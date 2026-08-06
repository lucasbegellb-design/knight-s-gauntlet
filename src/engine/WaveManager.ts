import { CombatEngine } from './CombatEngine';
import { Rng } from './rng';
import { applyXpGain, statsForLevel, type HeroProgress } from './heroProgression';
import { monsterPoolForWave, scaledMonsterStats, tierForWave, zoneForWave } from './waveScaling';
import { rollBrokenParts } from './brokenParts';
import { rollWaveAffix } from './affixes';
import type { MonsterTraits, WaveAffix } from '../data/affixes';
import { aggregateModifiers, type AggregatedModifiers, type ModifierSource } from './modifiers';
import { collectConditionals } from './conditionals';
import { resolveSolitudeModifiers } from './solitude';
import type { RunConditionContext } from './CombatEngine';
import { primaryMonster } from './CombatEngine';
import { generateLootOptions, type LootContext, type LootOption } from './loot';
import type { AllyUnit, Combatant, CombatEvent, CombatState, SpellCaster } from './types';
import type { HeroDefinition } from '../data/hero.types';
import type { MonsterDefinition, MonsterTier } from '../data/monster.types';
import type { EquipmentSlot } from '../data/equipment.types';
import { allMonsters, bosses, megaBosses, miniBosses, normalMonsters, ultraBosses } from '../data/monsters';
import { relicRegistry } from '../data/relics';
import { equipmentRegistry } from '../data/equipment';
import { allCompanions, companionRegistry } from '../data/companions';
import { spellRegistry } from '../data/spells';
import { RARITY_POWER_MULTIPLIER, type Rarity } from '../data/rarity';
import type { ConditionalModifier, RelicModifier } from '../data/relic.types';
import type { Element } from './elements';

/** Fraction of missing HP recovered on each wave clear, on top of any relic-granted regen. */
const WAVE_CLEAR_HEAL_FRACTION = 0.45;
const PHOENIX_HEART_ID = 'phoenix_heart';
const PHOENIX_REVIVE_HP_FRACTION = 0.5;
const BROKEN_BLADE_ID = 'broken_blade';
/** Party damageMultiplier granted per Broken Part collected this run, while Broken Blade is owned. */
const BROKEN_BLADE_PER_PART = 0.01;
/** Caps Broken Blade's scaling so a very long run doesn't compound damage without bound. */
const BROKEN_BLADE_PART_CAP = 25;
export const MAX_ACTIVE_COMPANIONS = 3;
export const MAX_ACTIVE_SPELLS = 2;
/** Permanent equipment power boost per Forge level (meta-progression). */
const FORGE_BONUS_PER_LEVEL = 0.01;
/** Permanent stat boost per companion upgrade rank (meta-progression). */
const COMPANION_RANK_BONUS_PER_LEVEL = 0.08;
/**
 * Companion attack/heal output scales with the hero's own level, same axis the hero's own attack
 * already grows on. Without this, a companion's flat `attack`/`healAmount` stays fixed for the
 * entire run while monster stats keep compounding via `scaledMonsterStats` — companions were
 * reasonably tuned for wave 1 but fell further behind every wave after, which read as "companions
 * are weak" even though their base numbers were fine in isolation. HP intentionally isn't scaled
 * here — see the existing rank-bonus comment below on why companion maxHp must stay stable across
 * waves for the wave-clear-heal-fraction bookkeeping to work.
 */
const COMPANION_LEVEL_SCALING_PER_LEVEL = 0.05;

/**
 * Echo of Yourself — every ECHO_WAVE_INTERVAL waves, the wave's monster is replaced by a mirror of
 * the hero's own current effective combat stats (level + gear + relic bonuses already baked in,
 * the same numbers the hero itself fights with) instead of a bestiary entry. It's the one encounter
 * in the game whose difficulty is a direct readout of the player's own build rather than external
 * content: a glass-cannon build with no lifesteal/HP investment gets punished by exactly that
 * weakness reflected back. Deliberately doesn't grant the Echo the hero's crit/burn/lifesteal rolls
 * (monsters never consult modifiers — a Phase 3 architectural decision kept intact here); a flat
 * mirror of the raw numbers is already a genuine fight without touching that boundary. Can land on
 * the same wave as a miniboss/boss/megaboss — Echo wins that wave, tier is kept for reward-table
 * purposes only (Broken Parts drop table, etc.), not for its stats.
 */
