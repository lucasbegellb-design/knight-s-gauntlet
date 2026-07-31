import Phaser from 'phaser';
import { WaveManager, type WaveEvent } from '../engine/WaveManager';
import { xpForNextLevel } from '../engine/heroProgression';
import type { CombatEvent } from '../engine/types';
import { knight } from '../data/hero';
import type { MonsterTier } from '../data/monster.types';
import { relicRegistry } from '../data/relics';
import { equipmentRegistry } from '../data/equipment';
import { useRunStore } from '../store/runStore';
import type { EquippedDisplay } from '../store/runStore';

const HERO_COLOR = 0x3b82c4;
const HERO_SIZE = { width: 80, height: 120 };

const MONSTER_APPEARANCE: Record<MonsterTier, { color: number; width: number; height: number }> = {
  normal: { color: 0xc0392b, width: 70, height: 100 },
  miniboss: { color: 0xe67e22, width: 92, height: 130 },
  boss: { color: 0x8e2de2, width: 114, height: 160 },
};

const HP_BAR_WIDTH = 160;
const HP_BAR_HEIGHT = 14;
const HERO_X = 220;
const MONSTER_X = 580;
const UNIT_Y = 260;

interface UnitView {
  body: Phaser.GameObjects.Rectangle;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBarFill: Phaser.GameObjects.Rectangle;
  hpLabel: Phaser.GameObjects.Text;
}

export class CombatScene extends Phaser.Scene {
  private waveManager!: WaveManager;
  private heroView!: UnitView;
  private monsterView!: UnitView;
  private lastRestartToken = 0;
  private lastLootChoiceToken = 0;

  constructor() {
    super('CombatScene');
  }

  create(): void {
    this.lastRestartToken = useRunStore.getState().restartToken;
    this.lastLootChoiceToken = useRunStore.getState().lootChoiceRequest?.token ?? 0;
    this.startNewRun();
  }

  update(_time: number, delta: number): void {
    const store = useRunStore.getState();

    if (store.restartToken !== this.lastRestartToken) {
      this.lastRestartToken = store.restartToken;
      this.lastLootChoiceToken = store.lootChoiceRequest?.token ?? 0;
      this.startNewRun();
      return;
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
    this.pushSnapshotToStore();
  }

  private startNewRun(): void {
    this.waveManager = new WaveManager(knight, Date.now());

    const state = this.waveManager.getCombatState();
    const runState = this.waveManager.getRunState();

    if (this.heroView) this.destroyUnitView(this.heroView);
    if (this.monsterView) this.destroyUnitView(this.monsterView);

    this.heroView = this.createUnitView(HERO_X, HERO_SIZE.width, HERO_SIZE.height, HERO_COLOR);
    const monsterAppearance = MONSTER_APPEARANCE[runState.monsterTier];
    this.monsterView = this.createUnitView(MONSTER_X, monsterAppearance.width, monsterAppearance.height, monsterAppearance.color);

    this.updateUnitView(this.heroView, state.hero.name, state.hero.hp, state.hero.maxHp);
    this.updateUnitView(this.monsterView, state.monster.name, state.monster.hp, state.monster.maxHp);
    this.pushSnapshotToStore();
  }

  private handleEvents(events: WaveEvent[]): void {
    for (const event of events) {
      if (event.type === 'combat') {
        this.handleCombatEvent(event.event);
      }
      if (event.type === 'waveStarted') {
        const appearance = MONSTER_APPEARANCE[event.monster.tier];
        this.resizeMonsterView(appearance);
      }
      if (event.type === 'levelUp') {
        this.showFloatingText(HERO_X, UNIT_Y - 130, 'LEVEL UP!', '#f1c40f');
      }
      if (event.type === 'revived') {
        this.showFloatingText(HERO_X, UNIT_Y - 130, 'REVIVED!', '#ff3b6b');
      }
    }
  }

  private handleCombatEvent(event: CombatEvent): void {
    const heroId = this.waveManager.getCombatState().hero.id;

    if (event.type === 'attack') {
      const target = event.targetId === heroId ? this.heroView : this.monsterView;
      this.flash(target);
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
  }

  private syncUnitViews(): void {
    const state = this.waveManager.getCombatState();
    this.updateUnitView(this.heroView, state.hero.name, state.hero.hp, state.hero.maxHp);
    this.updateUnitView(this.monsterView, state.monster.name, state.monster.hp, state.monster.maxHp);
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
      isChoosingLoot: run.isChoosingLoot,
      lootOptions: run.lootOptions,
    });
  }

  private createUnitView(bodyX: number, width: number, height: number, color: number): UnitView {
    const body = this.add.rectangle(bodyX, UNIT_Y, width, height, color);
    const hpBarBg = this.add.rectangle(bodyX, UNIT_Y - 90, HP_BAR_WIDTH, HP_BAR_HEIGHT, 0x222222);
    const hpBarFill = this.add
      .rectangle(bodyX - HP_BAR_WIDTH / 2, UNIT_Y - 90, HP_BAR_WIDTH, HP_BAR_HEIGHT, 0x2ecc71)
      .setOrigin(0, 0.5);
    const hpLabel = this.add.text(bodyX, UNIT_Y - 112, '', { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);

    return { body, hpBarBg, hpBarFill, hpLabel };
  }

  private destroyUnitView(view: UnitView): void {
    view.body.destroy();
    view.hpBarBg.destroy();
    view.hpBarFill.destroy();
    view.hpLabel.destroy();
  }

  private resizeMonsterView(appearance: { color: number; width: number; height: number }): void {
    this.monsterView.body.width = appearance.width;
    this.monsterView.body.height = appearance.height;
    this.monsterView.body.fillColor = appearance.color;
    this.monsterView.body.setAlpha(1);
  }

  private updateUnitView(view: UnitView, name: string, hp: number, maxHp: number): void {
    const ratio = Phaser.Math.Clamp(maxHp > 0 ? hp / maxHp : 0, 0, 1);
    view.hpBarFill.width = HP_BAR_WIDTH * ratio;
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
