import { useMetaStore, GACHA_SINGLE_PULL_COST } from '../store/metaStore';
import { RARITY_COLOR, RARITY_LABEL } from '../data/rarity';
import { GeneratedPortrait } from './RarityIcon';

const DUPLICATE_REFUND = Math.round(GACHA_SINGLE_PULL_COST * 0.3);

/** Full-screen reveal shown right after a Gacha pull — reuses the loot-overlay visual language but for summoned characters. */
export function GachaReveal() {
  const results = useMetaStore((s) => s.lastGachaResults);
  const clearGachaResults = useMetaStore((s) => s.clearGachaResults);

  if (!results || results.length === 0) return null;

  return (
    <div className="loot-overlay gacha-reveal-overlay">
      <div className="loot-title">{results.length > 1 ? `${results.length} Characters Summoned!` : 'Character Summoned!'}</div>
      <div className="loot-cards gacha-reveal-cards">
        {results.map((result, index) => {
          const color = RARITY_COLOR[result.companion.rarity];
          const rarityClass =
            result.companion.rarity === 'mythic' ? ' loot-card-mythic' : result.companion.rarity === 'legendary' ? ' loot-card-legendary' : '';
          return (
            <div
              key={`${result.companion.id}-${index}`}
              className={`loot-card gacha-reveal-card${rarityClass}`}
              style={{ borderColor: color, boxShadow: `0 0 18px ${color}66` }}
            >
              {result.isNew && <span className="gacha-new-badge">NEW</span>}
              <GeneratedPortrait category="companions_illustration" id={result.companion.id} size={96} />
              <div className="loot-card-rarity" style={{ color }}>
                {RARITY_LABEL[result.companion.rarity]}
              </div>
              <div className="loot-card-name">{result.companion.name}</div>
              {!result.isNew && <div className="gacha-duplicate-tag">Duplicate — +{DUPLICATE_REFUND} essence</div>}
            </div>
          );
        })}
      </div>
      <button type="button" className="restart-button" onClick={() => clearGachaResults()}>
        Continue
      </button>
    </div>
  );
}
