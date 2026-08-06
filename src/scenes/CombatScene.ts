import Phaser from 'phaser';
import { primaryMonster } from '../engine/CombatEngine';
import { playSfx } from '../audio/sfx';
import { WaveManager, type EquippedItems, type MetaBonuses, type WaveEvent } from '../engine/WaveManager';
import type { LootOption } from '../engine/loot';
import { scaleHeroDefinition, xpForNextLevel } from '../engine/heroProgression';
import { resolveLootLuckBonus, resolveTalentModifiers } from '../engine/talents';
import type { CombatEvent } from '../engine/types';
import { knight } from '../data/hero';
import type { MonsterTier } from '../data/monster.types';
import type { CompanionRole } from '../data/companion.types';
import { relicRegistry } from '../data/relics';
import { equipmentRegistry } from '../data/equipment';
import { allCompanions, companionRegistry } from '../data/companions';
import { allMonsters } from '../data/monsters';
import { spellRegistry } from '../data/spells';
import { allClasses, classRegistry, knightClass } from '../data/classes';
import { allZones } from '../data/zones';
import { continentForZone } from '../data/continents';
import { resolveForgeWeaponModifiers } from '../data/forgeWeapon';
import { resolveKingdomModifiers } from '../engine/kingdom';
import { useRunStore } from '../store/runStore';
import type { EquippedDisplay } from '../store/runStore';
import { useMetaStore } from '../store/metaStore';

const ASSET_BASE = 'game-assets';
const heroTextureKey = (classId: string) => `hero_${classId}`;
const heroAttackTextureKey = (classId: string) => `hero_${classId}_attack`;
const monsterTextureKey = (id: string) => `monster_${id}`;
const monsterAttackTextureKey = (id: string) => `monster_${id}_attack`;
const companionTextureKey = (id: string) => `companion_${id}`;
const companionAttackTextureKey = (id: string) => `companion_${id}_attack`;
const zoneTextureKey = (id: string) => `zone_${id}`;

const HERO_COLOR = 0x3b82c4;
/** Shadow-purple wash applied to the hero's own sprite when it's reused for an Echo encounter. */
const ECHO_TINT = 0x6a4fd1;
const HERO_SIZE = { width: 130, height: 150 };

const MONSTER_APPEARANCE: Record<MonsterTier, { color: number; width: number; height: number }> = {
  normal: { color: 0xc0392b, width: 120, height: 130 },
  miniboss: { color: 0xe67e22, width: 150, height: 160 },
  boss: { color: 0x8e2de2, width: 175, height: 190 },
  megaboss: { color: 0x7a0c0c, width: 210, height: 220 },
  ultraboss: { color: 0xf1c40f, width: 240, height: 250 },
};

/** Per-monster scale tweak layered on top of the tier's base size, so a few standouts read as bigger/smaller than their tier peers. */
const MONSTER_SPRITE_SCALE: Record<string, number> = {
  giant_rat: 0.8,
  bat: 0.85,
  swamp_troll: 1.15,
  troll_berserker: 1.1,
  inferno_golem: 1.2,
  ancient_wyrm: 1.15,
  frost_lich: 1.1,
};

const ZONE_BACKGROUND: Record<string, number> = Object.fromEntries(allZones.map((zone) => [zone.id, zone.backgroundColor]));
const DEFAULT_BACKGROUND = 0x1d1d1d;
const GAME_WIDTH = 800;
const GAME_HEIGHT = 450;
const ZONE_SCRIM_ALPHA = 0.35;

const ATTACK_LUNGE_DISTANCE = 34;
/** HUD refresh cadence. Fast enough to read as live, slow enough to stop dominating the frame. */
const HUD_SNAPSHOT_INTERVAL_MS = 66;
const ATTACK_LUNGE_OUT_MS = 130;
const ATTACK_LUNGE_BACK_MS = 160;
const HIT_SHAKE_DISTANCE = 7;
const HIT_SHAKE_DURATION_MS = 55;
const HIT_FLASH_MS = 130;
const IMPACT_BURST_MS = 220;
const DEATH_FADE_DURATION_MS = 420;
const SPAWN_IN_DURATION_MS = 320;
const IDLE_BOB_AMPLITUDE = 5;
const IDLE_BOB_DURATION_MS = 1100;
const CAMERA_SHAKE_HIT_MS = 70;
const CAMERA_SHAKE_HIT_INTENSITY = 0.0025;
const CAMERA_SHAKE_CRIT_MS = 140;
const CAMERA_SHAKE_CRIT_INTENSITY = 0.007;

const COMPANION_ROLE_COLOR: Record<CompanionRole, number> = {
  tank: 0x34495e,
  dps: 0xd35400,
  healer: 0x27ae60,
  support: 0x8e44ad,
  summoner: 0x16a085,
};

const HP_BAR_WIDTH = 160;
const HP_BAR_HEIGHT = 12;
const ATB_BAR_HEIGHT = 5;
const COMPANION_BAR_WIDTH = 64;
const COMPANION_BAR_HEIGHT = 7;

/** Party clustered bottom-left in a small diagonal formation (front hero + staggered allies behind), single enemy front-right — the classic FFBE-style facing arrangement. */
const HERO_X = 250;
const HERO_Y = 300;
const MONSTER_X = 570;
const MONSTER_Y = 250;
/**
 * Where a wave's enemies stand, by group size. A solo enemy keeps the exact centre-right spot it
 * always had, so single-enemy waves — every boss, miniboss and Echo — look untouched; groups fan
 * out into a readable diagonal that mirrors the party's own formation on the left.
 */
