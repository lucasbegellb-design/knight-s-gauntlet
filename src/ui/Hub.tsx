import { useState } from 'react';
import {
  useMetaStore,
  forgeUpgradeCost,
  companionUpgradeCost,
  ascensionShardCost,
  companionMaxRank,
  MAX_FORGE_LEVEL,
  MAX_COMPANION_UPGRADE_RANK,
  MAX_ASCENSION_LEVEL,
} from '../store/metaStore';
import { costForRank } from '../engine/talents';
import { allTalents } from '../data/talents';
import type { TalentBranch } from '../data/talent.types';
import { allCompanions } from '../data/companions';
import { allRelics } from '../data/relics';
import { allSpells } from '../data/spells';
import { allEquipment } from '../data/equipment';
import { allMonsters } from '../data/monsters';
import { RARITY_COLOR, RARITY_LABEL } from '../data/rarity';
import { GeneratedPortrait } from './RarityIcon';
import { forgeWeapon, forgeWeaponUpgradeCost, resolveForgeWeaponModifiers, MAX_FORGE_WEAPON_LEVEL } from '../data/forgeWeapon';
import { GachaTab } from './GachaTab';
import { GachaReveal } from './GachaReveal';
import { WorldTab } from './WorldTab';
import { KingdomTab } from './KingdomTab';
import { IdleEssenceBanner } from './IdleEssenceBanner';
import { EchoesTab } from './EchoesTab';
import { ElementBadge } from './ElementBadge';

const MODIFIER_LABEL: Record<string, string> = {
  damageMultiplier: 'damage',
  critChance: 'crit chance',
};

function describeForgeWeaponModifiers(level: number): string {
  const modifiers = resolveForgeWeaponModifiers(level);
  if (modifiers.length === 0) return 'Unforged — no bonuses yet.';
  return modifiers.map((m) => `+${(m.value * 100).toFixed(1)}% ${MODIFIER_LABEL[m.kind] ?? m.kind}`).join(' · ');
}

const BRANCH_LABEL: Record<TalentBranch, string> = {
  offense: 'Offense',
  defense: 'Defense',
  utility: 'Utility',
  economy: 'Economy',
};

const TABS = ['talents', 'forge', 'gacha', 'companions', 'kingdom', 'echoes', 'grimoire', 'world'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  talents: 'Talents',
  forge: 'Forge',
  gacha: 'Gacha',
  companions: 'Companions',
  kingdom: 'Kingdom',
  echoes: 'Echoes',
  grimoire: 'Grimoire',
  world: 'World',
};
const TAB_ICON: Record<Tab, string> = {
  talents: '✨',
  forge: '🔨',
  gacha: '🔮',
  companions: '🤝',
  kingdom: '🏰',
  echoes: '☾',
  grimoire: '📖',
  world: '🗺️',
};

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

  const brokenParts = useMetaStore((s) => s.brokenParts);
  const forgeWeaponLevel = useMetaStore((s) => s.forgeWeaponLevel);
  const upgradeForgeWeapon = useMetaStore((s) => s.upgradeForgeWeapon);
  const weaponMaxed = forgeWeaponLevel >= MAX_FORGE_WEAPON_LEVEL;
  const weaponCost = forgeWeaponUpgradeCost(forgeWeaponLevel);

  return (
    <div className="hub-panel-grid">
      <div className="hub-card">
        <div className="hub-card-title">Equipment Forge</div>
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

      <div className="hub-card forge-weapon-card">
        <div className="hub-card-title">{forgeWeapon.name}</div>
        <div className="hub-item-description">{forgeWeapon.description}</div>

        <div className="forge-weapon-level-row">
          <div className="forge-weapon-level-badge">
            Lv. {forgeWeaponLevel}
            <span className="hub-item-rank">/{MAX_FORGE_WEAPON_LEVEL}</span>
          </div>
          <span className="forge-parts-display">⚙️ {brokenParts} broken parts</span>
        </div>

        <div className="hub-row-item">
          <div>
            <div className="hub-item-name">Current bonus</div>
            <div className="hub-item-description">{describeForgeWeaponModifiers(forgeWeaponLevel)}</div>
            {!weaponMaxed && (
              <div className="hub-item-description forge-weapon-next">Next level: {describeForgeWeaponModifiers(forgeWeaponLevel + 1)}</div>
            )}
          </div>
          <button
            type="button"
            className="hub-buy-button"
            disabled={weaponMaxed || brokenParts < weaponCost}
            onClick={() => upgradeForgeWeapon()}
          >
            {weaponMaxed ? 'Maxed' : `${weaponCost} parts`}
          </button>
        </div>
      </div>
    </div>
  );
}

