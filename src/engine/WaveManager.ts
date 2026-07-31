import { CombatEngine } from './CombatEngine';
import { Rng } from './rng';
import { applyXpGain, statsForLevel, type HeroProgress } from './heroProgression';
import { scaledMonsterStats, tierForWave } from './waveScaling';
import { aggregateModifiers, type AggregatedModifiers, type ModifierSource } from './modifiers';
import { generateLootOptions, type LootOption } from './loot';
import type { Combatant, CombatEvent, CombatState } from './types';
import type { HeroDefinition } from '../data/hero.types';
import type { MonsterDefinition, MonsterTier } from '../data/monster.types';
import type { EquipmentSlot } from '../data/equipment.types';
import { bosses, miniBosses, normalMonsters } from '../data/monsters';
import { relicRegistry } from '../data/relics';
import { equipmentRegistry } from '../data/equipment';
import { RARITY_POWER_MULTIPLIER, type Rarity } from '../data/rarity';

/** Fraction of missing HP recovered on each wave clear, on top of any relic-granted regen. */
const WAVE_CLEAR_HEAL_FRACTION = 0.3;
const PHOENIX_HEART_ID = 'phoenix_heart';
const PHOENIX_REVIVE_HP_FRACTION = 0.5;

export interface OwnedRelic {
  id: string;
  count: number;
}

export interface EquippedItem {
  defId: string;
  rarity: Rarity;
}

export type EquippedItems = Record<EquipmentSlot, EquippedItem | null>;

export interface RunState {
  waveNumber: number;
  heroProgress: HeroProgress;
  isGameOver: boolean;
  monsterTier: MonsterTier;
  monsterName: string;
  gold: number;
  ownedRelics: OwnedRelic[];
  equipped: EquippedItems;
  isChoosingLoot: boolean;
  lootOptions: LootOption[];
  hasUsedPhoenixRevive: boolean;
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
  | { type: 'lootOffered'; options: LootOption[] }
  | { type: 'lootChosen'; option: LootOption }
  | { type: 'revived' }
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
 * after each CombatEngine concludes, awards XP, rolls hero level-ups, offers
 * a loot choice (relic / equipment / gold) between waves, and escalates
 * monster stats/tier as the wave count climbs. Pure logic, no rendering
 * dependency — a Phaser scene (or anything else) only reads
 * `getRunState()`/`getCombatState()` and reacts to `tick()`/`chooseLoot()`'s events.
 */
export class WaveManager {
  private readonly heroDef: HeroDefinition;
  private readonly rng: Rng;
  private seed: number;
  private state: RunState;
  private engine: CombatEngine;
  /** Hero HP carried from the moment a wave ended into the next wave's construction (post loot choice). */
  private pendingHeroHp = 0;

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
      gold: 0,
      ownedRelics: [],
      equipped: { weapon: null, armor: null, accessory: null },
      isChoosingLoot: false,
      lootOptions: [],
      hasUsedPhoenixRevive: false,
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
    if (this.state.isGameOver || this.state.isChoosingLoot) {
      return [];
    }

    const combatEvents = this.engine.tick(dtMs);
    const events: WaveEvent[] = combatEvents.map((event) => ({ type: 'combat', event }));

    const combatEnd = combatEvents.find((event) => event.type === 'combatEnd');
    if (combatEnd && combatEnd.type === 'combatEnd') {
      if (combatEnd.winnerId === this.heroDef.id) {
        this.handleWaveCleared(events);
      } else if (!this.tryPhoenixRevive(events)) {
        this.state.isGameOver = true;
        events.push({ type: 'runOver', waveNumber: this.state.waveNumber });
      }
    }

    return events;
  }

  /** Applies the player's loot pick (by index into the current offering) and starts the next wave. */
  chooseLoot(index: number): WaveEvent[] {
    if (!this.state.isChoosingLoot) return [];
    const option = this.state.lootOptions[index];
    if (!option) return [];

    this.applyLootOption(option);
    const events: WaveEvent[] = [{ type: 'lootChosen', option }];

    this.state.isChoosingLoot = false;
    this.state.lootOptions = [];
    this.engine = this.buildWaveEngine(this.state.waveNumber + 1, this.pendingHeroHp);

    const monster = this.engine.getState().monster;
    events.push({
      type: 'waveStarted',
      waveNumber: this.state.waveNumber,
      monster: { id: monster.id, name: monster.name, tier: this.state.monsterTier, maxHp: monster.maxHp, attack: monster.attack },
    });

    return events;
  }

  private handleWaveCleared(events: WaveEvent[]): void {
    const clearedWave = this.state.waveNumber;
    const modifiers = this.computeModifiers();
    const xpGained = Math.round(this.currentMonsterDef().xpReward * (1 + modifiers.xpMultiplierSum));
    events.push({ type: 'waveCleared', waveNumber: clearedWave, xpGained });

    const { progress, levelsGained } = applyXpGain(this.state.heroProgress, xpGained);
    this.state.heroProgress = progress;
    if (levelsGained > 0) {
      events.push({ type: 'levelUp', newLevel: progress.level });
    }

    this.pendingHeroHp = this.engine.getState().hero.hp;
    this.state.isChoosingLoot = true;
    this.state.lootOptions = generateLootOptions(this.rng, this.ownedRelicIdMap(), clearedWave + 1, modifiers.goldMultiplierSum);
    events.push({ type: 'lootOffered', options: this.state.lootOptions });
  }

