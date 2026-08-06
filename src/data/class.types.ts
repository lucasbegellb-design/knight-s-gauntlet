import type { RelicModifier } from './relic.types';
import type { HeroStatMultiplier } from '../engine/heroProgression';
import type { Element } from '../engine/elements';

export interface ClassDefinition {
  id: string;
  name: string;
  description: string;
  /** The hero's elemental affinity for the whole run. */
  element: Element;
  /** Applied to the base Knight hero's stats + per-level growth before a run starts. */
  statMultiplier: HeroStatMultiplier;
  /** Folded into the hero's combat modifiers for the whole run, alongside relics/equipment/talents. */
  innateModifiers: RelicModifier[];
  /** Weapon (equipment slot 'weapon') ids this class may roll as its random starting weapon. */
  weaponPool: string[];
  /** Tint applied to the hero sprite so classes read as visually distinct while sharing one base sprite. */
  tint: number;
}
