import { Rng } from './rng';
import { NEUTRAL_MODIFIERS, type AggregatedModifiers } from './modifiers';
import type { Combatant, CombatEvent, CombatState } from './types';

const BASE_CRIT_MULTIPLIER = 1.5;
const BASE_BURN_RATIO = 0.4;

/**
 * Pure hero-vs-monster combat simulation. No rendering or framework
 * dependencies — callers (Phaser scenes, tests, future UI) only read
 * `getState()` and react to the events `tick()` returns.
 *
 * Only the hero's attacks consult `heroModifiers` (relic/equipment
 * bonuses); monster attacks always use their flat base damage. With
 * `NEUTRAL_MODIFIERS` (the default), behavior is identical to a build
 * with no relics/equipment at all.
 */
export class CombatEngine {
  private readonly state: CombatState;
  private readonly rng: Rng;
  private readonly heroId: string;
  private readonly heroModifiers: AggregatedModifiers;

  constructor(hero: Combatant, monster: Combatant, seed = 1, heroModifiers: AggregatedModifiers = NEUTRAL_MODIFIERS) {
    this.state = { hero, monster, elapsedMs: 0, isOver: false, winnerId: null };
    this.rng = new Rng(seed);
    this.heroId = hero.id;
    this.heroModifiers = heroModifiers;
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
      const nextEventAt = Math.min(this.state.hero.nextAttackAt, this.state.monster.nextAttackAt);
      if (nextEventAt > targetElapsed) {
        break;
      }

      this.state.elapsedMs = nextEventAt;

      if (this.state.hero.nextAttackAt <= nextEventAt) {
        this.resolveAttack(this.state.hero, this.state.monster, events);
        if (this.state.isOver) break;
      }
      if (this.state.monster.nextAttackAt <= nextEventAt) {
        this.resolveAttack(this.state.monster, this.state.hero, events);
        if (this.state.isOver) break;
      }
    }

    this.state.elapsedMs = targetElapsed;
    return events;
  }

  private resolveAttack(attacker: Combatant, target: Combatant, events: CombatEvent[]): void {
    attacker.nextAttackAt += attacker.attackIntervalMs;
    const isHeroAttacking = attacker.id === this.heroId;

    const totalDamage = isHeroAttacking ? this.computeHeroDamage(attacker, target, events) : attacker.attack;
    target.hp = Math.max(0, target.hp - totalDamage);

    events.push({
      type: 'attack',
      attackerId: attacker.id,
      targetId: target.id,
      damage: totalDamage,
      targetHpAfter: target.hp,
    });

    if (isHeroAttacking) {
      this.applyExecute(target, events);
      this.applyLifesteal(attacker, totalDamage, events);
    } else {
      this.applyReflect(attacker, totalDamage, events);
    }

    this.finalizeIfDead(target, attacker, events);
    this.finalizeIfDead(attacker, target, events);
  }

  /** Computes the hero's damage for this hit, applying crit/burn modifiers and pushing their flavor events. */
  private computeHeroDamage(attacker: Combatant, target: Combatant, events: CombatEvent[]): number {
    const mod = this.heroModifiers;
    let damage = attacker.attack * (1 + mod.damageMultiplierSum) + mod.flatDamageBonusSum;

    let isCrit = false;
    if (mod.critChanceSum > 0 && this.rng.next() < mod.critChanceSum) {
      isCrit = true;
      damage *= BASE_CRIT_MULTIPLIER + mod.critDamageMultiplierSum;
      events.push({ type: 'critHit', targetId: target.id });
    }

    if (mod.burnChanceSum > 0 && this.rng.next() < mod.burnChanceSum) {
      let burnDamage = attacker.attack * (BASE_BURN_RATIO + mod.burnDamageMultiplierSum);
      if (isCrit) {
        burnDamage *= 1 + mod.critBurnBonusMultiplierSum;
      }
      burnDamage = Math.round(burnDamage);
      damage += burnDamage;
      events.push({ type: 'statusProc', kind: 'burn', targetId: target.id, damage: burnDamage });
    }

    return Math.round(damage);
  }

  private applyExecute(target: Combatant, events: CombatEvent[]): void {
    const threshold = this.heroModifiers.executeThresholdSum;
    if (threshold > 0 && target.hp > 0 && target.hp / target.maxHp <= threshold) {
      target.hp = 0;
      events.push({ type: 'execute', targetId: target.id });
    }
  }

  private applyLifesteal(attacker: Combatant, damageDealt: number, events: CombatEvent[]): void {
    const percent = this.heroModifiers.lifestealPercentSum;
    if (percent <= 0) return;

    const healAmount = Math.round(damageDealt * percent);
    if (healAmount > 0) {
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmount);
      events.push({ type: 'lifesteal', healerId: attacker.id, amount: healAmount });
    }
  }

  /** `attacker` here is the monster; reflect punishes it for attacking a hero with this passive. */
  private applyReflect(attacker: Combatant, damageTaken: number, events: CombatEvent[]): void {
    const percent = this.heroModifiers.reflectDamagePercentSum;
    if (percent <= 0 || attacker.hp <= 0) return;

    const reflectDamage = Math.round(damageTaken * percent);
    if (reflectDamage > 0) {
      attacker.hp = Math.max(0, attacker.hp - reflectDamage);
      events.push({ type: 'reflect', damagedId: attacker.id, damage: reflectDamage });
    }
  }

  private finalizeIfDead(combatant: Combatant, opponent: Combatant, events: CombatEvent[]): void {
    if (this.state.isOver || combatant.hp > 0) return;

    events.push({ type: 'death', combatantId: combatant.id });
    this.state.isOver = true;
    this.state.winnerId = opponent.id;
    events.push({ type: 'combatEnd', winnerId: opponent.id });
  }
}
