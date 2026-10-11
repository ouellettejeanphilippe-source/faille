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
- [x] Le plafond : le coût suit le niveau (Remplaçant 1, Régulier 2, Pilier 3, ★ Étoile 5, ★ Phénomène 7), le cinq tient sous 15 ; un joueur ne se signe que si le reste paie les cases vides — `check_plafond` (2 000 repêchages au hasard, tous complets).
- [ ] Le cache IndexedDB des shards, avec une version des cotes dans sa clé (`COTES_VERSION` à créer avec lui).

## Jalon 1 bis — les images et la carte

- [x] Les photos des joueurs (celle de leur split) et les logos des équipes, copiés dans `img/lp/` hors du dépôt, au déploiement — `scripts/images.mjs`, `pages.yml`.
- [x] Les icônes et illustrations des champions (Data Dragon) ; le bassin de champions sur la carte.
- [x] `js/fiche.js` : la carte d'un joueur, quatre habillages d'époque.
- [ ] lolesports : les visages récents des joueurs que Leaguepedia n'a pas, et la ligne du temps des parties (2023 →).

## Jalon 1 ter — l'interface de Cap 82-0

- [x] `style.css` réécrite sur le système de Cap 82-0 : sept tailles, trois rayons, les couleurs en jetons, Barlow Condensed (`fonts/`, OFL 1.1) pour les titres, les chiffres et les boutons ; la lumière de la Faille sur le noir.
- [x] Le tableau indicateur : le retour (un seul, en haut), le plafond restant et sa jauge pendant qu'on bâtit ; la fiche, le rang et les jetons pendant le split.
- [x] Une action principale par écran, collée en bas ; le vestiaire en bandeau d'équipe et en rangées, « Signer » sur chaque rangée ; le cinq en bandes.
- [ ] Une vérification de la feuille de style à la `check_css` de Cap 82-0 (tailles, rayons, couleurs hors des jetons).
- [ ] Les couleurs de chaque équipe (le bandeau du vestiaire, la teinte du décor), comme les vraies couleurs de club de Cap 82-0.

## Jalon 2 — le moteur

- [x] `scripts/build_splits.mjs` : une ligne par partie dans chaque shard (`matchs`) — les repères du moteur s'y mesurent.
- [x] `MOTEUR.md` : la spécification, mesurée sur les 1 355 parties des Mondiaux (durée, éliminations, écart d'or final, dragons, Nashor, tours, côté bleu).
- [ ] L'écart d'or à 15 min et la ligne du temps (premier sang, première tour) : Leaguepedia ne les a pas — Oracle's Elixir ou lolesports.
- [x] `js/sim.js` : une partie par événements, des tours de 30 s, de 15 à 80 min (phase de lignes, escarmouches, objectifs, combat final), tout son hasard par `hasard()`.
- [x] `check_feuilles` : les égalités de la feuille, et chaque vraie partie rejouée contre ce qui s'est passé (13 repères dans l'intervalle de la mesure).
- [x] Le split au jour le jour (BO1, deux rondes), puis les séries (BO5, six équipes) — `check_graine` étendu au split.
- [x] `js/split.js` : la journée, le classement, les séries, la feuille d'une série.
- [ ] Les parties trop courtes : le combat final ne connaît pas les tours encore debout (1 % sous 18,5 min contre 22,1 au réel).

## Jalon 3 — le Rogue

