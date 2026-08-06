# Knight's Gauntlet — Plan d'amélioration global

> Objectif : faire passer le projet de « bonne démo technique » à « vrai jeu ».
> Document de cadrage, écrit après recherche sur les trois références citées
> (Devolver Digital, Ankama, Brave Frontier). Voir `CLAUDE.md` pour l'état
> actuel et `DESIGN_NOTES.md` pour l'historique des décisions.

---

## 1. Ce que disent les trois références

### Devolver Digital — l'identité avant le périmètre

Devolver ne publie pas un genre, il publie une **personnalité**. Leur critère
récurrent : des jeux qui font des choix délibérés et **ont la confiance de s'y
tenir** ; sélection fondée sur la passion et la singularité du studio plutôt
que sur des contraintes de genre. Le catalogue (Hotline Miami, Enter the
Gungeon, Cult of the Lamb, Titan Souls) partage moins des mécaniques qu'une
attitude : boucle courte et nerveuse, ton assumé, feedback violent, aucun
remplissage. Leur communication elle-même est irrévérencieuse — la
présentation *fait partie* du produit.

**Ce qu'on en retient pour Knight's Gauntlet :** une seule idée forte poussée
à fond bat dix systèmes corrects. Et le *feel* n'est pas une finition, c'est
le produit.

### Ankama — un univers, pas un décor

Ankama (Roubaix) n'a pas fait trois jeux, il a fait **un cosmos** — le Krosmoz
— dont Dofus, Wakfu et Waven sont des fenêtres. Le Monde des Douze porte le
nom de ses douze dieux ; **chaque classe est la dévotion à un dieu**, et le
dieu qu'on vénère détermine apparence et pouvoirs. La lore n'est pas du texte
d'ambiance : c'est le schéma directeur dont découlent les classes, les zones,
les monstres.

Côté production : art 2D lisible fait main, humour « décalé mais attachant »,
et sur Waven un principe de game feel explicite — **la vitesse d'animation est
le facteur numéro un**, gagner quelques secondes par tour change tout le
ressenti. Ankama modernise sans perdre l'âme.

**Ce qu'on en retient :** une cosmologie unique dont tout découle + agentivité
réelle en combat + la lisibilité et le rythme priment sur les particules.

### Brave Frontier — l'escouade *est* le jeu

Système de combat inspiré de *Valkyrie Profile* : escouade de **5 unités + 1
unité d'ami**, chacune avec élément, **Leader Skill** (bonus d'équipe défini
par l'unité en tête), et une **jauge de Brave Burst** remplie par les Battle
Crystals qui tombent quand on frappe. Le **spark** (synchronisation des coups)
et le crit sont multiplicatifs sur le calcul de dégâts — c'est là que
s'exprime la compétence du joueur dans un combat semi-automatique. Échelle
d'évolution par rangs jusqu'à l'Omni Evolution, avec Resonance entre deux
unités de même élément. Modes annexes : Vortex Gate, Frontier Hunter, Raid
coop 4 joueurs, Arena PvP asynchrone. Univers de Grand Gaia : un Invocateur
appelé par le dieu Lucius contre quatre Dieux Déchus. Record Guinness du plus
grand nombre de personnages jouables en pixel art.

**Ce qu'on en retient :** la collection n'a de valeur émotionnelle que si
composer l'escouade est **la** décision du run, et s'il reste **un** geste de
joueur dans le combat automatique.

---

## 2. Diagnostic honnête de l'état actuel

Le projet est solidement architecturé (moteur pur testé, registries typés,
séparation run/meta stricte). Le problème n'est pas la technique, il est le
**design**. Quatre constats :

1. **Le joueur prend ~1 décision par vague** (le choix de loot), et
   `balanceSim.test.ts` démontre qu'une stratégie « prendre toujours l'option
   0 » survit 49 fois sur 100. Une décision qu'un bot idiot gère à 49 % n'est
   pas une décision.
2. **Les 61 reliques se réduisent à 15 sommes additives scalaires**
   (`modifiers.ts`, clé `${kind}Sum`). Il n'existe aucun espace de combo :
   l'intérêt de Balatro vient de modificateurs **conditionnels** et
   **multiplicatifs**. L'architecture actuelle est structurellement opposée à
   ça.
3. **Les compagnons sont des blocs de stats avec un portrait.** Tirer un
   Mythique change un nombre, pas la façon dont le combat se joue — la
   récompense émotionnelle du gacha (le cœur de Brave Frontier) n'existe pas.
4. **Les monstres n'ont que hp/attack/speed** et ne consultent jamais les
   modificateurs (décision Phase 3). Un boss est un gros monstre normal. Et
   **il n'y a aucune voix** : les zones ont du texte de lore que personne ne
   lit, rien n'est drôle, étrange ou mémorable. C'est l'écart Devolver.

---

## 3. Le plan — 6 chantiers

### Chantier 0 — La Voix (Ankama + Devolver) · coût faible, impact maximal

