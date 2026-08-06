import type { RelicDefinition } from '../relic.types';

export const ironSkin: RelicDefinition = {
  id: 'iron_skin',
  name: 'Iron Skin',
  rarity: 'common',
  tags: ['vitality'],
  stacking: 'stackable',
  description: 'Increases maximum health.',
  flavor: "Not armour. Skin. The Forge was very literal.",
  modifiers: [{ kind: 'maxHpBonusPercent', value: 0.1 }],
};
