import { allClasses } from '../data/classes';
import { equipmentRegistry } from '../data/equipment';
import { useMetaStore } from '../store/metaStore';
import { GeneratedPortrait } from './RarityIcon';

export function ClassSelect() {
  const chooseClass = useMetaStore((s) => s.chooseClass);
  const setScreen = useMetaStore((s) => s.setScreen);

  return (
    <div className="hub">
      <div className="hud-row">
        <h2 className="hub-title">Choose Your Class</h2>
        <button type="button" className="restart-button" onClick={() => setScreen('hub')}>
          Back to Camp
        </button>
      </div>

      <div className="class-select-grid">
        {allClasses.map((classDef) => (
          <button key={classDef.id} type="button" className="class-card" onClick={() => chooseClass(classDef.id)}>
            <GeneratedPortrait category="hero" id="knight" size={64} />
            <div className="class-card-name">{classDef.name}</div>
            <div className="class-card-description">{classDef.description}</div>
            <div className="class-card-stats">
              <span>HP x{classDef.statMultiplier.maxHp.toFixed(2)}</span>
              <span>ATK x{classDef.statMultiplier.attack.toFixed(2)}</span>
              <span>SPD x{(1 / classDef.statMultiplier.attackIntervalMs).toFixed(2)}</span>
            </div>
            <div className="class-card-weapons">
              Weapons: {classDef.weaponPool.map((id) => equipmentRegistry.get(id).name).join(', ')}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