  private applyLootOption(option: LootOption): void {
    if (option.kind === 'relic') {
      const existing = this.state.ownedRelics.find((owned) => owned.id === option.relic.id);
      if (existing) {
        if (option.relic.stacking === 'stackable') {
          existing.count += 1;
        }
      } else {
        this.state.ownedRelics = [...this.state.ownedRelics, { id: option.relic.id, count: 1 }];
      }
    } else if (option.kind === 'equipment') {
      this.state.equipped = {
        ...this.state.equipped,
        [option.equipment.slot]: { defId: option.equipment.id, rarity: option.rarity },
      };
    } else {
      this.state.gold += option.amount;
    }
  }

  /** Consumes the hero's one-time Phoenix Heart revive, if owned and not yet used, continuing the current fight. */
  private tryPhoenixRevive(events: WaveEvent[]): boolean {
    if (this.state.hasUsedPhoenixRevive) return false;
    if (!this.state.ownedRelics.some((owned) => owned.id === PHOENIX_HEART_ID)) return false;

    this.state.hasUsedPhoenixRevive = true;
    const modifiers = this.computeModifiers();
    const levelStats = statsForLevel(this.heroDef, this.state.heroProgress.level);
    const maxHp = Math.round(levelStats.maxHp * (1 + modifiers.maxHpBonusPercentSum));
    const attackIntervalMs = Math.round(levelStats.attackIntervalMs / (1 + modifiers.attackSpeedMultiplierSum));
    const revivedHp = Math.max(1, Math.round(maxHp * PHOENIX_REVIVE_HP_FRACTION));
    const hero = buildCombatant(this.heroDef.id, this.heroDef.name, revivedHp, maxHp, levelStats.attack, attackIntervalMs);

    const currentMonster = this.engine.getState().monster;
    const monster = buildCombatant(
      currentMonster.id,
      currentMonster.name,
      currentMonster.hp,
      currentMonster.maxHp,
      currentMonster.attack,
      currentMonster.attackIntervalMs,
    );

    this.seed += 1;
    this.engine = new CombatEngine(hero, monster, this.seed, modifiers);
    events.push({ type: 'revived' });
    return true;
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

  private ownedRelicIdMap(): Map<string, number> {
    return new Map(this.state.ownedRelics.map((owned) => [owned.id, owned.count]));
  }

  private computeModifiers(): AggregatedModifiers {
    const relicSources: ModifierSource[] = this.state.ownedRelics.map((owned) => ({
      modifiers: relicRegistry.get(owned.id).modifiers,
      count: owned.count,
    }));

    const equipmentSources: ModifierSource[] = Object.values(this.state.equipped)
      .filter((item): item is EquippedItem => item !== null)
      .map((item) => {
        const def = equipmentRegistry.get(item.defId);
        const scaledValue = def.modifier.value * RARITY_POWER_MULTIPLIER[item.rarity];
        return { modifiers: [{ kind: def.modifier.kind, value: scaledValue }], count: 1 };
      });

    return aggregateModifiers([...relicSources, ...equipmentSources]);
  }

  private buildWaveEngine(waveNumber: number, carriedHeroHp?: number): CombatEngine {
    this.state.waveNumber = waveNumber;
    const tier = tierForWave(waveNumber);
    this.state.monsterTier = tier;

    const pool = tier === 'boss' ? bosses : tier === 'miniboss' ? miniBosses : normalMonsters;
    const def = pickFrom(pool, this.rng);
    this.state.monsterName = def.name;

    const scaled = scaledMonsterStats(def, waveNumber);
    const monster = buildCombatant(def.id, def.name, scaled.maxHp, scaled.maxHp, scaled.attack, def.attackIntervalMs);

    const modifiers = this.computeModifiers();
    const levelStats = statsForLevel(this.heroDef, this.state.heroProgress.level);
    const maxHp = Math.round(levelStats.maxHp * (1 + modifiers.maxHpBonusPercentSum));
    const attackIntervalMs = Math.round(levelStats.attackIntervalMs / (1 + modifiers.attackSpeedMultiplierSum));

    let heroHp = maxHp;
    if (carriedHeroHp !== undefined) {
      const beforeHeal = Math.min(maxHp, Math.max(0, carriedHeroHp));
      const healFraction = WAVE_CLEAR_HEAL_FRACTION + modifiers.regenPerWaveSum;
      heroHp = Math.min(maxHp, beforeHeal + Math.round((maxHp - beforeHeal) * healFraction));
    }

    const hero = buildCombatant(this.heroDef.id, this.heroDef.name, heroHp, maxHp, levelStats.attack, attackIntervalMs);

    this.seed += 1;
    return new CombatEngine(hero, monster, this.seed, modifiers);
  }
}
