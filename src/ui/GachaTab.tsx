import { allCompanions } from '../data/companions';
import { GACHA_RARITY_WEIGHTS } from '../engine/gacha';
import { RARITY_COLOR, RARITY_LABEL, RARITY_ORDER } from '../data/rarity';
import {
  useMetaStore,
  GACHA_SINGLE_PULL_COST,
  GACHA_MULTI_PULL_COST,
  GACHA_MULTI_PULL_COUNT,
} from '../store/metaStore';
import { GeneratedPortrait } from './RarityIcon';

export function GachaTab() {
  const currency = useMetaStore((s) => s.currency);
  const unlockedCompanionIds = useMetaStore((s) => s.unlockedCompanionIds);
  const pullGachaSingle = useMetaStore((s) => s.pullGachaSingle);
  const pullGachaMulti = useMetaStore((s) => s.pullGachaMulti);

  const unlockedSet = new Set(unlockedCompanionIds);

  return (
    <div className="hub-panel-grid">
      <div className="hub-card gacha-summon-card">
        <div className="hub-card-title">Summon</div>
        <p className="hub-item-description">
          Spend essence to summon new characters into your roster. Once summoned, a character can appear as a recruit during any run.
        </p>

        <div className="gacha-rate-row">
          {RARITY_ORDER.map((rarity) => (
            <span key={rarity} className="gacha-rate-chip" style={{ color: RARITY_COLOR[rarity], borderColor: RARITY_COLOR[rarity] }}>
              {RARITY_LABEL[rarity]} {GACHA_RARITY_WEIGHTS[rarity]}%
            </span>
          ))}
        </div>

        <div className="gacha-pull-buttons">
          <button type="button" className="restart-button gacha-pull-button" disabled={currency < GACHA_SINGLE_PULL_COST} onClick={() => pullGachaSingle()}>
            Summon x1
            <span className="gacha-pull-cost">🪙 {GACHA_SINGLE_PULL_COST}</span>
          </button>
          <button
            type="button"
            className="restart-button gacha-pull-button gacha-pull-button-multi"
            disabled={currency < GACHA_MULTI_PULL_COST}
            onClick={() => pullGachaMulti()}
          >
            Summon x{GACHA_MULTI_PULL_COUNT}
            <span className="gacha-pull-cost">🪙 {GACHA_MULTI_PULL_COST}</span>
          </button>
        </div>
      </div>

      <div className="hub-card">
        <div className="hub-card-title">Roster</div>
        <div className="gacha-roster-grid">
          {allCompanions.map((companion) => {
            const unlocked = unlockedSet.has(companion.id);
            const color = RARITY_COLOR[companion.rarity];
            return (
              <div
                key={companion.id}
                className={`gacha-roster-item${unlocked ? '' : ' locked'}`}
                style={{ borderColor: unlocked ? color : undefined }}
              >
                {unlocked ? (
                  <GeneratedPortrait category="companions_illustration" id={companion.id} size={56} />
                ) : (
                  <div className="gacha-roster-silhouette">?</div>
                )}
                <div className="gacha-roster-name" style={{ color: unlocked ? color : undefined }}>
                  {unlocked ? companion.name : '???'}
                </div>
                <div className="gacha-roster-rarity">{RARITY_LABEL[companion.rarity]}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
