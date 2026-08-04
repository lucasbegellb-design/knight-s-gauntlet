import { CombatEngine } from './CombatEngine';
import { Rng } from './rng';
import { applyXpGain, statsForLevel, type HeroProgress } from './heroProgression';
import { monsterPoolForWave, scaledMonsterStats, tierForWave, zoneForWave } from './waveScaling';
import { rollBrokenParts } from './brokenParts';
import { aggregateModifiers, type AggregatedModifiers, type ModifierSource } from './modifiers';
import { generateLootOptions, type LootContext, type LootOption } from './loot';
import type { AllyUnit, Combatant, CombatEvent, CombatState, SpellCaster } from './types';
import type { HeroDefinition } from '../data/hero.types';
import type { MonsterDefinition, MonsterTier } from '../data/monster.types';
import type { EquipmentSlot } from '../data/equipment.types';
import { bosses, miniBosses, normalMonsters } from '../data/monsters';
import { relicRegistry } from '../data/relics';
import { equipmentRegistry } from '../data/equipment';
import { allCompanions, companionRegistry } from '../data/companions';
import { spellRegistry } from '../data/spells';
import { RARITY_POWER_MULTIPLIER, type Rarity } from '../data/rarity';
import type { RelicModifier } from '../data/relic.types';

/** Fraction of missing HP recovered on each wave clear, on top of any relic-granted regen. */
const WAVE_CLEAR_HEAL_FRACTION = 0.3;
const PHOENIX_HEART_ID = 'phoenix_heart';
const PHOENIX_REVIVE_HP_FRACTION = 0.5;
export const MAX_ACTIVE_COMPANIONS = 3;
export const MAX_ACTIVE_SPELLS = 2;
/** Permanent equipment power boost per Forge level (meta-progression). */
const FORGE_BONUS_PER_LEVEL = 0.01;
/** Permanent stat boost per companion upgrade rank (meta-progression). */
const COMPANION_RANK_BONUS_PER_LEVEL = 0.08;

/**
 * Permanent meta-progression bonuses carried into a run from the HUB
 * (talents, forge level, companion upgrade ranks, loot luck). All plain
 * data, computed by the caller (see `src/engine/talents.ts`) — WaveManager
 * stays framework-free and fully testable without touching the meta store.
 */
export interface MetaBonuses {
  talentModifiers: RelicModifier[];
  lootLuckBonus: number;
  forgeLevel: number;
  companionUpgrades: Record<string, number>;
  /** Innate modifiers from the player's chosen class (see src/data/classes), active for the whole run. */
  classModifiers: RelicModifier[];
  /** Passive modifiers from the meta-persistent Forge Weapon's current level (see src/data/forgeWeapon.ts). */
  forgeWeaponModifiers: RelicModifier[];
}

export const DEFAULT_META_BONUSES: MetaBonuses = {
  talentModifiers: [],
  lootLuckBonus: 0,
  forgeLevel: 0,
  companionUpgrades: {},
  classModifiers: [],
  forgeWeaponModifiers: [],
};

export interface OwnedRelic {
  id: string;
  count: number;
}

export interface EquippedItem {
  defId: string;
  rarity: Rarity;
}

export type EquippedItems = Record<EquipmentSlot, EquippedItem | null>;

export interface OwnedCompanion {
  id: string;
  /** Current HP carried between waves; 0 means permanently fallen for the rest of this run. */
  hp: number;
}

export interface OwnedSpell {
  id: string;
  count: number;
}

export interface RunState {
  waveNumber: number;
  heroProgress: HeroProgress;
  isGameOver: boolean;
  monsterTier: MonsterTier;
  monsterName: string;
  zoneId: string;
  zoneName: string;
  gold: number;
  brokenParts: number;
  ownedRelics: OwnedRelic[];
  equipped: EquippedItems;
  companions: OwnedCompanion[];
  activeSpells: OwnedSpell[];
  passiveSpells: OwnedSpell[];
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
      zone: { id: string; name: string; isNewZone: boolean };
    }
  | { type: 'waveCleared'; waveNumber: number; xpGained: number }
  | { type: 'brokenPartsDropped'; amount: number }
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
 * Sequences an infinite run of hero-(+allies)-vs-monster fights: spawns the
 * next wave after each CombatEngine concludes, awards XP, rolls hero
 * level-ups, offers a loot choice (relic / equipment / companion / spell /
 * gold) between waves, and escalates monster stats/tier as the wave count
 * climbs. Pure logic, no rendering dependency — a Phaser scene (or anything
 * else) only reads `getRunState()`/`getCombatState()` and reacts to
 * `tick()`/`chooseLoot()`'s events.
 */
