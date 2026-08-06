import { Rng } from './rng';
import { NEUTRAL_MODIFIERS, type AggregatedModifiers } from './modifiers';
import { affinityBetween, affinityMultiplier } from './elements';
import type { AllyUnit, Combatant, CombatEvent, CombatState, SpellCaster } from './types';

const BASE_CRIT_MULTIPLIER = 1.5;
const BASE_BURN_RATIO = 0.4;

function pickWeightedUnit(pool: { unit: Combatant; weight: number }[], rng: Rng): Combatant {
  if (pool.length === 1) {
    return (pool[0] as { unit: Combatant; weight: number }).unit;
  }
  const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng.next() * totalWeight;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll < 0) return entry.unit;
  }
  return (pool[pool.length - 1] as { unit: Combatant; weight: number }).unit;
}

/**
 * Pure hero-vs-monster (+ optional allies/spells) combat simulation. No
 * rendering or framework dependencies — callers (Phaser scenes, tests,
 * future UI) only read `getState()` and react to the events `tick()`
 * returns.
 *
 * `partyModifiers` (relic/equipment/talent/companion-aura bonuses,
 * aggregated once per wave by WaveManager) apply to every attack the party
 * lands — the hero's own attacks and non-healer allies' attacks alike —
 * plus shared party-wide effects (execute, lifesteal, reflect). Monster
 * attacks always use flat base damage. With `NEUTRAL_MODIFIERS` and no
 * allies/spells (the defaults), behavior is identical to a build with none
 * of Phase 3/4's systems.
 */
export class CombatEngine {
  private readonly state: CombatState;
  private readonly rng: Rng;
  private readonly heroId: string;
  private readonly partyModifiers: AggregatedModifiers;
  private readonly spells: SpellCaster[];

  constructor(
    hero: Combatant,
    monster: Combatant,
    seed = 1,
    partyModifiers: AggregatedModifiers = NEUTRAL_MODIFIERS,
    allies: AllyUnit[] = [],
    spells: SpellCaster[] = [],
  ) {
    this.state = { hero, monster, allies, elapsedMs: 0, isOver: false, winnerId: null };
    this.rng = new Rng(seed);
    this.heroId = hero.id;
    this.partyModifiers = partyModifiers;
    this.spells = spells;
  }

  getState(): Readonly<CombatState> {
    return this.state;
  }

  /** Exposes the engine's seeded RNG stream (e.g. for future crit/variance/loot rolls). */
  roll(): number {
    return this.rng.next();
  }

  /** Advance the simulation by dtMs, returning the events emitted during this tick. */
  tick(dtMs: number): CombatEvent[] {
    const events: CombatEvent[] = [];
    if (this.state.isOver) {
      return events;
    }

    const targetElapsed = this.state.elapsedMs + dtMs;

    while (!this.state.isOver) {
      const actingAllies = this.state.allies.filter((ally) => ally.actsIndependently && ally.combatant.hp > 0);
      const candidateTimes = [
        this.state.hero.nextAttackAt,
        this.state.monster.nextAttackAt,
        ...actingAllies.map((ally) => ally.combatant.nextAttackAt),
        ...this.spells.map((spell) => spell.nextCastAt),
      ];
      const nextEventAt = Math.min(...candidateTimes);
      if (nextEventAt > targetElapsed) break;

      this.state.elapsedMs = nextEventAt;

      for (const ally of actingAllies) {
        if (this.state.isOver) break;
        if (ally.combatant.nextAttackAt <= nextEventAt) this.resolveAllyTurn(ally, events);
      }
      for (const spell of this.spells) {
        if (this.state.isOver) break;
        if (spell.nextCastAt <= nextEventAt) this.resolveSpellCast(spell, events);
      }
      if (!this.state.isOver && this.state.hero.nextAttackAt <= nextEventAt) {
        this.resolveHeroTurn(this.state.hero, this.state.monster, events);
      }
      if (!this.state.isOver && this.state.monster.nextAttackAt <= nextEventAt) {
        this.resolveMonsterTurn(this.state.monster, events);
      }
    }

    this.state.elapsedMs = targetElapsed;
    return events;
  }

  private endCombat(winnerId: string, events: CombatEvent[]): void {
    if (this.state.isOver) return;
    this.state.isOver = true;
    this.state.winnerId = winnerId;
    events.push({ type: 'combatEnd', winnerId });
  }

