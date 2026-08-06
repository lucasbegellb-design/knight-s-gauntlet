import type { CompanionDefinition } from '../companion.types';

export const arcaneMarksman: CompanionDefinition = {
  id: 'arcane_marksman',
  element: 'thunder',
  leaderSkill: {
    name: 'Mark the Weak',
    description: "Every seam in the armour, called out loud before the squad swings.",
    modifiers: [{ kind: 'critChance', value: 0.08 }, { kind: 'critDamageMultiplier', value: 0.2 }],
  },
  name: 'Arcane Marksman',
  rarity: 'rare',
  role: 'dps',
  description: "Calls every weak point out loud before firing. Nobody has asked her to stop.",
  maxHp: 26,
  attack: 8,
  attackIntervalMs: 1100,
};
