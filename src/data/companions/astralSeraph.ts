import type { CompanionDefinition } from '../companion.types';

export const astralSeraph: CompanionDefinition = {
  id: 'astral_seraph',
  element: 'light',
  leaderSkill: {
    name: 'Ascendant Aegis',
    description: "Something older than the Gauntlet decides your squad is worth keeping.",
    modifiers: [{ kind: 'damageMultiplier', value: 0.25 }, { kind: 'maxHpBonusPercent', value: 0.2 }, { kind: 'lifestealPercent', value: 0.1 }],
  },
  name: 'Astral Seraph',
  rarity: 'mythic',
  role: 'support',
  description: "Something older than the Forge looked at your squad and decided it was worth keeping.",
  maxHp: 36,
  attack: 0,
  attackIntervalMs: 999_999,
  auraModifier: { kind: 'damageMultiplier', value: 0.12 },
};
