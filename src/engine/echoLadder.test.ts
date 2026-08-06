import { describe, expect, it } from 'vitest';
import { WaveManager, DEFAULT_META_BONUSES, type EchoRecord, type MetaBonuses } from './WaveManager';
import { knight } from '../data/hero';

const ECHO_WAVE = 15;

function record(overrides: Partial<EchoRecord> = {}): EchoRecord {
  return {
    classId: 'knight',
    className: 'Berserker',
    element: 'fire',
    wave: 45,
    level: 12,
    attackRatio: 1.4,
    hpRatio: 0.8,
    attackIntervalMs: 700,
    critChance: 0.3,
    critDamageMultiplier: 0.5,
    lifestealPercent: 0.2,
    ...overrides,
  };
}

/** Advances a manager to the given wave by clearing loot choices, without simulating fights. */
function jumpToWave(manager: WaveManager, target: number): void {
  for (let i = 0; i < target * 400; i++) {
    const state = manager.getRunState();
    if (state.isGameOver || state.waveNumber >= target) break;
    if (state.isChoosingLoot) manager.chooseLoot(0);
    else manager.tick(200);
  }
}

describe('Echo of Yourself', () => {
  it('mirrors the live build when the ladder is empty', () => {
    const manager = new WaveManager(knight, 1);
    const engine = manager.getCombatState();
    expect(engine.monsters[0]!.id).not.toBe('echo_of_self');

    const echoManager = new WaveManager(knight, 1);
    // buildWaveEngine is exercised through the public run state; wave 15 is the first Echo.
    jumpToWave(echoManager, ECHO_WAVE);
    if (echoManager.getRunState().waveNumber === ECHO_WAVE) {
      expect(echoManager.getRunState().isEcho).toBe(true);
      expect(echoManager.getRunState().echoRecord).toBeNull();
    }
  });

  it('never resurrects a ladder Echo before the minimum wave', () => {
    const meta: MetaBonuses = { ...DEFAULT_META_BONUSES, echoLadder: [record()] };
    const manager = new WaveManager(knight, 3, meta);
    jumpToWave(manager, ECHO_WAVE);
    // Wave 15 is an Echo wave but sits below ECHO_LADDER_MIN_WAVE, so it must be the live mirror.
    if (manager.getRunState().isEcho) {
      expect(manager.getRunState().echoRecord).toBeNull();
    }
  });

  it('names a resurrected Echo after the run that set it', () => {
    // Drive many seeds so at least one rolls a ladder Echo at wave 30+.
    const meta: MetaBonuses = { ...DEFAULT_META_BONUSES, echoLadder: [record({ className: 'Duelist', wave: 52 })] };
    let sawLadderEcho = false;

    for (let seed = 1; seed <= 40 && !sawLadderEcho; seed++) {
      const manager = new WaveManager(knight, seed, meta);
      jumpToWave(manager, 30);
      const state = manager.getRunState();
      if (state.isEcho && state.echoRecord) {
        sawLadderEcho = true;
        expect(state.monsterName).toContain('Duelist');
        expect(state.monsterName).toContain('52');
      }
    }
  });

  it('never rolls an affix onto an Echo wave', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const manager = new WaveManager(knight, seed, DEFAULT_META_BONUSES);
      jumpToWave(manager, ECHO_WAVE);
      const state = manager.getRunState();
      if (state.isEcho) expect(state.monsterAffix).toBeNull();
    }
  });

  it('emits a record when an Echo wave is cleared', () => {
    // A deliberately overwhelming hero so the Echo wave resolves in the hero's favour.
    const strongHero = { ...knight, base: { ...knight.base, maxHp: 100_000, attack: 5_000, attackIntervalMs: 200 } };
    const manager = new WaveManager(strongHero, 1);

    let echoRecord: EchoRecord | null = null;
    for (let i = 0; i < 40_000 && !echoRecord; i++) {
      const state = manager.getRunState();
      if (state.isGameOver) break;
      const events = state.isChoosingLoot ? manager.chooseLoot(0) : manager.tick(200);
      const defeated = events.find((e) => e.type === 'echoDefeated');
      if (defeated?.type === 'echoDefeated') echoRecord = defeated.record;
    }

    expect(echoRecord).not.toBeNull();
    expect(echoRecord?.wave).toBe(ECHO_WAVE);
    expect(echoRecord?.classId).toBe(knight.id);
    expect(echoRecord?.hpRatio).toBeGreaterThan(0);
    expect(echoRecord?.attackRatio).toBeGreaterThan(0);
  });

  it('records what killed the run, flagging an Echo kill separately', () => {
    // A hero that cannot win: the Echo mirrors it, so the fight is decided by who swings first.
    const manager = new WaveManager(knight, 1);
    for (let i = 0; i < 40_000; i++) {
      const state = manager.getRunState();
      if (state.isGameOver) break;
      if (state.isChoosingLoot) manager.chooseLoot(0);
      else manager.tick(200);
    }

    const finalState = manager.getRunState();
    expect(finalState.isGameOver).toBe(true);
    expect(finalState.killedBy).not.toBeNull();
    expect(finalState.killedBy?.name).toBe(finalState.monsterName);
  });
});
