# Le moteur — la spécification

`js/sim.js` joue une partie, un split, ses séries. Ce document dit ce qu'il fait, d'où vient chaque chiffre et comment on sait qu'il retombe sur le vrai. Tout ce qui est marqué « mesuré » l'a été sur les 1 355 parties des quinze Mondiaux (2011 à 2025), le 10 octobre 2026 ; `check_feuilles` refait la mesure à chaque PR.

## 1. Les vraies parties

`scripts/build_splits.mjs` garde maintenant une ligne par partie dans chaque shard (`matchs`, voir docs/donnees.md) : les deux équipes, la durée, le côté gagnant, puis par côté les éliminations, l'or, les tours, les dragons, le Nashor, les hérauts, les inhibiteurs. Leaguepedia met le côté bleu en `Team1` (vérifié : `Side` 1 dans `ScoreboardPlayers`).

**Mesuré**, Mondial par Mondial :

| Mondial | Parties | Durée (min) | Éliminations / partie | Côté bleu | Écart d'or final | Tours / partie |
|---|---|---|---|---|---|---|
| 2011 | 28 | 38,0 ± 8,9 | — | 61 % | — | — |
| 2012 | 31 | 34,4 ± 7,2 | — | 45 % | — | — |
| 2013 | 63 | 32,1 ± 6,4 | — | 57 % | — | — |
| 2014 | 78 | 36,2 ± 8,6 | 28,6 | 59 % | 29,8 % | 12,4 |
| 2015 | 73 | 36,0 ± 7,2 | 26,5 | 59 % | 21,3 % | 12,9 |
| 2016 | 77 | 38,5 ± 9,3 | 25,0 | 55 % | 21,3 % | 12,3 |
| 2017 | 119 | 35,1 ± 8,8 | 19,5 | 56 % | 19,3 % | 12,6 |
| 2018 | 119 | 32,2 ± 5,9 | 23,1 | 57 % | 21,3 % | 11,5 |
| 2019 | 120 | 33,3 ± 6,4 | 26,4 | 53 % | 17,4 % | 12,3 |
| 2020 | 114 | 32,2 ± 5,0 | 26,3 | 51 % | 18,7 % | 11,6 |
| 2021 | 121 | 33,0 ± 6,3 | 27,1 | 49 % | 18,9 % | 12,4 |
| 2022 | 127 | 31,5 ± 5,5 | 26,2 | 54 % | 20,4 % | 11,6 |
| 2023 | 95 | 31,5 ± 5,4 | 25,3 | 61 % | 19,2 % | 11,9 |
| 2024 | 106 | 33,0 ± 5,2 | 27,2 | 58 % | 17,0 % | 12,4 |
| 2025 | 84 | 32,8 ± 5,5 | 30,2 | 50 % | 18,5 % | 11,3 |

L'écart d'or final est |or bleu − or rouge| sur l'or moyen d'une équipe. De 2011 à 2013, Leaguepedia n'a ni les éliminations d'équipe, ni l'or, ni les tours partie par partie : le moteur prend alors ce que les fiches des joueurs donnent (les éliminations, l'or) ou s'en passe (les tours), jamais un chiffre d'une autre époque.

**Mesuré, tous Mondiaux :** le côté bleu gagne 54,9 % des parties ; le vainqueur a fait tomber 9,35 tours, le perdant 2,72 ; **aucun vainqueur n'a moins de cinq tours ni zéro inhibiteur** (1 233 parties où c'est mesuré) — pas d'abandon dans ces données, le nexus tombe toujours. Les parties durent de 19,1 à 71,6 min (1 % sous 22,1, 1 % au-dessus de 54,4). L'écart type de la durée est 19,6 % de la durée moyenne de son Mondial.

**Pas encore mesurable :** l'écart d'or à 15 min et la ligne du temps d'une partie (le premier sang, la première tour). Leaguepedia ne les a pas ; ils viendront d'Oracle's Elixir (2014 →) ou de lolesports (2023 →). D'ici là, le moteur n'a aucun chiffre sur la phase de lignes qui ne se lise pas dans la partie entière.

## 2. Le principe : une partie par événements

