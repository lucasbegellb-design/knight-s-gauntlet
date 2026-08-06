import { useState } from 'react';
import { useMetaStore } from '../store/metaStore';
import { allSigilUpgrades } from '../data/prestige';
import { PRESTIGE_MIN_DEEPEST_WAVE, canSealRecord, sigilReward } from '../engine/prestige';

/**
 * The Sealed Record.
 *
 * Two halves, deliberately kept apart on the page: the seal itself, which is destructive and
 * therefore states in full what it takes and what it leaves; and the Sigil catalogue, which is
 * where the reward is actually spent.
 *
 * The "what survives" list is not decoration. Prestige reads as punishment when a player cannot
 * tell in advance whether their collection is at risk, and this one never touches it — saying so
 * plainly, before the button, is most of what makes the decision feel safe to take.
 */
export function PrestigeTab() {
  const prestige = useMetaStore((s) => s.prestige);
  const sealRecord = useMetaStore((s) => s.sealRecord);
  const purchaseSigilUpgrade = useMetaStore((s) => s.purchaseSigilUpgrade);
  const [confirming, setConfirming] = useState(false);

  const eligible = canSealRecord(prestige.deepestWave);
  const reward = sigilReward(prestige.deepestWave);
  const wavesToGo = Math.max(0, PRESTIGE_MIN_DEEPEST_WAVE - prestige.deepestWave);

  return (
    <div className="hub-panel-grid">
      <div className="hub-card">
        <div className="hub-card-title">Seal the Record</div>
        <div className="hub-item-description">
          A candidate that stops producing new data is archived, and the apparatus begins another. Sealing ends this
          profile and starts a fresh one — you keep everything you <strong>collected</strong>, and give back everything
          you <strong>bought</strong>.
        </div>

        <div className="prestige-stats">
          <div>
            <span className="prestige-stat-label">Records sealed</span>
            <span className="prestige-stat-value">{prestige.count}</span>
          </div>
          <div>
            <span className="prestige-stat-label">Deepest wave</span>
            <span className="prestige-stat-value">{prestige.deepestWave}</span>
          </div>
          <div>
            <span className="prestige-stat-label">Unspent Sigils</span>
            <span className="prestige-stat-value">◈ {prestige.sigils}</span>
          </div>
        </div>

        <div className="prestige-ledger">
          <div className="prestige-ledger-column">
            <div className="prestige-ledger-title prestige-ledger-keep">Survives the seal</div>
            <ul>
              <li>Every companion you have summoned</li>
              <li>Ascension levels</li>
              <li>The Grimoire</li>
              <li>The Hall of Echoes</li>
              <li>Sigils and sigil upgrades</li>
            </ul>
          </div>
          <div className="prestige-ledger-column">
            <div className="prestige-ledger-title prestige-ledger-lose">Reset by the seal</div>
            <ul>
              <li>Essence and Broken Parts</li>
              <li>Talent ranks</li>
              <li>Forge level and Forge Weapon</li>
              <li>Companion upgrade ranks</li>
              <li>Territories, Lords, Treasury</li>
            </ul>
          </div>
        </div>

        {eligible ? (
          confirming ? (
            <div className="prestige-confirm">
              <div>
                Seal this record for <strong>◈ {reward} Sigils</strong>? This cannot be undone.
              </div>
              <div className="prestige-confirm-actions">
                <button type="button" className="hub-buy-button" onClick={() => sealRecord()}>
                  Seal it
                </button>
                <button type="button" className="restart-button restart-button-ghost" onClick={() => setConfirming(false)}>
                  Not yet
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="hub-buy-button prestige-seal-button" onClick={() => setConfirming(true)}>
              Seal the Record — ◈ {reward}
            </button>
          )
        ) : (
          <div className="prestige-locked">
            Reach wave {PRESTIGE_MIN_DEEPEST_WAVE} in a single run to seal a record. <strong>{wavesToGo}</strong> waves
            to go.
          </div>
        )}
      </div>

      <div className="hub-card">
        <div className="hub-card-title">Sigils ◈ {prestige.sigils}</div>
        <div className="hub-item-description">
          Sigils never buy a bigger number — every other system in the Gauntlet already sells those. They change what a
          run <em>is</em>.
        </div>

        {allSigilUpgrades.map((upgrade) => {
          const level = prestige.upgrades[upgrade.id] ?? 0;
          const maxed = level >= upgrade.maxLevel;
          const affordable = prestige.sigils >= upgrade.cost;

          return (
            <div key={upgrade.id} className="hub-row-item">
              <div>
                <div className="hub-item-name">
                  {upgrade.name}{' '}
                  <span className="hub-item-rank">
                    {level}/{upgrade.maxLevel}
                  </span>
                </div>
                <div className="hub-item-description">{upgrade.description}</div>
                <div className="hub-item-flavor">{upgrade.flavor}</div>
              </div>
              <button
                type="button"
                className="hub-buy-button"
                disabled={maxed || !affordable}
                onClick={() => purchaseSigilUpgrade(upgrade.id)}
              >
                {maxed ? 'Maxed' : `◈ ${upgrade.cost}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