export class WaveManager {
  private readonly heroDef: HeroDefinition;
  private readonly rng: Rng;
  /** Separate RNG stream for Broken Parts drops so adding/removing that roll never shifts monster-pick or loot-roll sequences elsewhere. */
  private readonly brokenPartsRng: Rng;
  private readonly metaBonuses: MetaBonuses;
  private readonly unlockedCompanionIds: Set<string>;
  private seed: number;
  private state: RunState;
  private engine: CombatEngine;
  /** Hero HP carried from the moment a wave ended into the next wave's construction (post loot choice). */
  private pendingHeroHp = 0;
  /** Companion HP carried the same way, keyed by companion id. */
  private pendingCompanionHp = new Map<string, number>();

  constructor(
    heroDef: HeroDefinition,
    seed = 1,
    metaBonuses: MetaBonuses = DEFAULT_META_BONUSES,
    startingEquipment: Partial<EquippedItems> = {},
    unlockedCompanionIds: Iterable<string> = allCompanions.map((c) => c.id),
  ) {
    this.heroDef = heroDef;
    this.rng = new Rng(seed);
    this.brokenPartsRng = new Rng(seed + 90210);
    this.seed = seed;
    this.metaBonuses = metaBonuses;
    this.unlockedCompanionIds = new Set(unlockedCompanionIds);
    this.state = {
      waveNumber: 0,
      heroProgress: { level: 1, xp: 0 },
      isGameOver: false,
      monsterTier: 'normal',
      monsterName: '',
      zoneId: '',
      zoneName: '',
      gold: 0,
      brokenParts: 0,
      ownedRelics: [],
      equipped: { weapon: null, armor: null, accessory: null, ...startingEquipment },
      companions: [],
      activeSpells: [],
      passiveSpells: [],
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
    const previousZoneId = this.state.zoneId;
    this.engine = this.buildWaveEngine(this.state.waveNumber + 1, this.pendingHeroHp);

    const monster = this.engine.getState().monster;
    events.push({
      type: 'waveStarted',
      waveNumber: this.state.waveNumber,
      monster: { id: monster.id, name: monster.name, tier: this.state.monsterTier, maxHp: monster.maxHp, attack: monster.attack },
      zone: { id: this.state.zoneId, name: this.state.zoneName, isNewZone: this.state.zoneId !== previousZoneId },
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

    const brokenPartsGained = rollBrokenParts(this.state.monsterTier, this.brokenPartsRng);
    if (brokenPartsGained > 0) {
      this.state.brokenParts += brokenPartsGained;
      events.push({ type: 'brokenPartsDropped', amount: brokenPartsGained });
    }

    this.pendingHeroHp = this.engine.getState().hero.hp;
    this.pendingCompanionHp = new Map(this.engine.getState().allies.map((ally) => [ally.combatant.id, ally.combatant.hp]));

    this.state.isChoosingLoot = true;
    const context: LootContext = {
      ownedRelicIds: this.ownedIdCountMap(this.state.ownedRelics),
      ownedCompanionIds: new Set(this.state.companions.map((c) => c.id)),
      unlockedCompanionIds: this.unlockedCompanionIds,
      companionRosterFull: this.state.companions.length >= MAX_ACTIVE_COMPANIONS,
      ownedActiveSpellIds: new Set(this.state.activeSpells.map((s) => s.id)),
      activeSpellSlotsFull: this.state.activeSpells.length >= MAX_ACTIVE_SPELLS,
      ownedPassiveSpellIds: this.ownedIdCountMap(this.state.passiveSpells),
      waveNumber: clearedWave + 1,
      goldMultiplier: modifiers.goldMultiplierSum,
      luckBonus: this.metaBonuses.lootLuckBonus,
    };
    this.state.lootOptions = generateLootOptions(this.rng, context);
    events.push({ type: 'lootOffered', options: this.state.lootOptions });
  }

  private applyLootOption(option: LootOption): void {
    if (option.kind === 'relic') {
      const existing = this.state.ownedRelics.find((owned) => owned.id === option.relic.id);
      if (existing) {
        if (option.relic.stacking === 'stackable') existing.count += 1;
      } else {
        this.state.ownedRelics = [...this.state.ownedRelics, { id: option.relic.id, count: 1 }];
      }
    } else if (option.kind === 'equipment') {
      this.state.equipped = {
        ...this.state.equipped,
        [option.equipment.slot]: { defId: option.equipment.id, rarity: option.rarity },
      };
    } else if (option.kind === 'companion') {
      this.state.companions = [...this.state.companions, { id: option.companion.id, hp: option.companion.maxHp }];
    } else if (option.kind === 'spell') {
      if (option.spell.kind === 'active') {
        this.state.activeSpells = [...this.state.activeSpells, { id: option.spell.id, count: 1 }];
      } else {
        const existing = this.state.passiveSpells.find((owned) => owned.id === option.spell.id);
        if (existing) {
          if (option.spell.stacking === 'stackable') existing.count += 1;
        } else {
          this.state.passiveSpells = [...this.state.passiveSpells, { id: option.spell.id, count: 1 }];
        }
      }
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

    const { allies, spellCasters } = this.buildAlliesAndSpells(modifiers);

    this.seed += 1;
    this.engine = new CombatEngine(hero, monster, this.seed, modifiers, allies, spellCasters);
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

  private ownedIdCountMap(owned: { id: string; count: number }[]): Map<string, number> {
    return new Map(owned.map((entry) => [entry.id, entry.count]));
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
        const scaledValue =
          def.modifier.value * RARITY_POWER_MULTIPLIER[item.rarity] * (1 + this.metaBonuses.forgeLevel * FORGE_BONUS_PER_LEVEL);
        return { modifiers: [{ kind: def.modifier.kind, value: scaledValue }], count: 1 };
      });

    const talentSource: ModifierSource = { modifiers: this.metaBonuses.talentModifiers, count: 1 };
    const classSource: ModifierSource = { modifiers: this.metaBonuses.classModifiers, count: 1 };
    const forgeWeaponSource: ModifierSource = { modifiers: this.metaBonuses.forgeWeaponModifiers, count: 1 };

    const passiveSpellSources: ModifierSource[] = this.state.passiveSpells.map((owned) => {
      const def = spellRegistry.get(owned.id);
      const modifiers = def.kind === 'passive' ? def.modifiers : [];
      return { modifiers, count: owned.count };
    });

    const companionAuraSources: ModifierSource[] = this.state.companions
      .filter((owned) => owned.hp > 0)
      .map((owned) => companionRegistry.get(owned.id))
      .filter((def) => def.role === 'support' && def.auraModifier)
      .map((def) => ({ modifiers: [def.auraModifier as RelicModifier], count: 1 }));

    return aggregateModifiers([
      ...relicSources,
      ...equipmentSources,
      ...passiveSpellSources,
      ...companionAuraSources,
      talentSource,
      classSource,
      forgeWeaponSource,
    ]);
  }

  /** Builds this wave's AllyUnit/SpellCaster arrays from the owned roster, applying wave-clear healing per companion. */
  private buildAlliesAndSpells(modifiers: AggregatedModifiers): { allies: AllyUnit[]; spellCasters: SpellCaster[] } {
    const healFraction = WAVE_CLEAR_HEAL_FRACTION + modifiers.regenPerWaveSum;
    const allies: AllyUnit[] = [];

    for (const owned of this.state.companions) {
      const def = companionRegistry.get(owned.id);
      const carried = this.pendingCompanionHp.get(owned.id) ?? owned.hp;

      let finalHp = 0;
      if (carried > 0) {
        const beforeHeal = Math.min(def.maxHp, carried);
        finalHp = Math.min(def.maxHp, beforeHeal + Math.round((def.maxHp - beforeHeal) * healFraction));
      }
      owned.hp = finalHp;
      if (finalHp <= 0) continue;

      // Upgrade ranks boost output (attack/healing), not HP — keeps hp bookkeeping in one consistent scale
      // across waves (maxHp never changes for a companion, unlike the hero's level-driven growth).
      const rankBonus = 1 + (this.metaBonuses.companionUpgrades[owned.id] ?? 0) * COMPANION_RANK_BONUS_PER_LEVEL;
      const upgradedAttack = Math.round(def.attack * rankBonus);
      const combatant = buildCombatant(def.id, def.name, finalHp, def.maxHp, upgradedAttack, def.attackIntervalMs);
      allies.push({
        combatant,
        role: def.role,
        actsIndependently: def.role !== 'support',
        tauntWeight: def.role === 'tank' ? 4 : 1,
        healAmount: Math.round((def.healAmount ?? 0) * rankBonus),
        doubleStrikeChance: def.doubleStrikeChance ?? 0,
      });
    }

    const spellCasters: SpellCaster[] = this.state.activeSpells.map((owned) => {
      const def = spellRegistry.get(owned.id);
      if (def.kind !== 'active') {
        throw new Error(`Expected active spell, got passive: ${owned.id}`);
      }
      return { id: def.id, name: def.name, cooldownMs: def.cooldownMs, nextCastAt: def.cooldownMs, effect: def.effect, power: def.power };
    });

    return { allies, spellCasters };
  }

  private buildWaveEngine(waveNumber: number, carriedHeroHp?: number): CombatEngine {
    this.state.waveNumber = waveNumber;
    const tier = tierForWave(waveNumber);
    this.state.monsterTier = tier;

    const zone = zoneForWave(waveNumber);
    this.state.zoneId = zone.id;
    this.state.zoneName = zone.name;

    const tierPool = tier === 'boss' ? bosses : tier === 'miniboss' ? miniBosses : normalMonsters;
    const pool = monsterPoolForWave(waveNumber, tierPool);
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
    const { allies, spellCasters } = this.buildAlliesAndSpells(modifiers);

    this.seed += 1;
    return new CombatEngine(hero, monster, this.seed, modifiers, allies, spellCasters);
  }
}