const ECHO_WAVE_INTERVAL = 15;
/** The Echo fights at a fraction of the hero's own power, not 1:1 — a fair fight, not an unwinnable wall. */
const ECHO_POWER_FRACTION = 0.9;
const ECHO_ID = 'echo_of_self';

/**
 * Group waves.
 *
 * A single enemy per wave meant every fight had exactly one shape: a damage race against one HP
 * bar. Two or three enemies change the maths rather than just the numbers, because each keeps its
 * own attack timer — a pack of three out-actions one monster of the same total health, so raw
 * damage stops being the only answer and clear speed starts to matter.
 *
 * Only `normal` waves group. A boss is a duel and stays one, minibosses stay readable as a single
 * threat, and the Echo is a mirror of one hero. Group size is capped and gated behind the opening
 * waves so the game still teaches its baseline first.
 */
const GROUP_MIN_WAVE = 4;
const MAX_GROUP_SIZE = 3;
/** Chance a normal wave spawns extra enemies, climbing with depth up to the cap below. */
const GROUP_BASE_CHANCE = 0.2;
const GROUP_CHANCE_PER_WAVE = 0.008;
const GROUP_MAX_CHANCE = 0.62;
/** Chance a group that already has a second enemy gets a third. */
const THIRD_ENEMY_CHANCE = 0.35;
/**
 * Each enemy in a group is individually weaker than a solo monster of the same wave, or a pack
 * would simply be N times a fair fight. The total still exceeds one monster's worth — that surplus
 * is the reward for a wave that also demands faster clearing.
 */
const GROUP_STAT_SCALE: Record<number, number> = { 1: 1, 2: 0.66, 3: 0.5 };
/**
 * Echo ladder — the one mechanic in this game that isn't standard to the genre, promoted from a
 * curiosity every fifteen waves to the spine of the whole thing.
 *
 * Beating an Echo records the build that beat it. Later runs can then face *that* Echo instead of
 * the live mirror: your own past attempts become the bestiary. The difficulty stops being a number
 * someone tuned and becomes a history of your own decisions, which is the only thing this game
 * does that nothing else does.
 *
 * Ladder Echoes only start appearing once a run is deep enough to have earned the reference, and
 * they are scaled to the current wave rather than replayed at their recorded power — a wave-30
 * ghost at wave-30 numbers would be free by wave 80.
 */
const ECHO_LADDER_MIN_WAVE = 30;
const ECHO_LADDER_CHANCE = 0.5;
/** The Echo isn't a bestiary entry so it has no authored xpReward — approximates what a same-tier monster would give. */
const ECHO_XP_REWARD_BY_TIER: Record<MonsterTier, number> = {
  normal: 12,
  miniboss: 45,
  boss: 130,
  megaboss: 600,
  ultraboss: 4000,
};

/**
 * Permanent meta-progression bonuses carried into a run from the HUB
 * (talents, forge level, companion upgrade ranks, loot luck). All plain
 * data, computed by the caller (see `src/engine/talents.ts`) — WaveManager
 * stays framework-free and fully testable without touching the meta store.
 */
/**
 * A build that once beat an Echo, stored so it can come back as one. Ratios rather than raw
 * numbers, so a record stays meaningful when it is replayed twenty waves deeper than it was set.
 */
export interface EchoRecord {
  classId: string;
  className: string;
  element?: Element;
  /** Wave the record was set on — surfaced in the Echo's name so the player recognises it. */
  wave: number;
  level: number;
  /** Attack relative to the mirror the wave would otherwise have produced. */
  attackRatio: number;
  /** Max HP relative to the same. */
  hpRatio: number;
  attackIntervalMs: number;
  critChance: number;
  critDamageMultiplier: number;
  lifestealPercent: number;
}

export interface MetaBonuses {
  talentModifiers: RelicModifier[];
  lootLuckBonus: number;
  forgeLevel: number;
  companionUpgrades: Record<string, number>;
  /** Innate modifiers from the player's chosen class (see src/data/classes), active for the whole run. */
  classModifiers: RelicModifier[];
  /** Passive modifiers from the meta-persistent Forge Weapon's current level (see src/data/forgeWeapon.ts). */
  forgeWeaponModifiers: RelicModifier[];
  /** Passive modifiers from conquered Kingdom territories/recruited lords/Royal Treasury level (see src/engine/kingdom.ts). */
  kingdomModifiers: RelicModifier[];
  /** Past builds that beat an Echo, eligible to return as one. Newest first. */
  echoLadder: EchoRecord[];
}

