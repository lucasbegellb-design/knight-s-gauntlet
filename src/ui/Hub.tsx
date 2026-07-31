import { useState } from 'react';
import { useMetaStore, forgeUpgradeCost, companionUpgradeCost, MAX_FORGE_LEVEL, MAX_COMPANION_UPGRADE_RANK } from '../store/metaStore';
import { costForRank } from '../engine/talents';
import { allTalents } from '../data/talents';
import type { TalentBranch } from '../data/talent.types';
import { allCompanions } from '../data/companions';
import { allRelics } from '../data/relics';
import { allSpells } from '../data/spells';
import { allEquipment } from '../data/equipment';
import { allMonsters } from '../data/monsters';
import { RARITY_COLOR, RARITY_LABEL } from '../data/rarity';

const BRANCH_LABEL: Record<TalentBranch, string> = {
  offense: 'Offense',
  defense: 'Defense',
  utility: 'Utility',
  economy: 'Economy',
};

const TABS = ['talents', 'forge', 'companions', 'grimoire'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { talents: 'Talents', forge: 'Forge', companions: 'Companions', grimoire: 'Grimoire' };

function TalentsTab() {
  const currency = useMetaStore((s) => s.currency);
  const talentRanks = useMetaStore((s) => s.talentRanks);
  const purchaseTalentRank = useMetaStore((s) => s.purchaseTalentRank);

  const branches: TalentBranch[] = ['offense', 'defense', 'utility', 'economy'];

  return (
    <div className="hub-panel-grid">
      {branches.map((branch) => (
        <div key={branch} className="hub-card">
          <div className="hub-card-title">{BRANCH_LABEL[branch]}</div>
          {allTalents
            .filter((t) => t.branch === branch)
            .map((talent) => {
              const rank = talentRanks[talent.id] ?? 0;
              const maxed = rank >= talent.maxRank;
              const cost = costForRank(talent.baseCost, rank);
              return (
                <div key={talent.id} className="hub-row-item">
                  <div>
                    <div className="hub-item-name">
                      {talent.name}{' '}
                      <span className="hub-item-rank">
                        {rank}/{talent.maxRank}
                      </span>
                    </div>
                    <div className="hub-item-description">{talent.description}</div>
                  </div>
                  <button
                    type="button"
                    className="hub-buy-button"
                    disabled={maxed || currency < cost}
                    onClick={() => purchaseTalentRank(talent.id)}
                  >
                    {maxed ? 'Maxed' : `${cost}`}
                  </button>
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}

function ForgeTab() {
  const currency = useMetaStore((s) => s.currency);
  const forgeLevel = useMetaStore((s) => s.forgeLevel);
  const upgradeForge = useMetaStore((s) => s.upgradeForge);
  const maxed = forgeLevel >= MAX_FORGE_LEVEL;
  const cost = forgeUpgradeCost(forgeLevel);

  return (
    <div className="hub-card">
      <div className="hub-card-title">Forge</div>
      <div className="hub-row-item">
        <div>
          <div className="hub-item-name">
            Forge Level <span className="hub-item-rank">{forgeLevel}</span>
          </div>
          <div className="hub-item-description">All equipment found in future runs is permanently stronger (+1% power per level).</div>
        </div>
        <button type="button" className="hub-buy-button" disabled={maxed || currency < cost} onClick={() => upgradeForge()}>
          {maxed ? 'Maxed' : `${cost}`}
        </button>
      </div>
    </div>
  );
}

function CompanionsTab() {
  const currency = useMetaStore((s) => s.currency);
  const discoveredCompanionIds = useMetaStore((s) => s.discoveredCompanionIds);
  const companionUpgrades = useMetaStore((s) => s.companionUpgrades);
  const upgradeCompanion = useMetaStore((s) => s.upgradeCompanion);

  return (
    <div className="hub-card">
      <div className="hub-card-title">Companion Collection</div>
      {allCompanions.map((companion) => {
        const discovered = discoveredCompanionIds.includes(companion.id);
        if (!discovered) {
          return (
            <div key={companion.id} className="hub-row-item locked">
              <div className="hub-item-name">???</div>
              <div className="hub-item-description">Recruit this companion in a run to unlock it here.</div>
            </div>
          );
        }
        const rank = companionUpgrades[companion.id] ?? 0;
        const maxed = rank >= MAX_COMPANION_UPGRADE_RANK;
        const cost = companionUpgradeCost(rank);
        return (
          <div key={companion.id} className="hub-row-item">
            <div>
              <div className="hub-item-name">
                {companion.name} <span className="hub-item-rank">({companion.role})</span>{' '}
                <span className="hub-item-rank">
                  rank {rank}/{MAX_COMPANION_UPGRADE_RANK}
                </span>
              </div>
              <div className="hub-item-description">{companion.description}</div>
            </div>
            <button
              type="button"
              className="hub-buy-button"
              disabled={maxed || currency < cost}
              onClick={() => upgradeCompanion(companion.id)}
            >
              {maxed ? 'Maxed' : `${cost}`}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function GrimoireTab() {
  const discoveredRelicIds = useMetaStore((s) => s.discoveredRelicIds);
  const discoveredSpellIds = useMetaStore((s) => s.discoveredSpellIds);
  const discoveredEquipmentIds = useMetaStore((s) => s.discoveredEquipmentIds);
  const discoveredMonsterIds = useMetaStore((s) => s.discoveredMonsterIds);

  return (
    <div className="hub-panel-grid">
      <div className="hub-card">
        <div className="hub-card-title">Relics</div>
        {allRelics.map((relic) => {
          const known = discoveredRelicIds.includes(relic.id);
          return (
            <div key={relic.id} className="hub-row-item">
              <div>
                <div className="hub-item-name" style={{ color: known ? RARITY_COLOR[relic.rarity] : undefined }}>
                  {known ? relic.name : '???'}
                </div>
                {known && (
                  <div className="hub-item-description">
                    {RARITY_LABEL[relic.rarity]} · {relic.tags.join(', ')} — {relic.description}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hub-card">
        <div className="hub-card-title">Spells</div>
        {allSpells.map((spell) => {
          const known = discoveredSpellIds.includes(spell.id);
          return (
            <div key={spell.id} className="hub-row-item">
              <div>
                <div className="hub-item-name" style={{ color: known ? RARITY_COLOR[spell.rarity] : undefined }}>
                  {known ? spell.name : '???'}
                </div>
                {known && (
                  <div className="hub-item-description">
                    {RARITY_LABEL[spell.rarity]} · {spell.school} ({spell.kind}) — {spell.description}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hub-card">
        <div className="hub-card-title">Equipment</div>
        {allEquipment.map((item) => {
          const known = discoveredEquipmentIds.includes(item.id);
          return (
            <div key={item.id} className="hub-row-item">
              <div>
                <div className="hub-item-name">{known ? item.name : '???'}</div>
                {known && (
                  <div className="hub-item-description">
                    {item.slot} — {item.description}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hub-card">
        <div className="hub-card-title">Bestiary</div>
        {allMonsters.map((monster) => {
          const known = discoveredMonsterIds.includes(monster.id);
          return (
            <div key={monster.id} className="hub-row-item">
              <div>
                <div className="hub-item-name">{known ? monster.name : '???'}</div>
                {known && <div className="hub-item-description">{monster.tier}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Hub() {
  const [tab, setTab] = useState<Tab>('talents');
  const currency = useMetaStore((s) => s.currency);
  const setScreen = useMetaStore((s) => s.setScreen);

  return (
    <div className="hub">
      <div className="hud-row">
        <h2 className="hub-title">Camp</h2>
        <span className="gold-display">{currency} essence</span>
        <button type="button" className="restart-button" onClick={() => setScreen('run')}>
          Start Run
        </button>
      </div>

      <div className="hud-row">
        {TABS.map((t) => (
          <button key={t} type="button" className={`speed-button${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === 'talents' && <TalentsTab />}
      {tab === 'forge' && <ForgeTab />}
      {tab === 'companions' && <CompanionsTab />}
      {tab === 'grimoire' && <GrimoireTab />}
    </div>
  );
}