const MONSTER_SLOTS: Record<number, { x: number; y: number }[]> = {
  1: [{ x: MONSTER_X, y: MONSTER_Y }],
  2: [
    { x: 545, y: 300 },
    { x: 655, y: 215 },
  ],
  3: [
    { x: 520, y: 320 },
    { x: 615, y: 250 },
    { x: 700, y: 190 },
  ],
};
/** Group members render smaller than a solo enemy so three of them still fit and stay legible. */
const MONSTER_GROUP_SCALE: Record<number, number> = { 1: 1, 2: 0.82, 3: 0.68 };
const COMPANION_SLOTS = [
  { x: 130, y: 225 },
  { x: 150, y: 345 },
  { x: 70, y: 285 },
];
const COMPANION_SIZE = { width: 46, height: 66 };

interface UnitView {
  body: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  shadow: Phaser.GameObjects.Ellipse;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBarFill: Phaser.GameObjects.Rectangle;
  atbBarBg: Phaser.GameObjects.Rectangle;
  atbBarFill: Phaser.GameObjects.Rectangle;
  hpLabel: Phaser.GameObjects.Text;
  idleTween: Phaser.Tweens.Tween | null;
  /** The unit's persistent tint (e.g. a class color), restored after a hit-flash's temporary white tintFill. */
  restTint: number;
  /** Home position the attack lunge tween returns to; the hp bar/label stay pinned here regardless of the body's lunge offset. */
  baseX: number;
  baseY: number;
  /** Texture keys for the idle/attack frames (attack may be undefined/not-yet-generated) — attackLunge swaps between them. */
  idleTextureKey?: string;
  attackTextureKey?: string;
  /** The unit's bounding box, reapplied via applyContainFit whenever the body's texture is swapped. */
  boxWidth: number;
  boxHeight: number;
}

export class CombatScene extends Phaser.Scene {
  private waveManager!: WaveManager;
  private heroView!: UnitView;
  private monsterViews: UnitView[] = [];
  private allyViews: UnitView[] = [];
  private zoneBackdrop: Phaser.GameObjects.Image | null = null;
  private zoneScrim: Phaser.GameObjects.Rectangle | null = null;
  private lastLootChoiceToken = 0;
  private lastAbandonRunToken = 0;
  private lastBurstToken = 0;
  /**
   * Wall-clock of the last HUD snapshot. The snapshot rebuilds four arrays and re-renders every
   * subscribed React component; at 60fps that is the single largest source of allocation and
   * render work in the game, for numbers a player cannot read faster than ~15Hz anyway. State
   * changes that matter (loot offered, wave started, run over) push immediately regardless.
   */
  private lastSnapshotAt = 0;
  private heroTint = 0xffffff;
  private heroClassId = 'knight';
  /** Set by a critHit event, consumed by the attack event that immediately follows it (CombatEngine always emits them in that order). */
  private pendingCrit = false;
  private heroClassName = 'Knight';

  constructor() {
    super('CombatScene');
  }

  preload(): void {
    for (const classDef of allClasses) {
      this.load.image(heroTextureKey(classDef.id), `${ASSET_BASE}/hero/${classDef.id}.png`);
      this.load.image(heroAttackTextureKey(classDef.id), `${ASSET_BASE}/hero/${classDef.id}_attack.png`);
    }
    for (const monster of allMonsters) {
      this.load.image(monsterTextureKey(monster.id), `${ASSET_BASE}/monsters/${monster.id}.png`);
      this.load.image(monsterAttackTextureKey(monster.id), `${ASSET_BASE}/monsters/${monster.id}_attack.png`);
    }
    for (const companion of allCompanions) {
      this.load.image(companionTextureKey(companion.id), `${ASSET_BASE}/companions/${companion.id}.png`);
      this.load.image(companionAttackTextureKey(companion.id), `${ASSET_BASE}/companions/${companion.id}_attack.png`);
    }
    for (const zone of allZones) {
      this.load.image(zoneTextureKey(zone.id), `${ASSET_BASE}/zones/${zone.id}.png`);
    }
  }

  create(): void {
    this.lastLootChoiceToken = useRunStore.getState().lootChoiceRequest?.token ?? 0;
    this.lastAbandonRunToken = useRunStore.getState().abandonRunRequest?.token ?? 0;
    this.lastBurstToken = useRunStore.getState().burstRequest?.token ?? 0;
    this.startNewRun();
  }

  update(_time: number, delta: number): void {
    const store = useRunStore.getState();

    if (store.abandonRunRequest && store.abandonRunRequest.token !== this.lastAbandonRunToken) {
      this.lastAbandonRunToken = store.abandonRunRequest.token;
      const events = this.waveManager.abandonRun();
      this.handleEvents(events);
      this.syncUnitViews();
      this.pushSnapshotToStore();
      return;
    }

    if (store.burstRequest && store.burstRequest.token !== this.lastBurstToken) {
      this.lastBurstToken = store.burstRequest.token;
      // A manual burst resolves immediately rather than waiting for the next tick, so the
      // player's input and the on-screen impact land in the same frame.
      this.handleEvents(this.waveManager.triggerBurst());
    }

    if (store.lootChoiceRequest && store.lootChoiceRequest.token !== this.lastLootChoiceToken) {
      this.lastLootChoiceToken = store.lootChoiceRequest.token;
      const events = this.waveManager.chooseLoot(store.lootChoiceRequest.index);
      this.handleEvents(events);
      this.syncUnitViews();
      this.pushSnapshotToStore();
      return;
    }

    const events = this.waveManager.tick(delta * store.speed);
    this.handleEvents(events);
    this.syncUnitViews();
    // A wave boundary or a run ending must reach the HUD on the frame it happens; everything
    // else is just numbers ticking down and can ride the throttle.
    if (events.length > 0) this.pushSnapshotToStore();
    else this.pushSnapshotThrottled();
  }