Une partie avance par **tours de 30 secondes** et dure **de 15 à 80 minutes** : le nexus ne tombe pas avant l'abandon permis (15 min) et le combat final est forcé à 80. À chaque tour, chaque événement peut arriver :

| Événement | Quand | Débit | Qui le gagne |
|---|---|---|---|
| Élimination | dès 1 min 30 (les sbires se croisent) | éliminations de l'époque ÷ durée | avant 14 min : une ligne tirée au hasard, sa puissance de ligne ; après : la puissance de combat |
| Dragon | dès 5 min | dragons de l'époque ÷ (durée − 5) | la puissance d'objectifs |
| Héraut | de 8 à 20 min | hérauts de l'époque ÷ 12 | la puissance d'objectifs |
| Nashor | dès 20 min | Nashor de l'époque ÷ (durée − 20) | la puissance d'objectifs |
| Tour | dès 10 min | `tours` × tours de l'époque ÷ (durée − 10) | la puissance de combat, avec moins de boule de neige (`siege`) |
| Combat final | dès 15 min, forcé à 80 | de plus en plus probable avec le temps, plus tôt quand une équipe mène | la puissance de combat |

Les débits sont ceux **de l'époque** : le tempo de chaque équipe est celui de son split (`tempoDuSplit`), et une partie prend la moyenne des deux ; ton cinq, fait de cinq splits, prend la moyenne des cinq. Une partie de 2016 dure plus longtemps et compte plus d'éliminations qu'une de 2020 parce que ses vraies parties étaient ainsi.

**Qui gagne un événement.** La chance du côté bleu est `σ(force × écart de puissance + boule × avance d'or en milliers + cote × logit(part du côté bleu de l'époque))`. Les puissances sont lues sur les sous-cotes (js/cotes.js), qui sont des écarts types dans le rôle et le split :

- **combat** : la moyenne des valeurs des cinq ;
- **ligne** (haut, milieu, bas) : la ligne et la pression du joueur, l'implication du jungleur ; au bas, la ligne du tireur, l'implication et la vision du soutien ;
- **objectifs** : le combat, les objectifs du jungleur, la vision du soutien ;
- **ferme** : la moyenne des sous-cotes de ligne des cinq, qui donne un peu plus d'or par minute.

**Qui tue, qui aide, qui meurt, qui prend l'or : les vraies parts de chaque joueur dans son split.** Le tueur est tiré selon sa part des éliminations de l'équipe, la victime selon ses morts par partie, chaque coéquipier aide avec sa vraie chance d'aider sur une élimination qu'il ne fait pas, et le revenu de base se partage selon sa vraie part de l'or. Avant 14 min, seuls les joueurs de la ligne (et le jungleur) sont en jeu.

**Les primes et les horaires sont ceux du jeu**, pas des réglages : 300 d'or l'élimination, 150 partagés entre les aides, 250 la tour, 300 par joueur au Nashor ; le revenu de base est l'or de l'époque moins ce que ces primes en donnent déjà.

**Le combat final.** Son vainqueur fait tomber le nexus : trois tours d'une ligne (déjà prises, ou prises là), puis les deux du nexus, toujours là, et un inhibiteur. Les deux tours du nexus ne tombent jamais avant.

## 3. La feuille se ferme par construction

Une élimination crédite d'un même geste l'équipe, le tueur, la victime de l'autre équipe et les aides ; l'or va aux joueurs et à l'équipe ensemble ; chaque événement va au fil. `check_feuilles` le vérifie sur trois splits complets (saison et séries, ~330 parties) :

- les éliminations d'une équipe = celles de ses joueurs = les morts de l'autre ;
- l'or d'une équipe = celui de ses joueurs ;
- le fil compte ce que la feuille compte (éliminations, tours, dragons, hérauts, Nashor, inhibiteurs) et suit l'horloge ;
- au plus quatre aides par élimination, jamais le tueur ; au plus onze tours ;
- le vainqueur a fait tomber le nexus : cinq tours, un inhibiteur, 15 min passées, le dernier mot du fil ;
- dans la ligue, chaque élimination est une mort ; chaque série finit à sa dernière victoire ; chaque équipe joue ses 18 ; les séries couronnent un champion.

