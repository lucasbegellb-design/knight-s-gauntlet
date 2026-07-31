import Phaser from 'phaser';
import { CombatEngine } from '../engine/CombatEngine';
import type { Combatant } from '../engine/types';
import { monsterRegistry } from '../data/monsters';

const HERO_COLOR = 0x3b82c4;
const MONSTER_COLOR = 0xc0392b;
const HP_BAR_WIDTH = 160;
const HP_BAR_HEIGHT = 14;

interface UnitView {
  combatant: Combatant;
  bodyX: number;
  bodyY: number;
  color: number;
  body: Phaser.GameObjects.Rectangle;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBarFill: Phaser.GameObjects.Rectangle;
  hpLabel: Phaser.GameObjects.Text;
}

function makeHero(): Combatant {
  return {
    id: 'hero',
    name: 'Knight',
    maxHp: 60,
    hp: 60,
    attack: 6,
    attackIntervalMs: 900,
    nextAttackAt: 900,
  };
}

function makeMonsterCombatant(): Combatant {
  const def = monsterRegistry.get('goblin_grunt');
  return {
    id: def.id,
    name: def.name,
    maxHp: def.maxHp,
    hp: def.maxHp,
    attack: def.attack,
    attackIntervalMs: def.attackIntervalMs,
    nextAttackAt: def.attackIntervalMs,
  };
}

export class CombatScene extends Phaser.Scene {
  private engine!: CombatEngine;
  private hero!: UnitView;
  private monster!: UnitView;
  private endBanner?: Phaser.GameObjects.Text;

  constructor() {
    super('CombatScene');
  }

  create(): void {
    this.engine = new CombatEngine(makeHero(), makeMonsterCombatant());

    const state = this.engine.getState();
    this.hero = this.createUnitView(state.hero, 220, 260, HERO_COLOR);
    this.monster = this.createUnitView(state.monster, 580, 260, MONSTER_COLOR);
  }

  update(_time: number, delta: number): void {
    const events = this.engine.tick(delta);

    for (const event of events) {
      if (event.type === 'attack') {
        const target = event.targetId === this.hero.combatant.id ? this.hero : this.monster;
        this.flash(target);
      }
      if (event.type === 'combatEnd') {
        this.showEndBanner(event.winnerId);
      }
    }

    this.refreshUnitView(this.hero);
    this.refreshUnitView(this.monster);
  }

  private createUnitView(combatant: Combatant, bodyX: number, bodyY: number, color: number): UnitView {
    const body = this.add.rectangle(bodyX, bodyY, 80, 120, color);

    const hpBarBg = this.add.rectangle(bodyX, bodyY - 90, HP_BAR_WIDTH, HP_BAR_HEIGHT, 0x222222);
    const hpBarFill = this.add
      .rectangle(bodyX - HP_BAR_WIDTH / 2, bodyY - 90, HP_BAR_WIDTH, HP_BAR_HEIGHT, 0x2ecc71)
      .setOrigin(0, 0.5);

    const hpLabel = this.add
      .text(bodyX, bodyY - 112, `${combatant.name}  ${combatant.hp}/${combatant.maxHp}`, {
        fontSize: '14px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    return { combatant, bodyX, bodyY, color, body, hpBarBg, hpBarFill, hpLabel };
  }

  private refreshUnitView(view: UnitView): void {
    const state = this.engine.getState();
    const combatant = view.combatant.id === state.hero.id ? state.hero : state.monster;
    const ratio = Phaser.Math.Clamp(combatant.hp / combatant.maxHp, 0, 1);

    view.hpBarFill.width = HP_BAR_WIDTH * ratio;
    view.hpBarFill.fillColor = ratio > 0.3 ? 0x2ecc71 : 0xe74c3c;
    view.hpLabel.setText(`${combatant.name}  ${combatant.hp}/${combatant.maxHp}`);

    if (combatant.hp <= 0) {
      view.body.setAlpha(0.3);
    }
  }

  private flash(view: UnitView): void {
    this.tweens.add({
      targets: view.body,
      alpha: { from: 0.4, to: 1 },
      duration: 150,
    });
  }

  private showEndBanner(winnerId: string | null): void {
    if (this.endBanner) return;

    const text = winnerId === this.hero.combatant.id ? 'Victory' : 'Defeat';
    this.endBanner = this.add
      .text(400, 100, text, {
        fontSize: '48px',
        color: winnerId === this.hero.combatant.id ? '#f1c40f' : '#e74c3c',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
  }
}
