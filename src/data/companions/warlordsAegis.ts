import type { CompanionDefinition } from '../companion.types';

export const warlordsAegis: CompanionDefinition = {
  id: 'warlords_aegis',
  element: 'dark',
  leaderSkill: {
    name: "Warlord's Command",
    description: "A banner that hits back. The squad fights like it has already won.",
    modifiers: [{ kind: 'damageMultiplier', value: 0.18 }, { kind: 'maxHpBonusPercent', value: 0.18 }],
  },
  name: "Warlord's Aegis",
  rarity: 'legendary',
  role: 'support',
  description: "A banner that hits back. The squad starts fighting like it has already won.",
  maxHp: 46,
  attack: 0,
  attackIntervalMs: 999_999,
  auraModifier: { kind: 'reflectDamagePercent', value: 0.08 },
};
