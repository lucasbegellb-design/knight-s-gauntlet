import { useMetaStore } from '../store/metaStore';
import { allLords, allTerritories } from '../data/kingdom';
import { MAX_TREASURY_LEVEL, treasuryUpgradeCost } from '../engine/kingdom';
import type { RelicModifier } from '../data/relic.types';

const MODIFIER_LABEL: Record<string, string> = {
  damageMultiplier: 'damage',
  critChance: 'crit chance',
  maxHpBonusPercent: 'max HP',
  goldMultiplier: 'gold',
  xpMultiplier: 'XP',
  attackSpeedMultiplier: 'attack speed',
  lifestealPercent: 'lifesteal',
};

function describeModifiers(modifiers: RelicModifier[]): string {
  return modifiers.map((m) => `+${(m.value * 100).toFixed(1)}% ${MODIFIER_LABEL[m.kind] ?? m.kind}`).join(' · ');
}

export function KingdomTab() {
  const currency = useMetaStore((s) => s.currency);
  const conqueredTerritoryIds = useMetaStore((s) => s.conqueredTerritoryIds);
  const conquerTerritory = useMetaStore((s) => s.conquerTerritory);
  const recruitedLordIds = useMetaStore((s) => s.recruitedLordIds);
  const recruitLord = useMetaStore((s) => s.recruitLord);
  const treasuryLevel = useMetaStore((s) => s.treasuryLevel);
  const upgradeTreasury = useMetaStore((s) => s.upgradeTreasury);

  const treasuryMaxed = treasuryLevel >= MAX_TREASURY_LEVEL;
  const treasuryCost = treasuryUpgradeCost(treasuryLevel);

  return (
    <div className="hub-panel-grid">
      <div className="hub-card">
        <div className="hub-card-title">Royal Treasury</div>
        <div className="hub-item-description">
          A permanent gold/XP boost that never caps out — the long-term home for essence once everything else is maxed.
        </div>
        <div className="hub-row-item">
          <div>
            <div className="hub-item-name">
              Treasury Level <span className="hub-item-rank">{treasuryLevel}/{MAX_TREASURY_LEVEL}</span>
            </div>
            <div className="hub-item-description">+0.5% gold and +0.5% XP per level, permanently.</div>
          </div>
          <button
            type="button"
            className="hub-buy-button"
            disabled={treasuryMaxed || currency < treasuryCost}
            onClick={() => upgradeTreasury()}
          >
            {treasuryMaxed ? 'Maxed' : `${treasuryCost}`}
          </button>
        </div>
      </div>

      <div className="hub-card">
        <div className="hub-card-title">Territories</div>
        <div className="hub-item-description">Conquer territories beyond the Gauntlet for permanent, one-time stat bonuses.</div>
        {allTerritories.map((territory) => {
          const owned = conqueredTerritoryIds.includes(territory.id);
          return (
            <div key={territory.id} className="hub-row-item">
              <div>
                <div className="hub-item-name">{territory.name}</div>
                <div className="hub-item-description">
                  {territory.description} — {describeModifiers(territory.modifiers)}
                </div>
              </div>
              <button
                type="button"
                className="hub-buy-button"
                disabled={owned || currency < territory.cost}
                onClick={() => conquerTerritory(territory.id)}
              >
                {owned ? 'Conquered' : `${territory.cost}`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="hub-card">
        <div className="hub-card-title">Allied Lords</div>
        <div className="hub-item-description">Recruit generals and advisors to your court for permanent, one-time stat bonuses.</div>
        {allLords.map((lord) => {
          const owned = recruitedLordIds.includes(lord.id);
          return (
            <div key={lord.id} className="hub-row-item">
              <div>
                <div className="hub-item-name">
                  {lord.name} <span className="hub-item-rank">{lord.title}</span>
                </div>
                <div className="hub-item-description">
                  {lord.description} — {describeModifiers(lord.modifiers)}
                </div>
              </div>
              <button
                type="button"
                className="hub-buy-button"
                disabled={owned || currency < lord.cost}
                onClick={() => recruitLord(lord.id)}
              >
                {owned ? 'Recruited' : `${lord.cost}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
