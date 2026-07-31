import Phaser from 'phaser';
import { WaveManager, type MetaBonuses, type WaveEvent } from '../engine/WaveManager';
import type { LootOption } from '../engine/loot';
import { xpForNextLevel } from '../engine/heroProgression';
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
}

export class CombatScene extends Phaser.Scene {
  private waveManager!: WaveManager;
  private heroView!: UnitView;
  private monsterView!: UnitView;
  private allyViews: UnitView[] = [];
  private lastLootChoiceToken = 0;

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

  private buildMetaBonuses(): MetaBonuses {
    const meta = useMetaStore.getState();
    return {
      talentModifiers: resolveTalentModifiers(meta.talentRanks),
      lootLuckBonus: resolveLootLuckBonus(meta.talentRanks),
      forgeLevel: meta.forgeLevel,
      companionUpgrades: meta.companionUpgrades,
    };
  }

  private startNewRun(): void {
    this.waveManager = new WaveManager(knight, Date.now(), this.buildMetaBonuses());

    const state = this.waveManager.getCombatState();
    useMetaStore.getState().discover('monster', state.monster.id);

    if (this.heroView) this.destroyUnitView(this.heroView);
    if (this.monsterView) this.destroyUnitView(this.monsterView);
    this.allyViews.forEach((view) => this.destroyUnitView(view));
    this.allyViews = [];

    this.heroView = this.createUnitView(HERO_X, UNIT_Y, HERO_SIZE.width, HERO_SIZE.height, HERO_COLOR, HERO_TEXTURE_KEY);
    this.updateUnitView(this.heroView, state.hero.name, state.hero.hp, state.hero.maxHp);
    this.rebuildMonsterView();
    this.rebuildAllyViews();
    this.pushSnapshotToStore();
  }

  private rebuildMonsterView(): void {
    if (this.monsterView) this.destroyUnitView(this.monsterView);
    const state = this.waveManager.getCombatState();
    const runState = this.waveManager.getRunState();
    const appearance = MONSTER_APPEARANCE[runState.monsterTier];
    this.monsterView = this.createUnitView(
      MONSTER_X,
      UNIT_Y,
      appearance.width,
      appearance.height,
      appearance.color,
      monsterTextureKey(state.monster.id),
    );
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
      const view = this.viewForId(event.targetId, heroId);
      if (view) this.flash(view);
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
  ): UnitView {
    const barY = bodyY - height / 2 - 20;
    const body =
      textureKey && this.textures.exists(textureKey)
        ? this.add.image(bodyX, bodyY, textureKey).setDisplaySize(width, height)
        : this.add.rectangle(bodyX, bodyY, width, height, color);
    const hpBarBg = this.add.rectangle(bodyX, barY, barWidth, barHeight, 0x222222);
    const hpBarFill = this.add.rectangle(bodyX - barWidth / 2, barY, barWidth, barHeight, 0x2ecc71).setOrigin(0, 0.5);
    const hpLabel = this.add
      .text(bodyX, barY - (barHeight + 8), '', { fontSize: barHeight > 10 ? '14px' : '10px', color: '#ffffff' })
      .setOrigin(0.5);

    return { body, hpBarBg, hpBarFill, hpLabel };
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
    view.body.setAlpha(hp <= 0 ? 0.3 : 1);
  }

  private flash(view: UnitView): void {
    this.tweens.add({ targets: view.body, alpha: { from: 0.4, to: 1 }, duration: 150 });
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
