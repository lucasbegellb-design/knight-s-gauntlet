import Phaser from 'phaser';
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
import { companionRegistry } from '../data/companions';
import { allMonsters } from '../data/monsters';
import { spellRegistry } from '../data/spells';
import { classRegistry, knightClass } from '../data/classes';
import { allZones } from '../data/zones';
import { useRunStore } from '../store/runStore';
import type { EquippedDisplay } from '../store/runStore';
import { useMetaStore } from '../store/metaStore';

const ASSET_BASE = 'game-assets';
const HERO_TEXTURE_KEY = 'hero_knight';
const monsterTextureKey = (id: string) => `monster_${id}`;

const HERO_COLOR = 0x3b82c4;
const HERO_SIZE = { width: 90, height: 130 };

const MONSTER_APPEARANCE: Record<MonsterTier, { color: number; width: number; height: number }> = {
  normal: { color: 0xc0392b, width: 80, height: 110 },
  miniboss: { color: 0xe67e22, width: 104, height: 144 },
  boss: { color: 0x8e2de2, width: 128, height: 176 },
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

const ATTACK_LUNGE_DISTANCE = 26;
const ATTACK_LUNGE_DURATION_MS = 110;
const HIT_SHAKE_DISTANCE = 6;
const HIT_SHAKE_DURATION_MS = 70;
const DEATH_FADE_DURATION_MS = 420;
const SPAWN_IN_DURATION_MS = 320;

const COMPANION_ROLE_COLOR: Record<CompanionRole, number> = {
  tank: 0x34495e,
  dps: 0xd35400,
  healer: 0x27ae60,
  support: 0x8e44ad,
  summoner: 0x16a085,
};

const HP_BAR_WIDTH = 160;
const HP_BAR_HEIGHT = 14;
const COMPANION_BAR_WIDTH = 70;
const COMPANION_BAR_HEIGHT = 8;
const HERO_X = 220;
const MONSTER_X = 580;
const UNIT_Y = 260;
const COMPANION_Y = 400;
const COMPANION_SLOT_X = [140, 220, 300];
const COMPANION_SIZE = { width: 44, height: 64 };

interface UnitView {
  body: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBarFill: Phaser.GameObjects.Rectangle;
  hpLabel: Phaser.GameObjects.Text;
  /** Home position the attack lunge tween returns to; the hp bar/label stay pinned here regardless of the body's lunge offset. */
  baseX: number;
  baseY: number;
}

export class CombatScene extends Phaser.Scene {
  private waveManager!: WaveManager;
  private heroView!: UnitView;
  private monsterView!: UnitView;
  private allyViews: UnitView[] = [];
  private lastLootChoiceToken = 0;
  private heroTint = 0xffffff;
  private heroClassName = 'Knight';

  constructor() {
    super('CombatScene');
  }

  preload(): void {
    this.load.image(HERO_TEXTURE_KEY, `${ASSET_BASE}/hero/knight.png`);
    for (const monster of allMonsters) {
      this.load.image(monsterTextureKey(monster.id), `${ASSET_BASE}/monsters/${monster.id}.png`);
    }
  }

  create(): void {
    this.lastLootChoiceToken = useRunStore.getState().lootChoiceRequest?.token ?? 0;
    this.startNewRun();
  }

  update(_time: number, delta: number): void {
    const store = useRunStore.getState();

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
    this.pushSnapshotToStore();
  }

  private buildMetaBonuses(classModifiers: MetaBonuses['classModifiers']): MetaBonuses {
    const meta = useMetaStore.getState();
    return {
      talentModifiers: resolveTalentModifiers(meta.talentRanks),
      lootLuckBonus: resolveLootLuckBonus(meta.talentRanks),
      forgeLevel: meta.forgeLevel,
      companionUpgrades: meta.companionUpgrades,
      classModifiers,
    };
  }

  private startNewRun(): void {
    const meta = useMetaStore.getState();
    const classDef = classRegistry.tryGet(meta.selectedClassId ?? '') ?? knightClass;
    this.heroTint = classDef.tint;
    this.heroClassName = classDef.name;

    const scaledHero = scaleHeroDefinition(knight, classDef.statMultiplier);
    const startingEquipment: Partial<EquippedItems> = meta.startingWeapon
      ? { weapon: { defId: meta.startingWeapon.defId, rarity: meta.startingWeapon.rarity } }
      : {};

    this.waveManager = new WaveManager(
      scaledHero,
      Date.now(),
      this.buildMetaBonuses(classDef.innateModifiers),
      startingEquipment,
    );

    const state = this.waveManager.getCombatState();
    useMetaStore.getState().discover('monster', state.monster.id);

    if (this.heroView) this.destroyUnitView(this.heroView);
    if (this.monsterView) this.destroyUnitView(this.monsterView);
    this.allyViews.forEach((view) => this.destroyUnitView(view));
    this.allyViews = [];

    this.heroView = this.createUnitView(HERO_X, UNIT_Y, HERO_SIZE.width, HERO_SIZE.height, HERO_COLOR, HERO_TEXTURE_KEY, undefined, undefined, this.heroTint);
    this.updateUnitView(this.heroView, state.hero.name, state.hero.hp, state.hero.maxHp);
    this.rebuildMonsterView();
    this.rebuildAllyViews();
    this.applyZoneBackground();
    this.pushSnapshotToStore();
  }

  private applyZoneBackground(): void {
    const zoneId = this.waveManager.getRunState().zoneId;
    this.cameras.main.setBackgroundColor(ZONE_BACKGROUND[zoneId] ?? DEFAULT_BACKGROUND);
  }

  private rebuildMonsterView(): void {
    if (this.monsterView) this.destroyUnitView(this.monsterView);
    const state = this.waveManager.getCombatState();
    const runState = this.waveManager.getRunState();
    const appearance = MONSTER_APPEARANCE[runState.monsterTier];
    const scale = MONSTER_SPRITE_SCALE[state.monster.id] ?? 1;
    this.monsterView = this.createUnitView(
      MONSTER_X,
      UNIT_Y,
      Math.round(appearance.width * scale),
      Math.round(appearance.height * scale),
      appearance.color,
      monsterTextureKey(state.monster.id),
    );
    if ('setFlipX' in this.monsterView.body) this.monsterView.body.setFlipX(true);
    this.updateUnitView(this.monsterView, state.monster.name, state.monster.hp, state.monster.maxHp);
  }

  private rebuildAllyViews(): void {
    this.allyViews.forEach((view) => this.destroyUnitView(view));
    this.allyViews = [];

    const allies = this.waveManager.getCombatState().allies;
    allies.forEach((ally, index) => {
      const x = COMPANION_SLOT_X[index] ?? COMPANION_SLOT_X[COMPANION_SLOT_X.length - 1] ?? HERO_X;
      const color = COMPANION_ROLE_COLOR[ally.role];
      const view = this.createUnitView(
        x,
        COMPANION_Y,
        COMPANION_SIZE.width,
        COMPANION_SIZE.height,
        color,
        undefined,
        COMPANION_BAR_WIDTH,
        COMPANION_BAR_HEIGHT,
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
        useMetaStore.getState().discover('monster', event.monster.id);
        if (event.zone.isNewZone) {
          this.applyZoneBackground();
          this.showFloatingText(MONSTER_X - 180, UNIT_Y - 170, `Entering ${event.zone.name}`, '#f3f4f6');
        }
      }
      if (event.type === 'levelUp') {
        this.showFloatingText(HERO_X, UNIT_Y - 130, 'LEVEL UP!', '#f1c40f');
      }
      if (event.type === 'revived') {
        this.showFloatingText(HERO_X, UNIT_Y - 130, 'REVIVED!', '#ff3b6b');
      }
      if (event.type === 'lootChosen') {
        this.discoverLootOption(event.option);
      }
      if (event.type === 'runOver') {
        useMetaStore.getState().depositCurrency(this.waveManager.getRunState().gold);
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
      if (attackerView && targetView) this.attackLunge(attackerView, targetView.baseX);
      if (targetView) this.hitShake(targetView);
    }
    if (event.type === 'death') {
      const view = this.viewForId(event.combatantId, heroId);
      if (view) this.deathAnimation(view);
    }
    if (event.type === 'critHit') {
      this.showFloatingText(MONSTER_X, UNIT_Y - 130, 'CRIT!', '#ffd23f');
    }
    if (event.type === 'statusProc' && event.kind === 'burn') {
      this.showFloatingText(MONSTER_X, UNIT_Y - 145, `-${event.damage} burn`, '#e67e22');
    }
    if (event.type === 'lifesteal') {
      this.showFloatingText(HERO_X, UNIT_Y - 145, `+${event.amount}`, '#2ecc71');
    }
    if (event.type === 'execute') {
      this.showFloatingText(MONSTER_X, UNIT_Y - 130, 'EXECUTED', '#e74c3c');
    }
    if (event.type === 'reflect') {
      this.showFloatingText(MONSTER_X, UNIT_Y - 160, `-${event.damage} reflect`, '#9b59b6');
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
  }

  private viewForId(id: string, heroId: string): UnitView | undefined {
    if (id === heroId) return this.heroView;
    if (id === this.waveManager.getCombatState().monster.id) return this.monsterView;
    const allies = this.waveManager.getCombatState().allies;
    const index = allies.findIndex((a) => a.combatant.id === id);
    return index >= 0 ? this.allyViews[index] : undefined;
  }

  private positionForId(id: string, heroId: string): { x: number; y: number } | undefined {
    if (id === heroId) return { x: HERO_X, y: UNIT_Y };
    if (id === this.waveManager.getCombatState().monster.id) return { x: MONSTER_X, y: UNIT_Y };
    const allies = this.waveManager.getCombatState().allies;
    const index = allies.findIndex((a) => a.combatant.id === id);
    if (index < 0) return undefined;
    const x = COMPANION_SLOT_X[index] ?? COMPANION_SLOT_X[COMPANION_SLOT_X.length - 1] ?? HERO_X;
    return { x, y: COMPANION_Y };
  }

  private syncUnitViews(): void {
    const state = this.waveManager.getCombatState();
    this.updateUnitView(this.heroView, state.hero.name, state.hero.hp, state.hero.maxHp);
    this.updateUnitView(this.monsterView, state.monster.name, state.monster.hp, state.monster.maxHp);
    state.allies.forEach((ally, index) => {
      const view = this.allyViews[index];
      if (view) this.updateUnitView(view, ally.combatant.name, ally.combatant.hp, ally.combatant.maxHp, COMPANION_BAR_WIDTH);
    });
  }

  private pushSnapshotToStore(): void {
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
      return { id: owned.id, name: def.name, role: def.role, hp: live ? live.combatant.hp : owned.hp, maxHp: def.maxHp };
    });

    const activeSpells = run.activeSpells.map((owned) => {
      const def = spellRegistry.get(owned.id);
      return { id: owned.id, name: def.name, rarity: def.rarity, count: owned.count };
    });

    const passiveSpells = run.passiveSpells.map((owned) => {
      const def = spellRegistry.get(owned.id);
      return { id: owned.id, name: def.name, rarity: def.rarity, count: owned.count };
    });

    useRunStore.getState().setSnapshot({
      waveNumber: run.waveNumber,
      zoneName: run.zoneName,
      heroClassName: this.heroClassName,
      monsterName: combat.monster.name,
      monsterTier: run.monsterTier,
      monsterHp: combat.monster.hp,
      monsterMaxHp: combat.monster.maxHp,
      heroLevel: run.heroProgress.level,
      heroXp: run.heroProgress.xp,
      heroXpToNext: xpForNextLevel(run.heroProgress.level),
      heroHp: combat.hero.hp,
      heroMaxHp: combat.hero.maxHp,
      isGameOver: run.isGameOver,
      gold: run.gold,
      ownedRelics,
      equipped,
      companions,
      activeSpells,
      passiveSpells,
      isChoosingLoot: run.isChoosingLoot,
      lootOptions: run.lootOptions,
    });
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
  ): UnitView {
    const barY = bodyY - height / 2 - 20;
    const body =
      textureKey && this.textures.exists(textureKey)
        ? this.add.image(bodyX, bodyY, textureKey).setDisplaySize(width, height)
        : this.add.rectangle(bodyX, bodyY, width, height, color);
    if (tint !== undefined && tint !== 0xffffff && 'setTint' in body) body.setTint(tint);
    const hpBarBg = this.add.rectangle(bodyX, barY, barWidth, barHeight, 0x222222);
    const hpBarFill = this.add.rectangle(bodyX - barWidth / 2, barY, barWidth, barHeight, 0x2ecc71).setOrigin(0, 0.5);
    const hpLabel = this.add
      .text(bodyX, barY - (barHeight + 8), '', { fontSize: barHeight > 10 ? '14px' : '10px', color: '#ffffff' })
      .setOrigin(0.5);

    body.setScale(body.scaleX * 0.4, body.scaleY * 0.4);
    body.setAlpha(0);
    this.tweens.add({ targets: body, alpha: 1, scaleX: body.scaleX / 0.4, scaleY: body.scaleY / 0.4, duration: SPAWN_IN_DURATION_MS, ease: 'Back.Out' });

    return { body, hpBarBg, hpBarFill, hpLabel, baseX: bodyX, baseY: bodyY };
  }

  private destroyUnitView(view: UnitView): void {
    view.body.destroy();
    view.hpBarBg.destroy();
    view.hpBarFill.destroy();
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

  /** Attacker lunges a short distance toward its target and springs back — the engine has no attack-anim concept, this is purely visual. */
  private attackLunge(view: UnitView, towardX: number): void {
    const direction = Math.sign(towardX - view.baseX) || 1;
    this.tweens.add({
      targets: view.body,
      x: view.baseX + direction * ATTACK_LUNGE_DISTANCE,
      duration: ATTACK_LUNGE_DURATION_MS,
      yoyo: true,
      ease: 'Quad.Out',
    });
  }

  /** Target flinches (small side-to-side shake) and flashes on taking a hit. */
  private hitShake(view: UnitView): void {
    this.tweens.add({
      targets: view.body,
      x: { from: view.baseX - HIT_SHAKE_DISTANCE, to: view.baseX },
      duration: HIT_SHAKE_DURATION_MS,
      yoyo: true,
      repeat: 1,
    });
    this.tweens.add({ targets: view.body, alpha: { from: 0.4, to: 1 }, duration: 150 });
  }

  /** One-shot shrink/fade/tilt played the moment a unit's death event arrives. */
  private deathAnimation(view: UnitView): void {
    this.tweens.add({
      targets: view.body,
      scaleX: view.body.scaleX * 0.85,
      scaleY: view.body.scaleY * 0.85,
      angle: 8,
      alpha: 0.3,
      duration: DEATH_FADE_DURATION_MS,
      ease: 'Quad.In',
    });
  }

  private showFloatingText(x: number, y: number, text: string, color: string): void {
    const toast = this.add.text(x, y, text, { fontSize: '16px', color, fontStyle: 'bold' }).setOrigin(0.5);
    this.tweens.add({
      targets: toast,
      y: y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => toast.destroy(),
    });
  }
}
