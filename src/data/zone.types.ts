export interface ZoneDefinition {
  id: string;
  name: string;
  description: string;
  /** First wave (inclusive) this zone covers. The last registered zone stays active for every wave beyond its own range (endless). */
  waveStart: number;
  /** Monster ids (any tier) this zone draws from. Falls back to the full tier pool if a tier has no members here. */
  monsterIds: string[];
  /** Background tint shown behind combat while this zone is active. */
  backgroundColor: number;
}
