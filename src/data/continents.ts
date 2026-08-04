import { Registry } from './registry';
import type { ContinentDefinition } from './continent.types';
import { greenwoodFringe, bonefields, cinderWastes, wyrmsReach } from './zones';

export const sunderedIsles: ContinentDefinition = {
  id: 'sundered_isles',
  name: 'The Sundered Isles',
  tagline: 'Where every gauntlet begins.',
  description:
    'A chain of overgrown islands, half-swallowed by forest and grave-dust. Adventurers wash up here with nothing but a blade and a bad idea — most don’t make it past the boneyards at the chain’s far end.',
  zoneIds: [greenwoodFringe.id, bonefields.id],
};

export const ashenReaches: ContinentDefinition = {
  id: 'ashen_reaches',
  name: 'The Ashen Reaches',
  tagline: 'Where the fire never dies, and neither does the Wyrm.',
  description:
    'Beyond the Isles the world burns: ash-flats scorched by something ancient, and a rift so deep it has no floor. Nobody who reaches the Reaches was ever the same person that left the Isles.',
  zoneIds: [cinderWastes.id, wyrmsReach.id],
};

export const continentRegistry = new Registry<ContinentDefinition>();
continentRegistry.registerAll([sunderedIsles, ashenReaches]);

export const allContinents = continentRegistry.all();

export function continentForZone(zoneId: string): ContinentDefinition | undefined {
  return allContinents.find((continent) => continent.zoneIds.includes(zoneId));
}
