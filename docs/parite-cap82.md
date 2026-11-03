# La parité avec Cap 82-0 — l'index des systèmes

> **Rétro-documenté à partir du code.** Écrit le 2 novembre 2026 par la commande `/parite`, adaptée de `/reverse-document`, `/map-systems` et `/adopt` de Claude-Code-Game-Studios (Donchitos, licence MIT : https://github.com/Donchitos/Claude-Code-Game-Studios).
>
> **Les versions lues** : Cap 82-0 à `26540d0` (version 3.2.14, la V23 en cours) ; Faille à `4ea335a` (le 30 oct.). **Relu le 2 nov. au soir** à `a482ceb` : trois tranches de la V23 livrées depuis — G1 (les finis), B (les choix deviennent des cartes), E (les histoires ont des suites et des rares) ; restent chez Cap 82-0 A2, D et F.
>
> **Ce que l'index rapporte** : ce que le code des deux jeux **fait**. Une intention devinée porte « INTENTION INCONNUE » ; ses questions sont tranchées au § 6. Quand ce document et le code ne disent pas la même chose, ne suppose pas que le document est l'exigence.
>
> **Comment il a été fait** : cinq relecteurs, un par terrain (`faille-design`, `faille-economie`, `faille-recit`, `faille-ux`, et un général pour le hors-Rogue). Ce sont les agents `rogue-*` de Cap 82-0, eux-mêmes adaptés de Claude-Code-Game-Studios. Chacun a lu les deux dépôts. Les affirmations lourdes ont été revérifiées dans le code avant d'entrer ici.

JP, 2 nov. 2026 : *utilise Claude-Code-Game-Studios pour analyser le jeu hockey afin que Faille soit « exactement » le même jeu, mais avec LoL*.

## 1. Le verdict

**Faille suit le Cap 82-0 d'avant le 25 octobre, avec en plus le coach-personnage de la V21 (29 oct.).** On y retrouve :

- le départ faible du Rogue ;
- les cartes en carton 5:7 et leurs séries ;
- le méta ;
- le direct et la Faille dessinée ;
- le coach-personnage de la V21.

Ce que Cap 82-0 a fait depuis n'y est pas :

- **la V18** (25 oct.) : les systèmes de ligne partent, l'affinité les remplace ;
- **les cotes sur 20** (27 oct.) ;
- **la V22** (31 oct.) : les adjoints en main et en séjour, et la banque d'histoires neuve ;
- **la V23** (2 nov.) : les niveaux des adjoints et des entraîneurs, la règle du coach, le salaire des adjoints, le banc qui s'allume ;
- **les cinq lots de réglages du 2 nov.** : la première run qui laisse bâtir, le Pack Époque ;
- **Sur glace**, né le 31 oct.

Le jalon 7 de Faille, écrit les 29 et 30 octobre, est donc périmé par endroits (§ 5).

**Les trois trous qui font que ce n'est pas encore le même jeu.** Chacun manque à une des boucles de Cap 82-0.

1. **Le soir n'a pas de gros match.** Il n'y a ni rival choisi, ni duel en trois périodes, ni plan proposé par l'adjoint, ni mise doublée. Chaque partie est la même partie.
2. **La saison a les adjoints de la V21.** C'est un « staff » de trois échanges permanents, offerts aux journées 6 et 12 ; Cap 82-0 l'a retiré à la V22. Il n'y a ni la main, ni les séjours, ni les niveaux, ni le salaire.
3. **La semaine n'a pas d'histoire.** Il n'y a ni histoire de la semaine, ni voix, ni scène, ni verdict d'après. Le seul événement, « Trois défaites de suite », ne nomme personne.

**Quatre fondations portent tout le reste.** Trois sont posées (P1, P2) ; il manque le canal par joueur :

- **l'impact en chiffres de partie** (fait, P2) : chaque option se dit en vraies stats de partie, mesurées en paires ;
- **un canal par joueur, daté** : sans lui, pas de dé sur le joueur nommé, et ni lancée ni doute ;
- **le robot à trois politiques** (fait, P1) : il juge la courbe d'une run ;
- **`essai_rogue`** (fait, P1) : il mesure chaque écran.

**Les comptes.** L'index (§ 3) a 138 lignes ; 7 sont bloquantes : B4, C2, C3, D7, F9, G1, H4. Les juges de P1 ont fait passer E5 et H22 à jumeau, H23 à partiel ; l'impact de P2, B1 à jumeau et E2 à partiel ; le mandat de P3, F18 et E3 à jumeau ; le plan de match de P4, B6 à jumeau.

| État | Lignes |
|---|---|
| = jumeau | 18 |
| ≈ transposé d'une version périmée | 28 |
| ◐ partiel | 37 |
| ✗ absent | 49 |
| ∅ sans objet | 4 |
| — Faille en plus | 2 |

**Le premier rapport de mesure.** Les juges de P1, le 2 nov. (`check_profondeur`, `check_robot`, scripts/lib/robot.mjs). Les trois robots jouent les mêmes dés.

- **L'attentif gagne trop vite.** Il lit ses joueurs (le marché, les packs, la stratégie au fit) et gagne son premier titre dès la run 1, dans les deux campagnes ; Cap 82-0 le veut entre les runs 3 et 8. Sur douze runs sans déblocage, il en gagne sept.
- **Mener compte trop peu.** Sur de vraies équipes, l'attentif ne bat le distrait que de +2,8 V par split de 18 ; Cap 82-0 mesure 20,7 V sur 82, soit environ +4,5 à la même échelle. Une meilleure équipe mal menée fait toujours les séries (0 fois sur 16), et le distrait gagne un titre en 24 runs.
- **Le robot d'avant.** Une run dure 1,4 split, et il gagne un titre en 40 runs (`check_robot`).

Le marché qui vend des Piliers à 8 🪙 (F34), le pack légendes ouvert dès la run 1 (F10), la stratégie qui paie au fit (B6) et le mandat aux séries (F18) en sont les suspects, et leurs tranches (P3, P4, P11) se jugent sur `check_profondeur`.

**Après P3 (le mandat au classement), le 3 nov.** Le mandat n'était pas la cause : l'attentif gagne toujours le titre au premier split de sa première run (cinq campagnes sur cinq). Le mandat au classement le rend même plus sûr après : sa run ne s'arrête plus sur un mandat « le titre », elle dure tant qu'il finit premier, et il regagne le titre dans 93 % de ses runs, contre 75 % (cinq campagnes). Le robot d'avant, lui, gagne moins (4 titres en 60 runs, contre 7). Restent le marché (F34), les packs (F10) et la stratégie au fit (B6), à P4 et P11.

## 2. La méthode

| Commande de Claude-Code-Game-Studios | Ce qu'elle a fait ici |
|---|---|
| `/reverse-document` | Lire ce que le code de Cap 82-0 **fait** aujourd'hui, pas ce que ses vieux devis disaient. Une intention inférée est marquée comme telle. Une section vide dit « rien trouvé ». |
| `/map-systems` | Chaque système, sa catégorie et ses dépendances, puis la carte en couches (Fondation → Cœur → Fonctions → Présentation → Finition), les goulots et les cycles. |
| `/adopt` | Chaque écart classé par gravité (Bloquant, Haut, Moyen, Bas), puis un plan numéroté qu'on coche : le jalon 8 de `LIVRAISON.md`. |

**L'état d'un système.**

| Signe | Sens |
|---|---|
| `=` | jumeau : il fait la même chose aujourd'hui |
| `≈` | transposé, mais d'une version périmée de Cap 82-0 (la colonne dit laquelle) |
| `◐` | partiel (la colonne dit ce qui manque) |
| `✗` | absent |
| `∅` | sans objet au LoL (la colonne dit pourquoi) |

**La gravité.**

| Gravité | Sens |
|---|---|
| **Bloquant** | sans lui, la boucle n'est pas la même |
| **Haut** | un écart que le joueur sent |
| **Moyen** | un écart qu'on voit en cherchant |
| **Bas** | une finition |

**Les noms.** Les chemins nus sont ceux de Faille ; « Cap » préfixe ceux de Cap 82-0 quand il y a doute. `V` veut dire des victoires : par saison de 82 matchs chez Cap 82-0, par split de 18 parties chez Faille.

**La transposition.** La colonne « Transposition » dit le jumeau LoL en une ligne :

| Cap 82-0 | Faille |
|---|---|
| un match | une partie |
| une période | une phase (les lignes jusqu'à 14 min, le milieu jusqu'à 25, la fin : `LIGNES_FIN`, `MILIEU_FIN`, js/canaux.js) |
| une saison | un split |
| l'alignement de 23 | le cinq et son banc |

## 3. L'index des systèmes

### A. Fondation : les données et les cotes

| # | Système (Cap 82-0) | Cap 82-0 | Faille | État | Transposition | Dépend de | Gravité |
|---|---|---|---|---|---|---|---|
| A1 | Le découpage par saison | ARCHITECTURE.md, `data/seasons/` | `data/splits/<id>.json` (les 15 Mondiaux) | = | — | — | — |
| A2 | Le chargeur à trois niveaux | `js/data.js` `loadSeason` (shard, API, seed) | `js/data.js` `chargerSplit` (le shard seul) | ◐ | un seed dans la coquille ; l'API ∅ (Leaguepedia refuse l'anonyme) | sw.js | Bas |
| A3 | Le cache IndexedDB, versionné par les cotes | `openDB`, clé `saison@RATINGS_VERSION` | absent (jalon 1) | ✗ | utile seulement si les cotes entrent au shard | A5 | Bas |
| A4 | L'Action qui rebâtit chaque semaine | `build-data.yml` (le lundi) | `donnees.yml` (à la main) | ◐ | un horaire pour les splits en cours, une fois le catalogue relu | catalogue | Bas |
| A5 | Une seule implémentation des cotes | `js/ratings.js` | `js/cotes.js` `profilsDuSplit` | = | — | — | — |
| A6 | La force d'équipe suit le classement | `check_ratings` (≈ 0,8) | `check_cotes` (r = 0,85) | = | — | — | — |
| A7 | Les niveaux | `js/niveaux.js` : Soutien → ★ Phénomène, le haut à 50/20/4/1 % ; le meilleur des points ou de la défense (« déf. ») | `js/cotes.js` `NIVEAUX` : Remplaçant → ★ Phénomène, le haut à 60/30/10/3 % | ≈ | aligner les seuils, ou écrire pourquoi (« Remplaçant » est voulu : Soutien est un rôle) | — | Moyen |
| A8 | Les cotes sur 20 et l'hexagone (27 oct.) | `axes20`, `radarHtml`, `lesCotes` ; docs/cotes-sur-20.md ; `check_cotes` | **interdites** (CLAUDE.md : « Aucune cote dans le DOM, jamais ») | ✗ | six axes par rôle (ligne, pression, dégâts, implication, survie, vision), lus des sous-cotes que js/canaux.js joue ; « Sur la Faille » en mots à la fiche | Q3, tranché | Haut |
| A9 | Les badges joués par le moteur | Cap `js/sim.js` `badgesDe` (le second rend la moitié) | `js/cotes.js` `BADGES`, lus, jamais joués | ◐ | les jouer par un canal, ou les garder en vitrine | canaux | Moyen |
| A10 | Les familles | `FAMILLES` (Tir, Jeu, Défense, Robustesse) ; `check_familles` | absent | ✗ | quatre familles (la ligne, le combat, la carte, la tenue) pour ranger les packs | A9 | Bas |
| A11 | L'affinité et ses accords (V18) | `AFFINITES`, `accordsDeLigne` ; `check_affinite` | absent (les liens d'origine en sont le cousin) | ✗ | des accords de badges par duo (le bas et son soutien, le milieu et la jungle), au plus petit palier | A9 | Moyen |
| A12 | Les traits (les votes) | `js/traits.js` ; `check_traits` | absent | ✗ | le MVP des finales, les équipes d'étoiles, si Leaguepedia les expose (non vérifié) | données | Bas |
| A13 | Les stats non mesurées | inférées en retenue vers le passé, « ≈ » à l'écran (31 oct.) ; `check_gestes` | le remplacement écrit dans `AXES`, ou l'axe neutre | ≈ | Faille est plus stricte, d'avant le 31 oct. | — | Bas |
| A14 | Les zones, la carrure, les positions multiples | `LINE_ZONES`, `agressiviteDeLigne` | — | ∅ | un rôle par joueur, aucune donnée physique | — | — |

