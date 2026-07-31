import { useRunStore } from '../store/runStore';
import { RARITY_COLOR, RARITY_LABEL, type Rarity } from '../data/rarity';
import type { LootOption } from '../engine/loot';

function describeOption(option: LootOption): { name: string; description: string; rarity: Rarity; kindLabel: string } {
  if (option.kind === 'relic') {
    return { name: option.relic.name, description: option.relic.description, rarity: option.rarity, kindLabel: 'Relic' };
  }
  if (option.kind === 'equipment') {
    return {
      name: option.equipment.name,
      description: option.equipment.description,
      rarity: option.rarity,
      kindLabel: 'Equipment',
    };
  }
  if (option.kind === 'companion') {
    return {
      name: option.companion.name,
      description: option.companion.description,
      rarity: option.rarity,
      kindLabel: `Companion (${option.companion.role})`,
    };
  }
  if (option.kind === 'spell') {
    return {
      name: option.spell.name,
      description: option.spell.description,
      rarity: option.rarity,
      kindLabel: option.spell.kind === 'active' ? 'Active Spell' : 'Passive Spell',
    };
  }
  return { name: 'Gold', description: `Gain ${option.amount} gold.`, rarity: 'common', kindLabel: 'Gold' };
}

export function LootPopup() {
  const isChoosingLoot = useRunStore((state) => state.isChoosingLoot);
  const lootOptions = useRunStore((state) => state.lootOptions);
  const requestLootChoice = useRunStore((state) => state.requestLootChoice);

  if (!isChoosingLoot) return null;

  return (
    <div className="loot-overlay">
      <div className="loot-title">Choose Your Reward</div>
      <div className="loot-cards">
        {lootOptions.map((option, index) => {
          const info = describeOption(option);
          const color = RARITY_COLOR[info.rarity];
          const rarityClass = info.rarity === 'mythic' ? ' loot-card-mythic' : info.rarity === 'legendary' ? ' loot-card-legendary' : '';
          return (
            <button
              key={index}
              type="button"
              className={`loot-card${rarityClass}`}
              style={{ borderColor: color, boxShadow: `0 0 18px ${color}66` }}
              onClick={() => requestLootChoice(index)}
            >
              <div className="loot-card-rarity" style={{ color }}>
                {RARITY_LABEL[info.rarity]}
              </div>
              <div className="loot-card-kind">{info.kindLabel}</div>
              <div className="loot-card-name">{info.name}</div>
              <div className="loot-card-description">{info.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
