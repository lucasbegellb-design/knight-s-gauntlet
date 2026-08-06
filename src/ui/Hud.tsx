import { useRunStore, type CombatSpeed } from '../store/runStore';
import { AffinityCallout, ElementBadge } from './ElementBadge';
import { useMetaStore } from '../store/metaStore';
import { RARITY_COLOR } from '../data/rarity';
import type { MonsterTier } from '../data/monster.types';

const SPEEDS: CombatSpeed[] = [1, 2, 4];
const EQUIPMENT_SLOTS = ['weapon', 'armor', 'accessory'] as const;

const TIER_LABEL: Record<MonsterTier, string> = {
  normal: '',
  miniboss: 'MINI-BOSS',
  boss: 'BOSS',
  megaboss: 'MEGABOSS',
  ultraboss: 'ULTRABOSS',
};

const TIER_COLOR: Record<MonsterTier, string> = {
  normal: '#8b93a1',
  miniboss: '#e67e22',
  boss: '#e74c3c',
  megaboss: '#ff5555',
  ultraboss: '#f1c40f',
};

const TIER_BADGE_CLASS: Record<MonsterTier, string> = {
  normal: '',
  miniboss: '',
  boss: '',
  megaboss: 'tier-badge-megaboss',
  ultraboss: 'tier-badge-ultraboss',
};

const ROLE_COLOR: Record<string, string> = {
  tank: '#5d7a99',
  dps: '#d35400',
  healer: '#27ae60',
  support: '#8e44ad',
  summoner: '#16a085',
};

/** Large HP values (wave 500+ under the escalation curve) read better as "12.3k"/"1.2M" than a long digit string. */
function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  if (value >= 1_000) return `${(value / 1000).toFixed(1)}k`;
  return `${value}`;
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className="bar-track">
      <div className="bar-fill" style={{ width: `${ratio * 100}%`, background: color }} />
    </div>
  );
}

/**
 * The party Brave Burst gauge — and the only input the combat loop has.
 *
 * While charging it is a passive readout. Once armed it becomes a button with a short window:
 * hitting it fires the squad-wide burst at bonus power, ignoring it lets the engine auto-fire at
 * base power a moment later. Nothing is lost by never touching it, which is the point — an idle
 * game earns its one interaction only if declining it is still a complete way to play.
 */
function BraveBurstBar() {
  const gauge = useRunStore((s) => s.burstGauge);
  const armed = useRunStore((s) => s.burstArmed);
  const requestBurst = useRunStore((s) => s.requestBurst);
  const isGameOver = useRunStore((s) => s.isGameOver);

  if (isGameOver) return null;

  return (
    <div className={`burst-row ${armed ? 'burst-row-armed' : ''}`}>
      <span className="burst-label">Brave Burst</span>
      <div className="burst-track">
        <div className="burst-fill" style={{ width: `${Math.min(1, gauge) * 100}%` }} />
      </div>
      <button type="button" className="burst-button" disabled={!armed} onClick={() => requestBurst()}>
        {armed ? 'UNLEASH ×1.5' : `${Math.round(Math.min(1, gauge) * 100)}%`}
      </button>
    </div>
  );
}

