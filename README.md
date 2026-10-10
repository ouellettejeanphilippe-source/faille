# Faille

Jeu web statique en français québécois : la roulette sort un split et une équipe pro de League of Legends, tu piges un joueur dans ce vestiaire, tu bâtis ton cinq, et tu joues le split.

Le petit frère de [Cap 82-0](https://github.com/ouellettejeanphilippe-source/hockey) : mêmes principes (statique, modules ES, aucune dépendance npm, le hasard à graine, aucune cote à l'écran), autre jeu.

## Jouer en local

```
python3 -m http.server 8000
```

puis `localhost:8000`. Les modules ES ne marchent pas en `file://`.

## Les données

`node scripts/build_splits.mjs` interroge Leaguepedia et écrit `data/splits/` et `data/index.json`. L'API limite le débit : c'est lent. Sinon, l'Action « Bâtir les splits » le fait et commite. Voir `docs/donnees.md`.

## Le moteur

`js/sim.js` joue chaque partie par événements, un tour de 30 secondes à la fois, de 15 à 80 minutes, calibré sur les vraies parties des shards. `MOTEUR.md` en est la spécification ; `node scripts/check_feuilles.mjs` vérifie la feuille de match et rejoue chaque vraie partie contre ce qui s'est passé.

## Le rogue

Avant chacune de tes séries, le repêchage des champions : trois bannissements de chaque côté, un champion par joueur dans son vrai bassin. Entre deux journées, la boutique : des packs de cartes de plan de jeu et un coach, payés en jetons gagnés par les résultats. Tout passe par les canaux du moteur et se mesure en paires : `node scripts/check_rogue.mjs` (MOTEUR.md §6 à §8).

## Mention légale

Faille n'est pas approuvé par Riot Games et ne reflète pas les opinions de Riot Games ni de quiconque officiellement impliqué dans la production ou la gestion des propriétés de Riot Games. Riot Games et toutes les propriétés associées sont des marques de commerce ou des marques déposées de Riot Games, Inc.

Statistiques : Leaguepedia (lol.fandom.com), CC BY-SA 3.0.
