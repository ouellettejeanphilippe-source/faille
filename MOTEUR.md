# Le moteur — la spécification

`js/moteur.js` joue une partie, `js/sim.js` un split et ses séries. Ce document dit ce que le moteur fait, d'où vient chaque chiffre et comment on sait qu'il retombe sur le vrai. Tout ce qui est marqué « mesuré » l'a été sur les 1 355 parties des quinze Mondiaux (2011 à 2025) ; `check_feuilles` refait la mesure à chaque PR.

Depuis la version 6 de la sauvegarde (30 octobre 2026), une partie se joue **comme une vraie** (§ 2) : les sorts d'invocateur, les niveaux et l'ultime, les sbires, les combats, les monstres et les tours de son époque. Une sauvegarde d'avant joue le moteur d'alors, gelé dans `js/moteur-v1.js` (§ 13), pour se rejouer pareil. Les canaux (§ 6) et ce qui les porte (le repêchage, les cartes, le coach, la stratégie, les liens) sont les mêmes pour les deux.

## 1. Les vraies parties

`scripts/build_splits.mjs` garde une ligne par partie dans chaque shard (`matchs`, voir docs/donnees.md) : les deux équipes, la durée, le côté gagnant, puis par côté les éliminations, l'or, les tours, les dragons, le Nashor, les hérauts, les inhibiteurs. Leaguepedia met le côté bleu en `Team1` (vérifié : `Side` 1 dans `ScoreboardPlayers`).

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

L'écart d'or final est |or bleu − or rouge| sur l'or moyen d'une équipe. De 2011 à 2013, Leaguepedia n'a ni les éliminations d'équipe, ni l'or, ni les tours, ni les objectifs partie par partie : le moteur prend alors ce que les fiches des joueurs donnent (les éliminations, l'or), les règles du jeu de l'époque (§ 2) et, pour la prise des monstres, les débits de repli de `js/moteur.js` ; aucun repère ne se mesure sur ces années-là.

**Mesuré, tous Mondiaux :** le côté bleu gagne 54,9 % des parties ; le vainqueur a fait tomber 9,35 tours, le perdant 2,72 ; **aucun vainqueur n'a moins de cinq tours ni zéro inhibiteur** (1 233 parties où c'est mesuré) — pas d'abandon dans ces données, le nexus tombe toujours. Les parties durent de 19,1 à 71,6 min ; l'écart type de la durée est 19,6 % de la durée moyenne de son Mondial.

**Mesuré le 30 octobre 2026, pour le moteur d'aujourd'hui** (de nouveaux repères, `scripts/lib/reperes.mjs`) :

- le gagnant fait **70,6 %** des éliminations de la partie (1 233 parties) — un combat a deux camps qui tuent ;
- le gagnant a fait tomber **1,75** inhibiteur, le perdant **0,11** (1 005 parties) — un inhibiteur repousse et se refait tomber ;
- **7,5 %** des parties durent moins des trois quarts de la durée de leur époque (1 355 parties) — la dégelée existe, mais pas trop ;
- **2,32 aides par élimination** (281 équipes, le total des fiches de leurs joueurs) ;
- les **hérauts** par partie suivent leurs règles : 0,9 à 1 de 2017 à 2019 (un seul héraut), 2 de 2020 à 2023 (deux), 1 en 2024 et 2025 ;
- les **sorts d'invocateur** de chaque rôle, Mondial par Mondial (`ScoreboardPlayers`, `SummonerSpells`) : le haut prend Flash et Embrasement jusqu'en 2013, Flash et Téléportation ensuite ; le jungler, Châtiment et Flash ; le milieu, Embrasement, puis la Téléportation (2015 →), le Fantôme en 2016 ; le tireur passe de la Fatigue (2011) à l'Embrasement, la Barrière (2013), les Soins (2014 → 2016, 2018, 2020), la Téléportation (2019), la Purge (2021 → 2024), la Barrière (2025) ; le soutien, de la Clairvoyance (2011) à la Fatigue, l'Embrasement, les Soins (`REPLI`, js/moteur.js).

**Pas encore mesurable :** l'écart d'or à 15 min et la ligne du temps d'une partie (le premier sang, la première tour, le premier dragon). Leaguepedia ne les a pas ; ils viendront d'Oracle's Elixir (2014 →) ou de lolesports (2023 →). D'ici là, les horaires de la phase de lignes viennent des règles du jeu, et ce qui s'y passe n'est jugé que par ce que la partie entière en garde.

## 2. Une partie comme une vraie

Une partie avance par **tours de 30 secondes**, et chaque tour a **son propre dé** (tiré de la graine de la partie et du numéro du tour) : un effet qui change un combat ne décale pas les dés des tours suivants, et deux parties qui ne diffèrent que par un canal restent la même partie ailleurs — c'est ce qui rend la mesure en paires (§ 8) nette. Rien n'est tiré d'avance : la durée, le pointage, l'or, les niveaux émergent.

**Chaque joueur** a son état : vivant ou mort jusqu'à sa réapparition, son expérience et son niveau (l'ultime au 6), ses sbires, son or, ses deux sorts d'invocateur et leurs recharges, son ultime et sa recharge, sa série d'éliminations (sa prime) ou de morts. Ses sorts sont les siens (le shard : la paire la plus jouée sur son plus joué), sinon ceux de son rôle à l'époque de la partie (`REPLI`, mesuré).