export function Hud() {
  const state = useRunStore();

  return (
    <div className="hud">
      <div className="hud-row">
        <div className="hud-panel">
          <div className="hud-label">
            Wave {state.waveNumber} <span className="hud-sublabel">— {state.zoneName}</span>
          </div>
          {state.isEcho ? (
            <div className="tier-badge tier-badge-echo" style={{ color: '#b39dff' }}>
              ECHO
            </div>
          ) : (
            state.monsterTier !== 'normal' && (
              <div
                className={`tier-badge ${TIER_BADGE_CLASS[state.monsterTier]}`}
                style={{ color: TIER_COLOR[state.monsterTier] }}
              >
                {TIER_LABEL[state.monsterTier]}
              </div>
            )
          )}
          {state.monsterAffix && (
            <div
              className="affix-badge"
              style={{ color: state.monsterAffix.color, borderColor: `${state.monsterAffix.color}66`, background: `${state.monsterAffix.color}14` }}
              title={state.monsterAffix.description}
            >
              {state.monsterAffix.name.toUpperCase()}
            </div>
          )}
          <div className="hud-sublabel">
            {state.monsterName} <ElementBadge element={state.monsterElement} compact />
            <AffinityCallout attacker={state.heroElement} defender={state.monsterElement} />
          </div>
          <Bar value={state.monsterHp} max={state.monsterMaxHp} color="#e74c3c" />
          <div className="hud-value">
            {formatNumber(state.monsterHp)}/{formatNumber(state.monsterMaxHp)}
          </div>
        </div>

        <div className="hud-panel">
          <div className="hud-label">Level {state.heroLevel}</div>
          <div className="hud-sublabel">
            {state.heroClassName} <ElementBadge element={state.heroElement} compact />
            <AffinityCallout attacker={state.monsterElement} defender={state.heroElement} />
          </div>
          <Bar value={state.heroHp} max={state.heroMaxHp} color="#2ecc71" />
          <div className="hud-value">
            {formatNumber(state.heroHp)}/{formatNumber(state.heroMaxHp)} HP
          </div>
          <Bar value={state.heroXp} max={state.heroXpToNext} color="#3498db" />
          <div className="hud-value">
            {formatNumber(state.heroXp)}/{formatNumber(state.heroXpToNext)} XP
          </div>
        </div>
      </div>

      <BraveBurstBar />

      <div className="hud-row">
        <span className="hud-sublabel">Speed</span>
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            type="button"
            className={`speed-button${state.speed === speed ? ' active' : ''}`}
            onClick={() => state.setSpeed(speed)}
          >
            x{speed}
          </button>
        ))}
        {state.brokenParts > 0 && <span className="hud-sublabel">⚙️ {state.brokenParts} broken parts</span>}
        <span className="gold-display">🪙 {state.gold} gold</span>
        <button
          type="button"
          className="flee-button"
          onClick={() => {
            if (window.confirm(`Abandon this run at wave ${state.waveNumber}? Your gold and Broken Parts will still be banked.`)) {
              state.requestAbandonRun();
            }
          }}
        >
          Flee
        </button>
      </div>

      <div className="hud-row">
        {EQUIPMENT_SLOTS.map((slot) => {
          const item = state.equipped[slot];
          return (
            <div
              key={slot}
              className="equip-slot"
              style={item ? { borderColor: RARITY_COLOR[item.rarity], color: RARITY_COLOR[item.rarity] } : undefined}
            >
              {item ? item.name : slot}
            </div>
          );
        })}
      </div>

      {state.companions.length > 0 && (
        <div className="hud-row relic-tray">
          {state.companions.map((companion) => (
            <div
              key={companion.id}
              className="companion-chip"
              style={{ borderColor: ROLE_COLOR[companion.role], color: companion.hp > 0 ? '#f3f4f6' : '#5c5f6a' }}
            >
              <span style={{ color: ROLE_COLOR[companion.role] }}>{companion.role}</span> {companion.name}{' '}
              {companion.hp > 0 ? `${formatNumber(companion.hp)}/${formatNumber(companion.maxHp)}` : '(fallen)'}
            </div>
          ))}
        </div>
      )}

      {state.activeSpells.length > 0 && (
        <div className="hud-row relic-tray">
          <span className="hud-sublabel">Active</span>
          {state.activeSpells.map((spell) => (
            <div key={spell.id} className="relic-chip" style={{ borderColor: RARITY_COLOR[spell.rarity], color: RARITY_COLOR[spell.rarity] }}>
              {spell.name}
            </div>
          ))}
        </div>
      )}

      {(state.ownedRelics.length > 0 || state.passiveSpells.length > 0) && (
        <div className="hud-row relic-tray">
          {state.ownedRelics.map((relic) => (
            <div key={relic.id} className="relic-chip" style={{ borderColor: RARITY_COLOR[relic.rarity], color: RARITY_COLOR[relic.rarity] }}>
              {relic.name}
              {relic.count > 1 ? ` x${relic.count}` : ''}
            </div>
          ))}
          {state.passiveSpells.map((spell) => (
            <div key={spell.id} className="relic-chip" style={{ borderColor: RARITY_COLOR[spell.rarity], color: RARITY_COLOR[spell.rarity] }}>
              {spell.name}
              {spell.count > 1 ? ` x${spell.count}` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GameOverOverlay() {
  const isGameOver = useRunStore((state) => state.isGameOver);
  const endReason = useRunStore((state) => state.endReason);
  const waveNumber = useRunStore((state) => state.waveNumber);
  const setScreen = useMetaStore((state) => state.setScreen);

  if (!isGameOver) return null;

  return (
    <div className="game-over-overlay">
      <div className="game-over-title">{endReason === 'abandoned' ? 'Run Retreated' : 'Run Over'}</div>
      <div className="game-over-subtitle">
        {endReason === 'abandoned' ? `Retreated on wave ${waveNumber}` : `Fell on wave ${waveNumber}`}
      </div>
      <button type="button" className="restart-button" onClick={() => setScreen('hub')}>
        Return to Camp
      </button>
    </div>
  );
}