Aucun changement d'architecture. C'est le meilleur ratio du plan.

- `LORE.md` : **une** cosmologie à la Krosmoz. Qui a forgé le Gauntlet, ce
  qu'est vraiment l'Écho, pourquoi les Broken Parts existent. Les 4 classes
  deviennent des **dévotions** à des entités de ce panthéon (Ankama : le dieu
  qu'on vénère définit ce qu'on est) — les multiplicateurs de stats existants
  ne bougent pas, ils reçoivent juste une raison d'être.
- Réécriture des descriptions : 61 reliques + 19 monstres + 11 compagnons.
  Une bonne ligne chacun, ton décalé-attachant. C'est la différence entre un
  tableur et un jeu.
- Renommage de tout ce qui est générique (« Merchant's Ring », « Knight's
  Plate »). « Broken Blade » est bon — c'est le niveau à tenir partout.
- Les continents/zones existants deviennent la géographie de cette cosmologie
  au lieu d'être 4 filtres de pool de monstres avec un fond peint.

**Fichiers :** `src/data/**/*.ts` (champs `description`/`name` uniquement),
`LORE.md`, `WorldTab.tsx`.

### Chantier 1 — Éléments et affinités (Brave Frontier) · l'axe de profondeur manquant

Le changement le plus rentable structurellement : il rend rétroactivement
intéressants les 11 compagnons et les 19 monstres déjà produits.

- `src/engine/elements.ts` (pur, testé) : 6 éléments et la roue d'affinité de
  BF (fort ×1.5 / faible ×0.5).
- `element` ajouté à `Combatant`, `MonsterDefinition`, `CompanionDefinition`,
  `ClassDefinition`, et en option sur `RelicModifier`.
- Application dans `CombatEngine.computeAttackDamage` — un seul point
  d'insertion, multiplicatif, avant l'arrondi.
- Les pools de monstres par zone deviennent thématiques par élément →
  **l'escouade qu'on amène dépend de la zone**.
- Un badge d'élément dans le HUD et sur les cartes de loot ; `RarityIcon.tsx`
  fournit déjà le motif d'icône à réutiliser.

**Risque :** faible. Additif, valeur par défaut neutre possible pour tout
contenu non taggé.

### Chantier 2 — Modificateurs conditionnels (Balatro / Devolver) · le plafond le plus haut

C'est le vrai refactor. À faire **après** le chantier 1 pour que les
conditions puissent référencer l'élément.

- `RelicModifier` passe de `{kind, value}` à une union : le cas plat actuel
  reste tel quel (les 61 reliques continuent de marcher sans réécriture) +
  un nouveau cas `{trigger, condition, effect}`.
- Vocabulaire de déclencheurs : `onCrit`, `onKill`, `onWaveStart`,
  `whileBelowHalfHp`, `everyNthAttack`, `perRelicOfRarity`,
  `perElementInSquad`.
- **Ajouter des modificateurs multiplicatifs** à côté des sommes :
  `damageMultiplierProduct` en parallèle de `damageMultiplierSum`. Le plaisir
  de Balatro vient du `×`, jamais du `+`.
- `aggregateModifiers` reste pour les plats ; une nouvelle couche
  `conditionals.ts` est consultée par `CombatEngine` sur chaque événement
  qu'il émet déjà (`critHit`, `death`, `attack`) — le moteur émet déjà tous
  les hooks nécessaires, il ne les écoute simplement pas.
- Objectif de contenu : ~15 reliques conçues **pour** se combiner, pas 61 de
  plus qui s'additionnent.

**Risque :** élevé sur `modifiers.ts` / `CombatEngine.ts`. Chantier à faire
d'un bloc, avec `balanceSim.test.ts` comme garde-fou (plancher 40/100).

### Chantier 3 — L'escouade (Brave Frontier) · rendre le gacha signifiant

- **Composition avant le run** : on choisit ses 3 compagnons à l'écran de
  sélection au lieu de les recevoir aléatoirement en loot. Le loot en run les
  améliore/en ajoute, il ne les définit plus.
- **Leader Skill** : le compagnon placé en tête accorde un jeu de
  `RelicModifier` à toute l'équipe. Décision qui définit un build, coût moteur
  quasi nul — ça réutilise le vocabulaire de modificateurs existant.
- **Jauge de Brave Burst** : les barres ATB existent déjà dans `CombatScene`
  (`atbProgress()`). On ajoute une jauge d'équipe qui se remplit sur les coups
  donnés et reçus ; pleine, l'escouade déclenche une attaque combinée.
  Automatique par défaut, mais **un tap manuel donne un bonus de dégâts** —
  c'est le seul geste de joueur dans un jeu idle, et c'est exactement le
  spark de BF.
- Combiné au chantier 1, choisir son escouade selon l'élément de la zone
  devient un vrai puzzle.

### Chantier 4 — Les monstres deviennent des adversaires