export const DEFAULT_META_BONUSES: MetaBonuses = {
  talentModifiers: [],
  lootLuckBonus: 0,
  forgeLevel: 0,
  companionUpgrades: {},
  classModifiers: [],
  forgeWeaponModifiers: [],
  kingdomModifiers: [],
  echoLadder: [],
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
  /** Why the run ended — distinguishes a voluntary flee (abandonRun) from a death, for UI copy. */
  endReason: 'death' | 'abandoned';
  /** What killed the run: the monster's display name, and whether it was an Echo. */
  killedBy: { name: string; isEcho: boolean; echoRecord: EchoRecord | null } | null;
  monsterTier: MonsterTier;
  monsterName: string;
  /** True when the current wave's monster is an Echo of the hero's own stats, not a bestiary entry. */
  isEcho: boolean;
  /** Current monster's element, mirrored into run state so the HUD can show the matchup. */
  monsterElement?: Element;
  /** Affix rolled onto the current wave, if any — see `src/engine/affixes.ts`. */
  monsterAffix: WaveAffix | null;
  /** Set when the current Echo is a resurrected past run rather than a live mirror. */
  echoRecord: EchoRecord | null;
  /** How many enemies this wave spawned. 1 for bosses, minibosses and Echoes. */
  monsterGroupSize: number;
  /** Empty companion slots this wave, driving the Solitary Trial bonus. 0 at full strength. */
  emptyCompanionSlots: number;
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
      monster: { id: string; name: string; tier: MonsterTier; maxHp: number; attack: number; isEcho: boolean; element?: Element; affix: WaveAffix | null; echoRecord: EchoRecord | null };
      zone: { id: string; name: string; isNewZone: boolean };
    }
  | { type: 'waveCleared'; waveNumber: number; xpGained: number }
  | { type: 'brokenPartsDropped'; amount: number }
  | { type: 'levelUp'; newLevel: number }
  | { type: 'lootOffered'; options: LootOption[] }
  | { type: 'lootChosen'; option: LootOption }
  | { type: 'revived' }
  | { type: 'runOver'; waveNumber: number }
  /** An Echo wave was cleared — carries the record to add to the ladder. */
  | { type: 'echoDefeated'; record: EchoRecord }
  /** This Echo wave resurrected a past run rather than mirroring the current one. */
  | { type: 'echoFromLadder'; record: EchoRecord };

function pickFrom(list: MonsterDefinition[], rng: Rng): MonsterDefinition {
  if (list.length === 0) {
    throw new Error('No monster definitions registered for this tier');
  }
  const index = Math.floor(rng.next() * list.length);
  return list[Math.min(index, list.length - 1)] as MonsterDefinition;
}

function buildCombatant(
  id: string,
  name: string,
  hp: number,
  maxHp: number,
  attack: number,
  attackIntervalMs: number,
  element?: Element,
  /** Delay added to the first swing; used to stagger a group so it doesn't act in unison. */
  startOffsetMs = 0,
): Combatant {
  return { id, name, hp, maxHp, attack, attackIntervalMs, nextAttackAt: attackIntervalMs + startOffsetMs, element };
}

