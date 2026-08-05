import type { RelicModifier } from '../relic.types';

/** A one-time conquest — a territory grants a small permanent stat bonus once claimed. */
export interface KingdomTerritoryDefinition {
  id: string;
  name: string;
  description: string;
  /** Essence cost to conquer. */
  cost: number;
  modifiers: RelicModifier[];
}

/** A one-time recruit — a court advisor/general granting a small permanent stat bonus once recruited. */
export interface KingdomLordDefinition {
  id: string;
  name: string;
  title: string;
  description: string;
  /** Essence cost to recruit. */
  cost: number;
  modifiers: RelicModifier[];
}
