// Priority V1 asset manifest: hero + core monsters/boss + rarity icons first,
// per DESIGN_NOTES.md — the rest of the roster can be appended and re-run later
// without touching generated files (the script skips anything already on disk).
export const manifest = [
  { id: 'knight', category: 'hero', prompt: 'a brave young knight in silver plate armor, heroic pose, holding a sword and shield' },
  { id: 'goblin_grunt', category: 'monsters', prompt: 'a small snarling green goblin warrior with a crude dagger' },
  { id: 'slime', category: 'monsters', prompt: 'a translucent blue gelatinous slime monster with a simple cute face' },
  { id: 'wolf', category: 'monsters', prompt: 'a fierce grey dire wolf baring its fangs, low crouching stance' },
  { id: 'skeleton', category: 'monsters', prompt: 'an undead skeleton warrior in tattered armor holding a rusty sword' },
  { id: 'bat', category: 'monsters', prompt: 'a small screeching cave bat with leathery wings' },
  { id: 'orc_chieftain', category: 'monsters', prompt: 'a hulking orc chieftain with tribal armor and a massive battle axe, miniboss' },
  { id: 'ancient_wyrm', category: 'monsters', prompt: 'an ancient purple dragon wyrm with glowing eyes, epic boss monster, imposing' },
  { id: 'rarity_common', category: 'icons', prompt: 'a simple grey gemstone icon, plain and dull' },
  { id: 'rarity_rare', category: 'icons', prompt: 'a glowing blue sapphire gemstone icon' },
  { id: 'rarity_epic', category: 'icons', prompt: 'a glowing purple amethyst gemstone icon' },
  { id: 'rarity_legendary', category: 'icons', prompt: 'a glowing golden orange topaz gemstone icon, radiant' },
  { id: 'rarity_mythic', category: 'icons', prompt: 'a glowing rainbow prismatic crystal icon, ethereal, magical' },
];