  private buildMetaBonuses(classModifiers: MetaBonuses['classModifiers']): MetaBonuses {
    const meta = useMetaStore.getState();
    return {
      talentModifiers: resolveTalentModifiers(meta.talentRanks),
      lootLuckBonus: resolveLootLuckBonus(meta.talentRanks),
      forgeLevel: meta.forgeLevel,
      companionUpgrades: meta.companionUpgrades,
      classModifiers,
      forgeWeaponModifiers: resolveForgeWeaponModifiers(meta.forgeWeaponLevel),
      kingdomModifiers: resolveKingdomModifiers({
        conqueredTerritoryIds: meta.conqueredTerritoryIds,
        recruitedLordIds: meta.recruitedLordIds,
        treasuryLevel: meta.treasuryLevel,
      }),
      echoLadder: meta.echoLadder,
    };
  }

  private startNewRun(): void {
    const meta = useMetaStore.getState();
    const classDef = classRegistry.tryGet(meta.selectedClassId ?? '') ?? knightClass;
    this.heroTint = classDef.tint;
    this.heroClassName = classDef.name;
    this.heroClassId = classDef.id;

    const scaledHero = scaleHeroDefinition(knight, classDef.statMultiplier, classDef.element);
    const startingEquipment: Partial<EquippedItems> = meta.startingWeapon
      ? { weapon: { defId: meta.startingWeapon.defId, rarity: meta.startingWeapon.rarity } }
      : {};

    this.waveManager = new WaveManager(
      scaledHero,
      Date.now(),
      this.buildMetaBonuses(classDef.innateModifiers),
      startingEquipment,
      meta.unlockedCompanionIds,
      meta.selectedCompanionIds,
    );

    const state = this.waveManager.getCombatState();
    // Group members share one bestiary entry; discover by definition id, not combat id.
    for (const monster of state.monsters) {
      useMetaStore.getState().discover('monster', monster.id.split('#')[0] as string);
    }

    if (this.heroView) this.destroyUnitView(this.heroView);
    this.monsterViews.forEach((view) => this.destroyUnitView(view));
    this.monsterViews = [];
    this.allyViews.forEach((view) => this.destroyUnitView(view));
    this.allyViews = [];

    this.heroView = this.createUnitView(
      HERO_X,
      HERO_Y,
      HERO_SIZE.width,
      HERO_SIZE.height,
      HERO_COLOR,
      heroTextureKey(this.heroClassId),
      undefined,
      undefined,
      this.heroTint,
      heroAttackTextureKey(this.heroClassId),
    );
    this.updateUnitView(this.heroView, state.hero.name, state.hero.hp, state.hero.maxHp);
    this.rebuildMonsterView();
    this.rebuildAllyViews();
    this.applyZoneBackground();
    this.pushSnapshotToStore();
  }

