# Protocole de travail agent — économie de ressources

Ce fichier existe pour qu'une session (humaine ou agent) travaille sur ce dépôt
en consommant le minimum de tokens/temps. Il est prescriptif : le suivre est
plus important que l'élégance ponctuelle.

## Règles de lecture

1. **Ne jamais relire un fichier déjà lu dans la session.** Les outils d'édition
   échouent bruyamment si l'état a divergé — pas besoin de vérifier après coup.
2. **Ne jamais relire un fichier qu'on vient d'éditer** pour « vérifier ».
3. Préférer `Grep -o` / `Glob` ciblés à la lecture intégrale. Pour connaître la
   forme d'un type, lire le `*.types.ts` (10-50 lignes), pas les 12 fichiers de
   données qui l'implémentent.
4. Pour un registre de N entrées similaires (monstres, reliques, compagnons) :
   lire **un** exemplaire, en déduire la forme, puis éditer les N par script.

## Règles d'écriture

5. **Éditions de masse par script Node**, jamais N appels `Edit`. Écrire le
   script dans le scratchpad, l'exécuter, le jeter. Un script qui touche
   19 fichiers coûte le prix d'un fichier.
6. Regrouper les appels d'outils indépendants dans un **seul bloc parallèle**.
7. Nouveau contenu volumineux (descriptions, lore) : générer par script depuis
   une table compacte plutôt que d'écrire 61 fichiers à la main.

## Règles de vérification

8. **Un seul cycle de vérification par chantier**, pas par fichier :
   `npm run lint && npx tsc --noEmit && npm test && npm run build`.
   Utiliser `npm test -- --run <pattern>` pendant l'itération, la suite complète
   seulement avant commit.
9. Toujours **tronquer la sortie** des commandes bruyantes (`| tail -20`).
   Une suite de tests qui passe n'a besoin que de sa dernière ligne.
10. Les tests du moteur (`src/engine/*.test.ts`) sont le filet de sécurité.
    `balanceSim.test.ts` a un plancher à 40/100 survivants : c'est le garde-fou
    de tout changement d'équilibrage.

## Règles de commit

11. Un commit par chantier, poussé immédiatement. Un chantier qui ne compile pas
    ne se commit pas.
12. Mettre à jour `CLAUDE.md` **une fois en fin de chantier**, pas au fil de l'eau.

## Budget indicatif par chantier

| Poste | Cible |
|---|---|
| Lectures de fichiers | ≤ 6 par chantier |
| Cycles de tests complets | 1 |
| Scripts de masse | autant que nécessaire, c'est le levier |
