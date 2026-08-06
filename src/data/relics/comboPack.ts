import type { RelicDefinition } from '../relic.types';

/**
 * The combo pack — the first relics authored *for* the conditional/multiplicative layer rather
 * than for the flat additive sums.
 *
 * Every relic before these resolved into one of fifteen `${kind}Sum` numbers, which is why sixty
 * of them never produced a build: nothing any relic did could depend on anything another relic
 * did. These are deliberately the opposite. Each is unremarkable alone and each has an obvious
 * partner, so the interesting decision is which *pair* to chase rather than which single number
 * is biggest:
 *
 *  - Hoarder's Ledger and Curator's Seal both reward breadth, and multiply with each other.
 *  - Last Stand and Cracked Hourglass both want you hurt; Bloodletter's Pact pays you for it.
 *  - Elementalist's Focus and Prism Core both want a wide squad, which fights the element-stacking
 *    that Zealot's Brand rewards — a real fork, not two flavours of the same choice.
 *  - Executioner's Tally and Opening Gambit split the fight in half: one wants the enemy healthy,
 *    the other wants it nearly dead, and taking both is a deliberately mediocre play.
 *
 * All are `unique` — stacking a multiplicative relic compounds far too fast to stay tunable.
 */
export const comboPackRelics: RelicDefinition[] = [
  {
    id: 'hoarders_ledger',
    name: "Hoarder's Ledger",
    rarity: 'rare',
    tags: ['economy'],
    stacking: 'unique',
    description: 'Every relic you carry makes the rest hit harder. +4% damage per relic owned.',
    flavor: "Counts what you own and quietly judges the total upward.",
    modifiers: [],
    conditionals: [{ condition: { kind: 'perRelicOwned' }, damageMultiplier: 0.04 }],
  },
  {
    id: 'curators_seal',
    name: "Curator's Seal",
    rarity: 'epic',
    tags: ['economy'],
    stacking: 'unique',
    description: 'A collection is worth more than its parts. +3% crit chance per relic owned.',
    flavor: "A collection, correctly displayed, becomes a threat.",
    modifiers: [],
    conditionals: [{ condition: { kind: 'perRelicOwned' }, critChance: 0.03 }],
  },
  {
    id: 'last_stand',
    name: 'Last Stand',
    rarity: 'rare',
    tags: ['blood'],
    stacking: 'unique',
    description: 'Below half health, you fight like it matters. x1.6 damage while wounded.',
    flavor: "Works best at the exact moment you would rather it did not apply.",
    modifiers: [],
    conditionals: [{ condition: { kind: 'attackerBelowHalfHp' }, damageMultiplier: 0.6 }],
  },
  {
    id: 'bloodletters_pact',
    name: "Bloodletter's Pact",
    rarity: 'epic',
    tags: ['blood'],
    stacking: 'unique',
    description: 'Pays out in proportion to what you have already lost. +7% damage per tenth of missing health.',
    flavor: "Paid out in arrears, in your own currency.",
    modifiers: [],
    conditionals: [{ condition: { kind: 'perMissingHpTenth' }, damageMultiplier: 0.07 }],
  },
  {
    id: 'cracked_hourglass',
    name: 'Cracked Hourglass',
    rarity: 'rare',
    tags: ['speed'],
    stacking: 'unique',
    description: 'Time runs faster for the desperate. +12% crit chance while below half health.',
    flavor: "Runs faster the emptier it gets. So do you.",
    modifiers: [],
    conditionals: [{ condition: { kind: 'attackerBelowHalfHp' }, critChance: 0.12 }],
  },
  {
    id: 'executioners_tally',
    name: "Executioner's Tally",
    rarity: 'epic',
    tags: ['crit'],
    stacking: 'unique',
    description: 'Finishes what the fight started. x1.8 damage against enemies below half health.',
    flavor: "Only interested in the last part of a fight.",
    modifiers: [],
    conditionals: [{ condition: { kind: 'targetBelowHalfHp' }, damageMultiplier: 0.8 }],
  },
  {
    id: 'opening_gambit',
    name: 'Opening Gambit',
    rarity: 'rare',
    tags: ['crit'],
    stacking: 'unique',
    description: 'The first blow decides most fights. x1.5 damage against enemies above half health.',
    flavor: "Only interested in the first. They do not get along.",
    modifiers: [],
    conditionals: [{ condition: { kind: 'targetAboveHalfHp' }, damageMultiplier: 0.5 }],
  },
  {
    id: 'elementalists_focus',
    name: "Elementalist's Focus",
    rarity: 'epic',
    tags: ['forge'],
    stacking: 'unique',
    description: 'A broad squad channels cleanly. +14% damage per distinct element among your living companions.',
    flavor: "Wants a broad squad. Says so constantly.",
    modifiers: [],
    conditionals: [{ condition: { kind: 'perDistinctSquadElement' }, damageMultiplier: 0.14 }],
  },
  {
    id: 'prism_core',
    name: 'Prism Core',
    rarity: 'legendary',
    tags: ['forge'],
    stacking: 'unique',
    description: 'Splits your advantage into every colour at once. x1.9 damage whenever you hold the elemental advantage.',
    flavor: "Splits one advantage into every colour it can find.",
    modifiers: [],
    conditionals: [{ condition: { kind: 'elementAdvantage' }, damageMultiplier: 0.9 }],
  },
  {
    id: 'stubborn_grudge',
    name: 'Stubborn Grudge',
    rarity: 'rare',
    tags: ['vitality'],
    stacking: 'unique',
    description: 'Refuses to accept a bad matchup. x1.7 damage whenever the enemy resists your element.',
    flavor: "Told it was a bad matchup. Continued anyway.",
    modifiers: [],
    conditionals: [{ condition: { kind: 'elementDisadvantage' }, damageMultiplier: 0.7 }],
  },
  {
    id: 'compounding_interest',
    name: 'Compounding Interest',
    rarity: 'legendary',
    tags: ['economy'],
    stacking: 'unique',
    description: 'Grows with the run itself. +2% damage for every wave you have cleared.',
    flavor: "The longest run you ever had, arguing for itself.",
    modifiers: [],
    conditionals: [{ condition: { kind: 'perWaveCleared' }, damageMultiplier: 0.02 }],
  },
  {
    id: 'headsmans_follow_through',
    name: "Headsman's Follow-Through",
    rarity: 'epic',
    tags: ['crit'],
    stacking: 'unique',
    description: 'Critical hits carry all the way through. Crits deal an extra x1.6.',
    flavor: "The hit was over. It kept going.",
    modifiers: [],
    conditionals: [{ condition: { kind: 'onCrit' }, damageMultiplier: 0.6 }],
  },
  {
    id: 'zealots_brand',
    name: "Zealot's Brand",
    rarity: 'epic',
    tags: ['fire'],
    stacking: 'unique',
    description: 'Rewards conviction over variety. +22% damage per Fire companion in your squad.',
    flavor: "Rewards conviction. Punishes a balanced roster. Chooses.",
    modifiers: [],
    conditionals: [{ condition: { kind: 'perSquadElement', element: 'fire' }, damageMultiplier: 0.22 }],
  },
  {
    id: 'gravekeepers_lantern',
    name: "Gravekeeper's Lantern",
    rarity: 'rare',
    tags: ['vitality'],
    stacking: 'unique',
    description: 'Burns brightest where the light is thin. x1.55 damage against Dark enemies.',
    flavor: "Lit for the Bonefields. Never put out since.",
    modifiers: [],
    conditionals: [{ condition: { kind: 'vsElement', element: 'dark' }, damageMultiplier: 0.55 }],
  },
  {
    id: 'unbroken_guard',
    name: 'Unbroken Guard',
    rarity: 'rare',
    tags: ['vitality'],
    stacking: 'unique',
    description: 'Untouched and unhurried. x1.4 damage while above three quarters health.',
    flavor: "Impressive while it lasts. Stops being true immediately.",
    modifiers: [],
    conditionals: [{ condition: { kind: 'attackerAboveThreeQuarterHp' }, damageMultiplier: 0.4 }],
  },
];
