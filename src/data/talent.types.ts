import type { RelicModifier } from './relic.types';

export type TalentBranch = 'offense' | 'defense' | 'utility' | 'economy';

export type TalentEffect = { kind: 'modifier'; modifier: RelicModifier } | { kind: 'lootLuck'; valuePerRank: number };

export interface TalentDefinition {
  id: string;
  name: string;
  branch: TalentBranch;
  description: string;
  maxRank: number;
  baseCost: number;
  effect: TalentEffect;
}
