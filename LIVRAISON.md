# Livraison — le plan de travail

Chaque item : son fichier, ce qu'il apporte, le script qui le prouve. Coche au fur et à mesure.

## Jalon 0 — la coquille

- [x] `scripts/build_splits.mjs` : Leaguepedia → un shard par split, avec la source dans chaque shard.
- [x] `js/main.js` : roulette (split + équipe), vestiaire en vraies stats, un joueur par rôle.
- [x] `js/hasard.js` : le hasard à graine — `check_graine`.
- [x] `sw.js` : la coquille hors ligne — `check_coquille`.
- [x] Zéro code mort — `check_mort`.
- [ ] Bâtir les quatre premiers splits (LCK et LEC 2019) et les commiter par l'Action.
- [ ] Élargir `scripts/splits.json` : LCK, LPL, LEC, LCS, de 2015 à aujourd'hui, et les Mondiaux.

## Jalon 1 — les cotes

- [ ] `js/cotes.js` : une cote par rôle, relative au split (or/min, CS/min, dégâts/min, KDA, participation aux éliminations), partagée par le build et le navigateur.
- [ ] `check_cotes` : la force d'équipe tirée des cotes suit le vrai classement (corrélation autour de 0,8).
- [ ] Le niveau à l'écran (Soutien → Phénomène), jamais la cote.
- [ ] Le plafond : un coût tiré de la cote (pas de salaires publics), et le cinq doit tenir dessous.
- [ ] Le cache IndexedDB des shards, la version des cotes dans sa clé.

## Jalon 2 — le moteur

- [ ] `MOTEUR.md` : la spécification, mesurée sur de vraies parties (durée, éliminations, écart d'or à 15 min, dragons, Nashor, tours, côté bleu).
- [ ] `js/sim.js` : une partie par événements (phase de lignes, escarmouches, objectifs, combat final), tout son hasard par `hasard()`.
- [ ] `check_feuilles` : les égalités de la feuille (les éliminations des joueurs font celles de l'équipe, etc.).
- [ ] Le split au jour le jour (séries BO1/BO3), puis les séries (BO5) — `check_graine` étendu au split.

## Jalon 3 — le Rogue

- [ ] Le repêchage des champions (choix et bannissements) comme deck de match.
- [ ] Jetons, boutique, packs, coachs : repris de Cap 82-0 par les canaux du moteur, mesurés en paires.

## Journal

- 2026-10-10 — Jalon 0 : le dépôt, la coquille, le script Leaguepedia, les vérifications rapides et la CI.
