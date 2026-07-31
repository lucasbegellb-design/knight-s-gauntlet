import { Registry } from './registry';
import type { ZoneDefinition } from './zone.types';
import { allMonsters } from './monsters';

export const greenwoodFringe: ZoneDefinition = {
  id: 'greenwood_fringe',
  name: 'Greenwood Fringe',
  description: 'The edge of the gauntlet — goblins, slime, and wolves test the unwary.',
  waveStart: 1,
  monsterIds: ['goblin_grunt', 'slime', 'wolf', 'giant_rat', 'forest_spider', 'orc_chieftain', 'ancient_wyrm'],
  backgroundColor: 0x1f3a24,
};

export const bonefields: ZoneDefinition = {
  id: 'bonefields',
  name: 'Bonefields',
  description: 'A sunken graveyard. Skeletons and wraiths rise from the dust.',
  waveStart: 11,
  monsterIds: ['skeleton', 'bat', 'shade_wraith', 'bandit_thug', 'troll_berserker', 'frost_lich'],
  backgroundColor: 0x2a2438,
};

export const cinderWastes: ZoneDefinition = {
  id: 'cinder_wastes',
  name: 'Cinder Wastes',
  description: 'Scorched, ash-choked flats where trolls and venomous broods lurk.',
  waveStart: 21,
  monsterIds: ['swamp_troll', 'bandit_thug', 'shade_wraith', 'bat', 'venomous_broodmother', 'inferno_golem'],
  backgroundColor: 0x3a1f1f,
};

export const wyrmsReach: ZoneDefinition = {
  id: 'wyrms_reach',
  name: "Wyrm's Reach",
  description: 'The gauntlet has no end here — every horror encountered so far returns, harder.',
  waveStart: 31,
  monsterIds: allMonsters.map((m) => m.id),
  backgroundColor: 0x241f38,
};

export const zoneRegistry = new Registry<ZoneDefinition>();
zoneRegistry.registerAll([greenwoodFringe, bonefields, cinderWastes, wyrmsReach]);

/** Ordered by waveStart ascending — zoneForWave relies on this order. */
export const allZones = [...zoneRegistry.all()].sort((a, b) => a.waveStart - b.waveStart);
