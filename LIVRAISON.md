# Livraison — le plan de travail

Chaque item : son fichier, ce qu'il apporte, le script qui le prouve. Coche au fur et à mesure.

## Jalon 0 — la coquille

- [x] `scripts/build_splits.mjs` : Leaguepedia → un shard par split, avec la source dans chaque shard.
- [x] `js/main.js` : roulette (split + équipe), vestiaire en vraies stats, un joueur par rôle.
- [x] `js/hasard.js` : le hasard à graine — `check_graine`.
- [x] `sw.js` : la coquille hors ligne — `check_coquille`.
- [x] Zéro code mort — `check_mort`.
- [x] `scripts/splits.json` : les Mondiaux de 2011 à 2025 ; `scripts/catalogue.mjs` pour les splits de LCS, LEC, LCK et LPL.
- [x] La connexion à Leaguepedia par mot de passe de robot (anonyme, la limite de débit bloque tout).
- [ ] Bâtir les Mondiaux par l'Action et confirmer, époque par époque, ce qui est mesuré (docs/donnees.md).
- [ ] Le catalogue des quatre ligues, relu, puis leurs splits par tranches d'années.

## Jalon 1 — les cotes

- [x] `js/cotes.js` : huit sous-cotes, chacune avec ses formules de remplacement par époque ; valeur par rôle ; niveau ; badges lus sur les sous-cotes et les classes des champions.
- [x] Le niveau et les badges dans le vestiaire, jamais la cote.
- [x] `check_cotes` : les remplacements sur des splits d'essai de deux époques.
- [ ] `check_cotes` : poser la borne de la corrélation force / fiche sur la première mesure des Mondiaux, puis calibrer `POIDS`.
- [ ] Oracle's Elixir (2014 →) : les écarts à 15 min prennent la tête de Ligne, les plaques celle de Pression, la jungle adverse un badge 🐺 Envahisseur.
- [ ] Les objets (déjà dans les shards) : leurs étiquettes de Data Dragon pour lire un build (létalité, tank, enchanteur).
- [ ] Le plafond : un coût tiré de la cote (pas de salaires publics), et le cinq doit tenir dessous.
- [ ] Le cache IndexedDB des shards, avec une version des cotes dans sa clé (`COTES_VERSION` à créer avec lui).

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
- 2026-10-10 — Jalon 1 commencé : les Mondiaux de 2011 à 2025, le catalogue des quatre ligues, la récolte élargie (objectifs, vision, objets, classes), `js/cotes.js` et ses remplacements par époque, `check_cotes`.
- 2026-10-10 — Leaguepedia refuse l'anonyme, même depuis GitHub : connexion par mot de passe de robot (secrets `LEAGUEPEDIA_USER` et `LEAGUEPEDIA_PASS`).
