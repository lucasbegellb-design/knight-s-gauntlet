// Priority V1 asset manifest: hero + core monsters/boss + rarity icons first,
// per DESIGN_NOTES.md — the rest of the roster can be appended and re-run later
// without touching generated files (the script skips anything already on disk).
export const manifest = [
  { id: 'knight', category: 'hero', prompt: 'a heroic young knight in ornate silver plate armor, sword and shield raised, noble determined expression' },
  {
    id: 'berserker',
    category: 'hero',
    prompt: 'a fierce battle-scarred barbarian berserker wielding a massive twin-bladed axe, wild hair, rage-filled eyes, tribal armor',
  },
  {
    id: 'guardian',
    category: 'hero',
    prompt: 'a stalwart armored guardian knight with a massive tower shield and heavy blue-accented plate armor, unshakeable defensive stance',
  },
  {
    id: 'duelist',
    category: 'hero',
    prompt: 'a swift agile duelist swordsman in a sleek gold-trimmed coat, rapier in hand, confident dashing pose',
  },
  { id: 'goblin_grunt', category: 'monsters', prompt: 'a small snarling green goblin warrior with a crude dagger' },
  { id: 'slime', category: 'monsters', prompt: 'a translucent blue gelatinous slime monster with a simple cute face' },
  { id: 'wolf', category: 'monsters', prompt: 'a fierce grey dire wolf baring its fangs, low crouching stance' },
  { id: 'skeleton', category: 'monsters', prompt: 'an undead skeleton warrior in tattered armor holding a rusty sword' },
  { id: 'bat', category: 'monsters', prompt: 'a small screeching cave bat with leathery wings' },
  { id: 'orc_chieftain', category: 'monsters', prompt: 'a hulking orc chieftain with tribal armor and a massive battle axe, miniboss' },
  { id: 'ancient_wyrm', category: 'monsters', prompt: 'an ancient purple dragon wyrm with glowing eyes, epic boss monster, imposing' },
  { id: 'giant_rat', category: 'monsters', prompt: 'a scruffy oversized rat with sharp teeth, feral' },
  { id: 'forest_spider', category: 'monsters', prompt: 'a large venomous forest spider with glowing eyes' },
  { id: 'bandit_thug', category: 'monsters', prompt: 'a rough human bandit thug with a hood and a club' },
  { id: 'swamp_troll', category: 'monsters', prompt: 'a hulking green swamp troll covered in muck, brutish' },
  { id: 'shade_wraith', category: 'monsters', prompt: 'a ghostly dark shade wraith made of smoke and shadow, glowing eyes' },
  { id: 'troll_berserker', category: 'monsters', prompt: 'a massive raging troll berserker with battle scars, miniboss' },
  { id: 'venomous_broodmother', category: 'monsters', prompt: 'a monstrous venomous spider broodmother, miniboss, many eyes' },
  { id: 'frost_lich', category: 'monsters', prompt: 'an undead frost lich in icy tattered robes, glowing blue eyes, boss monster' },
  { id: 'inferno_golem', category: 'monsters', prompt: 'a massive molten stone golem wreathed in fire, boss monster, imposing' },
  {
    id: 'colossus_of_ash',
    category: 'monsters',
    prompt: 'a colossal ash-grey stone titan wreathed in smoldering cinders, cracked glowing molten veins, megaboss, towering and imposing',
  },
  {
    id: 'gravemind_hydra',
    category: 'monsters',
    prompt: 'a monstrous three-headed hydra made of bone and shadow, glowing violet eyes, megaboss, terrifying',
  },
  {
    id: 'the_unmaking',
    category: 'monsters',
    prompt:
      'an apocalyptic void entity of shattered cosmic armor and swirling dark energy, ultraboss, final boss, overwhelming presence, radiant black and gold',
  },
  { id: 'rarity_common', category: 'icons', prompt: 'a simple grey gemstone icon, plain and dull' },
  { id: 'rarity_rare', category: 'icons', prompt: 'a glowing blue sapphire gemstone icon' },
  { id: 'rarity_epic', category: 'icons', prompt: 'a glowing purple amethyst gemstone icon' },
  { id: 'rarity_legendary', category: 'icons', prompt: 'a glowing golden orange topaz gemstone icon, radiant' },
  { id: 'rarity_mythic', category: 'icons', prompt: 'a glowing rainbow prismatic crystal icon, ethereal, magical' },

  // Gacha companions: each gets two assets — a menu illustration (style: 'illustration') and a
  // combat pixel-art sprite (style: 'pixelArt', category 'companions' so CombatScene's existing
  // texture loading picks it up with zero code changes). See generate.mjs for the style suffixes.
  {
    id: 'stalwart_guardian',
    category: 'companions_illustration',
    style: 'illustration',
    prompt: 'a stalwart armored guardian knight holding a tower shield, protective stance',
  },
  {
    id: 'stalwart_guardian',
    category: 'companions',
    style: 'pixelArt',
    prompt: 'a stalwart armored guardian knight holding a tower shield, protective stance',
  },
  {
    id: 'roguish_blade',
    category: 'companions_illustration',
    style: 'illustration',
    prompt: 'a quick roguish swordsman in a hood with twin daggers, agile pose',
  },
  {
    id: 'roguish_blade',
    category: 'companions',
    style: 'pixelArt',
    prompt: 'a quick roguish swordsman in a hood with twin daggers, agile pose',
  },
  {
    id: 'arcane_marksman',
    category: 'companions_illustration',
    style: 'illustration',
    prompt: 'an elegant spellsword archer channeling arcane energy into a glowing bow',
  },
  {
    id: 'arcane_marksman',
    category: 'companions',
    style: 'pixelArt',
    prompt: 'an elegant spellsword archer channeling arcane energy into a glowing bow',
  },
  {
    id: 'wandering_cleric',
    category: 'companions_illustration',
    style: 'illustration',
    prompt: 'a serene traveling cleric in white and gold robes holding a healing staff',
  },
  {
    id: 'wandering_cleric',
    category: 'companions',
    style: 'pixelArt',
    prompt: 'a serene traveling cleric in white and gold robes holding a healing staff',
  },
  {
    id: 'camp_bard',
    category: 'companions_illustration',
    style: 'illustration',
    prompt: 'a charming bard with a lute, mid-performance, energetic pose',
  },
  { id: 'camp_bard', category: 'companions', style: 'pixelArt', prompt: 'a charming bard with a lute, mid-performance, energetic pose' },
  {
    id: 'ember_wisp',
    category: 'companions_illustration',
    style: 'illustration',
    prompt: 'a small floating spirit wisp made of flickering fire, mischievous glowing eyes',
  },
  {
    id: 'ember_wisp',
    category: 'companions',
    style: 'pixelArt',
    prompt: 'a small floating spirit wisp made of flickering fire, mischievous glowing eyes',
  },
  {
    id: 'crimson_dragoon',
    category: 'companions_illustration',
    style: 'illustration',
    prompt: 'a legendary dragoon in crimson dragon-scale armor wielding a long lance, dramatic heroic pose',
  },
  {
    id: 'crimson_dragoon',
    category: 'companions',
    style: 'pixelArt',
    prompt: 'a legendary dragoon in crimson dragon-scale armor wielding a long lance, dramatic heroic pose',
  },
  {
    id: 'astral_seraph',
    category: 'companions_illustration',
    style: 'illustration',
    prompt: 'a mythic celestial seraph with glowing golden wings and radiant halo, ethereal divine aura',
  },
  {
    id: 'astral_seraph',
    category: 'companions',
    style: 'pixelArt',
    prompt: 'a mythic celestial seraph with glowing golden wings and radiant halo, ethereal divine aura',
  },
  {
    id: 'iron_vanguard',
    category: 'companions_illustration',
    style: 'illustration',
    prompt: 'a veteran armored vanguard knight with a massive tower shield and battle-worn plate, unshakeable defensive stance',
  },
  {
    id: 'iron_vanguard',
    category: 'companions',
    style: 'pixelArt',
    prompt: 'a veteran armored vanguard knight with a massive tower shield and battle-worn plate, unshakeable defensive stance',
  },
  {
    id: 'hearthkeeper',
    category: 'companions_illustration',
    style: 'illustration',
    prompt: 'a hardened field medic in warm earthen robes holding a glowing mending staff, calm and resolute',
  },
  {
    id: 'hearthkeeper',
    category: 'companions',
    style: 'pixelArt',
    prompt: 'a hardened field medic in warm earthen robes holding a glowing mending staff, calm and resolute',
  },
  {
    id: 'warlords_aegis',
    category: 'companions_illustration',
    style: 'illustration',
    prompt: 'a battle-worn banner-bearer holding a great standard and a rune-etched aegis shield, commanding heroic stance',
  },
  {
    id: 'warlords_aegis',
    category: 'companions',
    style: 'pixelArt',
    prompt: 'a battle-worn banner-bearer holding a great standard and a rune-etched aegis shield, commanding heroic stance',
  },

  // Kingdom territories: landscape/banner art, ids matching src/data/kingdom/territories.ts.
  {
    id: 'ember_reach_foothills',
    category: 'territories',
    style: 'landscape',
    prompt: 'volcanic foothill borderlands with smoking forges and mining camps, warm orange glow',
  },
  {
    id: 'frostmark_passes',
    category: 'territories',
    style: 'landscape',
    prompt: 'a snowbound mountain pass with a fortified garrison, icy peaks, cold blue light',
  },
  {
    id: 'the_sunken_coast',
    category: 'territories',
    style: 'landscape',
    prompt: 'a reclaimed coastal trade port with tall ships and tide-worn docks, sunset over the sea',
  },
  {
    id: 'duskwood_marches',
    category: 'territories',
    style: 'landscape',
    prompt: 'ancient forest academies with towers among old-growth trees, dusky purple twilight',
  },
  {
    id: 'the_ashfall_steppe',
    category: 'territories',
    style: 'landscape',
    prompt: 'windswept ash-grey steppe plains with distant riders, overcast dramatic sky',
  },
  {
    id: 'the_obsidian_crown',
    category: 'territories',
    style: 'landscape',
    prompt: 'a broken obsidian throne room, cracked black stone and dying embers, an annexed rival capital',
  },

  // Kingdom allied lords: character portraits, ids matching src/data/kingdom/lords.ts.
  {
    id: 'marshal_kade_ironhold',
    category: 'lords',
    style: 'illustration',
    prompt: 'a stern armored marshal general with a battle-worn cloak, defensive tactician, commanding presence',
  },
  {
    id: 'warlord_ysolde_blackmane',
    category: 'lords',
    style: 'illustration',
    prompt: 'a fierce female warlord raider with dark war paint and twin blades, aggressive confident stance',
  },
  {
    id: 'quartermaster_renn',
    category: 'lords',
    style: 'illustration',
    prompt: 'a shrewd quartermaster in a leather coat surrounded by ledgers and supply crates, calculating expression',
  },
  {
    id: 'sage_aveline_of_the_spire',
    category: 'lords',
    style: 'illustration',
    prompt: 'an elegant elder sage in flowing spire-blue robes holding an ancient tome, wise scholarly expression',
  },
  {
    id: 'bloodguard_captain_thrace',
    category: 'lords',
    style: 'illustration',
    prompt: 'a battle-hardened field medic captain in crimson battlefield armor, resolute and grim',
  },
  {
    id: 'the_exiled_prince_corvin',
    category: 'lords',
    style: 'illustration',
    prompt: 'a deposed royal prince in tattered but regal finery, a broken crown, defiant proud expression',
  },

  // Zone backdrops: full-bleed environment art, ids matching src/data/zones.ts.
  {
    id: 'greenwood_fringe',
    category: 'zones',
    style: 'landscape',
    prompt: 'the edge of a dense mysterious forest gauntlet, dappled green light, goblin campfires in the distance',
  },
  {
    id: 'bonefields',
    category: 'zones',
    style: 'landscape',
    prompt: 'a sunken graveyard under a pale moon, jagged bone fragments jutting from purple mist',
  },
  {
    id: 'cinder_wastes',
    category: 'zones',
    style: 'landscape',
    prompt: 'scorched ash-choked flatlands under a smoldering red sky, cracked burnt earth',
  },
  {
    id: 'wyrms_reach',
    category: 'zones',
    style: 'landscape',
    prompt: 'a vast dark arcane wasteland where reality frays at the edges, swirling violet void energy',
  },
];

/**
 * Second-frame "attack pose" entries derived automatically from every hero/monster/companion
 * combat-sprite entry above, instead of hand-duplicating ~34 prompts — stays in sync forever as
 * roster content is added. generate.mjs turns entry.frame === 'attack' into an img2img request
 * sourced from the sibling idle PNG (see buildPrompt/outputPath there), so the new pose stays
 * visually anchored to the same character instead of drifting on an independent txt2img roll.
 */
export const attackFrameManifest = manifest
  .filter((entry) => ['hero', 'monsters', 'companions'].includes(entry.category))
  .map((entry) => ({ ...entry, frame: 'attack' }));

export const fullManifest = [...manifest, ...attackFrameManifest];
