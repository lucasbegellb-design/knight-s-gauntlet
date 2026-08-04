export interface ContinentDefinition {
  id: string;
  name: string;
  /** Short one-line story hook shown under the continent name. */
  tagline: string;
  /** Longer lore blurb for the World tab. */
  description: string;
  /** Zone ids (from zones.ts) belonging to this continent, in the order the run reaches them. */
  zoneIds: string[];
}
