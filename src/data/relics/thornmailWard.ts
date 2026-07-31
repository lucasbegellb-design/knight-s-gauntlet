import type { RelicDefinition } from '../relic.types';

export const thornmailWard: RelicDefinition = {
  id: 'thornmail_ward',
  name: 'Thornmail Ward',
  rarity: 'epic',
  tags: ['vitality'],
  stacking: 'unique',
  description: 'Reflect a large portion of damage taken back at attackers.',
  modifiers: [{ kind: 'reflectDamagePercent', value: 0.25 }],
};
