import type { RelicModifier } from './relic.types';

/** A single, ever-improving meta weapon (not part of the in-run loot pool) that levels up between runs using Broken Parts salvaged from fallen monsters. */
export const forgeWeapon = {
  id: 'forge_weapon',
  name: 'The Reforged Edge',
  description: 'A blade you rebuild between runs. Every level permanently sharpens it — funded by Broken Parts salvaged from monsters, not gold.',
};

export const MAX_FORGE_WEAPON_LEVEL = 10;

/** Broken Parts needed to advance from `currentLevel` to `currentLevel + 1`. */
export function forgeWeaponUpgradeCost(currentLevel: number): number {
  return Math.round(6 * (currentLevel + 1) ** 1.55);
}

/** Passive combat modifiers granted per level (scales linearly with level, like a talent rank). */
export const FORGE_WEAPON_MODIFIERS_PER_LEVEL: RelicModifier[] = [
  { kind: 'damageMultiplier', value: 0.02 },
  { kind: 'critChance', value: 0.006 },
];

/** Expands the forge weapon's current level into the flat, already-scaled RelicModifier list it contributes for the run. */
export function resolveForgeWeaponModifiers(level: number): RelicModifier[] {
  if (level <= 0) return [];
  return FORGE_WEAPON_MODIFIERS_PER_LEVEL.map((modifier) => ({ kind: modifier.kind, value: modifier.value * level }));
}
