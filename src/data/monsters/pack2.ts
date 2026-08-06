import type { MonsterDefinition } from '../monster.types';

/** Phase 6 content scale-up: additional monsters, grouped in one file (see DESIGN_NOTES.md). */
export const monsterPack2: MonsterDefinition[] = [
  { id: 'giant_rat', element: 'water', name: 'Giant Rat', flavor: "Ate the archives. Now knows more about the project than you do.", tier: 'normal', maxHp: 16, attack: 3, attackIntervalMs: 600, xpReward: 8 },
  { id: 'forest_spider', element: 'dark', name: 'Forest Spider', flavor: "Weaves across the Bonefields markers. Improves them, arguably.", tier: 'normal', maxHp: 24, attack: 5, attackIntervalMs: 1100, xpReward: 11 },
  { id: 'bandit_thug', element: 'fire', name: 'Bandit Thug', flavor: "Robbing people in a place with no economy. Committed, at least.", tier: 'normal', maxHp: 32, attack: 6, attackIntervalMs: 1200, xpReward: 12 },
  { id: 'swamp_troll', element: 'water', name: 'Swamp Troll', flavor: "Was told to guard a bridge. There is no bridge. It is still guarding.", tier: 'normal', maxHp: 40, attack: 5, attackIntervalMs: 1500, xpReward: 14 },
  { id: 'shade_wraith', element: 'dark', name: 'Shade Wraith', flavor: "What is left of someone who read the full project brief.", tier: 'normal', maxHp: 20, attack: 6, attackIntervalMs: 650, xpReward: 10 },
  { id: 'troll_berserker', element: 'earth', name: 'Troll Berserker', flavor: "Stopped guarding the bridge. Everyone preferred the bridge.", tier: 'miniboss', maxHp: 100, attack: 11, attackIntervalMs: 1100, xpReward: 45 },
  {
    id: 'venomous_broodmother',
    element: 'water',
    name: 'Venomous Broodmother',
    flavor: "Nesting in the intake vents. Very warm. Very bad.",
    tier: 'miniboss',
    maxHp: 85,
    attack: 8,
    attackIntervalMs: 900,
    xpReward: 42,
  },
  { id: 'frost_lich', element: 'water', name: 'Frost Lich', flavor: "Solved mortality. Did not read the terms.", tier: 'boss', maxHp: 240, attack: 13, attackIntervalMs: 1200, xpReward: 130 },
  { id: 'inferno_golem', element: 'fire', name: 'Inferno Golem', flavor: "Assembled from Forge slag by the Forge, out of habit.", tier: 'boss', maxHp: 260, attack: 15, attackIntervalMs: 1300, xpReward: 140 },
];
