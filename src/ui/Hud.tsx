import { useRunStore, type CombatSpeed } from '../store/runStore';
import { RARITY_COLOR } from '../data/rarity';

const SPEEDS: CombatSpeed[] = [1, 2, 4];
const EQUIPMENT_SLOTS = ['weapon', 'armor', 'accessory'] as const;

const TIER_LABEL: Record<string, string> = {
  normal: '',
  miniboss: 'MINI-BOSS',
  boss: 'BOSS',
};

const TIER_COLOR: Record<string, string> = {
  normal: '#8b93a1',
  miniboss: '#e67e22',
  boss: '#e74c3c',
};

const ROLE_COLOR: Record<string, string> = {
  tank: '#5d7a99',
  dps: '#d35400',
  healer: '#27ae60',
  support: '#8e44ad',
  summoner: '#16a085',
};

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className="bar-track">
      <div className="bar-fill" style={{ width: `${ratio * 100}%`, background: color }} />
    </div>
  );
}

export function Hud() {
  const state = useRunStore();

  return (
    <div className="hud">
      <div className="hud-row">
        <div className="hud-panel">
          <div className="hud-label">Wave {state.waveNumber}</div>
          {state.monsterTier !== 'normal' && (
            <div className="tier-badge" style={{ color: TIER_COLOR[state.monsterTier] }}>
              {TIER_LABEL[state.monsterTier]}
            </div>
          )}
          <div className="hud-sublabel">{state.monsterName}</div>
          <Bar value={state.monsterHp} max={state.monsterMaxHp} color="#e74c3c" />
          <div className="hud-value">
            {state.monsterHp}/{state.monsterMaxHp}
          </div>
        </div>

        <div className="hud-panel">
          <div className="hud-label">Level {state.heroLevel}</div>
          <div className="hud-sublabel">Knight</div>
          <Bar value={state.heroHp} max={state.heroMaxHp} color="#2ecc71" />
          <div className="hud-value">
            {state.heroHp}/{state.heroMaxHp} HP
          </div>
          <Bar value={state.heroXp} max={state.heroXpToNext} color="#3498db" />
          <div className="hud-value">
            {state.heroXp}/{state.heroXpToNext} XP
          </div>
        </div>
      </div>

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
        <span className="gold-display">{state.gold} gold</span>
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
              {companion.hp > 0 ? `${companion.hp}/${companion.maxHp}` : '(fallen)'}
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
  const waveNumber = useRunStore((state) => state.waveNumber);
  const requestRestart = useRunStore((state) => state.requestRestart);

  if (!isGameOver) return null;

  return (
    <div className="game-over-overlay">
      <div className="game-over-title">Run Over</div>
      <div className="game-over-subtitle">Fell on wave {waveNumber}</div>
      <button type="button" className="restart-button" onClick={() => requestRestart()}>
        New Run
      </button>
    </div>
  );
}