const TIER_POOLS: Record<MonsterTier, MonsterDefinition[]> = {
  normal: normalMonsters,
  miniboss: miniBosses,
  boss: bosses,
  megaboss: megaBosses,
  ultraboss: ultraBosses,
};

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
  /** Likewise for affix rolls — an independent stream keeps existing seeded expectations stable. */
  private readonly affixRng: Rng;
  private readonly metaBonuses: MetaBonuses;
  private readonly unlockedCompanionIds: Set<string>;
  private seed: number;
  private state: RunState;
  private engine: CombatEngine;
  /** Hero HP carried from the moment a wave ended into the next wave's construction (post loot choice). */
  private pendingHeroHp = 0;
  /** Companion HP carried the same way, keyed by companion id. */
  private pendingCompanionHp = new Map<string, number>();
  /** First companion of the pre-run squad; its leader skill applies party-wide while it lives. */
  private leaderCompanionId: string | null = null;
  /** Traits for the current Echo wave, or null on any normal wave. */
  private echoTraits: MonsterTraits | null = null;

  constructor(
    heroDef: HeroDefinition,
    seed = 1,
    metaBonuses: MetaBonuses = DEFAULT_META_BONUSES,
    startingEquipment: Partial<EquippedItems> = {},
    unlockedCompanionIds: Iterable<string> = allCompanions.map((c) => c.id),
    /**
     * Squad chosen before the run (see `SquadSelect`). The first id is the leader — its
     * `leaderSkill` applies party-wide while it lives. Empty keeps the pre-squad behavior of
     * discovering companions purely through loot, which is still a valid way to play: bringing
     * fewer companions leaves roster slots open, so companion loot options keep appearing.
     */
    startingCompanionIds: string[] = [],
  ) {
    this.heroDef = heroDef;
    this.rng = new Rng(seed);
    this.brokenPartsRng = new Rng(seed + 90210);
    this.affixRng = new Rng(seed + 13377);
    this.seed = seed;
    this.metaBonuses = metaBonuses;
    this.unlockedCompanionIds = new Set(unlockedCompanionIds);
    this.state = {
      waveNumber: 0,
      heroProgress: { level: 1, xp: 0 },
      isGameOver: false,
      endReason: 'death',
      killedBy: null,
      monsterTier: 'normal',
      monsterName: '',
      isEcho: false,
      monsterAffix: null,
      echoRecord: null,
      monsterGroupSize: 1,
      emptyCompanionSlots: MAX_ACTIVE_COMPANIONS,
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
    this.state.companions = startingCompanionIds
      .slice(0, MAX_ACTIVE_COMPANIONS)
      .filter((id) => this.unlockedCompanionIds.has(id) && companionRegistry.tryGet(id) !== undefined)
      .map((id) => ({ id, hp: companionRegistry.get(id).maxHp }));
    this.leaderCompanionId = this.state.companions[0]?.id ?? null;

    this.engine = this.buildWaveEngine(1);
  }

  /** The squad leader's id, or null when the run started with no chosen squad. */
  getLeaderCompanionId(): string | null {
    return this.leaderCompanionId;
  }

  /** Forwards a player-timed Brave Burst to the active fight. No-op unless the gauge is armed. */
  triggerBurst(): WaveEvent[] {
    if (this.state.isGameOver || this.state.isChoosingLoot) return [];
    const events = this.engine.triggerBurst().map((event) => ({ type: 'combat', event }) as WaveEvent);

    // A manual burst can end the fight outright, so it goes through the same wave-cleared path a
    // normal killing blow would rather than waiting for the next tick to notice.
    const combatEnd = this.engine.getState().isOver;
    if (combatEnd && events.length > 0 && this.engine.getState().winnerId === this.heroDef.id) {
      this.handleWaveCleared(events);
    }
    return events;
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
        this.state.killedBy = {
          name: this.state.monsterName,
          isEcho: this.state.isEcho,
          echoRecord: this.state.echoRecord,
        };
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

    const monster = primaryMonster(this.engine.getState()) ?? (this.engine.getState().monsters[0] as Combatant);
    events.push({
      type: 'waveStarted',
      waveNumber: this.state.waveNumber,
      monster: {
        id: monster.id,
        name: monster.name,
        tier: this.state.monsterTier,
        maxHp: monster.maxHp,
        attack: monster.attack,
        isEcho: this.state.isEcho,
        element: monster.element,
        affix: this.state.monsterAffix,
        echoRecord: this.state.echoRecord,
      },
      zone: { id: this.state.zoneId, name: this.state.zoneName, isNewZone: this.state.zoneId !== previousZoneId },
    });

    return events;
  }

  /** Lets the player voluntarily end an otherwise-endless run — cashes out exactly like a normal death via the same `runOver` event/currency-deposit path. */
  abandonRun(): WaveEvent[] {
    if (this.state.isGameOver) return [];

    this.state.isGameOver = true;
    this.state.endReason = 'abandoned';
    this.state.isChoosingLoot = false;
    this.state.lootOptions = [];
    return [{ type: 'runOver', waveNumber: this.state.waveNumber }];
  }

  private handleWaveCleared(events: WaveEvent[]): void {
    const clearedWave = this.state.waveNumber;
    const modifiers = this.computeModifiers();
    // Every enemy in the wave pays out, so clearing a group is worth more than clearing a solo
    // wave — otherwise a harder wave would reward the same as an easier one.
    const baseXp = this.currentMonsterDefs().reduce((sum, def) => sum + def.xpReward, 0);
    const xpGained = Math.round(baseXp * (1 + modifiers.xpMultiplierSum));
    events.push({ type: 'waveCleared', waveNumber: clearedWave, xpGained });

    const { progress, levelsGained } = applyXpGain(this.state.heroProgress, xpGained);
    this.state.heroProgress = progress;
    if (levelsGained > 0) {
      events.push({ type: 'levelUp', newLevel: progress.level });
    }

    if (this.state.isEcho) {
      events.push({ type: 'echoDefeated', record: this.buildEchoRecord() });
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
    const hero = buildCombatant(this.heroDef.id, this.heroDef.name, revivedHp, maxHp, levelStats.attack, attackIntervalMs, this.heroDef.element);

    // Phoenix revive rebuilds the fight in place; every surviving enemy keeps its current HP.
    const revivedMonsters = this.engine.getState().monsters.map((current) =>
      buildCombatant(current.id, current.name, current.hp, current.maxHp, current.attack, current.attackIntervalMs, current.element),
    );

    const { allies, spellCasters } = this.buildAlliesAndSpells(modifiers);

    this.seed += 1;
    this.engine = new CombatEngine(
      hero,
      revivedMonsters,
      this.seed,
      modifiers,
      allies,
      spellCasters,
      this.computeConditionals(),
      this.runConditionContext(),
      this.echoTraits ?? this.state.monsterAffix?.traits ?? {},
    );
    events.push({ type: 'revived' });
    return true;
  }

  /**
   * Chooses a past run to resurrect as this wave's Echo, or null to mirror the current build.
   * Uses the main rng stream deliberately: which Echo you face is part of the run's shape, not a
   * side roll, and a seeded run should reproduce it.
   */
  private pickLadderEcho(waveNumber: number): EchoRecord | null {
    const ladder = this.metaBonuses.echoLadder;
    if (ladder.length === 0 || waveNumber < ECHO_LADDER_MIN_WAVE) return null;
    if (this.rng.next() >= ECHO_LADDER_CHANCE) return null;
    const index = Math.min(ladder.length - 1, Math.floor(this.rng.next() * ladder.length));
    return ladder[index] ?? null;
  }

  /**
   * Decides how many enemies this wave spawns. Uses the affix stream rather than the main one so
   * adding group waves does not shift the monster-pick or loot-roll sequences of existing seeds.
   */
  private rollGroupSize(waveNumber: number, tier: MonsterTier): number {
    if (tier !== 'normal' || waveNumber < GROUP_MIN_WAVE) return 1;

    const chance = Math.min(GROUP_MAX_CHANCE, GROUP_BASE_CHANCE + (waveNumber - GROUP_MIN_WAVE) * GROUP_CHANCE_PER_WAVE);
    if (this.affixRng.next() >= chance) return 1;
    return this.affixRng.next() < THIRD_ENEMY_CHANCE ? Math.min(MAX_GROUP_SIZE, 3) : 2;
  }

  /** Snapshots the build that just beat an Echo, as ratios against the mirror it faced. */
  private buildEchoRecord(): EchoRecord {
    const modifiers = this.computeModifiers();
    const levelStats = statsForLevel(this.heroDef, this.state.heroProgress.level);
    const maxHp = Math.round(levelStats.maxHp * (1 + modifiers.maxHpBonusPercentSum));
    const attack = (levelStats.attack + modifiers.flatDamageBonusSum) * (1 + modifiers.damageMultiplierSum);
    const monster = primaryMonster(this.engine.getState()) ?? (this.engine.getState().monsters[0] as Combatant);

    // Ratios against the Echo that was actually fought, so a record replayed at a deeper wave
    // still describes *how* that build fought rather than how big its numbers happened to be.
    const mirrorAttack = Math.max(1, attack * ECHO_POWER_FRACTION);
    const mirrorHp = Math.max(1, maxHp * ECHO_POWER_FRACTION);

    return {
      classId: this.heroDef.id,
      className: this.heroDef.name,
      element: this.heroDef.element,
      wave: this.state.waveNumber,
      level: this.state.heroProgress.level,
      attackRatio: monster.maxHp > 0 ? monster.attack / mirrorAttack : 1,
      hpRatio: monster.maxHp / mirrorHp,
      attackIntervalMs: Math.round(levelStats.attackIntervalMs / (1 + modifiers.attackSpeedMultiplierSum)),
      critChance: modifiers.critChanceSum,
      critDamageMultiplier: modifiers.critDamageMultiplierSum,
      lifestealPercent: modifiers.lifestealPercentSum,
    };
  }

  /** Re-derives the content definitions for every enemy in the active wave. */
  private currentMonsterDefs(): MonsterDefinition[] {
    return this.engine.getState().monsters.map((monster) => this.monsterDefFor(monster));
  }

  /** Re-derives the content definition backing one live enemy. */
  private monsterDefFor(monster: Combatant): MonsterDefinition {
    if (monster.id.startsWith(ECHO_ID)) {
      // Not a bestiary entry — synthesize just enough of a definition to award tier-appropriate XP.
      return {
        id: ECHO_ID,
        name: monster.name,
        tier: this.state.monsterTier,
        element: monster.element ?? 'light',
        maxHp: monster.maxHp,
        attack: monster.attack,
        attackIntervalMs: monster.attackIntervalMs,
        xpReward: ECHO_XP_REWARD_BY_TIER[this.state.monsterTier],
      };
    }
    // Group members carry a `#n` suffix so each has a unique combat id; the bestiary key is the
    // part before it.
    const defId = monster.id.split('#')[0] as string;
    const found = allMonsters.find((m) => m.id === defId);
    if (!found) {
      throw new Error(`Unknown monster id in active combat: ${monster.id}`);
    }
    return found;
  }

  /**
   * Conditionals currently come from relics alone. Equipment/talents/class stay purely additive on
   * purpose: the combo layer is worth much more when a bounded, curated set of sources feeds it —
   * spreading it across every content type would put the product term on almost every run and turn
   * an interaction into a baseline.
   */
  private computeConditionals(): ConditionalModifier[] {
    return collectConditionals(
      this.state.ownedRelics.map((owned) => ({ conditionals: relicRegistry.get(owned.id).conditionals, count: owned.count })),
    );
  }

  /** Per-wave snapshot of run-level facts the conditional predicates read. */
  private runConditionContext(): RunConditionContext {
    return {
      relicCount: this.state.ownedRelics.length,
      wavesCleared: Math.max(0, this.state.waveNumber - 1),
      squadElements: this.state.companions
        .filter((owned) => owned.hp > 0)
        .map((owned) => companionRegistry.get(owned.id).element),
    };
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
    const kingdomSource: ModifierSource = { modifiers: this.metaBonuses.kingdomModifiers, count: 1 };

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

    const leader = this.leaderCompanionId
      ? this.state.companions.find((owned) => owned.id === this.leaderCompanionId && owned.hp > 0)
      : undefined;
    const leaderSkill = leader ? companionRegistry.get(leader.id).leaderSkill : undefined;
    const leaderSources: ModifierSource[] = leaderSkill ? [{ modifiers: leaderSkill.modifiers, count: 1 }] : [];

    // Counts living companions, so a party wiped mid-run ramps the hero up as it happens rather
    // than only at squad-selection time.
    const livingCompanions = this.state.companions.filter((owned) => owned.hp > 0).length;
    const solitudeModifiers = resolveSolitudeModifiers(livingCompanions, MAX_ACTIVE_COMPANIONS);
    this.state.emptyCompanionSlots = MAX_ACTIVE_COMPANIONS - livingCompanions;
    const solitudeSources: ModifierSource[] = solitudeModifiers.length > 0 ? [{ modifiers: solitudeModifiers, count: 1 }] : [];

    const brokenBladeSources: ModifierSource[] = this.state.ownedRelics.some((owned) => owned.id === BROKEN_BLADE_ID)
      ? [
          {
            modifiers: [{ kind: 'damageMultiplier', value: Math.min(this.state.brokenParts, BROKEN_BLADE_PART_CAP) * BROKEN_BLADE_PER_PART }],
            count: 1,
          },
        ]
      : [];

    return aggregateModifiers([
      ...relicSources,
      ...equipmentSources,
      ...passiveSpellSources,
      ...companionAuraSources,
      ...leaderSources,
      ...solitudeSources,
      ...brokenBladeSources,
      talentSource,
      classSource,
      forgeWeaponSource,
      kingdomSource,
    ]);
  }

  /** Builds this wave's AllyUnit/SpellCaster arrays from the owned roster, applying wave-clear healing per companion. */
  private buildAlliesAndSpells(modifiers: AggregatedModifiers): { allies: AllyUnit[]; spellCasters: SpellCaster[] } {
    const healFraction = WAVE_CLEAR_HEAL_FRACTION + modifiers.regenPerWaveSum;
    const allies: AllyUnit[] = [];

    for (const owned of this.state.companions) {
      const def = companionRegistry.get(owned.id);
      // Relic/equipment/talent bonuses now reach companions too, not just the hero — mirrors buildWaveEngine's hero construction.
      const scaledMaxHp = Math.round(def.maxHp * (1 + modifiers.maxHpBonusPercentSum));
      const scaledIntervalMs = Math.round(def.attackIntervalMs / (1 + modifiers.attackSpeedMultiplierSum));
      const carried = this.pendingCompanionHp.get(owned.id) ?? owned.hp;

      let finalHp = 0;
      if (carried > 0) {
        const beforeHeal = Math.min(scaledMaxHp, carried);
        finalHp = Math.min(scaledMaxHp, beforeHeal + Math.round((scaledMaxHp - beforeHeal) * healFraction));
      }
      owned.hp = finalHp;
      if (finalHp <= 0) continue;

      // Upgrade ranks boost output (attack/healing), not HP — keeps hp bookkeeping in one consistent scale
      // across waves (maxHp never changes for a companion, unlike the hero's level-driven growth).
      const rankBonus = 1 + (this.metaBonuses.companionUpgrades[owned.id] ?? 0) * COMPANION_RANK_BONUS_PER_LEVEL;
      const levelBonus = 1 + (this.state.heroProgress.level - 1) * COMPANION_LEVEL_SCALING_PER_LEVEL;
      const outputBonus = rankBonus * levelBonus;
      const upgradedAttack = Math.round(def.attack * outputBonus);
      const combatant = buildCombatant(def.id, def.name, finalHp, scaledMaxHp, upgradedAttack, scaledIntervalMs, def.element);
      allies.push({
        combatant,
        role: def.role,
        actsIndependently: def.role !== 'support',
        tauntWeight: def.role === 'tank' ? 4 : 1,
        healAmount: Math.round((def.healAmount ?? 0) * outputBonus),
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

    // Hero's real effective stats for this wave — computed before monster selection so an Echo
    // wave can mirror them directly instead of picking from the bestiary.
    const modifiers = this.computeModifiers();
    const levelStats = statsForLevel(this.heroDef, this.state.heroProgress.level);
    const maxHp = Math.round(levelStats.maxHp * (1 + modifiers.maxHpBonusPercentSum));
    const attackIntervalMs = Math.round(levelStats.attackIntervalMs / (1 + modifiers.attackSpeedMultiplierSum));

    this.state.isEcho = waveNumber > 0 && waveNumber % ECHO_WAVE_INTERVAL === 0;

    let monsters: Combatant[];
    if (this.state.isEcho) {
      // The live mirror: what the hero itself fights with this wave, at ECHO_POWER_FRACTION.
      const mirrorAttack = Math.max(1, Math.round((levelStats.attack + modifiers.flatDamageBonusSum) * (1 + modifiers.damageMultiplierSum) * ECHO_POWER_FRACTION));
      const mirrorMaxHp = Math.max(1, Math.round(maxHp * ECHO_POWER_FRACTION));

      const record = this.pickLadderEcho(waveNumber);
      this.state.echoRecord = record;

      const echoAttack = record ? Math.max(1, Math.round(mirrorAttack * record.attackRatio)) : mirrorAttack;
      const echoMaxHp = record ? Math.max(1, Math.round(mirrorMaxHp * record.hpRatio)) : mirrorMaxHp;
      const echoInterval = record ? record.attackIntervalMs : attackIntervalMs;
      const echoElement = record ? record.element : this.heroDef.element;
      const echoName = record ? `Echo of ${record.className}, wave ${record.wave}` : `Echo of ${this.heroDef.name}`;

      this.state.monsterName = echoName;
      this.state.monsterElement = echoElement;
      // The Echo deliberately never rolls an affix: its whole premise is being an exact readout of
      // a build, and a bolted-on modifier would break that reading.
      this.state.monsterAffix = null;
      // The Echo now fights with the hero's own crit and lifesteal profile, not just raw numbers.
      // It routes through MonsterTraits rather than the party modifier pipeline, so the Phase 3
      // boundary holds — the mirror gets its own copy of the numbers, not a shared reference.
      this.state.monsterGroupSize = 1;
      this.echoTraits = {
        critChance: (record ? record.critChance : modifiers.critChanceSum) * ECHO_POWER_FRACTION,
        critDamageMultiplier: record ? record.critDamageMultiplier : modifiers.critDamageMultiplierSum,
        lifestealPercent: (record ? record.lifestealPercent : modifiers.lifestealPercentSum) * ECHO_POWER_FRACTION,
      };
      monsters = [buildCombatant(ECHO_ID, echoName, echoMaxHp, echoMaxHp, echoAttack, echoInterval, echoElement)];
    } else {
      this.state.echoRecord = null;
      this.echoTraits = null;
      const tierPool = TIER_POOLS[tier];
      const pool = monsterPoolForWave(waveNumber, tierPool);
      const def = pickFrom(pool, this.rng);
      this.state.monsterName = def.name;
      this.state.monsterElement = def.element;
      const affix = rollWaveAffix(waveNumber, tier, this.affixRng);
      this.state.monsterAffix = affix;

      const groupSize = this.rollGroupSize(waveNumber, tier);
      const statScale = GROUP_STAT_SCALE[groupSize] ?? 1;
      const scaled = scaledMonsterStats(def, waveNumber);

      const affixedHp = Math.max(1, Math.round(scaled.maxHp * (affix?.hpMultiplier ?? 1) * statScale));
      const affixedAttack = Math.max(1, Math.round(scaled.attack * (affix?.attackMultiplier ?? 1) * statScale));
      const affixedInterval = Math.max(120, Math.round(def.attackIntervalMs * (affix?.attackIntervalMultiplier ?? 1)));

      const baseName = affix ? `${affix.name} ${def.name}` : def.name;
      this.state.monsterName = groupSize > 1 ? `${baseName} x${groupSize}` : baseName;
      this.state.monsterGroupSize = groupSize;

      monsters = Array.from({ length: groupSize }, (_, index) =>
        buildCombatant(
          // Each group member needs a unique combat id (the renderer and the event stream key off
          // it); `monsterDefFor` strips the suffix back off to find the bestiary entry.
          groupSize > 1 ? `${def.id}#${index}` : def.id,
          baseName,
          affixedHp,
          affixedHp,
          affixedAttack,
          // Stagger the pack's opening swings so three enemies don't land as one simultaneous
          // spike on the first exchange.
          affixedInterval,
          def.element,
          index * Math.round(affixedInterval / Math.max(1, groupSize)),
        ),
      );
    }

    let heroHp = maxHp;
    if (carriedHeroHp !== undefined) {
      const beforeHeal = Math.min(maxHp, Math.max(0, carriedHeroHp));
      const healFraction = WAVE_CLEAR_HEAL_FRACTION + modifiers.regenPerWaveSum;
      heroHp = Math.min(maxHp, beforeHeal + Math.round((maxHp - beforeHeal) * healFraction));
    }

    const hero = buildCombatant(this.heroDef.id, this.heroDef.name, heroHp, maxHp, levelStats.attack, attackIntervalMs, this.heroDef.element);
    const { allies, spellCasters } = this.buildAlliesAndSpells(modifiers);

    this.seed += 1;
    return new CombatEngine(
      hero,
      monsters,
      this.seed,
      modifiers,
      allies,
      spellCasters,
      this.computeConditionals(),
      this.runConditionContext(),
      this.echoTraits ?? this.state.monsterAffix?.traits ?? {},
    );
  }
}
