import type { CSSProperties } from 'react';
import { allClasses } from '../data/classes';
import { equipmentRegistry } from '../data/equipment';
import { useMetaStore } from '../store/metaStore';
import { GeneratedPortrait } from './RarityIcon';

const CLASS_ICON: Record<string, string> = {
  knight: '🛡️',
  berserker: '🪓',
  guardian: '🏰',
  duelist: '🗡️',
};

/**
 * Pure UI accent (card border/glow) — deliberately separate from ClassDefinition.tint, which
 * now stays neutral (0xffffff) since each class has its own distinct hero sprite; a color wash
 * over real art would just muddy it. This keeps the class-select screen visually distinct anyway.
 */
const CLASS_ACCENT: Record<string, string> = {
  knight: '#ffffff',
  berserker: '#e74c3c',
  guardian: '#3498db',
  duelist: '#f1c40f',
};

function StatBar({ label, value, max = 1.6 }: { label: string; value: number; max?: number }) {
  const ratio = Math.max(0.04, Math.min(1, value / max));
  return (
    <div className="class-stat-row">
      <span className="class-stat-label">{label}</span>
      <div className="class-stat-track">
        <div className="class-stat-fill" style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className="class-stat-value">x{value.toFixed(2)}</span>
    </div>
  );
}

export function ClassSelect() {
  const chooseClass = useMetaStore((s) => s.chooseClass);
  const setScreen = useMetaStore((s) => s.setScreen);

  return (
    <div className="hub">
      <div className="hud-row">
        <h2 className="hub-title">Choose Your Class</h2>
        <button type="button" className="restart-button restart-button-ghost" onClick={() => setScreen('hub')}>
          ← Back to Camp
        </button>
      </div>
      <p className="class-select-intro">Every class rolls a random starting weapon from its own arsenal — pick a playstyle, not just a name.</p>

      <div className="class-select-grid">
        {allClasses.map((classDef) => {
          const accent = CLASS_ACCENT[classDef.id] ?? '#ffffff';
          return (
            <button
              key={classDef.id}
              type="button"
              className="class-card"
              style={{ '--class-accent': accent } as CSSProperties}
              onClick={() => chooseClass(classDef.id)}
            >
              <div className="class-card-portrait-ring">
                <GeneratedPortrait category="hero" id={classDef.id} size={72} />
                <span className="class-card-icon">{CLASS_ICON[classDef.id] ?? '⚔️'}</span>
              </div>
              <div className="class-card-name">{classDef.name}</div>
              <div className="class-card-description">{classDef.description}</div>

              <div className="class-card-stat-block">
                <StatBar label="HP" value={classDef.statMultiplier.maxHp} />
                <StatBar label="ATK" value={classDef.statMultiplier.attack} />
                <StatBar label="SPD" value={1 / classDef.statMultiplier.attackIntervalMs} />
              </div>

              <div className="class-card-weapons">
                <span className="class-card-weapons-label">Arsenal</span>
                {classDef.weaponPool.map((id) => equipmentRegistry.get(id).name).join(' · ')}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