**Le revenu** : l'or de l'époque, moins ce que les primes en donnent, se partage chaque tour — une part passive à tous, la ferme aux vivants selon leur vraie part de l'or de l'équipe ; un écart de ligne et le camp qui mène à l'or (la carte à lui) en prennent un peu plus. **L'expérience** par minute selon le rôle (le haut et le milieu seuls dans leur ligne, le bas partagé, le soutien moins), plus celle des éliminations ; les niveaux suivent la table du jeu (280, puis 100 de plus par niveau, jusqu'au 18). **Les sbires** : la vraie cadence de chaque joueur (`cs`, par minute), tant qu'il est en vie.

**Les jeux.** En phase de lignes (jusqu'à 14:00), chaque ligne peut avoir son **duel** (de plus en plus souvent jusqu'au niveau 6), son **gank** (le jungler qui vient, l'autre qui répond parfois, la Téléportation du haut sur un combat du bas de 2014 à 2019), sa **plongée sous la tour** (dès 6:00 : la tour défend) ; les junglers et les soutiens s'**envahissent**. Ensuite viennent les **picks** (un joueur pris seul par deux à quatre), les **escarmouches** et les **combats d'équipe**. Les débits suivent les éliminations de l'époque (`JEUX` × `rythme`) ; les objectifs ont leurs batailles en plus.

**Un combat est un combat.** Ses participants (en vie et là) se rendent les coups un échange à la fois : un camp prend une élimination selon sa puissance (la ligne pour un jeu de ligne, le combat sinon), ses buffs, l'heure (le tardif), son or, son côté, son niveau (l'ultime au 6 en phase de lignes) et ses sorts prêts (l'Embrasement, la Fatigue), et surtout son **nombre** — un mort ne revient pas avant sa réapparition, alors un combat qui tourne tourne vite. La victime s'en tire parfois au **Flash** (ou au Fantôme), aux **Soins**, à la **Barrière** ; un Flash brûlé la rend plus facile à prendre jusqu'à sa recharge. Le tueur selon sa vraie part des éliminations, les aides parmi ceux qui sont là ; le combat continue ou se défait. Il en sort des échanges, des 3 pour 1, des as, des doublés et des pentas (dans les dix secondes, trente pour le cinquième), des fins de série et leurs primes.

**Les primes** (wiki LoL, « Champion gold bounties ») : 300 d'or, la moitié de plus aux aides (150 au plus) ; une série monte la prime de 100 par élimination dès la deuxième, jusqu'à 1 000 ; une série de morts la baisse (267, puis × 0,75, au moins 100) ; le premier sang, 100 de plus (sauf en 2025) ; les plaques, les tours (par palier, selon l'époque), le Nashor (300 à chacun).

**Les structures.** Chaque camp a trois tours par ligne, son inhibiteur, deux tours devant le nexus. Elles tombent **dans l'ordre**, par la pression : celle d'une ligne en phase de lignes (une plaque à la fois, jusqu'à 14:00, à leur époque), la poussée de côté ensuite (le haut et le bas, et le camp qui mène y tient la carte), la charge du héraut, les super-sbires d'un inhibiteur à terre, et surtout **la poussée du vainqueur d'un combat** : d'autant plus loin que les autres attendent à leur fontaine, que l'heure avance (sur la durée de l'époque), que le vainqueur mène à l'or, qu'il a le Nashor. Les tours du nexus ne s'attaquent que si un inhibiteur est à terre ; un inhibiteur **repousse** 5 min après sa chute ; la base se défend mieux contre un camp qui ne mène pas de loin. Le nexus tombe quand une poussée y arrive, jamais avant 15 min ; à 80 min, chaque tour finit sur un combat qui le force.

**Les monstres** apparaissent à leurs horaires et se prennent à un débit réglé pour retomber sur le nombre mesuré de leur époque ; un camp a la priorité (ses objectifs — tôt, les lignes qui l'entourent —, sa stratégie, son or, son nombre), l'autre le dispute ou le cède. Disputé, c'est une **bataille** à la fosse, et le jungler de l'autre camp peut le **voler au Châtiment**. Le dragon (son type, l'âme, le terrain, l'ancestral et son exécution), le héraut (sa charge sur une tour), les larves du Néant, Atakhan, le Nashor (son buff, qui pousse).

### Les règles de chaque époque

Au patch du Mondial de l'année (`regles()`, js/moteur.js ; une partie entre deux époques prend la moyenne des années). Sources : le wiki LoL (« Dragon pit », « Dragon/Removed », « Baron Nashor », « Rift Herald », « Voidgrub », « Atakhan », « Death », « Champion gold bounties », « Turret »), les notes de la V8.23 ; les recharges des sorts, Data Dragon (`summoner.json` des versions 3.15.5, 4.20.1, 6.24.1, 16.20.1).

| | 2011–2014 | 2015 | 2016–2017 | 2018 | 2019 | 2020–2021 | 2022 | 2023 | 2024 | 2025 |
|---|---|---|---|---|---|---|---|---|---|---|
| Dragon (premier, retour) | 2:30, 6 min | 2:30, 6 min | 2:30, 6 min | 2:30, 6 min | 5:00, 5 min | 5:00, 5 min | 5:00, 5 min | 5:00, 5 min | 5:00, 5 min | 5:00, 5 min |
| Ses types | un seul | un seul | 4 élémentaires | 4 | 4 | 4, l'âme, le terrain | + Hextech | + Chimtech | 6 | 6 |
| L'ancestral | — | — | dès 35:00, retour 10 min | 35:00, 8 min | 35:00, 6 min | 6 min après l'âme | idem | idem | idem | idem |
| Nashor (premier, retour, buff) | 15:00, 7 min, 4 min | 20:00, 7, 3 | 20:00, 7, 3:30 | 20:00, 7, 3:30 | 20:00, 6, 3:30 | 20:00, 6, 3 | 20:00, 6, 3 | 20:00, 6, 3 | 20:00, 6, 3 | 25:00, 6, 3 |
| Héraut | — | — | 6:00 (2016), 10:00 (2017) | 9:50 | 9:50 | 8:00, et un second | 8:00, deux | 8:00, deux | 14:00, un | 15:00, un |
| Larves du Néant | — | — | — | — | — | — | — | — | 2 × 3 dès 6:00 | 3 à 8:00 |
| Atakhan | — | — | — | — | — | — | — | — | — | 20:00 |
| Plaques (or chacune) | — | — | — | — | 160 | 160 | 160 | 160 | 125 | 125 |

## 3. La feuille se ferme par construction

Une élimination crédite d'un même geste l'équipe, le tueur, la victime de l'autre équipe et les aides ; l'or va aux joueurs et à l'équipe ensemble ; chaque événement va au fil. `check_feuilles` le vérifie sur trois splits complets (saison et séries, ~330 parties) :

- les éliminations d'une équipe = celles de ses joueurs = les morts de l'autre ; l'or d'une équipe = celui de ses joueurs ;
- le fil compte ce que la feuille compte (éliminations, tours, plaques, dragons, hérauts, larves, Atakhan, Nashor, inhibiteurs) et suit l'horloge ;
- au plus quatre aides par élimination, jamais le tueur ; au plus onze tours ;
- le vainqueur a fait tomber le nexus : cinq tours, un inhibiteur, 15 min passées, le dernier mot du fil ;
- **et la partie se tient d'un bout à l'autre** : un mort ne tue, n'aide ni ne meurt avant sa réapparition ; un sort ne resert pas avant sa recharge ; une ligne tombe dans l'ordre, les tours du nexus quand un inhibiteur est à terre, le nexus après elles ; un inhibiteur ne retombe qu'après avoir repoussé ; cinq plaques au plus par tour, avant 14:00 ; un doublé suit l'élimination d'avant du même tueur ; les niveaux de 1 à 18 ; les monstres de l'époque seulement ;
- dans la ligue, chaque élimination est une mort ; chaque série finit à sa dernière victoire ; chaque équipe joue ses 18 ; les séries couronnent un champion.

## 4. La calibration

Les réglages, et rien d'autre ne se règle (`REGLAGES`, js/moteur.js) : `force` (un écart de puissance), `boule` (l'or d'avance), `nombre` (un joueur de plus dans un combat), `cote` (le côté bleu), `ferme` et `emprise` (la ferme d'un écart de ligne, et du camp qui mène), `rythme` (le débit des jeux), `aide`, `tours` (la pression sur les tours), `pousse` (ce que vaut un mort adverse en tours), `fin` (la poussée qui grandit avec l'heure et l'avance, la base qui se défend), `obj` (la part de l'or sur un objectif, la chance de le disputer, le buff d'un dragon, de l'âme, de l'ancestral, du Nashor, la charge du héraut, le vol, le rythme des prises). `scripts/calibrer.mjs` les cherche ensemble contre les repères, sur deux jeux de graines à la fois (`REJOUER=4 DECALAGES=0,100`), pour que **chaque vraie partie des Mondiaux, rejouée entre ses deux vraies équipes**, retombe sur ce qui s'est passé. `check_feuilles` rejoue les 1 355 parties huit fois chacune et juge chaque repère contre **l'intervalle de la mesure elle-même** (deux erreurs types de part et d'autre) :

| Repère | Réel | Avant | Moteur | Borne |
|---|---|---|---|---|
| Durée, sur celle de l'époque | 1,000 | 0,994 | 1,006 | 0,989 à 1,011 |
| Écart type de la durée, sur celle de l'époque | 0,196 | 0,198 | 0,194 | 0,189 à 0,204 |
| Éliminations par partie | 25,757 | 25,807 | 25,535 | 25,266 à 26,247 |
| La part des éliminations au gagnant | 70,6 % | 81,0 % ✗ | 70,8 % | 69,9 % à 71,3 % |
| Victoires du côté bleu | 54,9 % | 55,5 % | 56,1 % | 52,2 % à 57,6 % |
| Le favori des cotes gagne, écart de 0 à 0,1 | 55,3 % | 51,1 % | 52,8 % | 49,2 % à 61,4 % |
| Le favori des cotes gagne, écart de 0,1 à 0,2 | 57,4 % | 59,5 % | 59,4 % | 51,4 % à 63,4 % |
| Le favori des cotes gagne, écart de 0,2 à 0,4 | 72,1 % | 73,5 % | 69,3 % | 67,4 % à 76,8 % |
| Le favori des cotes gagne, écart de 0,4 et plus | 84,0 % | 86,2 % | 83,8 % | 80,5 % à 87,4 % |
| Tours du gagnant | 9,350 | 9,348 | 9,288 | 9,279 à 9,421 |
| Tours du perdant | 2,716 | 2,758 | 2,774 | 2,603 à 2,829 |
| Inhibiteurs du gagnant | 1,753 | 1,000 ✗ | 1,806 | 1,694 à 1,812 |
| Inhibiteurs du perdant | 0,109 | 0,000 ✗ | 0,123 | 0,077 à 0,142 |
| Écart d'or final, sur l'or moyen | 20,0 % | 19,8 % | 20,2 % | 19,4 % à 20,5 % |
| Dragons par partie | 4,104 | 4,141 | 4,087 | 4,034 à 4,174 |
| Nashor par partie | 1,369 | 1,392 | 1,353 | 1,328 à 1,410 |
| Hérauts par partie | 1,335 | 1,321 | 1,337 | 1,298 à 1,373 |
| Parties courtes (moins de 0,75 de la durée de l'époque) | 7,5 % | 9,8 % ✗ | 8,1 % | 6,0 % à 8,9 % |
| Aides par élimination | 2,319 | 2,327 | 2,308 | 2,291 à 2,348 |
| Le camp qui prend plus de dragons gagne | 83,3 % | 84,7 % | 82,5 % | 81,0 % à 85,6 % |
| Le camp qui prend plus de Nashor gagne | 92,5 % | 91,6 % | 92,1 % | 90,9 % à 94,1 % |
| Le camp qui prend plus de hérauts gagne | 66,2 % | 66,0 % | 68,9 % | 62,9 % à 69,5 % |

« Avant » : le moteur d'avant la version 6 (§ 13), mesuré le même jour sur les mêmes repères ; il ne tenait pas les nouveaux (un gagnant qui faisait 81 % des éliminations, un seul inhibiteur pour tout le monde). « Le favori des cotes » : l'équipe dont les cinq ont la plus grande valeur moyenne. Une part de ce lien est circulaire (les cotes lisent l'or et la participation, qui suivent la victoire — voir check_cotes) : le moteur reproduit ce que les cotes prédisent du vrai, pas plus.

**Pour recalibrer** (de nouveaux splits, une règle d'époque de plus) : `node scripts/check_feuilles.mjs` dit quel repère sort ; `REJOUER=4 DECALAGES=0,100 node scripts/calibrer.mjs 300` cherche (une vingtaine de minutes), en partant des réglages de `DEPART` ; on recopie le résultat dans `REGLAGES` et on vérifie sur un troisième jeu de graines. Ce qui porte quoi : la durée, `pousse` et `fin.pente` ; sa dispersion et les parties courtes, `fin.avance` et `fin.base` ; les éliminations, `rythme` ; leur part au gagnant, `nombre` et `boule` ; les tours, `tours` et `pousse` ; l'écart d'or, `ferme`, `emprise` et `boule` ; les favoris, `force` ; le côté, `cote` ; les objectifs, `obj`.

**La vitesse.** Une partie se joue en ~170 µs (le moteur d'avant : ~90 µs), mesuré sur 20 000 parties après échauffement ; `check_rogue` passe d'une demi-minute à un peu plus d'une minute.

## 5. Le split et les séries

- **La ligue** : ton cinq et neuf vrais vestiaires, tirés par la même roulette (un split, une équipe ; à chaque rôle, celui qui l'a le plus joué). Deux rondes où chacun croise chacun, côtés inversés au retour : 18 journées de BO1 (`creerSplit` sait faire le BO3).
- **Au jour le jour** (la règle de Cap 82-0) : rien ne se joue d'avance ; `jouerJournee` joue une journée. Chaque partie a son propre dé, tiré de la graine du split et de sa place au calendrier (`graineDe`) : jouées une à une ou d'un bloc, avec du hasard tiré ailleurs entre deux, elles donnent la même chose — `check_graine`.
- **Le classement** : les séries gagnées, l'écart des parties, le face-à-face.
- **Les séries** : les six premiers, en BO5. 3 contre 6 et 4 contre 5 ouvrent ; le premier croise le moins bien classé des survivants ; une ronde se joue d'un coup. Dans une série, le perdant de la partie d'avant prend le côté bleu.

## 6. Les canaux (jalon 3)

Ce qui change une partie (le repêchage des champions, les cartes du plan de jeu, le coach) passe par **les canaux** (`js/canaux.js`, partagés par les deux moteurs), et par rien d'autre. Une source d'effets est un objet dont chaque clé est un canal ; les sources se somment en un seul endroit (`sommerEffets`), puis chaque canal reste dans sa borne (`BORNES`).

| Canal | Ce qu'il fait | Borne |
|---|---|---|
| `ligne` | écarts types ajoutés aux trois lignes (la phase de lignes) | ± 0,5 |
| `combat` | écarts types ajoutés au combat (escarmouches, tours, combat final) | ± 0,4 |
| `objectifs` | écarts types ajoutés aux objectifs (dragons, héraut, Nashor) | ± 0,5 |
| `dragons`, `heraut`, `nashor` | écarts types ajoutés à CET objectif seulement (une priorité) | ± 2,5 |
| `split` | écarts types ajoutés aux tours que l'équipe dispute (la pression de côté) | ± 2,5 |
| `tardif` | écarts types de combat qui comptent selon l'heure : × 2 (t ÷ durée de l'époque − 0,8), de −1 à 1 | ± 0,8 |
| `rythme` | × le débit des éliminations, pour les deux équipes | 0,7 à 1,4 |
| `siege` | × le débit des tours, pour les deux équipes | 0,7 à 1,4 |
| `fin` | × la hâte du combat final : plus de 1, on ferme tôt ; moins, on étire | 0,7 à 1,4 |
| `confort` | { rôle : écarts types } ajoutés à toutes les sous-cotes d'un joueur | −1 à 0 |

Les trois multiplicatifs touchent la partie entière : chacune des deux équipes en porte la racine carrée. **Neutres, les canaux rejouent la partie calibrée au tirage près** : les vraies parties de `check_feuilles` ne passent par aucun effet, et une ligue sans effet donne la même empreinte qu'avant les canaux.

**Dans le moteur d'aujourd'hui** (js/moteur.js), chaque canal a sa prise, et aucune ne bouge une partie neutre. Une puissance s'y compose (le nombre, les niveaux, l'or font boule de neige), alors un écart type d'un canal additif y vaut 0,85 écart type de puissance (`DOSE`), et celui du combat 0,7 (`DOSE_COMBAT`) : le combat se joue échange par échange, et c'est le canal de l'exécution d'une stratégie.

- `ligne` : la puissance des trois lignes (les duels, les ganks, les plongées), dosée à 0,7 ; la pression d'une ligne sur sa tour (les plaques), un écart type de plus ; les autres combats de la phase de lignes, la moitié (`LIGNE_CANAL`). Une ligne qui gagne pèse plus ici qu'au moteur d'avant — elle fait les niveaux, l'or, les plaques, la première tour —, d'où ce dosage : 0,45 écart type de ligne y vaut 1,1 victoire par saison, comme avant.
- `combat`, `objectifs`, `dragons`, `heraut`, `nashor` : la puissance au combat, la priorité sur un objectif ; et la bataille d'un objectif, préparée par le camp qui l'a priorisé : la moitié de ses objectifs et de sa priorité sur ce monstre. La priorité d'un dragon ou du Nashor va jusqu'à 2,5 écarts types, faite pour la priorité seule ; dans la bataille, un combat à cinq qui décide souvent la partie, elle ne compte que pour 0,3 (`PREPARE`), celle du héraut entière.
- `split` : la poussée de côté, la pression des lignes pour moitié, et la poussée d'un vainqueur (+12 % par écart type).
- `tardif` : la puissance au combat selon l'heure, autour d'un pivot plus tôt qu'avant (`PIVOT_V2`, 0,65 de la durée de l'époque) : la partie se décide plus tôt ici.
- `rythme` : le débit des jeux, la chance de disputer un objectif, la suite d'un combat ; et chaque poussée un peu moins loin, pour que la partie garde ses tours.
- `siege` : la pression sur les tours et la poussée d'un vainqueur ; `fin` : la poussée (par sa racine) et la défense de la base (par sa racine).
- `confort` : les sous-cotes de chaque joueur, comme avant.

## 7. Le repêchage des champions

`js/repechage.js`. Avant chacune de tes séries : l'adversaire bannit tes trois plus joués (le plus joué de chacun de tes cinq, les plus joués d'abord), tu bannis trois champions dans leurs bassins, tu choisis un champion pour chacun de tes cinq dans son **vrai bassin** du split, puis l'adversaire prend, joueur par joueur, son plus joué qui reste. Tu choisis avant lui : prendre son champion fétiche le lui enlève.

- **Le confort.** Sur un champion qu'il a moins joué que son plus joué, un joueur perd 0,6 × (1 − √(ses parties dessus ÷ celles sur son plus joué)) écart type sur toutes ses sous-cotes ; hors de son bassin, 0,6 entier. Sur son plus joué, rien.
- **La composition.** Les classes des cinq champions (Data Dragon, `data/champions.json`) donnent la forme de la partie, **comptées contre la composition moyenne des vraies équipes**, chacun sur son plus joué : 0,54 assassin, 0,78 tireur, 0,84 tank, 1,27 mage, 0,85 combattant, 0,73 soutien (`REFERENCE`, mesurée sur les 281 équipes des Mondiaux ; `check_rogue` la remesure). Une composition ordinaire ne change rien.
- Les séries où tu ne joues pas n'ont pas de repêchage : chacun y prend son plus joué, ce qui est la partie calibrée.

## 8. Le rogue, mesuré en paires

`js/rogue.js`, repris de Cap 82-0. Les **jetons** ne se gardent pas : ils se recomptent des résultats (20 au départ, 4 par série gagnée, 1 par série perdue, 20 par ronde de séries gagnée) moins les achats. La **boutique** vend trois packs (bronze 10 jetons, argent 18, or 30 ; chaque pack hausse le suivant de 10 %), tirés du dé de la ligue et du numéro de l'achat ; une carte ne sort qu'une fois. Le **plan de jeu** : trois cartes actives au plus, changées entre deux journées. Le **coach** (12 jetons, un seul en poste) monte de palier à 3, 6 et 9 séries jouées avec une carte de sa couleur au plan ; la couleur d'une carte se lit sur ses canaux (`couleurDe`), jamais à la main. Chaque palier ouvre un de ses trois **pouvoirs** (§ 11).

**La mesure en paires** (`check_rogue`) : la même ligue de dix vraies équipes jouée sous la même graine, l'effet donné aux équipes paires puis aux impaires ; pour chaque équipe, ses victoires avec l'effet moins ses victoires sans. Douze ligues, 120 paires par mesure. La forme se lit sur les parties d'une équipe traitée contre une qui ne l'est pas, comparées aux mêmes parties sans aucun effet. Sans effet, les deux passes sont identiques (le témoin).

**Les bornes**, par saison de 18 parties : une carte rapporte au plus 0,6 victoire (commune), 1 (peu commune), 1,5 (rare), 2,5 (légendaire, et un coach au palier III) ; une rare, une légendaire et un coach au palier III **se voient** sur la feuille (± 1 min, ± 2 éliminations, ± 0,6 tour, ± 0,3 objectif par partie, ou ± 0,3 objectif de plus pour elle). Le repêchage automatique des deux côtés ne penche pas (± 0,6).

**Mesuré** le 30 octobre 2026, sur le moteur d'aujourd'hui (victoires de plus par saison ; la forme contre une équipe sans effet, par partie) :

| | Victoires | Durée | Éliminations | Tours | Ses objectifs |
|---|---|---|---|---|---|
| ⚡ Escarmouches au niveau 3 (rare) | +0,37 | −2,10 min | +5,39 | −0,31 | +0,32 |
| 🦀 Le héraut au milieu (rare) | +0,20 | −1,89 | −2,03 | +0,27 | +0,16 |
| 🟣 Le coup de Nashor (rare) | +0,35 | +0,40 | −5,40 | +0,01 | +0,04 |
| 🏆 La méta du tournoi (légendaire) | +1,35 | −0,46 | +4,55 | −0,05 | +0,55 |
| 🌀 Le 4-1 (légendaire) | +0,13 | −2,31 | −2,25 | +0,12 | +0,04 |
| Trois bannissements (l'adversaire n'en fait pas) | +0,68 | +0,23 | −0,27 | +0,07 | +0,26 |
| Le repêchage automatique, des deux côtés | +0,03 | +0,67 | +0,25 | +0,14 | −0,03 |

Le reste (les communes, les peu communes, une classe de plus au repêchage) est dans la sortie de `check_rogue`. Une lecture a un bruit d'environ ± 0,1 victoire : on ne retouche pas une carte sur une seule lecture.

**Ce que ça dit.** Une carte change la forme de la partie bien plus que sa force : les rares rapportent de 0,2 à 0,4 victoire par saison et changent la partie de deux à cinq éliminations ou de deux minutes. La méta du tournoi, la plus forte, monte à 1,35 victoire (au moteur d'avant : 0,6), sous sa borne de légendaire : un combat se joue maintenant échange par échange, et une équipe meilleure à la ligne, au combat et aux objectifs en tire plus. Les bannissements pèsent 0,7, à jeu égal avec l'adversaire. Le tardif coûte encore un peu (−0,10 et −0,33 pour ses deux cartes), même avec son pivot ramené à 0,65 de la durée (`PIVOT_V2`) : la ligne du temps des parties (Oracle's Elixir) le calibrera.

## 9. Les liens d'origine et l'entraînement (jalon 4)

Les **liens d'origine** (`LIENS`, js/rogue.js, repris des « liens » de LoL Esports Manager) récompensent les joueurs de ton cinq qui ont joué ensemble pour vrai : le duo bas-soutien ou milieu-jungle d'un même vestiaire, trois d'un même vestiaire, trois aux couleurs d'un même club. Une vraie équipe a déjà les siens dans la partie calibrée ; un lien rend à ton cinq une part de ce qu'elle a. Chacun passe par les canaux, comme une carte, et `check_rogue` le mesure en paires à sa rareté : de +0,03 à +0,13 victoire par saison, l'ordre de grandeur des cartes peu communes.

L'**entraînement** (js/gestion.js) ne crée aucun canal : un champion entraîné entre au bout du bassin du joueur, compté pour le quart de son plus joué (`ENTRAINEMENT.part`). Le confort le lit comme les autres : il coûte −0,3 écart type, entre ses vrais champions et le hors-bassin (−0,6). `check_gestion` vérifie qu'il tombe là. L'écran le dit « entraîné », jamais en parties.

## 10. La stratégie (jalon 5)

`js/strategie.js`. Le plan de match de ton cinq, au centre du split : sept stratégies — le contrôle des dragons, jouer autour du Nashor, le héraut et les tours, pousser en solitaire, les combats à cinq, l'agression précoce, jouer pour le tardif. Chacune **demande** des joueurs (trois rôles et un axe chacun : un jungler d'objectifs, un haut qui gagne sa ligne…), et son **fit** est la moyenne de ces sous-cotes, jugées dans le split de chaque joueur. Comme les systèmes de Cap 82-0 :

- son **gain** (ses canaux : la priorité sur un objectif, la pression de côté, le rythme…) suit le fit : la moitié à fit nul, une fois et demie sur mesure, rien à contre-emploi marqué ;
- son **prix** se paie toujours (céder un autre objectif, une ligne plus faible…) ;
- son **exécution** : un plan que tes joueurs savent jouer rend l'équipe meilleure au combat, un plan à contre-emploi la défait (de −0,25 à +0,5 écart type, nulle à fit nul).

Le fit se dit en mots, comme un badge (Sur mesure, Bon fit, Fit moyen, À contre-emploi ; ✓ ≈ ✗ par demande), jamais en cote.

**Mesuré en paires** (`check_rogue`) : chaque équipe traitée joue la stratégie avec SES joueurs ; le tiers le mieux ajusté y gagne de 0,5 à 2,5 victoires par saison, le tiers le moins bien ajusté y perd (0 ou moins), et chacune se voit sur sa propre signature (les dragons, le Nashor, les hérauts, les tours que l'équipe prend de plus que l'autre ; la durée ; les objectifs). Mesuré le 30 octobre 2026, sur le moteur d'aujourd'hui : le tiers le mieux ajusté gagne de +0,73 (jouer autour du Nashor) à +2,05 (pousser en solitaire) ; le moins bien ajusté perd de −0,43 (le contrôle des dragons) à −0,83 (pousser en solitaire). L'écart est plus grand qu'au moteur d'avant (+0,5 à +1,1, puis 0 à −0,4) : un plan joue sur plus de prises (les plaques, la poussée, la bataille d'un objectif préparée), et le fit y compte plus. Une lecture a un bruit d'environ ± 0,3 victoire par tiers (40 équipes) : d'autres ligues d'essai donnent jusqu'à 2,5 pour pousser en solitaire et l'agression précoce, et des shards rebâtis (les sorts de chacun, le Mondial 2023 complété) 2,2 pour le tardif — d'où `DOSE_COMBAT` et `PREPARE` (§ 6), qui gardent les deux jeux de shards dans leurs bornes.

**Les vraies équipes jouent leur vraie partie** : aucune stratégie ne s'ajoute à elles (elles sont la calibration). Leur **identité** se lit sur leurs vraies parties — l'objectif qu'elles prenaient le plus au-dessus de la moyenne de leur split — et le dépisteur la dit.

## 11. Les pouvoirs du coach, phase par phase (jalon 6)

Repris du coach-personnage de Cap 82-0 (sa V21) : un pouvoir **lit ce qui est déjà joué** et **frappe une phase**. Une partie a trois phases : la phase de lignes (jusqu'à `LIGNES_FIN`, 14 min), le milieu de partie (jusqu'à `MILIEU_FIN`, 25 min), la fin de partie. Au début d'une phase, chaque pouvoir de l'équipe lit son état — son côté, son avance d'or, ses tours et ses dragons de plus que l'autre — et, si sa condition tient, ajoute ses effets aux canaux de l'équipe le temps de la phase ; les puissances et les débits se refont. Un pouvoir ne tire aucun dé : celui qui ne joue pas laisse la partie telle quelle, et une équipe sans pouvoir joue la partie calibrée. La feuille garde ceux qui ont joué (`feuille.pouvoirs`) ; le direct les dit.

Chaque coach en a trois, ouverts aux niveaux 1, 3 et 5 du coach-personnage (avant la version 4 de la sauvegarde, un par palier de confiance) ; chacun joue à peu près une partie sur deux, et fort quand il joue :

| Coach | I | II | III |
|---|---|---|---|
| 🐺 L'agresseur | La traque : en lignes, du côté rouge | La curée : au milieu, en avance à l'or | Le carnage : en fin, en retard à l'or |
| 🐉 Le stratège | Le contrôle du fleuve : au milieu, pas en avance aux dragons | La vision du héraut : en lignes, du côté bleu | L'appel du Nashor : en fin, à 4 000 d'or ou moins |
| ⏳ Le patient | La ferme : en lignes, du côté rouge | L'endurance : en fin, en retard à l'or | Le dernier mot : en fin, à 4 000 d'or ou moins |
| 🏰 L'assiégeant | Le siège : au milieu, autant de tours ou plus | Le héraut au front : en lignes, du côté bleu | La percée : en fin, en avance à l'or |

**Mesuré en paires** (`check_rogue`, le 30 octobre 2026, sur le moteur d'aujourd'hui) : chaque pouvoir seul reste sous 1,5 victoire par saison (de +0,02 à +0,43), joue dans 25 à 75 % des parties (de 26 à 66 %), et se voit sur sa signature les parties où il joue — la traque +1,36 élimination, la curée −1,58 min, le carnage +2,56 éliminations, le contrôle du fleuve +0,27 dragon de plus que l'adversaire, la vision du héraut +0,20 héraut, l'appel du Nashor +0,20 Nashor, la ferme −1,19 élimination, l'endurance +3,32 min, le dernier mot +2,40 éliminations, le siège +0,34 tour, le héraut au front +0,16 héraut, la percée −2,35 min. Les trois ensemble (le palier III) restent sous 2,5 victoires : de +0,53 (le stratège) à +0,82 (le patient).

**Le personnage** (version 4) : le coach, choisi au départ, gagne de l'expérience — 1 par série gagnée, 2 par ronde de séries gagnée, 3 pour un titre, 1 de plus par série gagnée avec une carte de sa couleur au plan — recomptée des résultats comme les jetons. Ses niveaux (à 0, 8, 20, 36 et 56 points) ouvrent ses pouvoirs aux niveaux 1, 3 et 5 ; aux niveaux 2 et 4, un **talent** fait grandir un pouvoir de moitié (chaque canal de moitié plus loin du neutre, toujours dans sa borne). Mesuré en paires : un pouvoir grandi reste sous 2,5 victoires (de −0,03 à +0,78) et se voit encore sur sa signature ; le personnage complet (niveau 5, deux talents) reste sous 4 victoires, de +0,58 (le stratège) à +1,02 (l'agresseur) — un coach change la forme d'une partie bien plus que sa force.

## 12. Le direct et le sommaire

Le direct (js/direct.js) rejoue la feuille et ne décide rien ; la Faille (js/terrain.js) place chaque événement du fil et nomme les moments que la feuille porte ; le commentateur (js/commentaire.js) dit le fil. Une feuille du moteur d'aujourd'hui (`moteur: 2`) leur en donne plus, et ils le lisent :

- **au tableau**, chaque joueur, son niveau sur son champion (`niveaux`, minute par minute), ses deux sorts d'invocateur, éteints le temps de leur recharge (lue dans le fil : chaque sort brûlé, à son heure), K/M/A, ses sbires (`sbires`) et son or (`orJoueurs`) ; au pointage, les tours, le Nashor et chaque dragon à son type ;
- **sur la carte**, chaque combat à son lieu (une ligne, une fosse, la jungle, la base), chaque tour à sa ligne et à son palier, les plaques qui sautent, les inhibiteurs qui tombent et qui repoussent, la fuite au Flash, la Téléportation, les larves, Atakhan ; les moments de plus : le gank déjoué, la bataille de l'ancestral, le vol au Châtiment, le quadruplé et le pentakill au détail du combat ;
- **au fil**, l'ultime nommé en français (`ultimes`, data/champions.json), les éliminations multiples, la prime de fin de série, l'Embrasement qui achève, le Flash brûlé pour rien, le dragon à son type, l'âme, l'ancestral, le vol, la tour à son palier, l'inhibiteur qui tombe et qui repousse, la première plaque, le premier niveau 6, le premier objet complété — les moments qui comptent, jamais chaque sbire ;
- **au sommaire**, le niveau, les sorts, les sbires et les objets complétés de chacun (ses objets les plus achetés dans son split, à la minute où son or en paie le prix), les plaques, les inhibiteurs et les larves face à face, les dragons à leur type, et les faits de la partie.

Le direct tient dans un écran de 390 × 844 : le pointage, la carte, les dix joueurs, puis la courbe de l'or et le fil dans une boîte qui défile seule, et les gestes.

## 13. Annexe : le moteur d'avant la version 6, gelé

`js/moteur-v1.js` : le moteur tel qu'il était le 30 octobre 2026, au tirage près, sans aucun réglage. Une partie de Rogue est un journal d'actions rejoué sous sa graine (js/partie.js) : les sauvegardes v ≤ 5 jouent ce moteur-là (`moteur: 1` à la création de leur split), et `check_gestion` le prouve deux fois : 75 parties jouées par le code d'avant, gelées avec les six vraies équipes qui les ont jouées et l'empreinte de chacune (`scripts/lib/moteur-v1.json`, sans les shards : une donnée corrigée à Leaguepedia n'y change rien), et une run de la version 5 gelée avec l'empreinte de ses parties (`scripts/lib/partie-v5.json`), qui tire ses joueurs des shards et ne se juge que sur ceux où elle a été gelée (leur empreinte, `shards`). Le direct et le commentateur lisent encore ses feuilles (`check_terrain` et `check_commentaire` jouent une ligue de chaque moteur).

### Le principe d'alors : une partie par événements

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

### Sa calibration

Huit réglages, et rien d'autre ne se règle (`REGLAGES`, aujourd'hui gelés dans js/moteur-v1.js) : `force`, `boule`, `ferme`, `tours`, `siege`, `cote`, `fin` (base, pente, avance) et `obj`, ce que valent les objectifs neutres (la part de la boule de neige sur un objectif et sur le héraut, le buff d'un dragon et de l'âme, celui du Nashor pendant trois minutes, la chance que le héraut fasse tomber une tour). Ils ont été cherchés ensemble pour que **chaque vraie partie des Mondiaux, rejouée entre ses deux vraies équipes**, retombe sur ce qui s'est passé. `check_feuilles` rejoue les 1 355 parties huit fois chacune et juge chaque repère contre **l'intervalle de la mesure elle-même** (deux erreurs types de part et d'autre) :

| Repère | Réel | Moteur | Borne |
|---|---|---|---|
| Durée, sur celle de l'époque | 1,000 | 0,994 | 0,989 à 1,011 |
| Écart type de la durée, idem | 0,196 | 0,198 | 0,189 à 0,204 |
| Éliminations par partie | 25,76 | 25,81 | 25,27 à 26,25 |
| Victoires du côté bleu | 54,9 % | 55,5 % | 52,2 à 57,6 % |
| Le favori des cotes gagne, écart < 0,1 | 55,3 % | 51,1 % | 49,2 à 61,4 % |
| … écart de 0,1 à 0,2 | 57,4 % | 59,5 % | 51,4 à 63,4 % |
| … écart de 0,2 à 0,4 | 72,1 % | 73,5 % | 67,4 à 76,8 % |
| … écart de 0,4 et plus | 84,0 % | 86,2 % | 80,5 à 87,4 % |
| Tours du gagnant | 9,35 | 9,35 | 9,28 à 9,42 |
| Tours du perdant | 2,72 | 2,76 | 2,60 à 2,83 |
| Écart d'or final | 20,0 % | 19,8 % | 19,4 à 20,5 % |
| Dragons par partie | 4,10 | 4,14 | 4,03 à 4,17 |
| Nashor par partie | 1,37 | 1,39 | 1,33 à 1,41 |
| Le camp qui prend plus de dragons gagne | 83,3 % | 84,7 % | 81,0 à 85,6 % |
| … plus de Nashor | 92,5 % | 91,6 % | 90,9 à 94,1 % |
| … plus de hérauts | 66,2 % | 66,0 % | 62,9 à 69,5 % |

**Les objectifs comptent (11 octobre 2026).** Avant, un objectif ne faisait que suivre la force : celui qui prenait plus de dragons gagnait 91 % du temps au moteur contre 83 % au réel, le Nashor 97,5 % contre 92,5 %, le héraut 80 % contre 66 % — et un dragon ne donnait rien. Depuis, un objectif se dispute avec moins de boule de neige (le héraut, tôt, encore moins), et il porte quelque chose : chaque dragon et l'âme renforcent le camp, le Nashor aussi pendant trois minutes, le héraut fait souvent tomber une tour. `scripts/calibrer.mjs` a cherché les réglages ensemble contre tous les repères (scripts/lib/reperes.mjs) ; ils tiennent sur trois jeux de graines. C'est ce qui permet à une stratégie de prioriser un objectif pour quelque chose (§10).

« Le favori des cotes » : l'équipe dont les cinq ont la plus grande valeur moyenne. Une part de ce lien est circulaire (les cotes lisent l'or et la participation, qui suivent la victoire — voir check_cotes) : le moteur reproduit ce que les cotes prédisent du vrai, pas plus.

**Ce qu'il ne retombait pas.** Les parties les plus courtes (9,8 % sous les trois quarts de la durée de leur époque, contre 7,5 %) ; la part des éliminations au gagnant (81 %, contre 70,6 %) ; un seul inhibiteur pour le gagnant et aucun pour le perdant (1,75 et 0,11). Le combat final ne connaissait que le temps et l'avance. Le moteur d'aujourd'hui les tient (§ 4).