  private resolveHeroTurn(hero: Combatant, monster: Combatant, events: CombatEvent[]): void {
    hero.nextAttackAt += hero.attackIntervalMs;

    const totalDamage = this.computeAttackDamage(hero, monster, events);
    monster.hp = Math.max(0, monster.hp - totalDamage);
    events.push({ type: 'attack', attackerId: hero.id, targetId: monster.id, damage: totalDamage, targetHpAfter: monster.hp });

    this.applyExecute(monster, events);
    this.applyLifesteal(hero, totalDamage, events);

    if (monster.hp <= 0 && !this.state.isOver) {
      events.push({ type: 'death', combatantId: monster.id });
      this.endCombat(hero.id, events);
    }
  }

  private resolveMonsterTurn(monster: Combatant, events: CombatEvent[]): void {
    monster.nextAttackAt += monster.attackIntervalMs;

    const pool: { unit: Combatant; weight: number }[] = [{ unit: this.state.hero, weight: 1 }];
    for (const ally of this.state.allies) {
      if (ally.combatant.hp > 0) pool.push({ unit: ally.combatant, weight: ally.tauntWeight });
    }
    const target = pickWeightedUnit(pool, this.rng);
    const isHeroTarget = target.id === this.heroId;

    // Monsters still never consult `partyModifiers` (a Phase 3 boundary), but elemental affinity
    // is a property of the matchup rather than of the party's build, so it cuts both ways.
    const monsterAffinity = affinityBetween(monster.element, target.element);
    const damage = Math.max(1, Math.round(monster.attack * affinityMultiplier(monster.element, target.element)));
    target.hp = Math.max(0, target.hp - damage);
    events.push({ type: 'attack', attackerId: monster.id, targetId: target.id, damage, targetHpAfter: target.hp });
    if (monsterAffinity !== 'neutral') {
      events.push({ type: 'affinity', attackerId: monster.id, targetId: target.id, affinity: monsterAffinity });
    }

    this.applyReflect(monster, damage, events);

    if (target.hp <= 0) {
      events.push({ type: 'death', combatantId: target.id });
      if (isHeroTarget) {
        this.endCombat(monster.id, events);
      }
    }

    if (monster.hp <= 0 && !this.state.isOver) {
      events.push({ type: 'death', combatantId: monster.id });
      this.endCombat(this.heroId, events);
    }
  }

  private resolveAllyTurn(ally: AllyUnit, events: CombatEvent[]): void {
    ally.combatant.nextAttackAt += ally.combatant.attackIntervalMs;

    if (ally.role === 'healer') {
      const candidates = [this.state.hero, ...this.state.allies.map((a) => a.combatant)].filter((c) => c.hp > 0);
      if (candidates.length === 0) return;
      const lowest = candidates.reduce((min, c) => (c.hp / c.maxHp < min.hp / min.maxHp ? c : min));
      const healAmount = Math.min(lowest.maxHp - lowest.hp, ally.healAmount);
      if (healAmount > 0) {
        lowest.hp += healAmount;
        events.push({ type: 'companionHeal', healerId: ally.combatant.id, targetId: lowest.id, amount: healAmount });
      }
      return;
    }

    const monster = this.state.monster;
    if (monster.hp <= 0) return;

    const damage = this.computeAttackDamage(ally.combatant, monster, events);
    monster.hp = Math.max(0, monster.hp - damage);
    events.push({ type: 'attack', attackerId: ally.combatant.id, targetId: monster.id, damage, targetHpAfter: monster.hp });
    this.applyExecute(monster, events);
    this.applyLifesteal(ally.combatant, damage, events);

    if (ally.role === 'summoner' && ally.doubleStrikeChance > 0 && monster.hp > 0 && this.rng.next() < ally.doubleStrikeChance) {
      const bonusDamage = this.computeAttackDamage(ally.combatant, monster, events);
      monster.hp = Math.max(0, monster.hp - bonusDamage);
      events.push({ type: 'attack', attackerId: ally.combatant.id, targetId: monster.id, damage: bonusDamage, targetHpAfter: monster.hp });
      this.applyExecute(monster, events);
      this.applyLifesteal(ally.combatant, bonusDamage, events);
    }

    if (monster.hp <= 0 && !this.state.isOver) {
      events.push({ type: 'death', combatantId: monster.id });
      this.endCombat(this.heroId, events);
    }
  }