  private applyZoneBackground(): void {
    const zoneId = this.waveManager.getRunState().zoneId;
    // Solid color always applied first — the permanent fallback if that zone's backdrop art is missing.
    this.cameras.main.setBackgroundColor(ZONE_BACKGROUND[zoneId] ?? DEFAULT_BACKGROUND);

    const textureKey = zoneTextureKey(zoneId);
    if (!this.textures.exists(textureKey)) {
      this.zoneBackdrop?.setVisible(false);
      this.zoneScrim?.setVisible(false);
      return;
    }

    if (!this.zoneBackdrop) {
      this.zoneBackdrop = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, textureKey).setDepth(-1000);
      this.zoneBackdrop.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
      this.zoneScrim = this.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, ZONE_SCRIM_ALPHA)
        .setDepth(-999);
    } else {
      this.zoneBackdrop.setTexture(textureKey).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setVisible(true);
      this.zoneScrim?.setVisible(true);
    }
  }

  private rebuildMonsterView(): void {
    this.monsterViews.forEach((view) => this.destroyUnitView(view));
    this.monsterViews = [];
    const state = this.waveManager.getCombatState();
    const runState = this.waveManager.getRunState();
    const appearance = MONSTER_APPEARANCE[runState.monsterTier];
    const count = Math.max(1, state.monsters.length);
    const slots = MONSTER_SLOTS[count] ?? MONSTER_SLOTS[3] ?? [{ x: MONSTER_X, y: MONSTER_Y }];
    const groupScale = MONSTER_GROUP_SCALE[count] ?? 0.68;

    state.monsters.forEach((monster, index) => {
      // Group members share one bestiary entry, so the art key is the id with its `#n` suffix off.
      const defId = monster.id.split('#')[0] as string;
      const scale = (MONSTER_SPRITE_SCALE[defId] ?? 1) * groupScale;
      // An Echo has no bestiary art of its own — it's a mirror of the hero, so it wears the hero's
      // own sprite (tinted shadow-purple) instead of falling back to the generic rectangle.
      const textureKey = runState.isEcho ? heroTextureKey(this.heroClassId) : monsterTextureKey(defId);
      const attackTextureKey = runState.isEcho ? heroAttackTextureKey(this.heroClassId) : monsterAttackTextureKey(defId);
      const slot = slots[Math.min(index, slots.length - 1)] as { x: number; y: number };

      const view = this.createUnitView(
        slot.x,
        slot.y,
        Math.round(appearance.width * scale),
        Math.round(appearance.height * scale),
        appearance.color,
        textureKey,
        undefined,
        undefined,
        runState.isEcho ? ECHO_TINT : undefined,
        attackTextureKey,
      );
      if ('setFlipX' in view.body) view.body.setFlipX(true);
      this.updateUnitView(view, monster.name, monster.hp, monster.maxHp);
      this.monsterViews.push(view);
    });
  }

  private isMonsterId(id: string): boolean {
    return this.waveManager.getCombatState().monsters.some((monster) => monster.id === id);
  }

  /** Screen position of the wave's current focus target, for callouts that point at "the enemy". */
  private focusPosition(): { x: number; y: number } {
    const state = this.waveManager.getCombatState();
    const index = state.monsters.findIndex((monster) => monster.hp > 0);
    const view = this.monsterViews[index >= 0 ? index : 0];
    return view ? { x: view.baseX, y: view.baseY } : { x: MONSTER_X, y: MONSTER_Y };
  }

  private rebuildAllyViews(): void {
    this.allyViews.forEach((view) => this.destroyUnitView(view));
    this.allyViews = [];

    const allies = this.waveManager.getCombatState().allies;
    allies.forEach((ally, index) => {
      const slot = COMPANION_SLOTS[index] ?? COMPANION_SLOTS[COMPANION_SLOTS.length - 1] ?? { x: HERO_X, y: HERO_Y };
      const color = COMPANION_ROLE_COLOR[ally.role];
      const view = this.createUnitView(
        slot.x,
        slot.y,
        COMPANION_SIZE.width,
        COMPANION_SIZE.height,
        color,
        companionTextureKey(ally.combatant.id),
        COMPANION_BAR_WIDTH,
        COMPANION_BAR_HEIGHT,
        undefined,
        companionAttackTextureKey(ally.combatant.id),
      );
      this.updateUnitView(view, ally.combatant.name, ally.combatant.hp, ally.combatant.maxHp, COMPANION_BAR_WIDTH);
      this.allyViews.push(view);
    });
  }

  private handleEvents(events: WaveEvent[]): void {
    for (const event of events) {
      if (event.type === 'combat') {
        this.handleCombatEvent(event.event);
      }
      if (event.type === 'waveStarted') {
        this.rebuildMonsterView();
        this.rebuildAllyViews();
        if (!event.monster.isEcho) useMetaStore.getState().discover('monster', event.monster.id);
        if (event.monster.isEcho) {
          const record = event.monster.echoRecord;
          this.showFloatingText(
            400,
            34,
            record ? `THE ${record.className.toUpperCase()} OF WAVE ${record.wave} RETURNS...` : 'AN ECHO OF YOURSELF STIRS...',
            '#b39dff',
            18,
          );
          playSfx('echo');
        }
        if (event.monster.affix) {
          this.showFloatingText(this.focusPosition().x, this.focusPosition().y - 210, event.monster.affix.name.toUpperCase(), event.monster.affix.color, 18);
        }
        if (event.zone.isNewZone) {
          this.applyZoneBackground();
          const continent = continentForZone(event.zone.id);
          const isFirstZoneOfContinent = continent?.zoneIds[0] === event.zone.id;
          if (continent && isFirstZoneOfContinent) {
            this.showFloatingText(400, 26, continent.name.toUpperCase(), '#e8b64c', 20);
            this.showFloatingText(400, 52, event.zone.name, '#f3f4f6', 16);
          } else {
            this.showFloatingText(400, 34, `Entering ${event.zone.name}`, '#f3f4f6', 18);
          }
        }
      }
      if (event.type === 'levelUp') {
        this.showFloatingText(HERO_X, HERO_Y - 155, 'LEVEL UP!', '#f1c40f', 20);
        playSfx('levelUp');
      }
      if (event.type === 'revived') {
        this.showFloatingText(HERO_X, HERO_Y - 155, 'REVIVED!', '#ff3b6b', 20);
      }
      if (event.type === 'brokenPartsDropped') {
        this.showFloatingText(MONSTER_X, MONSTER_Y - 175, `+${event.amount} Broken Parts`, '#b39dff');
      }
      if (event.type === 'lootChosen') {
        this.discoverLootOption(event.option);
        playSfx('loot');
      }
      if (event.type === 'echoDefeated') {
        useMetaStore.getState().recordEchoVictory(event.record);
      }
      if (event.type === 'runOver') {
        playSfx('gameOver');
        useMetaStore.getState().depositCurrency(this.waveManager.getRunState().gold);
        useMetaStore.getState().depositBrokenParts(this.waveManager.getRunState().brokenParts);
      }
    }
  }

  private discoverLootOption(option: LootOption): void {
    const discover = useMetaStore.getState().discover;
    if (option.kind === 'relic') discover('relic', option.relic.id);
    else if (option.kind === 'equipment') discover('equipment', option.equipment.id);
    else if (option.kind === 'companion') discover('companion', option.companion.id);
    else if (option.kind === 'spell') discover('spell', option.spell.id);
  }

  private handleCombatEvent(event: CombatEvent): void {
    const heroId = this.waveManager.getCombatState().hero.id;

    if (event.type === 'attack') {
      const attackerView = this.viewForId(event.attackerId, heroId);
      const targetView = this.viewForId(event.targetId, heroId);
      const wasCrit = this.pendingCrit;
      this.pendingCrit = false;
      if (attackerView) this.attackLunge(attackerView, targetView?.baseX ?? attackerView.baseX);
      const monsterIsAttacker = this.isMonsterId(event.attackerId);
      // Delay the impact (flash/shake/burst/number) until the attacker's lunge actually reaches the target — a real hit-stop beat instead of everything firing at once.
      this.time.delayedCall(ATTACK_LUNGE_OUT_MS, () => {
        if (targetView) this.hitImpact(targetView, event.damage, wasCrit);
        playSfx(wasCrit ? 'crit' : monsterIsAttacker ? 'monsterHit' : 'hit');
      });
    }
    if (event.type === 'death') {
      const view = this.viewForId(event.combatantId, heroId);
      if (view) this.deathAnimation(view);
      playSfx('death');
    }
    if (event.type === 'critHit') {
      this.pendingCrit = true;
      this.showFloatingText(400, 190, 'CRITICAL!', '#ffd23f', 24);
    }
    if (event.type === 'statusProc' && event.kind === 'burn') {
      const pos = this.positionForId(event.targetId, heroId) ?? { x: MONSTER_X, y: MONSTER_Y };
      this.showFloatingText(pos.x + 20, pos.y - 160, `-${event.damage} burn`, '#e67e22');
    }
    if (event.type === 'lifesteal') {
      this.showFloatingText(HERO_X, HERO_Y - 165, `+${event.amount}`, '#2ecc71');
    }
    if (event.type === 'execute') {
      this.showFloatingText(this.focusPosition().x, this.focusPosition().y - 150, 'EXECUTED', '#e74c3c', 20);
    }
    if (event.type === 'reflect') {
      this.showFloatingText(MONSTER_X, MONSTER_Y - 180, `-${event.damage} reflect`, '#9b59b6');
    }
    if (event.type === 'companionHeal') {
      const pos = this.positionForId(event.targetId, heroId);
      if (pos) this.showFloatingText(pos.x, pos.y - 30, `+${event.amount}`, '#2ecc71');
    }
    if (event.type === 'spellCast') {
      const pos = this.positionForId(event.targetId, heroId);
      const color = event.effect === 'heal' ? '#2ecc71' : event.effect === 'burn' ? '#e67e22' : '#9b59b6';
      const prefix = event.effect === 'heal' ? '+' : '-';
      if (pos) this.showFloatingText(pos.x, pos.y - 175, `${prefix}${event.amount}`, color);
    }
    if (event.type === 'affinity') {
      // Only the party's own hits get the callout — echoing it for every monster swing as well
      // would double the on-screen noise for the same piece of information.
      if (!this.isMonsterId(event.attackerId)) {
        const strong = event.affinity === 'strong';
        this.showFloatingText(this.focusPosition().x, this.focusPosition().y - 130, strong ? 'WEAK POINT!' : 'RESISTED', strong ? '#7bffb0' : '#ff8f8f', strong ? 20 : 16);
        playSfx(strong ? 'affinityStrong' : 'affinityWeak');
      }
    }
    if (event.type === 'thorns') {
      const pos = this.positionForId(event.attackerId, heroId) ?? { x: HERO_X, y: HERO_Y };
      this.showFloatingText(pos.x, pos.y - 150, `-${event.damage} thorns`, '#9be07b');
    }
    if (event.type === 'monsterHeal') {
      this.showFloatingText(this.focusPosition().x, this.focusPosition().y - 145, `+${event.amount}`, '#7bffc4', 14);
    }
    if (event.type === 'burstReady') {
      this.showFloatingText(400, 150, 'BRAVE BURST READY', '#ffd84d', 20);
      playSfx('burstReady');
    }
    if (event.type === 'braveBurst') {
      this.playBurstFlourish(event.manual, event.damage);
    }
  }

  /**
   * The squad-wide burst gets the biggest presentation in the game: a full-screen flash, a heavy
   * camera shake and every contributor lunging at once. A manual burst reads louder than the
   * auto-fire so the player can feel that catching the window mattered.
   */
  private playBurstFlourish(manual: boolean, damage: number): void {
    playSfx('burstFire');
    this.cameras.main.shake(manual ? 380 : 240, manual ? 0.022 : 0.013);
    this.cameras.main.flash(manual ? 260 : 160, 255, 232, 138, false);

    const focusX = this.focusPosition().x;
    if (this.heroView) this.attackLunge(this.heroView, focusX);
    this.allyViews.forEach((view, index) => {
      this.time.delayedCall(index * 55, () => this.attackLunge(view, focusX));
    });

    this.showFloatingText(400, 120, manual ? 'BRAVE BURST!' : 'brave burst', '#ffe98a', manual ? 30 : 22);
    this.showFloatingText(this.focusPosition().x, this.focusPosition().y - 195, `-${damage}`, '#ffd84d', manual ? 30 : 24);
  }

  private viewForId(id: string, heroId: string): UnitView | undefined {
    if (id === heroId) return this.heroView;
    const monsterIndex = this.waveManager.getCombatState().monsters.findIndex((monster) => monster.id === id);
    if (monsterIndex >= 0) return this.monsterViews[monsterIndex];
    const allies = this.waveManager.getCombatState().allies;
    const index = allies.findIndex((a) => a.combatant.id === id);
    return index >= 0 ? this.allyViews[index] : undefined;
  }

  private positionForId(id: string, heroId: string): { x: number; y: number } | undefined {
    if (id === heroId) return { x: HERO_X, y: HERO_Y };
    const monsterIndex = this.waveManager.getCombatState().monsters.findIndex((monster) => monster.id === id);
    if (monsterIndex >= 0) {
      const view = this.monsterViews[monsterIndex];
      return view ? { x: view.baseX, y: view.baseY } : { x: MONSTER_X, y: MONSTER_Y };
    }
    const allies = this.waveManager.getCombatState().allies;
    const index = allies.findIndex((a) => a.combatant.id === id);
    if (index < 0) return undefined;
    return COMPANION_SLOTS[index] ?? COMPANION_SLOTS[COMPANION_SLOTS.length - 1] ?? { x: HERO_X, y: HERO_Y };
  }

  /** Fraction (0-1) of the way this combatant is toward its next action — the same per-unit timer the engine already runs, just surfaced as a fillable ATB gauge instead of staying invisible. */
  private atbProgress(nextAttackAt: number, attackIntervalMs: number, elapsedMs: number): number {
    if (attackIntervalMs <= 0) return 1;
    return Phaser.Math.Clamp(1 - (nextAttackAt - elapsedMs) / attackIntervalMs, 0, 1);
  }

  private updateAtbBar(view: UnitView, ratio: number | null, barWidth: number): void {
    const visible = ratio !== null;
    view.atbBarBg.setVisible(visible);
    view.atbBarFill.setVisible(visible);
    if (ratio !== null) view.atbBarFill.width = barWidth * ratio;
  }

  private syncUnitViews(): void {
    const state = this.waveManager.getCombatState();

    this.updateUnitView(this.heroView, state.hero.name, state.hero.hp, state.hero.maxHp);
    this.updateAtbBar(
      this.heroView,
      state.hero.hp > 0 ? this.atbProgress(state.hero.nextAttackAt, state.hero.attackIntervalMs, state.elapsedMs) : null,
      HP_BAR_WIDTH,
    );

    state.monsters.forEach((monster, index) => {
      const view = this.monsterViews[index];
      if (!view) return;
      this.updateUnitView(view, monster.name, monster.hp, monster.maxHp);
      this.updateAtbBar(
        view,
        monster.hp > 0 ? this.atbProgress(monster.nextAttackAt, monster.attackIntervalMs, state.elapsedMs) : null,
        HP_BAR_WIDTH,
      );
    });

    state.allies.forEach((ally, index) => {
      const view = this.allyViews[index];
      if (!view) return;
      this.updateUnitView(view, ally.combatant.name, ally.combatant.hp, ally.combatant.maxHp, COMPANION_BAR_WIDTH);
      const ratio =
        ally.actsIndependently && ally.combatant.hp > 0
          ? this.atbProgress(ally.combatant.nextAttackAt, ally.combatant.attackIntervalMs, state.elapsedMs)
          : null;
      this.updateAtbBar(view, ratio, COMPANION_BAR_WIDTH);
    });
  }

  /** Snapshot on the HUD's own cadence rather than the renderer's. */
  private pushSnapshotThrottled(): void {
    const now = this.time.now;
    if (now - this.lastSnapshotAt < HUD_SNAPSHOT_INTERVAL_MS) return;
    this.lastSnapshotAt = now;
    this.pushSnapshotToStore();
  }

  private pushSnapshotToStore(): void {
    this.lastSnapshotAt = this.time.now;
    const combat = this.waveManager.getCombatState();
    const run = this.waveManager.getRunState();

    const ownedRelics = run.ownedRelics.map((owned) => {
      const def = relicRegistry.get(owned.id);
      return { id: owned.id, name: def.name, rarity: def.rarity, count: owned.count };
    });

    const equipped: EquippedDisplay = {
      weapon: run.equipped.weapon
        ? { name: equipmentRegistry.get(run.equipped.weapon.defId).name, rarity: run.equipped.weapon.rarity }
        : null,
      armor: run.equipped.armor
        ? { name: equipmentRegistry.get(run.equipped.armor.defId).name, rarity: run.equipped.armor.rarity }
        : null,
      accessory: run.equipped.accessory
        ? { name: equipmentRegistry.get(run.equipped.accessory.defId).name, rarity: run.equipped.accessory.rarity }
        : null,
    };

    const companions = run.companions.map((owned) => {
      const def = companionRegistry.get(owned.id);
      const live = combat.allies.find((a) => a.combatant.id === owned.id);
      // maxHp must come from the live combatant, not the raw definition: WaveManager scales a
      // companion's max HP by the party's maxHpBonusPercent, so reading the unscaled definition
      // here rendered impossible bars like "31/30". Leader skills made that routinely visible.
      return {
        id: owned.id,
        name: def.name,
        role: def.role,
        hp: live ? live.combatant.hp : owned.hp,
        maxHp: live ? live.combatant.maxHp : def.maxHp,
      };
    });

    const activeSpells = run.activeSpells.map((owned) => {
      const def = spellRegistry.get(owned.id);
      return { id: owned.id, name: def.name, rarity: def.rarity, count: owned.count };
    });

    const passiveSpells = run.passiveSpells.map((owned) => {
      const def = spellRegistry.get(owned.id);
      return { id: owned.id, name: def.name, rarity: def.rarity, count: owned.count };
    });

    // The HUD tracks the enemy the party is actually hitting; a group is summarised as a count
    // beside its name rather than by stacking three more health bars into the panel.
    const focus = primaryMonster(combat) ?? combat.monsters[0];
    const livingMonsters = combat.monsters.filter((monster) => monster.hp > 0).length;

    useRunStore.getState().setSnapshot({
      waveNumber: run.waveNumber,
      zoneName: run.zoneName,
      heroClassName: this.heroClassName,
      heroElement: combat.hero.element,
      monsterElement: focus?.element,
      monsterName: focus?.name ?? '',
      monsterTier: run.monsterTier,
      isEcho: run.isEcho,
      monsterAffix: run.monsterAffix,
      echoRecord: run.echoRecord,
      burstGauge: combat.burstGauge,
      burstArmed: combat.burstArmed,
      monsterHp: focus?.hp ?? 0,
      monsterMaxHp: focus?.maxHp ?? 0,
      monsterCount: combat.monsters.length,
      monstersRemaining: livingMonsters,
      heroLevel: run.heroProgress.level,
      heroXp: run.heroProgress.xp,
      heroXpToNext: xpForNextLevel(run.heroProgress.level),
      heroHp: combat.hero.hp,
      heroMaxHp: combat.hero.maxHp,
      isGameOver: run.isGameOver,
      endReason: run.endReason,
      killedBy: run.killedBy,
      gold: run.gold,
      brokenParts: run.brokenParts,
      ownedRelics,
      equipped,
      companions,
      activeSpells,
      passiveSpells,
      isChoosingLoot: run.isChoosingLoot,
      lootOptions: run.lootOptions,
    });
  }

  /** Contain-fit an Image within a bounding box instead of stretching — reused both at unit-view creation and whenever attackLunge swaps in a different-dimensioned attack-frame texture. */
  private applyContainFit(body: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle, width: number, height: number): void {
    if (!('setDisplaySize' in body)) return;
    const srcW = body.width || width;
    const srcH = body.height || height;
    const fitScale = Math.min(width / srcW, height / srcH);
    body.setDisplaySize(srcW * fitScale, srcH * fitScale);
  }

  private createUnitView(
    bodyX: number,
    bodyY: number,
    width: number,
    height: number,
    color: number,
    textureKey?: string,
    barWidth: number = HP_BAR_WIDTH,
    barHeight: number = HP_BAR_HEIGHT,
    tint?: number,
    attackTextureKey?: string,
  ): UnitView {
    const barY = bodyY - height / 2 - 20;
    const shadow = this.add.ellipse(bodyX, bodyY + height / 2 - 6, width * 0.6, height * 0.16, 0x000000, 0.35);
    const body =
      textureKey && this.textures.exists(textureKey)
        ? this.add.image(bodyX, bodyY, textureKey)
        : this.add.rectangle(bodyX, bodyY, width, height, color);
    this.applyContainFit(body, width, height);
    if (tint !== undefined && tint !== 0xffffff && 'setTint' in body) body.setTint(tint);

    const atbY = barY + barHeight + 3;
    const atbBarBg = this.add.rectangle(bodyX, atbY, barWidth, ATB_BAR_HEIGHT, 0x1a1a22);
    const atbBarFill = this.add.rectangle(bodyX - barWidth / 2, atbY, 0, ATB_BAR_HEIGHT, 0xf1c40f).setOrigin(0, 0.5);
    const hpBarBg = this.add.rectangle(bodyX, barY, barWidth, barHeight, 0x222222);
    const hpBarFill = this.add.rectangle(bodyX - barWidth / 2, barY, barWidth, barHeight, 0x2ecc71).setOrigin(0, 0.5);
    const hpLabel = this.add
      .text(bodyX, barY - (barHeight + 8), '', { fontSize: barHeight > 10 ? '14px' : '10px', color: '#ffffff' })
      .setOrigin(0.5);

    body.setScale(body.scaleX * 0.4, body.scaleY * 0.4);
    body.setAlpha(0);
    shadow.setAlpha(0);
    this.tweens.add({
      targets: body,
      alpha: 1,
      scaleX: body.scaleX / 0.4,
      scaleY: body.scaleY / 0.4,
      duration: SPAWN_IN_DURATION_MS,
      ease: 'Back.Out',
    });
    this.tweens.add({ targets: shadow, alpha: 0.35, duration: SPAWN_IN_DURATION_MS });

    const view: UnitView = {
      body,
      shadow,
      hpBarBg,
      hpBarFill,
      atbBarBg,
      atbBarFill,
      hpLabel,
      idleTween: null,
      restTint: tint ?? 0xffffff,
      baseX: bodyX,
      baseY: bodyY,
      idleTextureKey: textureKey,
      attackTextureKey,
      boxWidth: width,
      boxHeight: height,
    };
    view.idleTween = this.tweens.add({
      targets: body,
      y: { from: bodyY, to: bodyY - IDLE_BOB_AMPLITUDE },
      duration: IDLE_BOB_DURATION_MS + Phaser.Math.Between(-150, 150),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
      delay: SPAWN_IN_DURATION_MS,
    });

    return view;
  }

  private destroyUnitView(view: UnitView): void {
    view.idleTween?.stop();
    view.body.destroy();
    view.shadow.destroy();
    view.hpBarBg.destroy();
    view.hpBarFill.destroy();
    view.atbBarBg.destroy();
    view.atbBarFill.destroy();
    view.hpLabel.destroy();
  }

  private updateUnitView(view: UnitView, name: string, hp: number, maxHp: number, barWidth: number = HP_BAR_WIDTH): void {
    const ratio = Phaser.Math.Clamp(maxHp > 0 ? hp / maxHp : 0, 0, 1);
    view.hpBarFill.width = barWidth * ratio;
    view.hpBarFill.fillColor = ratio > 0.3 ? 0x2ecc71 : 0xe74c3c;
    view.hpLabel.setText(`${name}  ${hp}/${maxHp}`);
    // hp<=0 alpha is owned by deathAnimation()'s tween from here on — don't stomp it every sync frame.
    if (hp > 0) view.body.setAlpha(1);
  }

  /**
   * Attacker lunges toward its target (fast, with a little overshoot) then eases back home. The
   * impact itself is scheduled separately (see handleCombatEvent) to land exactly when the
   * forward leg (ATTACK_LUNGE_OUT_MS) completes — a real hit-stop beat instead of everything
   * firing at once.
   */
  private attackLunge(view: UnitView, towardX: number): void {
    const direction = Math.sign(towardX - view.baseX) || 1;
    this.swapUnitFrame(view, view.attackTextureKey);
    this.tweens.add({
      targets: view.body,
      x: view.baseX + direction * ATTACK_LUNGE_DISTANCE,
      duration: ATTACK_LUNGE_OUT_MS,
      ease: 'Back.Out',
      onComplete: () => {
        this.tweens.add({
          targets: view.body,
          x: view.baseX,
          duration: ATTACK_LUNGE_BACK_MS,
          ease: 'Quad.In',
          onComplete: () => this.swapUnitFrame(view, view.idleTextureKey),
        });
      },
    });
  }

  /** Swaps a unit's body to a different generated texture (idle <-> attack frame), if it's loaded — a no-op for units with no attack frame yet, or for the rectangle placeholder body. */
  private swapUnitFrame(view: UnitView, textureKey: string | undefined): void {
    if (!textureKey || !this.textures.exists(textureKey)) return;
    if (!(view.body instanceof Phaser.GameObjects.Image)) return;
    if (view.body.texture.key === textureKey) return;
    view.body.setTexture(textureKey);
    this.applyContainFit(view.body, view.boxWidth, view.boxHeight);
  }

  /** The actual "hit" beat: flinch, white flash, spark burst, screen shake, and the damage number — all timed to land together. */
  private hitImpact(view: UnitView, damage: number, wasCrit: boolean): void {
    this.tweens.add({
      targets: view.body,
      x: { from: view.baseX - HIT_SHAKE_DISTANCE, to: view.baseX },
      duration: HIT_SHAKE_DURATION_MS,
      yoyo: true,
      repeat: 1,
    });

    if (view.body instanceof Phaser.GameObjects.Image) {
      const image = view.body;
      image.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      this.time.delayedCall(HIT_FLASH_MS, () => {
        if (view.restTint === 0xffffff) image.clearTint();
        else image.setTint(view.restTint).setTintMode(Phaser.TintModes.MULTIPLY);
      });
    } else {
      this.tweens.add({ targets: view.body, alpha: { from: 0.35, to: 1 }, duration: HIT_FLASH_MS });
    }

    this.spawnImpactBurst(view.baseX, view.baseY);
    this.cameras.main.shake(
      wasCrit ? CAMERA_SHAKE_CRIT_MS : CAMERA_SHAKE_HIT_MS,
      wasCrit ? CAMERA_SHAKE_CRIT_INTENSITY : CAMERA_SHAKE_HIT_INTENSITY,
    );
    this.showDamageNumber(view.baseX, view.baseY - view.body.displayHeight * 0.6, damage, wasCrit);
  }

  /** Small expanding ring at the point of contact — a classic hit-spark. */
  private spawnImpactBurst(x: number, y: number): void {
    const burst = this.add.circle(x, y, 6, 0xffffff, 0.9);
    this.tweens.add({
      targets: burst,
      radius: 26,
      alpha: 0,
      duration: IMPACT_BURST_MS,
      ease: 'Quad.Out',
      onComplete: () => burst.destroy(),
    });
  }

  /** Bold, outlined, FFBE-style damage number that pops in with a bounce and drifts up while fading. Crits are bigger and orange. */
  private showDamageNumber(x: number, y: number, amount: number, isCrit: boolean): void {
    const fontSize = isCrit ? 30 : 21;
    const color = isCrit ? '#ffb347' : '#ffffff';
    const label = this.add
      .text(x, y, `${amount}`, {
        fontSize: `${fontSize}px`,
        color,
        fontStyle: '800',
        stroke: '#1a1418',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScale(0.3);

    this.tweens.add({ targets: label, scale: 1, duration: 130, ease: 'Back.Out' });
    this.tweens.add({
      targets: label,
      y: y - 46,
      alpha: 0,
      delay: 220,
      duration: 480,
      ease: 'Quad.In',
      onComplete: () => label.destroy(),
    });
  }

  /** One-shot shrink/fade/tilt played the moment a unit's death event arrives. */
  private deathAnimation(view: UnitView): void {
    view.idleTween?.stop();
    view.body.y = view.baseY;
    this.tweens.add({
      targets: view.body,
      scaleX: view.body.scaleX * 0.85,
      scaleY: view.body.scaleY * 0.85,
      angle: 8,
      alpha: 0.3,
      duration: DEATH_FADE_DURATION_MS,
      ease: 'Quad.In',
    });
    this.tweens.add({ targets: view.shadow, alpha: 0, duration: DEATH_FADE_DURATION_MS });
  }

  private showFloatingText(x: number, y: number, text: string, color: string, fontSize = 16): void {
    const toast = this.add
      .text(x, y, text, { fontSize: `${fontSize}px`, color, fontStyle: '800', stroke: '#1a1418', strokeThickness: 3 })
      .setOrigin(0.5);
    this.tweens.add({
      targets: toast,
      y: y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => toast.destroy(),
    });
  }
}