## 4. La calibration

Sept réglages, et rien d'autre ne se règle (`REGLAGES`, js/sim.js) : `force`, `boule`, `ferme`, `tours`, `siege`, `cote`, `fin` (base, pente, avance). Ils ont été cherchés ensemble pour que **chaque vraie partie des Mondiaux, rejouée entre ses deux vraies équipes**, retombe sur ce qui s'est passé. `check_feuilles` rejoue les 1 355 parties huit fois chacune et juge chaque repère contre **l'intervalle de la mesure elle-même** (deux erreurs types de part et d'autre) :

| Repère | Réel | Moteur | Borne |
|---|---|---|---|
| Durée, sur celle de l'époque | 1,000 | 0,996 | 0,989 à 1,011 |
| Écart type de la durée, idem | 0,196 | 0,198 | 0,189 à 0,204 |
| Éliminations par partie | 25,76 | 25,85 | 25,27 à 26,25 |
| Victoires du côté bleu | 54,9 % | 55,9 % | 52,2 à 57,6 % |
| Le favori des cotes gagne, écart < 0,1 | 55,3 % | 51,7 % | 49,2 à 61,4 % |
| … écart de 0,1 à 0,2 | 57,4 % | 58,3 % | 51,4 à 63,4 % |
| … écart de 0,2 à 0,4 | 72,1 % | 72,9 % | 67,4 à 76,8 % |
| … écart de 0,4 et plus | 84,0 % | 84,6 % | 80,5 à 87,4 % |
| Tours du gagnant | 9,35 | 9,36 | 9,28 à 9,42 |
| Tours du perdant | 2,72 | 2,74 | 2,60 à 2,83 |
| Écart d'or final | 20,0 % | 20,2 % | 19,4 à 20,5 % |
| Dragons par partie | 4,10 | 4,11 | 4,03 à 4,17 |
| Nashor par partie | 1,37 | 1,39 | 1,33 à 1,41 |

« Le favori des cotes » : l'équipe dont les cinq ont la plus grande valeur moyenne. Une part de ce lien est circulaire (les cotes lisent l'or et la participation, qui suivent la victoire — voir check_cotes) : le moteur reproduit ce que les cotes prédisent du vrai, pas plus.

**Pour recalibrer** (de nouveaux splits, un nouvel axe) : `node scripts/check_feuilles.mjs` dit quel repère sort ; on bouge le réglage qui le porte (la durée : `fin.base` ; sa dispersion : `fin.pente` ; les tours : `tours`, et leur partage : `siege` ; l'écart d'or : `ferme` et `boule` ; les favoris : `force` ; le côté : `cote`), et on vérifie avec plusieurs graines (`graineDe(n + 100, …)` dans le script) que la borne ne tient pas à un tirage.

**Ce qui ne retombe pas encore tout à fait.** Les parties les plus courtes : le moteur en sort 1 % sous 18,5 min, le réel 1 % sous 22,1 (le plus court mesuré : 19,1). Le combat final ne connaît que le temps et l'avance ; il lui manque ce qui empêche de finir tôt (les tours encore debout, les inhibiteurs qui repoussent).

## 5. Le split et les séries

