import { useRunStore, type CombatSpeed } from '../store/runStore';

const SPEEDS: CombatSpeed[] = [1, 2, 4];

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
      </div>

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