- [x] `js/sim.js` : les canaux (ligne, combat, objectifs, tardif, rythme, siège, fin, confort), sommés en un seul endroit et bornés ; neutres, ils rejouent la partie calibrée au tirage près — MOTEUR.md §6.
- [x] `data/champions.json` : la classe de chaque champion (Data Dragon), par `build_splits.mjs --champions`.
- [x] `js/repechage.js` : le repêchage des champions avant chacune de tes séries — trois bannissements de chaque côté, ton champion pour chacun de tes cinq dans son vrai bassin ; le confort et la composition (contre celle des vraies équipes) par les canaux — MOTEUR.md §7.
- [x] `js/tableau-repechage.js` : l'écran du repêchage ; le repêchage sur la feuille d'une série.
- [x] `js/rogue.js`, `js/boutique.js` : les jetons recomptés des résultats, trois packs, quinze cartes de plan de jeu, quatre coachs et leurs paliers de confiance — MOTEUR.md §8.
- [x] `check_rogue` : chaque carte, chaque coach au palier III, chaque classe et le repêchage mesurés en paires (12 ligues, 120 paires) ; les bornes par rareté, la visibilité des rares ; les packs rejouent, les jetons se recomptent.
- [x] Une partie de rogue sur plusieurs splits : les mandats et la sauvegarde (jalon 4).
- [ ] Les médailles et les déblocages entre deux runs (Cap 82-0 : écussons, vestiaire des déblocages).
- [ ] Ce que l'écran annonce, en chiffres de la mesure (« ≈ +2 éliminations par partie », `check_chiffres` de Cap 82-0) ; pour l'instant, la direction de chaque canal, en mots.
- [ ] Le pivot du tardif, mesuré sur la ligne du temps des parties (Oracle's Elixir) : ses deux cartes coûtent encore un peu.

## Jalon 4 — la gestion (Cap 82-0)

- [x] `js/partie.js` : la run tenue en journal d'actions ; rejouer le journal redonne la même partie — c'est la sauvegarde (`localStorage` : la graine et le journal) — `check_gestion`.
- [x] La run sur plusieurs splits : le mandat du proprio (les séries, la demie, la finale, le titre), le bilan, jusqu'à deux joueurs gardés sous le plafond ; les jetons (recomptés des splits finis), les cartes et le coach suivent ; un titre gagne la run.
- [x] La roulette à relances : Autre split, Autre équipe, Passer, deux de chaque par repêchage — `check_gestion`.
- [x] Le marché en cours de split, jusqu'à la date limite (mi-split) : trois agents libres par journée (Pilier au plus, tirés du dé du split), « qui sort ? » (titulaire ou banc), 8 🪙 la signature ; le banc, un sixième joueur sous le plafond, qu'on fait jouer ou qu'on relâche.
- [x] La boîte de réception : le proprio (le mandat, les objectifs de six journées payés 10 🪙, l'élan à quatre victoires de suite), l'entraîneur (trois défaites de suite : un événement à trancher, qui bloque la journée), le DG (le marché), le dépisteur (les plus joués de ton prochain adversaire).
- [ ] Les objectifs du proprio avec leurs chances (« Probable · Jouable · Coriace », Cap 82-0) et d'autres événements (dilemmes en cours de split).
- [ ] Les échanges avec les équipes de la ligue (un joueur contre un joueur), en plus des agents libres.
- [ ] Le banc qui joue une série au lieu d'une saison : choisir ton cinq au repêchage des champions selon les bassins.

## Journal

- 2026-10-10 — Jalon 0 : le dépôt, la coquille, le script Leaguepedia, les vérifications rapides et la CI.
- 2026-10-10 — Jalon 1 commencé : les Mondiaux de 2011 à 2025, le catalogue des quatre ligues, la récolte élargie (objectifs, vision, objets, classes), `js/cotes.js` et ses remplacements par époque, `check_cotes`.
- 2026-10-10 — Leaguepedia refuse l'anonyme par l'API, même depuis GitHub ; la page d'export passe. Les quinze Mondiaux bâtis : r = 0,85 entre la force tirée des cotes et la vraie fiche.
- 2026-10-10 — Les images : photos et logos de Leaguepedia copiés dans img/lp (leur serveur refuse les autres sites), champions de Data Dragon ; la carte d'un joueur et ses quatre époques ; la sous-cote Économie.
- 2026-10-10 — Jalon 2 : les parties dans les shards (`matchs`), le moteur par événements (tours de 30 s, de 15 à 80 min) calibré sur les 1 355 parties des Mondiaux, le split au jour le jour et ses séries, `check_feuilles`. Les shards se rebâtissent par l'Action « Bâtir les splits ».
- 2026-10-10 — Jalon 3 : les canaux du moteur, le repêchage des champions comme deck de série (bannissements, bassins, confort, composition), les jetons, la boutique, les packs, le plan de jeu et les coachs ; `check_rogue` les mesure en paires.
- 2026-10-10 — Le plafond (le coût suit le niveau, `check_plafond`) et l'interface rapprochée de Cap 82-0 : ses jetons, sa condensée, son tableau indicateur, sa barre d'action.
- 2026-10-11 — Jalon 4, la gestion de Cap 82-0 : la run sur plusieurs splits et son mandat, la sauvegarde par journal d'actions, la roulette à relances, le marché et le banc, la boîte de réception ; `check_gestion` joue des runs entières et les rejoue.