### B. Le moteur, et ce qu'il rend au jeu

| # | Système | Cap 82-0 | Faille | État | Transposition | Dépend de | Gravité |
|---|---|---|---|---|---|---|---|
| B1 | **L'impact en chiffres de match** | `js/impact.js` `statsDe`, `motsDeStats`, `effetEnChiffres` ; `check_chiffres`, `check_impact` | `js/impact.js` `phraseDe`, `chiffresDe`, `motsDeStats`, `impactCompose` ; la table mesurée `js/impacts.js` (`scripts/impact.mjs`) ; `check_impact`, `check_chiffres` (P2) | = | mesuré en paires (le moteur de Faille n'a pas la formule de Cap 82-0) : éliminations, morts, dragons, Nashor, hérauts, tours, minutes | — | — |
| B2 | Ce qui a fait le match | `js/causes.js` ; `check_causes` | absent | ✗ | une cause dite seulement si, retirée seule, elle change la partie sur le même dé (le moteur v2 tire un dé par tour) | moteur | Moyen |
| B3 | La lancée et le doute | `lanceeDe` ; `check_lancee` | absent ; les nouvelles 🔥 et 🧊 (js/soir.js) ne jouent rien | ✗ | les éliminations récentes contre le rythme de son vrai split ; jamais au 18-0 | B4 | Moyen |
| B4 | **Un effet sur un joueur nommé, daté** | `pariDeDecision`, `lui`, effets datés en matchs | `confort` seul (borné à [−1, 0], js/canaux.js `BORNES`) ; les effets sont refaits à chaque journée (`jouerAvecToi`) | ✗ | un canal par joueur, signé, daté en parties, mesuré en paires | moteur, `check_rogue` | **Bloquant** |
| B5 | Les situations du vestiaire | `SITUATIONS` ; `check_situations` | absent | ✗ | une paire, l'un porté, l'autre pesé, net nul | B4 | Bas |
| B6 | Le plan du soir (V17), sans systèmes (V18) | `PLANS` : « un plan change la FORME du match, pas sa force » ; `check_plan_de_match` | `js/strategie.js` `PLANS` (6, par partie, sans fit ; le Nashor dans le tardif) ; `check_plan_de_match` (P4) ; la stratégie au fit gardée pour les parties d'avant la v8 | = | la borne d'une commune ramenée à un split (±0,22 V) ; le héraut seulement dans une partie qui en a un ; ce que le plan dit vient de la table mesurée, pas d'une lecture contre l'adversaire du soir (`planEnChiffres` de Cap 82-0, que seul le robot fait) | — | — |
| B7 | La version du moteur | `VERSION_MOTEUR` : la saison en cours **se rejoue** ; `check_empreinte` | `js/partie.js` `VERSION` 6, `js/moteur-v1.js` **gelé** | ≈ | une politique contraire | Q10, tranché | Moyen |
| B8 | Les parts des joueurs | `check_parts` | `check_feuilles` (des repères d'équipe seulement) | ◐ | la part de chacun (éliminations, aides, or) simulée contre la vraie | moteur | Moyen |
| B9 | Les unités spéciales, la prolongation, le gardien, les blessures, les jambes, le ballottage | `speciales`, `fusillade`, js/ballottage.js… | — | ∅ | LIVRAISON.md, « Ce qui ne se transpose pas » ; une absence passe par une histoire | — | — |
| B10 | Le commentateur | `js/commentaire.js` ; `check_commentaire` | `js/commentaire.js` `BANQUES` ; `check_commentaire` | = | — | — | — |
| B11 | La place d'un tir, lue de la feuille | `js/glace.js` ; `check_glace` | `js/terrain.js` ; `check_terrain` | = | — | — | — |

### C. Le Rogue : le soir et le gros match

| # | Système | Cap 82-0 | Faille | État | Transposition | Dépend de | Gravité |
|---|---|---|---|---|---|---|---|
| C1 | Le jour à jour, et la route qui annonce | `ANNONCE_GROS` (la veille) ; le gros match se règle le jour même, vécu sans ✕ — `essai_rogue` | `js/sim.js` `jouerJournee` ; `js/soir.js` `laRoute`, sans gros match | ◐ | la route marque la partie clé la veille | C2 | Moyen |
| C2 | **Le gros match** | `grosMatchAvant` : `RIVAUX` 3 choisis sur `RIVAUX_OFFERTS` 5 au jour 0, la bête noire, `ESPACEMENT_GROS` 4 ; `check_gros` | absent | ✗ | environ deux par split ; un rival choisi parmi trois au départ du split ; la bête noire, en séries surtout (deux rondes seulement) | — | **Bloquant** |
| C3 | **Le duel en trois périodes** | `INTENTIONS` (5), `PLANS`, `FORCE_DUEL` 2, `propositionsDuDuel` (deux ou trois plans en vraies stats, « Garder ») ; les périodes vues ne bougent pas ; `check_duel` (sous 60 %) | absent | ✗ | trois phases (lignes, milieu, fin) ; intentions : traquer ton carry (nommé), la plongée, le siège, l'agression, jouer la montre ; plans dits en éliminations, tours, dragons et or de la phase | C2, B1 | **Bloquant** |
| C4 | La mise doublée, le butin, l'élan, les sonnés | `MISE_DOUBLEE`, `ELAN`, `SONNE` (3 matchs), `XP.gros` ; `check_gros` | absent | ✗ | la mise avant la fin de partie ; le butin, 20 🪙 et un adjoint | C3 | Haut |
| C5 | *Faille en plus* : le repêchage des champions à chaque partie | — (le plan d'avant-match plié en tient lieu) | `js/main.js` `avancer` → `#repechage`, plein écran à chaque partie | — | le garder, le plier en « Automatique », ou le réserver aux séries | Q6, tranché | Haut |
| C6 | Les moments | `MOMENTS_SI` ; `check_moments_si` | absent (seules les conditions des pouvoirs lisent l'état) | ✗ | le côté, les séries, après une défaite, après trois victoires, le rival, l'intention ; ∅ pour le dos-à-dos, les jambes, l'infirmerie | C2 | Moyen |

### D. Le Rogue : le coach, l'entraîneur, les adjoints

| # | Système | Cap 82-0 | Faille | État | Transposition | Dépend de | Gravité |
|---|---|---|---|---|---|---|---|
| D1 | L'expérience et les niveaux du coach | `js/pouvoirs.js` `XP` { victoire 1, gros 2, serie 5 }, `SEUILS_NIVEAU` [0, 10, 25, 45, 70] | `js/rogue.js` `XP` { serie 1, ronde 2, titre 3, couleur 1 }, `SEUILS_NIVEAU` [0, 8, 20, 36, 56] | ≈ | la V21, avec un reste de la confiance (`couleur`) ; transposé : +1 par partie gagnée, +2 la partie clé, les rondes de séries | C2 | Haut |
| D2 | Les talents, `TALENT_CASE` | `talentsDus` (les pouvoirs ouverts seulement) ; `TALENT_CASE` (une case d'adjoint de plus) | `js/partie.js` `talentEnAttente` (« ouvert ou pas encore ») | ◐ | le même | D7 | Moyen |
| D3 | Les pouvoirs par période | `POUVOIRS` 8 × 3, `pouvoirsDeLaPeriode`, `forceDuPouvoir` (talents × maîtrise) ; ils passent **par-dessus** les plafonds du jeu ; bornes : I et II 2,5 V, l'ultime 4, le personnage 16 | `COACHS[].pouvoirs` 4 × 3 ; écrêtés par `BORNES` (js/moteur.js `sommerEffets`) ; bornes : 1,5 V, grandi 2,5, le personnage 4 sur 18 | ◐ | l'ultime a sa propre borne ; ni maîtrise ni passage par-dessus les plafonds | D4 | Haut |
| D4 | L'entraîneur, une vraie carte | `js/coachs-reels.js` `carteDuCoach`, `MAITRISE` (×0,9 à ×1,3), `niveauDuCoach`, `lotoDesCoachs` (un loto de trois) ; `data/coachs.json` | absent ; le coach se prend au choix parmi quatre (js/menu.js) | ✗ | les vrais coachs d'un split (la source à Leaguepedia n'est pas vérifiée) ; sa philosophie lue des vraies parties de son équipe (`identiteDe` le fait presque) | données | Moyen |
| D5 | Les philosophies | `js/coachs.js` `COACHS` (8), `VOIES` (le prestige les ouvre) | `js/rogue.js` `COACHS` (4), toutes ouvertes | ◐ | huit philosophies LoL, ouvertes par le prestige | Q11, tranché | Moyen |
| D6 | La règle du coach (V23) | `REGLES_DU_COACH`, `primesDuCoach` : 2 ou 3 🪙 environ un soir sur quatre, `PRIME_COACH_MAX` 50 ; `check_banc` | absent ; `COMMANDITAIRES` (js/gestion.js) en est presque le jumeau | ✗ | une ligne de feuille par philosophie (l'agresseur et ses éliminations, le stratège et ses dragons…), réglée pour à peu près une partie sur quatre | D5 | Haut |
| D7 | **Les adjoints : une main, un séjour, un style (V22)** | `js/adjoints.js` `MAIN_MAX` 4, `SEJOUR` 12, `SEJOUR_SYNERGIE` 16, `REPOS` 20, `poster`, `quiPartDeLaMain` | `js/rogue.js` `ADJOINTS` (8 échanges permanents), `ADJOINTS_MAX` 3 ; `js/partie.js` `JOURNEES_ADJOINTS` [6, 12], `quiPart` | ≈ | **le staff de la V21, que Cap 82-0 a retiré** ; transposé au prorata d'un split (Q7) | D5 | **Bloquant** |
| D8 | Les cases en poste suivent le niveau | `CASES_PAR_NIVEAU` [1, 1, 2, 2, 3], `casesDuPerso` | trois cases fixes | ✗ | le même | D7 | Haut |
| D9 | Les niveaux d'adjoint (V23) | `NOMS_NIV`, `FORCE_NIV` (×0,7 à ×1,3), `PRIX_NIV`, `BORNE_NIV`, `niveauOffert` ; `check_pouvoirs` | absent | ✗ | les niveaux de Faille ; `BORNE_NIV` ramenée à un split | D7 | Haut |
| D10 | Le salaire des adjoints (V23) | `SALAIRE_NIV` [0, 0, 1, 2, 3], `salairesDesAdjoints` ; `check_banc` | absent | ✗ | au barème de Faille ; sans arbitre (pas de punitions) | D9 | Moyen |
| D11 | Les offres d'adjoints, aux moments forts | `adjointsOfferts` aux `PALIERS_PACK` [10, 30, 50, 70], au butin, au verdict, dans une histoire | aux journées 6 et 12 | ≈ | la V21 ; au prorata : journées 2, 7, 11 et 15 (non mesuré) | D7, C4 | Haut |
| D12 | Leur coach en séries (V23 F) | pas encore livré | — | ✗ | attendre que Cap 82-0 le livre | D3 | Bas |

### E. Le Rogue : les cartes, les bornes, la courbe

| # | Système | Cap 82-0 | Faille | État | Transposition | Dépend de | Gravité |
|---|---|---|---|---|---|---|---|
| E1 | La banque de cartes rares (plus de cartes de match) | `js/banque.js` (les retouches, le stage, les soins, l'échange d'un doublon) ; `RARE_DU_PACK` 0,25 ; les cartes de match sont parties à la V13-2 ; `check_banque` | `js/rogue.js` `CARTES` (15 cartes de partie), `PLAN` 3, des packs de cartes | ≈ | le modèle d'avant la V13-2 | Q1, tranché | Haut |
| E2 | Les bornes par rareté | ±1, 1,5, 2,5, 4 V sur 82 ; chaque effet se voit, commune comprise ; `check_effets`, `check_cartes` | `MAX_V` 0,6, 1, 1,5, 2,5 sur 18 (jugé) ; celles de Cap 82-0 ramenées à 18 (0,22 à 0,88), dites par `check_rogue` (P2) ; ce qui se voit, dit par `check_impact` | ◐ | jugées à P5, avec les styles d'adjoint | B1 | Moyen |
| E3 | Le mandat de la première run | `MANDAT_DE_LA_PREMIERE` : les 24 premiers sur 32, séries ou pas | `MANDAT_DE_LA_PREMIERE` : les huit premiers sur dix, séries ou pas ; `premiereRun` (aucune run de Rogue n'a joué un split), posé au départ (P3) | = | huit sur dix (Q9) | — | — |
| E4 | La ligue qui monte, la deuxième run plus dure | `niveauDeLigue`, `habillerLaLigue`, `ETAPE_APRES_LA_PREMIERE` ; `check_profondeur` | absent ; `tirerAdversaires` tire au hasard ; l'édition ne joue pas | ✗ | des vestiaires plus forts, ou l'édition qui joue (Q8) | F35 | Haut |
| E5 | Le robot à trois politiques et la profondeur | `scripts/lib/rogue_sim.mjs` (défaut, attentif, distrait), `ROBOT_SAUF`, `ROBOT_COACH` ; `check_profondeur`, `check_robot` | `scripts/lib/robot.mjs` `POLITIQUES` (P1) ; `check_profondeur` (rouge : le juge de P3, P5, P11), `check_robot` | = | sans `ROBOT_SAUF` ni `ROBOT_COACH` pour l'instant | — | — |

### F. L'économie et le méta

| # | Système | Cap 82-0 | Faille | État | Transposition | Dépend de | Gravité |
|---|---|---|---|---|---|---|---|
| F1 | Les jetons recomptés | `jetonsDe` | `jetonsDe`, `valeurDesGains` ; `check_rogue` | = | — | — | — |
| F2 | Le barème de la saison | `baremeRogue` (5 par victoire, monté par les déblocages du commanditaire, baissé par une exigence, fixé à chaque saison) | `JETONS` { victoire 4, défaite 1 }, fixe | ≈ | le barème porté par les déblocages et l'exigence | F22 | Moyen |
| F3 | La caisse à chaque saison | `jetonsDeDepart` (40, +20, +20), redonnée à chaque saison avec le reste | `JETONS.depart` 20, une fois par run | ◐ | la caisse à chaque split | — | Moyen |
| F4 | La prime d'une ronde de séries | `JETONS.serie` 40 | `JETONS.ronde` 20 | = | — | — | — |
| F5 | Le butin d'un gros match | `grosMatch` (20) × butin × mise | absent | ✗ | voir C4 | C4 | Moyen |
| F6 | Les objectifs du proprio | `OBJECTIFS` (8), trois offerts, un pris ; leur chance en mots (Probable, Jouable, Coriace, Très dur) ; réussi : 20 🪙 et un adjoint ; raté, il coûte ; `check_suivis` | `objectifsDe` : six journées imposées, 10 🪙, rien si c'est raté | ◐ | deux par split (journées 0 et 9), trois offerts, leur chance en mots | B1 | Haut |
| F7 | La boutique | `js/magasin.js` : des rayons, le pack du jour à −25 %, les chances en « 1 pack sur N », le rayon Ton club | `js/boutique.js` : packs de joueurs, packs de cartes, chances | ◐ | — | F10 | Moyen |
| F8 | Le Pack Bronze | 3 joueurs, 14 🪙 ; Pilier ou mieux 31,9 %, ★ Étoile 2,5 % ; `check_packs` | `PACKS_JOUEURS.recrues` : 3 joueurs, 12 🪙 ; Pilier ou mieux 48,8 %, ★ Étoile 11,5 % | ≈ | aux taux de Cap 82-0 | — | Haut |
| F9 | **Le Pack Époque** (2 nov.) | **un** joueur Pilier ou mieux (85, 13, 2), décennie et poste au choix, 26 🪙 : « le large contre le fort » ; `check_packs`, `ROBOT_PACK` | absent | ✗ | un joueur Pilier ou mieux, l'ère et le rôle au choix | — | **Bloquant** (une règle ferme : le choix de pack compte) |
| F10 | Les packs ouverts par les jalons | `BOUTIQUE_DE_DEPART` (le Bronze, l'Époque) ; `packsOuverts` par les `JALONS` | les trois packs ouverts dès la run 1 (le pack légendes : ★ Étoile ou mieux 48,8 %) | ✗ | les mêmes jalons | F20 | Haut |
| F11 | Les packs qui montent | `CRANS_DE_PACK` (deux crans en médailles : un joueur de plus, puis le métal du dessus), `monteeDesPacks` | absent | ✗ | le même | F19 | Haut |
| F12 | Le prestige dans les packs | `PRESTIGES[r].etoile`, `.phenomene` (×1 à ×1,5), sans qu'aucun rang n'en ferme | absent | ✗ | le même | F23 | Moyen |
| F13 | La hausse des prix | `HAUSSE_PACK` 40 % par pack de la saison, puis le prix de base | `HAUSSE` et `HAUSSE_JOUEURS` 10 %, cumulées sur toute la run | ≈ | 40 % par split, la même pour les deux sortes | — | Haut |
| F14 | Les cartes rares au pack, la revente, la pitié | `RARE_DU_PACK` 0,25 ; la revente au plus 40 % ; `PITIE` 12 | absent | ✗ | avec la banque (E1) ; la pitié ∅ tant que l'édition ne se tire pas au pack | E1 | Moyen |
| F15 | Le pack d'une ronde gagnée | `PACKS_DE_SERIE` (Argent, Or, Étoiles, Légendes), à la collection | 20 🪙, rien d'autre | ✗ | un pack par ronde gagnée | — | Moyen |
| F16 | La date limite | `DATE_LIMITE_MATCH` 62 (76 % de la saison) | `dateLimite` : la mi-split | ≈ | la journée 13 ou 14 | — | Bas |
| F17 | Les primes des fils | `PRIMES_DES_FILS` (5 à 10 🪙), `PRIME_FILS_MAX` 30 | absent | ✗ | le pentakill, la recrue qui éclate, le carry en feu | G7 | Bas |
| F18 | Le mandat au classement | `MANDATS` : faire les séries, puis les 10, les 6, les 3 premiers (V5 : « gagner une ronde » tuait 46 à 67 % des runs) | `MANDATS` : faire les séries (6 sur 10), puis les 3, les 2 premiers, premier ; `rangTient` ; ceux d'avant la version 7 gardés aux séries (P3) | = | les mêmes parts de la ligue sur 10 équipes ; mesuré, `check_profondeur` : le robot d'avant gagne moins (4 titres en 60 runs contre 7), l'attentif regagne plus souvent après son premier titre (93 % contre 75 %) — sa run dure tant qu'il finit premier ; la cause est sa force (F34, F10, B6) | — | — |
| F19 | Les médailles par résultat | les points ÷ 2, 10 par ronde, +20 à la Coupe, ×(1 + 0,15 k) | `MEDAILLES` (1, 2, 1, 3, 5), ×(1 + 0,25 k) | ≈ | l'échelle à trancher (Q14) | — | Moyen |
| F20 | Les jalons | `JALONS` (13) : payés une fois, ils offrent un déblocage ou des médailles, et ouvrent des packs | absent | ✗ | les séries, une ronde, dix de suite, la première place, la finale, le titre, 100 cartes, le coach au sommet… | — | Haut |
| F21 | Les missions, la découverte | `js/cartable.js` `MISSIONS` (6), `PRIME_DECOUVERTE` | absent | ✗ | cinq cartes d'un même vestiaire, une carte par ère… | collection | Bas |
| F22 | Les déblocages | 23, plus 16 crans | 10 | ◐ | Cap 82-0 sans jumeau ici : garder1-3, commanditaire1-2, les packs de spécialistes, plafond1-2, classeur3-4, le tri, banc1-2, recrue1-2 ; Faille en plus : le coach, le cadeau, le dépisteur, le noyau, le sursis | — | Haut |
| F23 | Le prestige : des médailles **et** un exploit | `rangDePrestige` ; il ouvre aussi des coachs (`coachsOuverts`, 3 à 8), le budget du classeur, le niveau de la ligue | `rangDe` : les médailles seules, et il ferme des déblocages | ◐ | les exploits (séries, ronde, finale) | F20 | Haut |
| F24 | Ton club : un nom et SON écusson | `js/club.js` : 20 clubs, chacun un nom et son écusson dessiné, 49 couleurs, **en jetons** à la boutique | `CLUBS` (10), `COULEURS` (8), **en médailles** ; un blason générique (js/fiche.js `ecussonHtml`) | ≈ | d'avant la 1.0 de Cap 82-0 | Q13, tranché | Moyen |
| F25 | Les exigences 🔺 | `EXIGENCES` : 8 crans, `PRIME_EXIGENCE` 0,15 | `EXIGENCES` : 6 crans, 0,25 ; elles commencent par le mandat (le 6e cran de Cap) | ≈ | les huit crans, dans l'ordre de Cap 82-0 | F2 | Moyen |
| F26 | Le classeur | `departDuClasseur` : une case Régulier et quatre pages, le tri à cinq cartes ; **la vedette prend la case du haut** (sinon l'attentif gagnait sa première Coupe dès la run 2) | `casesDe`, `lotoDe` : Régulier, Pilier, Étoile ; la vedette prend la case du haut (P3 ; en plus avant la version 7) | ◐ | le tri à cinq cartes | — | Bas |
| F27 | Les lotos entre deux saisons | `lotosDeSaison` (trois Régulier et un par page) | absent | ✗ | un loto Régulier et un par page | F26 | Moyen |
| F28 | Ceux qui restent | `gardesDeLaRun` [Pilier, Régulier] | `NIVEAUX_RESTES` (le noyau ouvre une case ★ Étoile) | ≈ | — | — | Bas |
| F29 | Ceux de la dernière run | `gardesDeLaDerniere` (garder1-3) | absent (la collection et le classeur en tiennent lieu) | ✗ | le même | F22 | Moyen |
| F30 | Le joueur de concession | `vedettesDeConcession` (trois Étoiles, trois profils) | `tirerEtoiles` (trois ★ Étoiles) | ≈ | trois rôles différents | — | Bas |
| F31 | Les bouche-trous | `bouchesTrousDuDepart` | `BOUCHE_TROUS` (70/30) | = | — | — | — |
| F32 | Les doublons | `monterLesDoublons` (`FUSION` 3, jusqu'à l'Or ; la Holo ne se fabrique pas) ; l'échange d'un doublon | `editionDe` : 1, 2, 3, 5, 8 copies, la Holo à 8 | ≈ | — | F33 | Moyen |
| F33 | Les éditions qui jouent | `js/rarete.js` `EDITIONS` : tirées au pack, elles **montent les badges** (`VARIANTE_PALIERS`) | par les copies, sans effet au jeu (règle de Faille) | ◐ | elles joueront, après les badges (Q8) | A9 | Haut |
| F34 | *Faille en plus* : le marché des agents libres | — ; chez Cap, un dépanneur est un Régulier au plus (`check_ballottage`) | `MARCHE` : trois par journée, **Pilier au plus**, 8 🪙, sans hausse | ≈ | le borner au Régulier, ou lui mettre la hausse (Q12) | F13 | Haut |
| F35 | *Faille en plus* : les commanditaires | ≈ la règle du coach (D6) | `COMMANDITAIRES` : 19,6 🪙 par split, 23 % des gains | — | les fondre dans la règle du coach ? (Q5) | D6 | Moyen |

### G. Le récit : les histoires, les voix, ce que le jeu raconte

| # | Système | Cap 82-0 | Faille | État | Transposition | Dépend de | Gravité |
|---|---|---|---|---|---|---|---|
| G1 | **Les histoires de la semaine (V22)** | `js/dossiers.js` `DOSSIERS` (six, et trois de deuxième moitié après le 41e match) ; deux réponses, chacune une chose concrète ou un dé sur le joueur nommé ; **V23 E** : des suites (une réponse plante un épisode 2, ouvert seulement si ce que son joueur a fait depuis se lit dans ses feuilles, `faitsDesSuites`, et qui passe avant le tirage) et des rares (certains lundis seulement, `CHANCE_RARE`, une fois par saison), quatorze histoires ; `check_dossiers`, `check_mots`, `check_effets`, `check_incidents` | `js/gestion.js` `EVENEMENTS.sequence` (« Trois défaites de suite » : trois options, aucun joueur, aucun chiffre) | ≈ | `js/dossiers.js`, la même forme ; la banque au § 4 | G2, G3, B4 | **Bloquant** |
| G2 | Le tirage, le repos, les sorties | `semaineAHistoire` (`CHANCE_HISTOIRE` 0,55), `REPOS_HISTOIRE` 5, `SORTIES_MAX` 2 | absent | ✗ | en journées : 18 par split, aucune « semaine » (Q7) | G1 | Haut |
| G3 | La porte des réponses | `appliquerGestes` : jetons, expérience, une carte d'adjoint, les absents, les jambes, l'auxiliaire | l'action `evenement` (js/partie.js) : jetons et pack seulement | ◐ | l'expérience (une ligne du journal que `xpDe` recompte), l'absence (le banc à son rôle), une carte d'adjoint | D7 | Haut |
| G4 | Les voix | `EXPEDITEURS` (`js/vie-gm.js`, 17 voix), une seule distribution | des chaînes éparses (`EVENEMENTS.*.qui`, `VOIX` de js/soir.js, les coachs) | ✗ | une distribution (§ 4) | — | Haut |
| G5 | Les scènes | `js/scenes.js` (`sceneDuDossier`, la mise, le palier, le butin, le mandat, les galons, l'adjoint) ; la réplique sans chiffre — `check_clarte` § 5 | `feuilleDuChoix` (`qui`, `titre`, `texte`) ; la voix y dit des chiffres | ◐ | `{ de, mot, fait }` pour chaque choix | G4 | Haut |
| G6 | Le joueur du fait | `joueurDuFait` (la vedette, le gardien, le dur) ; `check_vie` | `vedetteDe` (js/split.js), sur une seule partie | ◐ | sur ses N dernières parties ; « le dur » devient le joueur pris seul (`genre: 'pick'`) | — | Haut |
| G7 | Les fils, et la une | `filsDeSaison`, `FILS` (js/recit.js) ; la une est le fil le plus lourd d'hier soir ; `check_fils` | `laUne` (une partie), `nouvelles` (en feu ou en panne sur trois parties) | ◐ | les fils LoL (§ 4) | G6 | Haut |
| G8 | Les choix des fils, et leurs retours | `CHOIX_DES_FILS` (récrits à la V22), `retoursDuMatin` ; `check_retours` | absent | ✗ | la disette (lui parler), le duo (les souder), la recrue (la confiance) ; ∅ pour « monter au 1er trio » | G7, B4 | Moyen |
| G9 | Le verdict du lundi d'après | `js/verdicts.js` (`MATCHS_MIN` 3, `PLANCHER`) ; `check_verdicts` | absent (et absent du jalon 7) | ✗ | éliminations, morts, or à 15 min (`courbe`), tours, dragons, contre les parties d'avant ; « rien de net » sous le plancher | G1 | Haut |
| G10 | Les suivis | `suivisEnCours` ; `check_suivis` | les objectifs et le commanditaire chez le proprio | ◐ | « Ce qui court » au Vestiaire ; un joueur parti fait tomber sa promesse | G8 | Moyen |
| G11 | Les arcs et les défis | `ARCS = {}` depuis la V22 (le système reste, sans contenu) | absent | ∅ | vide chez Cap 82-0 : rien à transposer | — | — |
| G12 | Les galons | `GALONS` (5) ; le badge monte d'un métal pour le reste de la run, deux au plus ; une poignée par saison ; `check_galons` | `js/palmares.js` `GALONS` (6), sans effet ; le galon « titre » aux cinq de la finale | ≈ | à trancher avec l'édition (Q8) | A9 | Moyen |
| G13 | Le panthéon, son histoire chez toi | `graverAuPantheon` (records, trophées, chandails retirés), `graverLaSaison` | `pantheonDe`, « Ton histoire », les galons au verso | ◐ | le chandail retiré | — | Bas |
| G14 | Le banc qui s'allume (V23 A1) | `js/profil-style.js` `banc`, `bancHtml` ; `check_banc` | absent (la feuille garde déjà `pouvoirs`) | ✗ | sous le pointage du sommaire, les pouvoirs et les adjoints qui ont joué, phase par phase ; un autre nom (« le banc » est le sixième joueur, Q15) | D3, D7 | Moyen |
| G15 | Les mots disent leurs lignes ; toujours un joueur | `check_mots`, `check_incidents` (une liste blanche) | absent | ✗ | des lignes de partie | B1 | Haut |
| G16 | L'après-match, le panel télé, l'entracte, le pronostic | `apres-match.js`, `panel-tv.js`, `entracte.js`, `pronostic.js` ; `check_pronostic` | `ecranSommaire`, `faits` (js/soir.js) ; le reste absent | ◐ | l'entracte et le pronostic arrivent avec le duel | C3 | Bas |

### H. L'interface

| # | Système | Cap 82-0 | Faille | État | Transposition | Dépend de | Gravité |
|---|---|---|---|---|---|---|---|
| H1 | Les sections du Rogue | `SECTIONS_ROGUE` : Bureau (Boîte, Proprio, Coach, Vestiaire), Joueurs, Lignes, Marché (Boutique, Album), Ligue (Classement, Calendrier, Meneurs, Palmarès) ; l'Avant-match est parti | `SOUS` (js/main.js) : le Marché a quatre sous-onglets (Agents libres, Packs de joueurs, Plan de jeu, Album), la Ligue a les Séries en plus | ◐ | le Marché en Boutique et Album ; les Séries au Bureau pendant les séries | Q16, tranché | Moyen |
| H2 | L'en-tête du club, partout | `majEntete` : fiche, rang, jetons, dans toutes les sections | `majTete` (la jauge au bâti) ; `bandeChiffres` au Bureau seulement ; les jetons redits à quatre endroits | ◐ | — | — | Moyen |
| H3 | À faire, la Boîte | `rendreActions`, `MAISONS`, « Encore un choix · sujet » ; seul ce qui presse bloque — `essai_rogue` 10c | `aFaire`, `decisionDe` : un choix à la fois, tout bloque | ◐ | les maisons : le proprio, le coach, le vestiaire, la presse | G5 | Haut |
| H4 | **La feuille d'un choix** | `optionHtml`, `LIGNES_MAX` 2, la forme (Cadeau, Échange, Pari) ; **V23 B : la tuile devient une carte** (le relief, le filet du haut à la couleur de sa forme, son gros chiffre au cœur pris parmi ses lignes, deux au plus en tout ; elle se soulève sous le doigt et s'envole jouée, 200 ms ; sans dégradé) — `check_lisibilite` § 6, `check_mots` | `.option` : un nom et une phrase de `dire`, une tuile en dégradé avec ombre | ≈ | d'avant la scène de la V21 et la tuile sobre ; la forme, et au plus deux lignes vertes ou rouges en vraies stats de partie (la V23 B les met en cartes) | B1, G5 | **Bloquant** |
| H5 | Signer, c'est l'échange | `ouvrirListeSignature`, `choisirQuiSort` (la sortie touchée d'avance), `comparatifHtml` (l'un face à l'autre) ; un pack non signé reste dans la Boîte | un bouton par rangée, sans comparatif ; un pack non signé **s'efface en silence** (`jouerAvecToi` : `P.offrePack = null`) | ✗ | le comparatif : KDA, CS par minute, or et dégâts par minute, vision, coût | — | Haut |
| H6 | Ce soir en trois chiffres | E5 : trois chiffres en barres face à face, aux couleurs des deux clubs — `essai_rogue` 10d | `carteCeSoir` : cinq rangées, sans couleurs d'équipe | ≈ | éliminations, tours, dragons ou Nashor | H13 | Moyen |
| H7 | Hier soir, au complet | le match, le rang qui bouge, la une, les nouvelles (un séjour fini, la règle du coach) | `hierSoir`, `laUne` : ni les jetons gagnés, ni l'objectif qui avance, ni le pouvoir qui a joué | ◐ | ces trois lignes | G14 | Moyen |
| H8 | La fin de saison, Ta run, la Coupe | `sceneDuMandat`, `sceneDesGalons`, `montrerTaRun`, `montrerLaCoupe` (le son, trois vedettes en cartes) | `ecranBilan` : un titre et des listes, sans voix ; le son `medaille` | ◐ | « Le titre » en plein écran ; le proprio dit le mandat, le capitaine les galons | G5 | Moyen |
| H9 | Le bilan en onglets | `ONGLETS_BILAN` | une page | ◐ | Bilan, Classement, Meneurs | — | Bas |
| H10 | La carte : le carton, les séries, les éditions, l'inclinaison | `js/cartes.js` `cartonHtml`, `SERIES`, `brancherInclinaison` | `js/fiche.js` `carte`, `SERIES` (15), `serieDe`, `brancherInclinaison` | = | — | — | — |
| H11 | Les cartes couchées, les photos d'action | `photoCouchee`, `photoAction` ; `scripts/actions*.mjs` ; `check_actions` | absent (7 C) | ✗ | Commons et Openverse, crédités au dos | — | Bas |
| H12 | La carte d'adjoint, de coach, de jeu (lue à son verso) | `.cs-jeu` : ce qu'elle fait se lit à son verso ; le cadre d'un adjoint suit son niveau (V23) | `carteDeJeu` sans verso, `carteDuCoach` en liste ; une grille de trois | ≈ | la V21 | D7 | Moyen |
| H13 | Les vraies couleurs des équipes | `js/logos.js` | `paletteDe(nom)` : une teinte déduite du nom | ✗ | les couleurs des équipes (7 C) | données | Moyen |
| H14 | L'ouverture d'un pack | `brancherPaquet`, le walkout | `js/ouverture.js` `ouvrirPaquet` | = | — | — | — |
| H15 | Le badge, son icône seule | l'icône à la couleur de son palier, le mot à l'infobulle | l'icône, le nom et le palier | ≈ | — | — | Bas |
| H16 | Le menu pause, les sauvegardes | `js/menu.js`, `js/sauvegardes.js` : Dupliquer, confirmer en deux touchers | la Collection et le Palmarès redits au menu ; `window.confirm` | ≈ | — | — | Bas |
| H17 | Le toast et sa file | `toast`, `fileDesToasts` ; V23 G1 : au-dessus des onglets du bas et du bouton flottant, il ne cache jamais ce qu'on touche | `avis` : un seul, 3 s ; posé au-dessus de la barre d'action (relu, V23 G1) | ◐ | — | — | Bas |
| H18 | Le lexique, les émojis au trait, la bulle d'un mot | `js/lexique.js` `ICONES`, Noto Emoji, `bulleDef` ; `check_lexique`, `check_emojis` | absent | ✗ | — | — | Moyen |
| H19 | Les onglets accessibles | `role="tablist"`, `aria-selected` (`majNavbar`) | absent | ✗ | — | — | Moyen |
| H20 | La manette et le clavier | `js/manette.js`, `body.nav-clavier` | absent ; `:focus-visible` seul | ✗ | repris tel quel | pile.js | Moyen |
| H21 | Le retour, les gestes, le glisser-déposer | `pile.js`, `glisser.js`, `deposer.js` | les mêmes, repris | = | — | — | — |
| H22 | Les cibles de 44 px, les 8 px du bord | interface.md ; smoke `cibles44` ; `essai_rogue` 20n | smoke `cibles44` (`scripts/lib/cibles.mjs`), `essai_rogue` (`scripts/lib/bords.mjs`) ; le retour, les sous-onglets, les puces et les petits boutons à 44 px (P1) | = | — | — | — |
| H23 | **Les juges d'écran** | `essai_rogue` (un robot à 390 × 844, chaque écran mesuré en hauteurs d'écran), smoke `toutEstAtteignable`, `cibles44` | `essai_rogue` (le premier split, trois visites ; les hauteurs dites, le bord jugé), smoke `toutEstAtteignable`, `cibles44` (P1) | ◐ | la hauteur se juge à P17 ; une run entière plutôt qu'un split | — | Moyen |

### I. Les modes

| # | Système | Cap 82-0 | Faille | État | Transposition | Dépend de | Gravité |
|---|---|---|---|---|---|---|---|
| I1 | Le 82-0, le 18-0 | `js/partie.js` (le Loto, la ligue d'une saison ou de toutes, `HASARD`, `FRANCHISE`, l'identité), « Rejouer la saison », l'historique | `MODES.dixhuit` (js/meta.js) : la roulette et ses relances (`RELANCES` 2/2/2, le jumeau de `REROLLS`), le split d'un coup, les séries en direct | ◐ | le Loto par rôle, un seul split, une organisation au fil des ans (non vérifié), « Rejouer le split » | — | Moyen |
| I2 | Hors du Rogue, aucune carte | interface.md : « la rangée et le visage » | `vueCinq` en cartons dans les deux modes | ≈ | la rangée au 18-0 | — | Bas |
| I3 | L'exhibition | `js/exhibition.js` : choisir les deux clubs-saisons ; un match, une série 4 de 7, ou cent matchs | deux vestiaires à la roulette, une partie | ◐ | choisir, BO1, BO3 ou BO5, cent parties | — | Bas |
| I4 | Le menu des modes | une carte par genre, la dernière partie de chacun (`derniereDuGenre`) | une puce de mode au départ | ≈ | — | — | Bas |
| I5 | Sur table | `js/table.js` (4 472 lignes), `plateau.js`, `tournoi.js` : un tournoi de six clubs sur un plateau de 247 cases, à la Blood Bowl ; `check_table`, `smoke_table` | — | ∅ | rien à reprendre pour l'instant (Q4) | Q4, tranché | — |
| I6 | Sur glace (né le 31 oct.) | `js/physique.js`, `glace-ia.js`, `sur-glace.js`, `sprites.js`, `sons-glace.js` : un match 2D à la manette, la physique et les règles complètes, l'IA des neuf autres, deux vrais clubs ; `check_physique` | absent, et jamais nommé dans LIVRAISON.md | ✗ | « Sur la Faille » : un match 2D en temps réel sur la carte à nous ; pas maintenant (Q4) | Q4 | — |

### J. La plomberie et l'outillage

| # | Système | Cap 82-0 | Faille | État | Transposition | Dépend de | Gravité |
|---|---|---|---|---|---|---|---|
| J1 | Le juge, le code mort, la coquille | `verdict.mjs`, `lib/mort.mjs`, `check_mort`, `check_coquille` | identiques (le diff est vide) | = | — | — | — |
| J2 | `tout.mjs` | 36 scripts rapides | 15 scripts, `check_rogue` (32 s), `check_plan_de_match` (21 s), `check_robot`, `check_impact` et `check_chiffres` (26 s) compris | ≈ | — | — | Bas |
| J3 | `verifier.yml` | 27 étapes | 3 étapes (`tout.mjs`, le smoke, `essai_rogue`) | ◐ | une étape par juge, à mesure qu'ils arrivent | — | Moyen |
| J4 | Les vieilles parties, jugées en Node | `check_sauvegardes` | le smoke et `check_gestion` | ◐ | `check_sauvegardes` | — | Bas |
| J5 | La mise à jour, la version | `js/mise-a-jour.js`, `js/version.js` = `VERSION` de sw.js ; `check_maj` | `VERSION` de sw.js seul | ✗ | `version.js` et le rechargement au titre | — | Bas |
| J6 | L'APK, l'exe | `mobile/` (Capacitor), `desktop/` (Electron), `publier.yml` | absent (7 G, « en dernier ») | ✗ | le recadrage en JS pour que l'appareil recadre lui-même | — | Bas |
| J7 | La feuille de style, la lisibilité, la clarté | `check_css`, `check_lisibilite`, `check_clarte` | absent | ✗ | repris | — | Moyen |
| J8 | L'organisation de l'agent | `.claude/rules` (8 terrains, chacun chargé par son `paths:`), 10 agents, 3 commandes, `AGENTS.md` | **cette PR** : 5 agents (`faille-*`), 4 commandes (`/parite`, `/revue-design`, `/equilibrer`, `/rapport-essai`), `docs/gabarits/devis.md` ; les règles restent dans CLAUDE.md | ◐ | les règles par terrain dans `.claude/rules/` | — | Moyen |
| J9 | Les docs | `docs/decisions.md`, `structure.md`, le journal par mois (le plus récent en premier), les `refonte-v*.md` | `docs/donnees.md`, cet index ; le journal dans LIVRAISON.md, le plus ancien en premier | ◐ | un `docs/decisions.md` à Faille pour les transpositions | — | Moyen |
| J10 | Le premier écran, comme un téléphone le vit | `essai_poids` | absent | ✗ | — | — | Bas |

## 4. Le récit transposé : les voix, la banque, les fils

C'est l'inventaire de ce qui se transpose, pour l'écriture. Une ligne par voix, par histoire et par fil, et le champ de la feuille de `js/moteur.js` qui porterait chacune ; les champs ont été vérifiés. Pour chaque joueur, la feuille porte `n, r, k, m, a, or, cs, niv, vision`. Son fil porte les éliminations (`elim` : `tueur, victime, aides, ligne, genre, multi, prime, premier`) et les objectifs. Elle garde aussi `courbe` (l'or à la minute), `duree` et `gagnant`.

**Les voix d'`EXPEDITEURS`**

- **Les jumelles** : le proprio, l'entraîneur, l'analyste à la télé, les partisans, les finances, ton adjoint, un agent de joueur, les communications, un partisan fidèle, le DG, le dépisteur, la ligue (toujours générique, jamais Riot).
- **Le capitaine** : c'est le shotcaller. Le 🧢 de js/soir.js passe à 🎖.
- **Sans objet** : le physio et le médecin (pas de blessures, pas de jambes), le préposé à l'équipement, le maire. Pour remplacer le physio, une option : 🧠 le préparateur mental, qui lirait les morts (`m`) et les défaites de suite.
- **Faille en plus** : le 🎙️ panel du balado de js/soir.js, qui n'existe pas dans `EXPEDITEURS` ; il y entre (§ 6).

**La banque de Cap 82-0, histoire par histoire**

| Histoire de Cap 82-0 | Dans Faille | Le fait lu dans la feuille |
|---|---|---|
| 📸 La vedette | = | ton meilleur en `k + a` sur tes cinq dernières parties |
| 🥶 La disette | le carry muet | ton plus cher au bas ou au milieu, peu de `k` sur ses dernières parties ; le repos seulement si le banc joue son rôle |
| 🥅 Le gardien battu | ∅ ; pendant proposé : 🩸 **écrasé en ligne** | trois morts ou plus en phase de lignes (`elim.victime`, `elim.ligne`) ; réponses : le renvoyer sur sa ligne (un dé), ou son champion de confort au prochain repêchage (`confort`) |
| 🥊 La chicane | ∅ ; pendant proposé : 🎯 **le pris seul** | plusieurs morts `genre: 'pick'` |
| 🧳 La semaine sur la route | ∅ | ni jambes ni route ; le seul fait de calendrier est le côté (`T.bleu`) |
| 📋 Un adjoint en vue | = | mais c'est un faux choix chez Cap 82-0 : « Garder l'argent » domine (docs/revue-rogue-2026-11.md § 2.3) |
| 📉 La course perdue | = | après la date limite, le retard sur la 6e place (`QUALIFIES`) |
| 🏔 La première place | = | sa réponse prudente, « ménager les jambes », est à réécrire |
| 🛫 Le dos-à-dos | ∅ | une partie par journée |
| 🐣 Le petit qui pousse (V23 E) | = | un Remplaçant ou un Régulier de ton cinq qui produit (`k + a` sur ses dernières parties) ; « lui donner les ressources » est un dé qui plante sa suite deux journées plus tard |
| 🌟 Le petit est arrivé · 🌧 Le petit doute (V23 E, les suites) | = | ses éliminations et ses aides depuis, recomptées dans ses feuilles |
| 🎩 Les chapeaux sur la glace (V23 E, rare) | 🏆 **le pentakill** (rare) | un pentakill à la dernière partie (`elim.multi`) ; « aux enchères » ou « il garde la main chaude » |
| 🧊 Le blanchissage de l'auxiliaire (V23 E) | ∅ ; pendant proposé : 🪑 **le banc qui brille** | ton sixième a joué la dernière partie et n'est pas mort (`m` à 0) |

**Ce que l'attentif joue chez Cap 82-0.** Mesuré par `mesure_rythme` : 8,5 histoires par saison. Après la vedette, ses deux histoires les plus jouées sont la chicane et la route, justement deux de celles qui ne se transposent pas. Les pendants proposés ci-dessus en comblent le trou.

**Les fils**

| Fil de Cap 82-0 | Dans Faille |
|---|---|
| La course | un rythme d'éliminations (`k`) |
| Le feu | `k` par partie chez toi ≥ 1,6 fois son vrai split |
| Le jalon | des plateaux d'éliminations |
| La séquence | les premiers sangs de suite (`elim.premier`) |
| La disette | le vrai carry sous un seuil |
| Le duo | le bas et son soutien (le soutien dans `elim.aides`) |
| La recrue | aucun drapeau recrue dans le shard : à dériver de son premier split (non vérifié) |
| Le retour | ∅ |

## 5. Les écarts de règle : là où Faille fait le contraire

Chaque écart cite la règle actuelle de Cap 82-0 et le code de Faille qui la contredit. Plusieurs sont des règles fermes du `CLAUDE.md` de Faille, écrites d'après le Cap 82-0 d'alors : le § 6 dit lesquelles tombent, et la tranche qui les réécrit.

**Le Rogue**

1. **Le staff d'adjoints.**
   - Cap, rogue.md : « Le staff de la V21 est parti (ses douze échanges, la main de six, les trois en poste…) ». Vocabulaire : pas « staff ».
   - Faille : `js/rogue.js` « LE STAFF », `ADJOINTS_MAX` 3, `JOURNEES_ADJOINTS` [6, 12], `quiPart`, « Son staff · n/3 ». Son CLAUDE.md en fait une règle ferme.
2. **L'expérience à la couleur.**
   - Cap, js/coachs.js : la couleur « ne joue plus au moteur (V21 : la confiance et ses paliers sont partis) ».
   - Faille : `XP.couleur` compte les séries gagnées avec une carte de la couleur du coach au plan. C'est la confiance qui revient par une porte de côté.
3. **Le talent sur un pouvoir fermé.**
   - Cap : « le pouvoir I grandi ou une case d'adjoint de plus », sur les pouvoirs ouverts.
   - Faille : « ouvert ou pas encore » (`talentEnAttente`, `decisionDe`).
4. **Les pouvoirs écrêtés.**
   - Cap : « Sa précision, ses tirs et sa discipline passent par-dessus les plafonds du jeu ».
   - Faille : `sommerEffets([e.effets, effets[camp], ...actifs.map(x => x.effet)])` est borné par `BORNES`. C'est le défaut que la V21 § 2b a corrigé chez le Frelon.
5. **Le plan de jeu en cartes de partie.**
   - Cap, js/banque.js : « Les cartes de match sont parties avec la main du duel (V13-2) ».
   - Faille : `PLAN` 3, 15 `CARTES`, des packs qui ne vendent que des cartes. Ce puits se vide.
6. **Le coach au choix.**
   - Cap : l'entraîneur sort d'« un loto de trois au départ de la run », et le prestige ouvre les philosophies (`VOIES`).
   - Faille : les quatre coachs, tous ouverts, au choix (js/menu.js).
7. **Le premier mandat.**
   - Cap : « La première saison de la première run, le proprio laisse bâtir : finir dans les 24 premiers, séries ou pas ».
   - Faille : `mandatDe(1)` est « faire les séries ». Mesuré : 8 runs sur 20 finies au premier split, aucun coach au-delà du niveau 3.
8. **Le mandat aux séries.**
   - Cap (V5) : « Le mandat se lit maintenant au classement de la saison régulière ».
   - Faille : les séries, la demie, la finale, le titre.
9. **La vedette en plus du classeur.**
   - Cap, `departDuClasseur` : la vedette prend la case du haut ; en plus d'elle, l'attentif gagnait sa première Coupe dès la run 2.
   - Faille : `casesDe` met la vedette en plus.
10. **Le dépanneur.**
    - Cap : un dépanneur est « niveau Régulier au plus ».
    - Faille : `MARCHE` offre des Piliers chaque journée, à 8 🪙, sans hausse.

**Le moteur et les cotes**

11. **La stratégie au fit.**
    - Cap, moteur.md : « Les systèmes de ligne… sont partis (V18 ; JP : *enlever partout*) ». Et : « Un plan change la FORME du match, pas sa force ».
    - Faille, CLAUDE.md et `js/strategie.js` : « son gain suit le fit », « comme les systèmes de Cap 82-0 ». Le tiers le mieux ajusté gagne +0,73 à +2,05 V sur 18 (MOTEUR.md § 10).
    - Le jalon 5 de Faille vise aussi une maîtrise de la stratégie, que Cap 82-0 a retirée au S110 : « la chimie ne s'apprend plus ».
12. **Les cotes à l'écran.**
    - Cap, donnees.md (27 oct.) : « Une cote peut s'afficher ».
    - Faille, CLAUDE.md : « Aucune cote dans le DOM, jamais ».
13. **Dire un effet.**
    - Cap, interface.md : « Un choix se dit en vraies stats de match… jamais en victoires… jamais en note ».
    - Faille : `dire` écrit « ▲ les dragons », sans chiffre.
14. **Les vieilles parties.**
    - Cap, moteur.md : « Une saison en cours se REJOUE ».
    - Faille : l'ancien moteur est gelé (`js/moteur-v1.js`), et la partie se rejoue identique.
15. **L'édition et le galon.**
    - Cap : l'édition « monte ses badges » ; le galon fait monter le badge « d'un métal pour le reste de la run, deux au plus » ; une poignée de galons par saison.
    - Faille, CLAUDE.md : « Une édition ou un galon ne change rien au jeu ». Et `galonsDuSplit` grave le galon « titre » aux cinq joueurs de la finale.
16. **Les événements et le moteur.**
    - Cap (V22) : l'option audacieuse est un dé sur le joueur nommé, qui passe par le moteur et se mesure (`check_effets`).
    - Faille, PLAN.md : « Les événements ne touchent pas au moteur ». Son propre 7 B le contredit déjà.

**Le récit**

17. **La voix dit des chiffres.**
    - Cap : la réplique est sans chiffre, les chiffres vont au fait (`check_clarte` § 5).
    - Faille, `decisionDe` : « Niveau N : un de mes pouvoirs grandit de 50 % », « Ton staff : x/3 ».
18. **Un choix sans fait ni joueur.**
    - Cap : deux réponses, toujours un joueur, le fait en vrais chiffres (`check_incidents`, `check_dossiers`).
    - Faille, `EVENEMENTS.sequence` : « Le vestiaire doute », trois options, aucun joueur. Le choix sort bien au lendemain de la troisième défaite.
19. **Plusieurs distributions de voix.**
    - Cap : une seule, `EXPEDITEURS`.
    - Faille : `EVENEMENTS.*.qui`, les `VOIX` de js/soir.js, les coachs.

**L'interface**

20. **Les 44 × 44 et les 8 px du bord.** Il y a des cibles de 36 et 40 px, et rien ne mesure les bords.
21. **« Ses choix se règlent dans la Boîte. »** Trois choix se règlent ailleurs : l'entraînement au Vestiaire (`lEntrainement`), la signature d'un pack au Marché, le plan de jeu au Marché.
22. **« Une info, une maison. »** Plusieurs infos vivent à plusieurs endroits :
    - la stratégie, à la Boîte et au Cinq ;
    - les jetons, à quatre endroits ;
    - la date limite, à trois ;
    - la Collection et le Palmarès, au menu et dans les sections.
23. **« Signer, c'est l'échange. »** Il n'y a aucun comparatif, et un pack non signé s'efface sans un mot.
24. **Les cartes à choisir.**
    - Cap : « Les cartes à choisir se balaient en grand », et « une carte de jeu se lit à son verso ».
    - Faille : le plan de jeu les met en grille de trois, l'effet écrit sur la face.
25. **« La couleur vient des équipes. »** `paletteDe(nom)` déduit une teinte du nom.
26. **Ton club.**
    - Cap : un nom et SON écusson, vendus ensemble, en jetons, à la boutique.
    - Faille : le nom seul, en médailles, avec un blason générique.
27. **Hors du Rogue, aucune carte.** Le Cinq du 18-0 est en cartons.

**Les docs et l'outillage**

28. **Le journal.**
    - Cap : la plus récente en premier, archivé par mois.
    - Faille : le plus ancien en premier.
29. **La fusion des PR.** Cap 82-0 active l'auto-merge dès que `verifier` est vert. Le CLAUDE.md de Faille n'en dit rien.

**Un écart voulu, à garder.** « Rôle » veut dire la case chez Faille (haut… soutien) et ce que le joueur fait chez Cap 82-0 (sniper…). Le CLAUDE.md de Faille le dit.

**Une incohérence chez Cap 82-0, à lui signaler.** Sa rogue.md dit les « quatre choix de fil » partis à la V22. Pourtant `CHOIX_DES_FILS` est encore offert (js/saison.js) et récrit à la V22 (docs/structure.md). Faille suit le code.

## 6. Les questions, tranchées

JP, 2 nov. : *pour les questions, ajuste selon ce qui est logique*. Le principe retenu : **Cap 82-0 fait foi**, sauf là où le LoL l'empêche ou là où le coût ne se justifie pas. Chaque décision nomme sa tranche du jalon 8 (`LIVRAISON.md`), qui la code et réécrit la règle ferme qu'elle touche. D'ici là, les règles de `CLAUDE.md` disent le code d'aujourd'hui.

| # | La question | Tranché | Pourquoi | Tranche |
|---|---|---|---|---|
| Q1 | Le plan de jeu (15 cartes de partie, trois au plan, des packs de cartes) | **Il part.** Ses meilleures idées deviennent des styles d'adjoint. La banque garde une petite famille de cartes rares (le stage du coach, l'échange d'un doublon, puis les retouches quand l'édition jouera), une fois sur quatre dans un pack de joueurs | Chez Cap 82-0, la main de cartes se jouait presque aussi bien sans rien lire, et elle est partie à la V13-2. Ici, le puits des packs de cartes se vide | P5, P11 |
| Q2 | La stratégie au fit | **Des plans par partie** (la V17) : les sept stratégies deviennent les plans de la partie. Ils changent la forme, pas la force, se disent en vraies stats, et aucun ne domine. Le fit devient l'affinité (la V18) | C'est la règle de Cap 82-0 depuis la V18. Le duel a besoin de plans par phase, et le fit payait en force (+0,7 à +2,1 V sur 18) | P4, P15 |
| Q3 | Les cotes sur 20 | **Oui** : six axes par rôle, à la fiche et à la signature, lus des sous-cotes que le moteur joue | La raison de la règle de Faille tombe : le coût suit le niveau, pas la cote. Et une cote affichée est celle que le moteur joue (Cap 82-0, 27 oct.) | P15 |
| Q4 | Sur glace, Sur table | **Pas maintenant**, ni « Sur la Faille » ni plateau. À revoir après le jalon 8 | Le hockey l'a payé environ 6 800 lignes, et Faille devrait inventer 167 kits de champion qui ne sont pas dans ses données. La politique de Riot pour un jeu jouable n'est pas vérifiée. Sur glace ne touche pas le Rogue, et Cap 82-0 travaille le Rogue d'abord | — |
| Q5 | Les commanditaires et la règle du coach | **Fondus** : chaque philosophie a sa ligne de feuille qui paie, et les objectifs des commanditaires en fournissent la plupart. « Commanditaire » reste le nom des déblocages du barème, comme chez Cap 82-0 | C'est la même mécanique (la feuille jouée paie). Deux sources qui paient la même chose doubleraient ce revenu, déjà 23 % des jetons | P12 |
| Q6 | Le repêchage des champions à chaque partie | **Plié** sous la ligne de la partie, « Automatique » par défaut ; en plein écran aux séries et à la partie clé | Une journée ordinaire tient en un toucher, comme chez Cap 82-0. Le repêchage reste le deck là où il compte | P7 |
| Q7 | L'échelle du temps | **Au prorata de la saison : un split vaut une saison.** Un séjour dure 3 journées (4 en synergie), le repos 4. Les offres d'adjoints tombent aux journées 2, 7, 11 et 15. Une histoire sort une journée sur deux environ (≈ 8 par split, contre 8,5 par saison chez Cap 82-0), puis se repose 4 journées. Aux séries, une ronde compte pour une journée | Le découpage par split est celui de Cap 82-0 par saison : le rythme d'une saison (ses décisions, ses histoires, ses paliers) se garde d'une saison à l'autre | P5, P10 |
| Q8 | L'édition et le galon | **Ils jouent, dans l'ordre.** D'abord, les badges jouent par un canal, mesurés en paires. Puis le galon monte un badge d'un métal, deux au plus, et le galon « titre » aux cinq part (une poignée par split). Enfin, l'édition monte les badges, et la deuxième run donne une étape d'édition de plus à l'adversaire | C'est la règle de Cap 82-0, et c'est le seul canal qui rend la deuxième run plus dure | P15, P16 |
| Q9 | Le premier mandat | **Les huit premiers sur dix**, séries ou pas | Les 24 premiers sur 32 de Cap 82-0, ramenés à dix équipes ; jugé par `check_profondeur` | P3 |
| Q10 | Les vieilles parties | **Comme Cap 82-0, dès la v7** : une partie en cours se rejoue avec les nouvelles règles. Une action que le jeu ne connaît plus (un adjoint du staff, une carte au plan) s'ignore, et l'écran le dit une fois. Le méta n'est jamais touché. `js/moteur-v1.js` reste pour les v5 et avant ; aucune nouvelle copie gelée | Geler une version à chaque tranche du jalon 8 ferait une vingtaine de copies de code mort. `check_sauvegardes` le prouve | P5, P18 |
| Q11 | Les philosophies | **Huit**, ouvertes par le prestige. L'entraîneur est une vraie carte si Leaguepedia donne le coach de chaque équipe d'un split (à vérifier au build) ; sinon, le loto tire des philosophies | C'est Cap 82-0 ; la donnée décide de la carte | P13 |
| Q12 | Le marché des agents libres | **Des dépanneurs** : Régulier au plus, à prix fixe, comme le ballottage de Cap 82-0. Les Piliers viennent des packs | Un Pilier chaque journée à 8 🪙 contourne les packs, et le choix de pack doit compter | P11 |
| Q13 | Ton club | **En jetons**, à la boutique : un nom et son écusson dessiné, portés d'une run à l'autre | C'est Cap 82-0 ; la boutique y gagne un puits qui ne se vide pas | P16 |
| Q14 | L'échelle des médailles | **Celle de Cap 82-0, et ses prix**, ramenés à un split : le premier déblocage tombe après environ un split | La courbe compte, pas les nombres. Aujourd'hui, le premier déblocage de Faille demande trois splits | P16 |
| Q15 | La rangée qui s'allume au sommaire | **« Ce qui a joué »** | Le mot dit ce qu'on voit ; « le banc » est le sixième joueur, et « staff » est un mot retiré | P12 |
| Q16 | Le Marché | **Boutique et Album.** Les agents libres et les packs vont à la Boutique ; le plan de jeu part (Q1). Les Séries vont au Bureau pendant les séries | La carte des sections de Cap 82-0 | P17 |

**Aussi tranché**, ce que les relecteurs ont demandé en plus :

- **Les voix.** Le physio devient 🧠 le préparateur mental, qui lit les morts et les défaites de suite. Le 🎙️ panel du balado entre dans la distribution des voix (P8).
- **« Trois défaites de suite » part**, comme la banque d'avant la V22. Son fait revient en histoire, qui nomme le joueur (P10).
- **La banque.**
  - Les pendants LoL entrent dans la banque : 🩸 écrasé en ligne, 🎯 le pris seul.
  - 📋 « Un adjoint en vue » attend que Cap 82-0 corrige son faux choix.
  - Les suites et les rares de la V23 E attendent d'être livrées chez Cap 82-0 (P10).
- **L'ordre.** Les adjoints passent avant les histoires : c'est ce qui casse le cycle du § 7.
- **Les niveaux** s'alignent sur 50/20/4/1 % (A7), le plafond remesuré par `check_plafond` (P15).
- **Les choix de fil.** C'est le code de Cap 82-0 qui fait foi, pas sa `rogue.md` (P14).
- **Le 18-0 et l'exhibition** prennent les réglages de Cap 82-0 : le Loto, un seul split, « Rejouer », choisir les équipes, le format BO, cent parties (P19).

## 7. La carte des dépendances

Chez `/map-systems`, une couche s'appuie sur celles d'au-dessus. Le plan (§ 8) part d'en haut.

**Fondation.** Rien n'en dépend en dessous, et presque tout s'y appuie :

- les juges : le robot à trois politiques (E5) et `essai_rogue` (H23) ;
- l'impact en chiffres de partie (B1) ;
- le canal par joueur, daté (B4) ;
- les voix (G4) ;
- la décision des cotes sur 20 (A8, Q3).

**Cœur.**

| Système | S'appuie sur |
|---|---|
| le mandat au classement et la première run (F18, E3) | le robot |
| les adjoints V22 (D7, D8, D11) | le robot, la Q7 |
| le coach juste (D1 à D3) | le robot |
| le gros match et le duel (C1 à C4) | B1, le robot |
| les scènes et la feuille d'un choix (G5, H4) | B1, G4 |
| le Pack Époque et la boutique de départ (F8 à F10, F13) | le robot |

**Fonctions.**

| Système | S'appuie sur |
|---|---|
| les histoires (G1 à G3, G9, G15) | B4, G5, D7 |
| la V23 (D6, D9, D10, G14) | D7 |
| l'entraîneur et les philosophies (D4, D5, F23) | — |
| les moments, la lancée, les fils (C6, B3, G6 à G10) | C2, B4 |
| la run qui dure (F20, F22, F26 à F29, E4, F25) | — |

**Présentation.** Les écrans de Cap 82-0 (H1 à H9, H12, H13, H17 à H22), une fois que ce qu'ils montrent existe.

**Finition.** La plomberie (J) ; les modes hors du Rogue (I1 à I4) ; les photos d'action ; l'APK.

**Les goulots**, où beaucoup de systèmes passent :

- **B1** : les mots, les histoires, le duel, la feuille d'un choix, `check_mots` ;
- **D7** : les réponses des histoires, les offres, la V23, la rangée qui s'allume ;
- **C2** : l'expérience du coach, les moments, le butin, les offres ;
- **E5** : chaque mesure de courbe.

**Un cycle, et comment le casser.** Une histoire peut donner une carte d'adjoint, et les offres d'adjoints viennent aussi des histoires. On le casse en posant d'abord les adjoints, avec leurs offres aux moments forts, puis la réponse « une carte d'adjoint » des histoires.

**Les systèmes à risque**, à prototyper tôt :

| Système | Le risque |
|---|---|
| le canal par joueur (B4) | il touche le moteur calibré, et `check_feuilles` doit rester vert |
| le duel en trois phases (C3) | les phases existent déjà dans les canaux ; reste à prouver qu'un plan de phase se voit sur la feuille sans casser les repères |
| les adjoints V22 (D7) | une sauvegarde v7 ; la Q10 dit ce que devient une run v6 |
| Sur la Faille (I6) | le coût et la politique de Riot |

## 8. Le plan

Le plan est écrit au jalon 8 de `LIVRAISON.md`, qui fait foi et qu'on coche. Il suit les couches : les juges d'abord, puis les fondations, le cœur, les fonctions, les écrans et la plomberie. Chaque tranche est une petite PR, nomme son jumeau dans Cap 82-0 et le script qui la prouve. Les décisions du § 6 y sont prises en compte.

## Annexe — les scripts, jumeau par jumeau

Ce sont les juges de Cap 82-0 qui n'ont pas encore de jumeau ici, rangés par la tranche du jalon 8 qui les écrira.

**Trois homonymes à ne pas confondre :**

- `check_cotes` : celui de Faille est le jumeau de `check_ratings` ;
- `check_plafond` : celui de Faille juge le coût et le cinq qui se complète ;
- `check_rogue` : celui de Faille mesure en paires, comme les `check_cartes` et `check_pouvoirs` de Cap 82-0.

| Script de Cap 82-0 | Ce qu'il juge | Chez Faille |
|---|---|---|
| `check_profondeur`, `check_robot` | la courbe des runs (trois robots) ; le robot « premier Signer » ne gagne pas | à écrire (8 P1) |
| `essai_rogue` | une run jouée à 390 × 844 : un écran, 8 px au bord | à écrire (8 P1) |
| `check_chiffres`, `check_impact` | ce que l'écran annonce égale ce que le moteur joue ; le témoin à zéro | à écrire (8 P2) |
| `check_pouvoirs` | les pouvoirs et les adjoints, sous leurs bornes | dans `check_rogue` (8 P5, P6) |
| `check_duel`, `check_gros`, `check_combat`, `check_pronostic`, `check_instantane` | le duel, les gros matchs, l'entracte | à écrire (8 P7) |
| `check_clarte`, `check_lisibilite`, `check_choix` | la réplique sans chiffre, la tuile sobre, chaque choix en est un | à écrire (8 P8) |
| `check_effets`, `check_lancee`, `check_situations` | chaque effet se voit ; la lancée absente du 18-0 | à écrire (8 P9) |
| `check_dossiers`, `check_mots`, `check_verdicts`, `check_incidents`, `check_vie` | les histoires, leurs mots, leur verdict, toujours un joueur | à écrire (8 P10) |
| `check_packs`, `essai_packs`, `essai_achat` | les packs selon leurs taux, la revente, l'achat | dans `check_gestion` en partie ; à écrire (8 P11) |
| `check_banc`, `check_banque` | ce qui s'allume au soir est arrivé ; les cartes rares | à écrire (8 P12, P11) |
| `check_fils`, `check_retours`, `check_suivis`, `check_moments_si` | les fils et leurs retours, les suivis, les moments | à écrire (8 P14) |
| `check_galons` | les galons lus dans les feuilles | dans `check_meta` |
| `check_css`, `check_emojis`, `check_lexique`, `check_sauvegardes`, `check_maj`, `essai_poids` | la plomberie | à écrire (8 P18) |
| `check_affinite`, `check_familles` | l'affinité, les familles | à écrire (8 P15) |
| `check_plan_de_match` | chaque plan contre « Ton plan » ; aucun ne domine | à écrire (8 P4) |
| `check_causes`, `check_parts`, `check_traits` | les causes, les parts, les traits | à écrire, plus tard |
| `check_physique`, `check_table`, `smoke_table`, `check_regles` | Sur glace, Sur table | pas maintenant (Q4) |
| `check_ballottage`, `check_blessures`, `check_jambes`, `check_gardiens`, `check_speciales`, `check_prolongation`, `check_calendrier`, `check_gestes`, `check_pm`, `check_positions`, `check_au_mieux`, `check_suppression`, `check_neutre`, `check_fiches` | ce qui ne se transpose pas | ∅ |