- **La ligue** : ton cinq et neuf vrais vestiaires, tirés par la même roulette (un split, une équipe ; à chaque rôle, celui qui l'a le plus joué). Deux rondes où chacun croise chacun, côtés inversés au retour : 18 journées de BO1 (`creerSplit` sait faire le BO3).
- **Au jour le jour** (la règle de Cap 82-0) : rien ne se joue d'avance ; `jouerJournee` joue une journée. Chaque partie a son propre dé, tiré de la graine du split et de sa place au calendrier (`graineDe`) : jouées une à une ou d'un bloc, avec du hasard tiré ailleurs entre deux, elles donnent la même chose — `check_graine`.
- **Le classement** : les séries gagnées, l'écart des parties, le face-à-face.
- **Les séries** : les six premiers, en BO5. 3 contre 6 et 4 contre 5 ouvrent ; le premier croise le moins bien classé des survivants ; une ronde se joue d'un coup. Dans une série, le perdant de la partie d'avant prend le côté bleu.

## 6. Les canaux (jalon 3)

Ce qui change une partie (le repêchage des champions, les cartes du plan de jeu, le coach) passe par **les canaux** de `js/sim.js`, et par rien d'autre. Une source d'effets est un objet dont chaque clé est un canal ; les sources se somment en un seul endroit (`sommerEffets`), puis chaque canal reste dans sa borne (`BORNES`).

| Canal | Ce qu'il fait | Borne |
|---|---|---|
| `ligne` | écarts types ajoutés aux trois lignes (la phase de lignes) | ± 0,5 |
| `combat` | écarts types ajoutés au combat (escarmouches, tours, combat final) | ± 0,4 |
| `objectifs` | écarts types ajoutés aux objectifs (dragons, héraut, Nashor) | ± 0,5 |
| `tardif` | écarts types de combat qui comptent selon l'heure : × 2 (t ÷ durée de l'époque − 0,8), de −1 à 1 | ± 0,8 |
| `rythme` | × le débit des éliminations, pour les deux équipes | 0,7 à 1,4 |
| `siege` | × le débit des tours, pour les deux équipes | 0,7 à 1,4 |
| `fin` | × la hâte du combat final : plus de 1, on ferme tôt ; moins, on étire | 0,7 à 1,4 |
| `confort` | { rôle : écarts types } ajoutés à toutes les sous-cotes d'un joueur | −1 à 0 |

Les trois multiplicatifs touchent la partie entière : chacune des deux équipes en porte la racine carrée. **Neutres, les canaux rejouent la partie calibrée au tirage près** : les vraies parties de `check_feuilles` ne passent par aucun effet, et une ligue sans effet donne la même empreinte qu'avant les canaux.

## 7. Le repêchage des champions

`js/repechage.js`. Avant chacune de tes séries : l'adversaire bannit tes trois plus joués (le plus joué de chacun de tes cinq, les plus joués d'abord), tu bannis trois champions dans leurs bassins, tu choisis un champion pour chacun de tes cinq dans son **vrai bassin** du split, puis l'adversaire prend, joueur par joueur, son plus joué qui reste. Tu choisis avant lui : prendre son champion fétiche le lui enlève.

- **Le confort.** Sur un champion qu'il a moins joué que son plus joué, un joueur perd 0,6 × (1 − √(ses parties dessus ÷ celles sur son plus joué)) écart type sur toutes ses sous-cotes ; hors de son bassin, 0,6 entier. Sur son plus joué, rien.
- **La composition.** Les classes des cinq champions (Data Dragon, `data/champions.json`) donnent la forme de la partie, **comptées contre la composition moyenne des vraies équipes**, chacun sur son plus joué : 0,54 assassin, 0,78 tireur, 0,84 tank, 1,27 mage, 0,85 combattant, 0,73 soutien (`REFERENCE`, mesurée sur les 281 équipes des Mondiaux ; `check_rogue` la remesure). Une composition ordinaire ne change rien.
- Les séries où tu ne joues pas n'ont pas de repêchage : chacun y prend son plus joué, ce qui est la partie calibrée.

## 8. Le rogue, mesuré en paires

`js/rogue.js`, repris de Cap 82-0. Les **jetons** ne se gardent pas : ils se recomptent des résultats (20 au départ, 4 par série gagnée, 1 par série perdue, 20 par ronde de séries gagnée) moins les achats. La **boutique** vend trois packs (bronze 10 jetons, argent 18, or 30 ; chaque pack hausse le suivant de 10 %), tirés du dé de la ligue et du numéro de l'achat ; une carte ne sort qu'une fois. Le **plan de jeu** : trois cartes actives au plus, changées entre deux journées. Le **coach** (12 jetons, un seul en poste) monte de palier à 3, 6 et 9 séries jouées avec une carte de sa couleur au plan ; la couleur d'une carte se lit sur ses canaux (`couleurDe`), jamais à la main.

**La mesure en paires** (`check_rogue`) : la même ligue de dix vraies équipes jouée sous la même graine, l'effet donné aux équipes paires puis aux impaires ; pour chaque équipe, ses victoires avec l'effet moins ses victoires sans. Douze ligues, 120 paires par mesure. La forme se lit sur les parties d'une équipe traitée contre une qui ne l'est pas, comparées aux mêmes parties sans aucun effet. Sans effet, les deux passes sont identiques (le témoin).

