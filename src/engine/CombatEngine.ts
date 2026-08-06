import { Rng } from './rng';
import { NEUTRAL_MODIFIERS, type AggregatedModifiers } from './modifiers';
import { affinityBetween, affinityMultiplier, type Element } from './elements';
import { resolveConditionals, type ConditionContext } from './conditionals';
import type { ConditionalModifier } from '../data/relic.types';
import type { AllyUnit, Combatant, CombatEvent, CombatState, SpellCaster } from './types';

const BASE_CRIT_MULTIPLIER = 1.5;
const BASE_BURN_RATIO = 0.4;

/**
 * Brave Burst — the party gauge, lifted from Brave Frontier and adapted to an idle game.
 *
 * The gauge fills from the party landing hits and from taking them, so it charges on any
 * build rather than rewarding one stat. When it fills, the burst does *not* fire immediately:
 * it arms, and the player has `BURST_MANUAL_WINDOW_MS` to trigger it themselves for a damage
 * bonus. Miss the window and it auto-fires at base power.
 *
 * That window is the whole point. An idle game has no moment-to-moment input; this gives it
 * exactly one, it is strictly optional, and skipping it costs a bonus rather than the burst —
 * so an idling player loses nothing they had, while an attentive one is genuinely rewarded.
 * It's the closest analogue to BF's spark timing that a no-input combat loop can carry.
 */
const BURST_FILL_PER_PARTY_ATTACK = 0.055;
const BURST_FILL_PER_HIT_TAKEN = 0.09;
/** Each burst contributor deals this multiple of its own attack, before affinity and party modifiers. */
const BURST_ATTACK_MULTIPLIER = 2.4;
/** Extra damage for firing inside the manual window instead of letting it auto-fire. */
const BURST_MANUAL_BONUS = 1.5;
/** Healers contribute a party-wide heal instead of damage, at this multiple of their heal output. */
const BURST_HEAL_MULTIPLIER = 1.8;
const BURST_MANUAL_WINDOW_MS = 2600;

/**
 * Run-level facts a conditional can key off that the engine cannot see from one fight alone.
 * WaveManager rebuilds the engine each wave, so this is a per-wave snapshot rather than a live
 * reference — no back-pointer from the pure engine into the run sequencer.
 */
export interface RunConditionContext {
  relicCount: number;
  wavesCleared: number;
  squadElements: Element[];
}

