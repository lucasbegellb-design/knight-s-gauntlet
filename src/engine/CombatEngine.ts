import { Rng } from './rng';
import type { Combatant, CombatEvent, CombatState } from './types';

/**
 * Pure hero-vs-monster combat simulation. No rendering or framework
 * dependencies — callers (Phaser scenes, tests, future UI) only read
 * `getState()` and react to the events `tick()` returns.
 */
export class CombatEngine {
  private readonly state: CombatState;
  private readonly rng: Rng;

  constructor(hero: Combatant, monster: Combatant, seed = 1) {
    this.state = { hero, monster, elapsedMs: 0, isOver: false, winnerId: null };
    this.rng = new Rng(seed);
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
    const damage = attacker.attack;
    target.hp = Math.max(0, target.hp - damage);
    attacker.nextAttackAt += attacker.attackIntervalMs;

    events.push({
      type: 'attack',
      attackerId: attacker.id,
      targetId: target.id,
      damage,
      targetHpAfter: target.hp,
    });

    if (target.hp <= 0) {
      events.push({ type: 'death', combatantId: target.id });
      this.state.isOver = true;
      this.state.winnerId = attacker.id;
      events.push({ type: 'combatEnd', winnerId: attacker.id });
    }
  }
}