**Les bornes**, par saison de 18 parties : une carte rapporte au plus 0,6 victoire (commune), 1 (peu commune), 1,5 (rare), 2,5 (légendaire, et un coach au palier III) ; une rare, une légendaire et un coach au palier III **se voient** sur la feuille (± 1 min, ± 2 éliminations, ± 0,6 tour, ± 0,3 objectif par partie, ou ± 0,3 objectif de plus pour elle). Le repêchage automatique des deux côtés ne penche pas (± 0,6).

**Mesuré** le 10 octobre 2026 (victoires de plus par saison ; la forme contre une équipe sans effet, par partie) :

| | Victoires | Durée | Éliminations | Tours | Ses objectifs |
|---|---|---|---|---|---|
| ⚡ Escarmouches au niveau 3 (rare) | +0,40 | −1,55 min | +2,30 | −0,63 | +0,19 |
| 🦀 Le héraut au milieu (rare) | +0,02 | −0,27 | −0,31 | +0,69 | +0,14 |
| 🟣 Le coup de Nashor (rare) | +0,03 | +0,34 | −3,20 | +0,03 | +0,08 |
| 🏆 La méta du tournoi (légendaire) | +0,58 | −1,08 | +1,46 | −0,50 | +0,37 |
| 🌀 Le 4-1 (légendaire) | +0,13 | −0,41 | −0,45 | +0,62 | +0,17 |
| 🐺 L'agresseur, palier III | +0,37 | −1,24 | +2,01 | −0,56 | +0,25 |
| 🐉 Le stratège, palier III | +0,03 | +0,79 | −2,57 | +0,12 | +0,14 |
| ⏳ Le patient, palier III | −0,15 | +1,33 | −1,75 | +0,29 | −0,05 |
| 🏰 L'assiégeant, palier III | 0,00 | −0,23 | −0,28 | +0,69 | +0,10 |
| Trois bannissements (l'adversaire n'en fait pas) | +0,78 | −0,14 | −0,37 | −0,04 | +0,34 |
| Le repêchage automatique, des deux côtés | +0,10 | +0,03 | −0,21 | −0,10 | −0,12 |

Le reste (les communes, les peu communes, une classe de plus au repêchage) est dans la sortie de `check_rogue`. Une lecture a un bruit d'environ ± 0,1 victoire : on ne retouche pas une carte sur une seule lecture.

**Ce que ça dit.** Une carte change la forme de la partie bien plus que sa force : la plus forte rapporte à peine plus d'une demi-victoire par saison. Ce qui pèse le plus, ce sont les bannissements, à jeu égal avec l'adversaire. Le tardif coûte encore un peu (−0,18 et −0,37 pour ses deux cartes) : son pivot, 0,8 de la durée, se calibrera quand on aura la ligne du temps des parties (Oracle's Elixir).

## 9. Les liens d'origine et l'entraînement (jalon 4)

Les **liens d'origine** (`LIENS`, js/rogue.js, repris des « liens » de LoL Esports Manager) récompensent les joueurs de ton cinq qui ont joué ensemble pour vrai : le duo bas-soutien ou milieu-jungle d'un même vestiaire, trois d'un même vestiaire, trois aux couleurs d'un même club. Une vraie équipe a déjà les siens dans la partie calibrée ; un lien rend à ton cinq une part de ce qu'elle a. Chacun passe par les canaux, comme une carte, et `check_rogue` le mesure en paires à sa rareté : de +0,03 à +0,13 victoire par saison, l'ordre de grandeur des cartes peu communes.

L'**entraînement** (js/gestion.js) ne crée aucun canal : un champion entraîné entre au bout du bassin du joueur, compté pour le quart de son plus joué (`ENTRAINEMENT.part`). Le confort le lit comme les autres : il coûte −0,3 écart type, entre ses vrais champions et le hors-bassin (−0,6). `check_gestion` vérifie qu'il tombe là. L'écran le dit « entraîné », jamais en parties.