const DEFAULT_RUN_CONTEXT: RunConditionContext = { relicCount: 0, wavesCleared: 0, squadElements: [] };

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
  private readonly conditionals: ConditionalModifier[];
  private readonly runContext: RunConditionContext;
  /** Elapsed time at which the gauge filled, used to expire the manual-trigger window. */
  private burstArmedAt = 0;

  constructor(
    hero: Combatant,
    monster: Combatant,
    seed = 1,
    partyModifiers: AggregatedModifiers = NEUTRAL_MODIFIERS,
    allies: AllyUnit[] = [],
    spells: SpellCaster[] = [],
    conditionals: ConditionalModifier[] = [],
    runContext: RunConditionContext = DEFAULT_RUN_CONTEXT,
  ) {
    this.state = { hero, monster, allies, elapsedMs: 0, isOver: false, winnerId: null, burstGauge: 0, burstArmed: false };
    this.rng = new Rng(seed);
    this.heroId = hero.id;
    this.partyModifiers = partyModifiers;
    this.spells = spells;
    this.conditionals = conditionals;
    this.runContext = runContext;
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

    // Auto-fire once the manual window lapses. Checked after the loop rather than inside it so a
    // burst never resolves in the middle of a same-timestamp exchange of attacks.
    if (this.state.burstArmed && !this.state.isOver && this.state.elapsedMs - this.burstArmedAt >= BURST_MANUAL_WINDOW_MS) {
      this.fireBurst(false, events);
    }

    return events;
  }

  /**
   * Player-triggered Brave Burst. Returns false (and does nothing) when the gauge isn't armed,
   * so the UI can render a dead button rather than the caller having to guard.
   */
  triggerBurst(): CombatEvent[] {
    const events: CombatEvent[] = [];
    if (!this.state.burstArmed || this.state.isOver) return events;
    this.fireBurst(true, events);
    return events;
  }

  /** Adds charge to the party gauge, arming the burst the moment it fills. */
  private chargeBurst(amount: number, events: CombatEvent[]): void {
    if (this.state.burstArmed || this.state.isOver) return;
    this.state.burstGauge = Math.min(1, this.state.burstGauge + amount);
    if (this.state.burstGauge >= 1) {
      this.state.burstArmed = true;
      this.burstArmedAt = this.state.elapsedMs;
      events.push({ type: 'burstReady' });
    }
  }

  /**
   * Resolves the squad-wide burst: every living non-healer contributes a heavy hit through the
   * normal damage path (so party modifiers and elemental affinity both still apply), and every
   * living healer converts its contribution into a party heal instead.
   */
  private fireBurst(manual: boolean, events: CombatEvent[]): void {
    this.state.burstArmed = false;
    this.state.burstGauge = 0;

    const powerMultiplier = BURST_ATTACK_MULTIPLIER * (manual ? BURST_MANUAL_BONUS : 1);
    const monster = this.state.monster;
    const contributors: string[] = [];
    let totalDamage = 0;
    let totalHealed = 0;

    const strike = (unit: Combatant): void => {
      if (unit.hp <= 0 || monster.hp <= 0 || this.state.isOver) return;
      contributors.push(unit.id);
      // Route through a synthetic attacker so computeAttackDamage's crit/burn/affinity all apply
      // to the burst exactly as they would to a normal hit, without duplicating that pipeline.
      const burstUnit: Combatant = { ...unit, attack: unit.attack * powerMultiplier };
      const damage = this.computeAttackDamage(burstUnit, monster, events);
      monster.hp = Math.max(0, monster.hp - damage);
      totalDamage += damage;
      this.applyLifesteal(unit, damage, events);
    };

    if (this.state.hero.hp > 0) strike(this.state.hero);

    for (const ally of this.state.allies) {
      if (ally.combatant.hp <= 0) continue;
      if (ally.role === 'healer') {
        const amount = Math.round(ally.healAmount * BURST_HEAL_MULTIPLIER);
        const targets = [this.state.hero, ...this.state.allies.map((a) => a.combatant)].filter((c) => c.hp > 0);
        for (const target of targets) {
          const healed = Math.min(target.maxHp - target.hp, amount);
          if (healed > 0) {
            target.hp += healed;
            totalHealed += healed;
          }
        }
        contributors.push(ally.combatant.id);
        continue;
      }
      strike(ally.combatant);
    }

    this.applyExecute(monster, events);
    events.push({ type: 'braveBurst', manual, damage: totalDamage, healed: totalHealed, contributors });

    if (monster.hp <= 0 && !this.state.isOver) {
      events.push({ type: 'death', combatantId: monster.id });
      this.endCombat(this.heroId, events);
    }
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
    this.chargeBurst(BURST_FILL_PER_PARTY_ATTACK, events);

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
    this.chargeBurst(BURST_FILL_PER_HIT_TAKEN, events);

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
    this.chargeBurst(BURST_FILL_PER_PARTY_ATTACK, events);

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

    const conditional = resolveConditionals(this.conditionals, {
      attackerHpFraction: attacker.maxHp > 0 ? attacker.hp / attacker.maxHp : 0,
      targetHpFraction: target.maxHp > 0 ? target.hp / target.maxHp : 0,
      affinity,
      targetElement: target.element,
      relicCount: this.runContext.relicCount,
      wavesCleared: this.runContext.wavesCleared,
      squadElements: this.runContext.squadElements,
    } satisfies ConditionContext);

    let damage =
      (attacker.attack * (1 + mod.damageMultiplierSum) + mod.flatDamageBonusSum + conditional.flatDamage) *
      affinityMult *
      conditional.damageMultiplier;

    let isCrit = false;
    const critChance = mod.critChanceSum + conditional.critChance;
    if (critChance > 0 && this.rng.next() < critChance) {
      isCrit = true;
      damage *= (BASE_CRIT_MULTIPLIER + mod.critDamageMultiplierSum) * conditional.onCritMultiplier;
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
