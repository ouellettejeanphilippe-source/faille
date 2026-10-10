# Livraison — le plan de travail

Chaque item : son fichier, ce qu'il apporte, le script qui le prouve. Coche au fur et à mesure.

## Jalon 0 — la coquille

- [x] `scripts/build_splits.mjs` : Leaguepedia → un shard par split, avec la source dans chaque shard.
- [x] `js/main.js` : roulette (split + équipe), vestiaire en vraies stats, un joueur par rôle.
- [x] `js/hasard.js` : le hasard à graine — `check_graine`.
- [x] `sw.js` : la coquille hors ligne — `check_coquille`.
- [x] Zéro code mort — `check_mort`.
- [x] `scripts/splits.json` : les Mondiaux de 2011 à 2025 ; `scripts/catalogue.mjs` pour les splits de LCS, LEC, LCK et LPL.
- [x] Leaguepedia par `Special:CargoExport` (l'API refuse l'anonyme).
- [x] Les quinze Mondiaux bâtis ; ce que chaque époque mesure est dans docs/donnees.md.
- [ ] Le catalogue des quatre ligues, relu, puis leurs splits par tranches d'années.

## Jalon 1 — les cotes

- [x] `js/cotes.js` : huit sous-cotes, chacune avec ses formules de remplacement par époque ; valeur par rôle ; niveau ; badges lus sur les sous-cotes et les classes des champions.
- [x] Le niveau et les badges dans le vestiaire, jamais la cote.
- [x] `check_cotes` : les remplacements sur des splits d'essai de deux époques.
- [x] `check_cotes` : la borne force / fiche posée sur la première mesure (r = 0,85 sur 279 équipes des Mondiaux ; borne 0,75 à 0,95).
- [x] La sous-cote Économie (participation pour la part de l'or) et le badge 🧩 Chef d'orchestre : Faker 2024 passe de Remplaçant à Régulier.
- [ ] Calibrer `POIDS` ; lire les parties à élimination directe à part (Faker 2024 : Régulier sur les chiffres). Avant : Faker 2024 sortait Remplaçant (ses champions utilitaires rendent peu de dégâts). Une part de la corrélation est circulaire (l'or suit la victoire).
- [ ] Oracle's Elixir (2014 →) : les écarts à 15 min prennent la tête de Ligne, les plaques celle de Pression, la jungle adverse un badge 🐺 Envahisseur.
- [ ] Les objets (déjà dans les shards) : leurs étiquettes de Data Dragon pour lire un build (létalité, tank, enchanteur).
- [ ] Le plafond : un coût tiré de la cote (pas de salaires publics), et le cinq doit tenir dessous.
- [ ] Le cache IndexedDB des shards, avec une version des cotes dans sa clé (`COTES_VERSION` à créer avec lui).

## Jalon 1 bis — les images et la carte

- [x] Les photos des joueurs (celle de leur split) et les logos des équipes, copiés dans `img/lp/` hors du dépôt, au déploiement — `scripts/images.mjs`, `pages.yml`.
- [x] Les icônes et illustrations des champions (Data Dragon) ; le bassin de champions sur la carte.
- [x] `js/fiche.js` : la carte d'un joueur, quatre habillages d'époque.
- [ ] lolesports : les visages récents des joueurs que Leaguepedia n'a pas, et la ligne du temps des parties (2023 →).

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
- 2026-10-10 — Leaguepedia refuse l'anonyme par l'API, même depuis GitHub ; la page d'export passe. Les quinze Mondiaux bâtis : r = 0,85 entre la force tirée des cotes et la vraie fiche.
- 2026-10-10 — Les images : photos et logos de Leaguepedia copiés dans img/lp (leur serveur refuse les autres sites), champions de Data Dragon ; la carte d'un joueur et ses quatre époques ; la sous-cote Économie.