  private resolveSpellCast(spell: SpellCaster, events: CombatEvent[]): void {
    spell.nextCastAt += spell.cooldownMs;
    const hero = this.state.hero;
    const monster = this.state.monster;

    if (spell.effect === 'heal') {
      const healAmount = Math.min(hero.maxHp - hero.hp, spell.power);
      if (healAmount > 0) {
        hero.hp += healAmount;
        events.push({ type: 'spellCast', spellId: spell.id, targetId: hero.id, effect: 'heal', amount: healAmount });
      }
      return;
    }

    if (monster.hp <= 0) return;
    monster.hp = Math.max(0, monster.hp - spell.power);
    events.push({ type: 'spellCast', spellId: spell.id, targetId: monster.id, effect: spell.effect, amount: spell.power });

    if (monster.hp <= 0 && !this.state.isOver) {
      events.push({ type: 'death', combatantId: monster.id });
      this.endCombat(this.heroId, events);
    }
  }

  /**
   * Computes an attacker's (hero or non-healer ally) damage for this hit, applying elemental
   * affinity plus crit/burn modifiers and pushing their flavor events. Affinity is applied to
   * both the main hit and any burn proc so the numbers the player sees always agree with the
   * WEAK/RESIST callout on screen.
   */
  private computeAttackDamage(attacker: Combatant, target: Combatant, events: CombatEvent[]): number {
    const mod = this.partyModifiers;
    const affinity = affinityBetween(attacker.element, target.element);
    const affinityMult = affinityMultiplier(attacker.element, target.element);

    let damage = (attacker.attack * (1 + mod.damageMultiplierSum) + mod.flatDamageBonusSum) * affinityMult;

    let isCrit = false;
    if (mod.critChanceSum > 0 && this.rng.next() < mod.critChanceSum) {
      isCrit = true;
      damage *= BASE_CRIT_MULTIPLIER + mod.critDamageMultiplierSum;
      events.push({ type: 'critHit', targetId: target.id });
    }

    if (mod.burnChanceSum > 0 && this.rng.next() < mod.burnChanceSum) {
      let burnDamage = attacker.attack * (BASE_BURN_RATIO + mod.burnDamageMultiplierSum) * affinityMult;
      if (isCrit) {
        burnDamage *= 1 + mod.critBurnBonusMultiplierSum;
      }
      burnDamage = Math.round(burnDamage);
      damage += burnDamage;
      events.push({ type: 'statusProc', kind: 'burn', targetId: target.id, damage: burnDamage });
    }

    if (affinity !== 'neutral') {
      events.push({ type: 'affinity', attackerId: attacker.id, targetId: target.id, affinity });
    }

    return Math.round(damage);
  }

  private applyExecute(target: Combatant, events: CombatEvent[]): void {
    const threshold = this.partyModifiers.executeThresholdSum;
    if (threshold > 0 && target.hp > 0 && target.hp / target.maxHp <= threshold) {
      target.hp = 0;
      events.push({ type: 'execute', targetId: target.id });
    }
  }

  private applyLifesteal(attacker: Combatant, damageDealt: number, events: CombatEvent[]): void {
    const percent = this.partyModifiers.lifestealPercentSum;
    if (percent <= 0) return;

    const healAmount = Math.round(damageDealt * percent);
    if (healAmount > 0) {
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmount);
      events.push({ type: 'lifesteal', healerId: attacker.id, amount: healAmount });
    }
  }

  /** `attacker` here is the monster; reflect punishes it for attacking any reflect-carrying party member (hero or ally). */
  private applyReflect(attacker: Combatant, damageTaken: number, events: CombatEvent[]): void {
    const percent = this.partyModifiers.reflectDamagePercentSum;
    if (percent <= 0 || attacker.hp <= 0) return;

    const reflectDamage = Math.round(damageTaken * percent);
    if (reflectDamage > 0) {
      attacker.hp = Math.max(0, attacker.hp - reflectDamage);
      events.push({ type: 'reflect', damagedId: attacker.id, damage: reflectDamage });
    }
  }
}