- Casser délibérément la règle Phase 3 : `MonsterAbility[]` — enrage à 50 %,
  bouclier élémentaire, invocation d'adds, soin, blocage de la jauge d'équipe.
- **Affixes de vague** tirés aléatoirement (esprit Gungeon/Diablo) : Blindé,
  Véloce, Vampirique, Épineux. Multiplicateur de contenu très bon marché sur
  19 monstres.
- **Vagues multi-ennemis** : `CombatState.monster` → `monsters[]`. C'est un
  vrai refactor du moteur et de la scène ; c'est la partie que je décalerais
  en dernier si le temps manque.

### Chantier 5 — L'Écho comme identité (Devolver)

L'Écho de Soi-Même est **la seule mécanique réellement originale du jeu**.
Tout le reste est standard au genre. Devolver dirait : c'est ça votre jeu,
arrêtez d'en faire une note de bas de page toutes les 15 vagues.

- **Échelle d'Échos** : chaque Écho vaincu est enregistré (snapshot du build
  dans `metaStore`) et rejoue plus tard comme adversaire. Vos anciens runs
  peuplent votre propre bestiaire.
- Donner enfin à l'Écho vos crit/burn/lifesteal. La restriction actuelle est
  une note d'implémentation, pas un principe de design — un build qui doit
  battre sa propre copie complète, c'est le vrai test de maîtrise.
- Écran de fin de run : « L'Écho de la vague 45 t'a tué — c'était toi, au
  tour 12. » Voilà un moment Devolver.
- Conséquence directe : c'est **l'accroche communicable** du jeu, celle qui
  tient en une phrase.

### Chantier 6 — Feel et présentation (Ankama + Devolver)

- **Principe Ankama** : auditer les durées d'animation avant d'en ajouter.
  `ATTACK_LUNGE_OUT_MS` et le hit-stop actuels rendent probablement le combat
  lent ; la vitesse prime sur la richesse.
- **Audio** — il n'y en a aucun aujourd'hui. C'est le plus gros gain de feel
  par unité d'effort de tout le document.
- Paliers de screen-shake, classes de poids pour les nombres de dégâts,
  ralenti sur la mort d'un boss, push-in caméra à l'apparition d'un boss ou
  d'un Écho (la caméra est statique actuellement).

---

## 4. Séquencement recommandé

| Ordre | Chantier | Pourquoi ici |
|---|---|---|
| 1 | **0 — La Voix** | Coût nul en architecture, transforme la perception du projet. À faire en premier, toujours. |
| 2 | **1 — Éléments** | Additif, faible risque, redonne de la valeur à tout le contenu déjà produit. Prérequis du chantier 2. |
| 3 | **3 — Escouade** | Rend le gacha (déjà construit) enfin signifiant. Peu de moteur, beaucoup de jeu. |
| 4 | **6 — Feel + audio** | À intercaler dès que le combat a quelque chose de neuf à montrer. |
| 5 | **5 — Écho** | L'identité. À faire une fois que les builds sont assez riches pour que se battre soi-même soit intéressant. |
| 6 | **2 — Conditionnels** | Plafond le plus haut, risque le plus haut. Une fois les éléments en place. |
| 7 | **4 — Monstres/multi-ennemis** | Le refactor le plus coûteux, le plus facile à décaler. |

**Si un seul chantier était possible :** le 1 (éléments). C'est celui qui, à
lui seul, transforme un stat-stick en jeu à décisions.

---

## Sources

- [What makes a true Devolver game (Devolver Digital)](https://www.devolverdigital.com/propaganda/15-devolver-digital-employees-spill-the-beans-on-what-makes-a-true-devolver-game)
- [How Devolver Digital is redefining videogame publishing (PC Gamer)](https://www.pcgamer.com/how-devolver-digital-is-redefining-videogame-publishing/)
- [Devolver Digital: developer freedom and creativity (GamesHub)](https://www.gameshub.com/news/features/devolver-digital-freedom-creativity-game-development-graeme-struthers-interview-32195/)
- [Ankama (Wikipedia)](https://en.wikipedia.org/wiki/Ankama)
- [Ankama's F2P MMORPG trilogy: Dofus, Wakfu, Waven (MMOBomb)](https://www.mmobomb.com/ankama-free-to-play-mmorpg-trilogy-dofus-wakfu-waven-deserve-more-love)
- [World of Twelve / Krosmoz Wiki](https://krosmoz.fandom.com/wiki/World_of_Twelve)
- [Character Animations (Waven devblog)](https://waven-game.com/en/devblog-en/character-animations/)
- [Brave Frontier (Wikipedia)](https://en.wikipedia.org/wiki/Brave_Frontier)
- [Unit Skills (Brave Frontier Wiki)](https://bravefrontierglobal.fandom.com/wiki/Unit_Skills)
- [Brave Frontier (Gacha Games Wiki)](https://gachagames.miraheze.org/wiki/Brave_Frontier)