function CompanionsTab() {
  const currency = useMetaStore((s) => s.currency);
  const discoveredCompanionIds = useMetaStore((s) => s.discoveredCompanionIds);
  const companionUpgrades = useMetaStore((s) => s.companionUpgrades);
  const upgradeCompanion = useMetaStore((s) => s.upgradeCompanion);
  const companionShards = useMetaStore((s) => s.companionShards);
  const companionAscension = useMetaStore((s) => s.companionAscension);
  const ascendCompanion = useMetaStore((s) => s.ascendCompanion);

  return (
    <div className="hub-card">
      <div className="hub-card-title">Companion Collection</div>
      <div className="hub-item-description">
        Duplicate summons grant Ascension Shards for that character, raising their rank cap beyond {MAX_COMPANION_UPGRADE_RANK} — the
        Gacha keeps paying off long after your roster is complete.
      </div>
      {allCompanions.map((companion) => {
        const discovered = discoveredCompanionIds.includes(companion.id);
        if (!discovered) {
          return (
            <div key={companion.id} className="hub-row-item locked">
              <div className="hub-item-name">???</div>
              <div className="hub-item-description">Summon this character in the Gacha to unlock it here.</div>
            </div>
          );
        }
        const ascensionLevel = companionAscension[companion.id] ?? 0;
        const maxRank = companionMaxRank(ascensionLevel);
        const rank = companionUpgrades[companion.id] ?? 0;
        const maxed = rank >= maxRank;
        const cost = companionUpgradeCost(rank);

        const shards = companionShards[companion.id] ?? 0;
        const ascensionMaxed = ascensionLevel >= MAX_ASCENSION_LEVEL;
        const ascensionCost = ascensionShardCost(ascensionLevel);

        return (
          <div key={companion.id} className="hub-row-item">
            <GeneratedPortrait category="companions_illustration" id={companion.id} size={40} />
            <div>
              <div className="hub-item-name">
                {companion.name} <span className="hub-item-rank">({companion.role})</span>{' '}
                <span className="hub-item-rank">
                  rank {rank}/{maxRank}
                </span>
                {ascensionLevel > 0 && <span className="hub-item-rank">· ascension {ascensionLevel}</span>}
              </div>
              <div className="hub-item-description">{companion.description}</div>
              <div className="hub-item-description">💎 {shards} ascension shards</div>
            </div>
            <button
              type="button"
              className="hub-buy-button"
              disabled={maxed || currency < cost}
              onClick={() => upgradeCompanion(companion.id)}
            >
              {maxed ? 'Maxed' : `${cost}`}
            </button>
            <button
              type="button"
              className="hub-buy-button"
              disabled={ascensionMaxed || shards < ascensionCost}
              onClick={() => ascendCompanion(companion.id)}
            >
              {ascensionMaxed ? 'Maxed' : `Ascend (${ascensionCost} 💎)`}
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
                  <>
                    <div className="hub-item-description">
                      {RARITY_LABEL[relic.rarity]} · {relic.tags.join(', ')} — {relic.description}
                    </div>
                    {relic.flavor && <div className="hub-item-flavor">{relic.flavor}</div>}
                  </>
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
              {known && <GeneratedPortrait category="monsters" id={monster.id} size={36} />}
              <div>
                <div className="hub-item-name">
                  {known ? monster.name : '???'} {known && <ElementBadge element={monster.element} compact />}
                </div>
                {known && (
                  <>
                    <div className="hub-item-description">{monster.tier}</div>
                    {monster.flavor && <div className="hub-item-flavor">{monster.flavor}</div>}
                  </>
                )}
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
      <div className="hud-row hub-topbar">
        <GeneratedPortrait category="hero" id="knight" size={48} />
        <h2 className="hub-title">Camp</h2>
        <span className="gold-display">🪙 {currency} essence</span>
        <button type="button" className="restart-button" onClick={() => setScreen('classSelect')}>
          Start Run →
        </button>
      </div>

      <IdleEssenceBanner />

      <div className="hud-row hub-tab-row">
        {TABS.map((t) => (
          <button key={t} type="button" className={`hub-tab-button${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            <span className="tab-icon">{TAB_ICON[t]}</span> {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === 'talents' && <TalentsTab />}
      {tab === 'forge' && <ForgeTab />}
      {tab === 'gacha' && <GachaTab />}
      {tab === 'companions' && <CompanionsTab />}
      {tab === 'kingdom' && <KingdomTab />}
      {tab === 'echoes' && <EchoesTab />}
      {tab === 'grimoire' && <GrimoireTab />}
      {tab === 'world' && <WorldTab />}

      <GachaReveal />
    </div>
  );
}
