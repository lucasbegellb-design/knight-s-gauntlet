import { CombatEngine } from './CombatEngine';
import { Rng } from './rng';
import { applyXpGain, statsForLevel, type HeroProgress } from './heroProgression';
import { scaledMonsterStats, tierForWave } from './waveScaling';
import type { Combatant, CombatEvent, CombatState } from './types';
import type { HeroBaseStats, HeroDefinition } from '../data/hero.types';
import type { MonsterDefinition, MonsterTier } from '../data/monster.types';
import { bosses, miniBosses, normalMonsters } from '../data/monsters';

export interface RunState {
  waveNumber: number;
  heroProgress: HeroProgress;
  isGameOver: boolean;
  monsterTier: MonsterTier;
  monsterName: string;
}

export type WaveEvent =
  | { type: 'combat'; event: CombatEvent }
  | {
      type: 'waveStarted';
      waveNumber: number;
      monster: { id: string; name: string; tier: MonsterTier; maxHp: number; attack: number };
    }
  | { type: 'waveCleared'; waveNumber: number; xpGained: number }
  | { type: 'levelUp'; newLevel: number }
  | { type: 'runOver'; waveNumber: number };

function pickFrom(list: MonsterDefinition[], rng: Rng): MonsterDefinition {
  if (list.length === 0) {
    throw new Error('No monster definitions registered for this tier');
  }
  const index = Math.floor(rng.next() * list.length);
  return list[Math.min(index, list.length - 1)] as MonsterDefinition;
}

function buildCombatant(id: string, name: string, hp: number, maxHp: number, attack: number, attackIntervalMs: number): Combatant {
  return { id, name, hp, maxHp, attack, attackIntervalMs, nextAttackAt: attackIntervalMs };
}

/**
 * Sequences an infinite run of hero-vs-monster fights: spawns the next wave
 * after each CombatEngine concludes, awards XP, rolls hero level-ups, and
 * escalates monster stats/tier as the wave count climbs. Pure logic, no
 * rendering dependency — a Phaser scene (or anything else) only reads
 * `getRunState()`/`getCombatState()` and reacts to `tick()`'s events.
 */
export class WaveManager {
  private readonly heroDef: HeroDefinition;
  private readonly rng: Rng;
  private seed: number;
  private state: RunState;
  private engine: CombatEngine;

  constructor(heroDef: HeroDefinition, seed = 1) {
    this.heroDef = heroDef;
    this.rng = new Rng(seed);
    this.seed = seed;
    this.state = {
      waveNumber: 0,
      heroProgress: { level: 1, xp: 0 },
      isGameOver: false,
      monsterTier: 'normal',
      monsterName: '',
    };
    this.engine = this.buildWaveEngine(1);
  }

  getRunState(): Readonly<RunState> {
    return this.state;
  }

  getCombatState(): Readonly<CombatState> {
    return this.engine.getState();
  }

  tick(dtMs: number): WaveEvent[] {
    if (this.state.isGameOver) {
      return [];
    }

    const combatEvents = this.engine.tick(dtMs);
    const events: WaveEvent[] = combatEvents.map((event) => ({ type: 'combat', event }));

    const combatEnd = combatEvents.find((event) => event.type === 'combatEnd');
    if (combatEnd && combatEnd.type === 'combatEnd') {
      if (combatEnd.winnerId === this.heroDef.id) {
        this.handleWaveCleared(events);
      } else {
        this.state.isGameOver = true;
        events.push({ type: 'runOver', waveNumber: this.state.waveNumber });
      }
    }

    return events;
  }

  private handleWaveCleared(events: WaveEvent[]): void {
    const clearedWave = this.state.waveNumber;
    const xpGained = this.currentMonsterDef().xpReward;

    events.push({ type: 'waveCleared', waveNumber: clearedWave, xpGained });

    const previousStats = statsForLevel(this.heroDef, this.state.heroProgress.level);
    const { progress, levelsGained } = applyXpGain(this.state.heroProgress, xpGained);
    const newStats = statsForLevel(this.heroDef, progress.level);
    this.state.heroProgress = progress;

    const hpDelta = newStats.maxHp - previousStats.maxHp;
    const carriedHp = Math.min(newStats.maxHp, Math.max(0, this.engine.getState().hero.hp + hpDelta));

    if (levelsGained > 0) {
      events.push({ type: 'levelUp', newLevel: progress.level });
    }

    this.engine = this.buildWaveEngine(this.state.waveNumber + 1, carriedHp, newStats);

    const monster = this.engine.getState().monster;
    events.push({
      type: 'waveStarted',
      waveNumber: this.state.waveNumber,
      monster: { id: monster.id, name: monster.name, tier: this.state.monsterTier, maxHp: monster.maxHp, attack: monster.attack },
    });
  }

  /** Re-derives the content definition for whichever monster the active CombatEngine is fighting. */
  private currentMonsterDef(): MonsterDefinition {
    const monster = this.engine.getState().monster;
    const found =
      normalMonsters.find((m) => m.id === monster.id) ??
      miniBosses.find((m) => m.id === monster.id) ??
      bosses.find((m) => m.id === monster.id);
    if (!found) {
      throw new Error(`Unknown monster id in active combat: ${monster.id}`);
    }
    return found;
  }

  private buildWaveEngine(waveNumber: number, carriedHeroHp?: number, heroStatsOverride?: HeroBaseStats): CombatEngine {
    this.state.waveNumber = waveNumber;
    const tier = tierForWave(waveNumber);
    this.state.monsterTier = tier;

    const pool = tier === 'boss' ? bosses : tier === 'miniboss' ? miniBosses : normalMonsters;
    const def = pickFrom(pool, this.rng);
    this.state.monsterName = def.name;

    const scaled = scaledMonsterStats(def, waveNumber);
    const monster = buildCombatant(def.id, def.name, scaled.maxHp, scaled.maxHp, scaled.attack, def.attackIntervalMs);

    const heroStats = heroStatsOverride ?? statsForLevel(this.heroDef, this.state.heroProgress.level);
    const heroHp = carriedHeroHp ?? heroStats.maxHp;
    const hero = buildCombatant(this.heroDef.id, this.heroDef.name, heroHp, heroStats.maxHp, heroStats.attack, heroStats.attackIntervalMs);

    this.seed += 1;
    return new CombatEngine(hero, monster, this.seed);
  }
}
