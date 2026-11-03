# Faille — instructions pour l'agent

## Le projet en une phrase

Jeu web statique en français québécois : la roulette sort un split et une équipe pro de League of Legends, tu piges un joueur dans ce vestiaire, tu bâtis ton cinq (haut, jungle, milieu, bas, soutien) sous un plafond, et tu simules le split puis les séries.

Hébergé sur GitHub Pages. Aucun backend, aucune dépendance npm, aucun framework. Le petit frère de Cap 82-0 (`ouellettejeanphilippe-source/hockey`) : quand une question de principe se pose, la réponse de Cap 82-0 (son `CLAUDE.md`, son `docs/decisions.md`) est le point de départ.

## Avant de coder

Lis `LIVRAISON.md` — le plan de travail : les jalons, chaque item avec son fichier et le script qui le prouve. Coche les cases et ajoute une ligne au journal.

`PLAN.md` garde l'état court et les décisions prises. `docs/donnees.md` dit d'où viennent les données et sous quelles conditions. `MOTEUR.md` est la spécification du moteur et sa calibration.

`docs/parite-cap82.md` est l'index des systèmes de Cap 82-0. Il donne leur état ici (jumeau, périmé, partiel, absent, sans objet), les écarts de règle et les questions à JP. Le jalon 8 de `LIVRAISON.md` en est le plan. Avant de transposer un système de Cap 82-0, lis sa ligne, puis le code de Cap 82-0 d'aujourd'hui : il bouge vite.

## Les agents et les commandes

`.claude/agents/` garde des spécialistes à qui confier une question de leur terrain (l'outil Agent) :

| Agent | Son terrain |
|---|---|
| `faille-design` | le fun, les boucles, les vrais choix, la courbe d'une run |
| `faille-equilibre` | les bornes, mesurées en paires |
| `faille-economie` | les jetons, les packs, les médailles, les déblocages |
| `faille-ux` | le parcours, une info une maison, le pouce à 390 px |
| `faille-recit` | les histoires, les voix, la une |

`.claude/skills/` garde quatre commandes :

| Commande | Ce qu'elle fait |
|---|---|
| `/parite [terrain]` | refait l'audit contre Cap 82-0 et met l'index à jour |
| `/revue-design <devis>` | juge un devis avant le code, sur le gabarit `docs/gabarits/devis.md` |
| `/equilibrer <sujet>` | mesure un sujet et propose un réglage |
| `/rapport-essai <notes>` | ramène les reproches d'un essai à leur cause |

Ils sont repris des agents et des commandes de Cap 82-0, eux-mêmes adaptés de Claude-Code-Game-Studios (Donchitos, licence MIT : https://github.com/Donchitos/Claude-Code-Game-Studios).

## Structure

```
index.html            la page unique
style.css             tous les styles, mobile d'abord (390 px), sur le système de Cap 82-0
fonts/                Barlow Condensed (OFL 1.1), la condensée de Cap 82-0, et les quinze polices des séries de cartes (fonts/POLICES.txt)
sw.js                 travailleur de service : la coquille hors ligne (FICHIERS)
data/index.json       la liste des splits bâtis
data/splits/<id>.json un shard par split : équipes, fiches, joueurs et leurs vraies stats, chemins de leurs images
data/champions.json   les champions joués : nom → id de Data Dragon (leurs images) et leurs classes
img/lp/               les photos des joueurs et les logos des équipes, HORS DU DÉPÔT : copiés au déploiement (pages.yml, scripts/images.mjs)
docs/parite-cap82.md  l'index des systèmes de Cap 82-0 et leur état ici, les écarts de règle, les questions à JP (/parite)
docs/gabarits/devis.md le gabarit d'un devis, jugé par /revue-design avant le code
.claude/              les agents (faille-*) et les commandes (/parite, /revue-design, /equilibrer, /rapport-essai)

js/main.js            le contrôleur : chaque geste passe par faire() (une action du journal), la sauvegarde, le méta, les écrans
js/partie.js          la run en journal d'actions : appliquer, rejouer, la sauvegarde (la graine, le mode, les déblocages, le club, la collection du départ, le journal) ; les deux modes (le 18-0, le Rogue), les cases du départ (la vedette, le classeur, ceux qui restent) et le pack de départ
js/gestion.js         les règles du DG : relances, marché et banc, packs de joueurs, le joueur qui vieillit, mandats, objectifs, événements, commanditaires, entraînement
js/bureau.js          le Bureau (Boîte, Proprio, Coach, Vestiaire), les Joueurs (le tableau), le Cinq (ton cinq, ton plan), les agents libres ; la stratégie ; le bilan d'un split
js/soir.js            « Ce soir » avant une partie (l'affiche, la forme, le face-à-face, leur cinq), le sommaire d'une partie jouée ; la une, les nouvelles, autour de la ligue
js/meta.js            le méta entre les runs, rien de compté : médailles, rang, déblocages, ton club, la collection, le panthéon
js/palmares.js        le palmarès d'un split, lu dans ses feuilles : stats, meneurs, trophées, galons, records
js/sauvegardes.js     les parties (un index, une clé chacune, l'export et l'import), le méta et les options, dans le stockage
js/menu.js            l'écran titre, le menu, les parties, le départ d'une partie (le mode, le coach, le joueur de concession, le club)
js/depart.js          le départ du Rogue à l'écran : une case et son loto, le pack de départ, les étoiles de concession ; l'exhibition
js/vitrine.js         les déblocages et ton club, le palmarès, la collection et ses albums
js/regles.js          la page des règles, chaque chiffre lu de sa constante
js/direct.js          une partie en direct : la Faille, le pointage, la courbe de l'or, le fil
js/terrain.js         la Faille du direct : chaque événement à sa place, chaque moment nommé (gank, plongée, combat, bataille, poussée…)
js/commentaire.js     le commentateur du direct : des phrases montées pièce par pièce, tirées en paquet
js/sons.js            les sons, synthétisés (Web Audio)
js/ouverture.js       l'ouverture d'un pack en plein écran : le paquet, la déchirure, la pile qu'on balaie, le walkout d'une étoile, l'étalage
js/cotes.js           les cotes cachées : sous-cotes et leurs remplacements par époque, valeur, niveau, badges ; le plafond et le coût
js/fiche.js           la carte d'un joueur : un carton 5:7 recto verso dans la série de son année (SERIES, une par année 2011 → 2025), son édition ; le retournement, l'inclinaison ; ses petites images au vestiaire
js/images.js          d'où vient chaque image (img/lp, Data Dragon)
js/data.js            le chargeur (index, shard, champions)
js/sim.js             le split au jour le jour, les séries, le tempo et les vraies équipes ; il appelle le moteur de la partie (MOTEUR.md)
js/moteur.js          le moteur v2 : une partie comme une vraie — les sorts d'invocateur, les niveaux et l'ultime, les sbires, les combats, les monstres et les tours de chaque époque (MOTEUR.md)
js/moteur-v1.js       le moteur d'avant, gelé : il rejoue les sauvegardes v ≤ 5
js/canaux.js          les canaux d'une partie (`sommerEffets`) et les horaires des phases, partagés par les deux moteurs
js/strategie.js       la stratégie : sept plans de match, leur fit sur les joueurs, l'identité des vraies équipes (MOTEUR.md §10)
js/split.js           la Ligue (classement, calendrier, meneurs, séries), hier soir, la feuille d'une série
js/repechage.js       le repêchage des champions : bannissements, bassins, confort, composition (MOTEUR.md §7)
js/tableau-repechage.js l'écran du repêchage
js/rogue.js           les jetons, les packs, les cartes de plan de jeu, les coachs, les liens d'origine (MOTEUR.md §8, §9)
js/impact.js          l'impact en chiffres de partie : ce qu'un effet change sur la feuille, au-dessus du bruit (`phraseDe`, `chiffresDe`) ; la composition d'un repêchage, sommée
js/impacts.js         la table mesurée de chaque effet (écrite par scripts/impact.mjs, ne pas éditer à la main)
js/boutique.js        le Marché : les packs de joueurs, le plan de jeu (cartes, coach, packs de cartes)
js/hasard.js          tout le hasard du jeu, à graine
js/pile.js            le retour, un niveau à la fois (repris de Cap 82-0)
js/glisser.js         les gestes du doigt (repris de Cap 82-0) : balayer d'un onglet à l'autre, tirer une couche vers le bas pour la fermer
js/deposer.js         le glisser-déposer, souris et doigt (l'appui tenu) : le banc sur son titulaire, au Cinq
js/util.js            les petits outils partagés

scripts/build_splits.mjs   Leaguepedia + Data Dragon → data/ (lent : l'API limite le débit)
scripts/catalogue.mjs      la table Tournaments → scripts/splits.json (les splits des quatre ligues)
scripts/images.mjs         les photos et les logos des shards → img/lp/, une fois chacun ; les portraits recadrés à la copie
scripts/recadrer.py        le recadrage d'un portrait (Pillow, outil de fabrication) : la tête par la transparence, un 5:7 au fond transparent
scripts/splits.json        les splits à bâtir : les Mondiaux, puis le catalogue
scripts/lib/leaguepedia.mjs l'API Cargo, sa pause et ses attentes
scripts/verdict.mjs        le juge partagé : chaque script pose son code de sortie
scripts/tout.mjs           enchaîne les vérifications rapides
scripts/lib/vestiaires.mjs les vraies équipes des shards, pour les scripts du moteur
scripts/calibrer.mjs       cherche les réglages du moteur contre les repères (scripts/lib/reperes.mjs) ; ne juge rien
scripts/impact.mjs         mesure chaque effet en paires et écrit js/impacts.js ; ne juge rien
scripts/lib/paires.mjs     le banc de mesure en paires (check_rogue, impact.mjs, check_chiffres) ; scripts/lib/effets.mjs, le registre des effets chiffrés
scripts/check_*.mjs        les vérifications (graine, coquille, code mort, cotes, plafond, gestion, méta, feuilles, commentaire, terrain, rogue, robot, impact, chiffres)
scripts/check_profondeur.mjs trois robots sur les mêmes dés : mener compte-t-il ? la première run est-elle dure ? (hors du CI : le juge de la courbe d'une run)
scripts/smoke.mjs          le test de fumée à 390 px (Playwright) : le parcours entier, du titre à la reprise ; tout est atteignable, aucune cible sous 44 px
scripts/essai_rogue.mjs    un robot joue le premier split à 390 × 844 : chaque écran mesuré en hauteurs d'écran, rien à moins de 8 px du bord
scripts/lib/robot.mjs      un DG robot qui joue des runs entières, à trois politiques (défaut, attentif, distrait) sur les mêmes dés
scripts/lib/bords.mjs, cibles.mjs  ce qui colle au bord, les cibles sous 44 px (repris de Cap 82-0)
```

## Règles fermes

Le pourquoi de chacune est, pour l'instant, dans le `docs/decisions.md` de Cap 82-0.

**Les règles qui vont changer.** Le 2 nov. 2026, les questions de la parité ont été tranchées (`docs/parite-cap82.md` § 6). Plusieurs règles ci-dessous vont changer, chacune avec sa tranche du jalon 8 :

| La règle | Ce qu'elle devient | Tranche |
|---|---|---|
| « aucune cote dans le DOM » | les cotes sur 20 | P15 |
| la stratégie au fit | des plans par partie | P4 |
| le staff d'adjoints et le plan de jeu | les adjoints de la V22 | P5 |
| les commanditaires | la règle du coach | P12 |
| « une édition ou un galon ne change rien au jeu » | ils jouent | P16 |
| « un événement joue sur la gestion » | un canal par joueur | P9 |

D'ici leur tranche, elles disent le code d'aujourd'hui et se respectent. La tranche qui en change une la réécrit.

**Les données**
- Pas de scraping de pages web : l'API Cargo de Leaguepedia (CC BY-SA 3.0, attribution au pied de la page et dans chaque shard), plus tard Oracle's Elixir si ses conditions le permettent. Les conditions de chaque source sont dans `docs/donnees.md`.
- Ne commite pas `data/splits/*.json` à la main : c'est le job du script et de l'Action.
- La politique « fan content » de Riot : jeu gratuit, rien qui laisse croire qu'il est officiel, la mention légale de Riot au pied de la page, pas « League of Legends » ni « LoL » dans le nom du jeu.

**Les cotes**
- Aucune cote dans le DOM, jamais ; ce qui s'affiche est le niveau, les badges ou une vraie stat.
- Une seule implémentation des cotes (`js/cotes.js`, partagée par les scripts et le navigateur).
- Le coût sous le plafond suit le niveau et rien d'autre ; le cinq se complète toujours — `check_plafond`.
- Chaque sous-cote se juge contre le même rôle dans le même split ; la force d'équipe suit la vraie fiche — `check_cotes`.
- Une stat qu'une époque ne mesure pas n'est jamais inventée : on la lit par une formule de remplacement écrite dans `AXES`, ou l'axe reste neutre et ses badges ne se décernent pas — `check_cotes`.

**Le moteur (jalon 2)**
- Tout le hasard passe par `hasard()` (js/hasard.js) ; la même graine rejoue le même split — `check_graine`.
- Aucun chiffre de calibration inventé : chaque repère vient des vraies parties (durée, éliminations, or, tours, dragons, Nashor, côté bleu), et chaque partie rejouée retombe dans l'intervalle de la mesure — `check_feuilles`.
- Un objectif vaut ce qu'il vaut dans les vraies parties : le camp qui en prend le plus gagne aussi souvent qu'en vrai — `check_feuilles`.
- La feuille de match se ferme par construction (les éliminations des joueurs font celles de l'équipe et les morts de l'autre…) — `check_feuilles`.

**Le rogue (jalon 3)**
- Tout ce qui change une partie (repêchage, carte, coach) passe par les canaux (`sommerEffets`, js/canaux.js), et par rien d'autre ; neutres, ils rejouent la partie calibrée — `check_graine`, `check_feuilles`.
- Mesuré en paires, ou pas mesuré : une carte reste dans la borne de sa rareté, une rare se voit sur la feuille — `check_rogue`.
- Les jetons se recomptent des résultats et des achats, jamais gardés ; une carte ne sort qu'une fois ; la couleur d'une carte se lit sur ses canaux.
- Ce qu'un effet change se dit en vraies stats de partie — éliminations, morts, dragons, Nashor, hérauts, tours, minutes —, jamais en cote, en victoires ni en « % » : mesuré en paires (`scripts/impact.mjs` écrit `js/impacts.js`, `js/impact.js` le dit), une ligne sous le bruit ne se dit pas — `check_impact`, `check_chiffres`. Un effet ou un moteur qui change fait refaire la table (`node scripts/impact.mjs`, une minute et demie) : `check_impact` le demande.
- Une stratégie : son gain suit le fit des joueurs, son prix se paie toujours ; le tiers le mieux ajusté y gagne, le moins bien ajusté y perd — `check_rogue`. Le fit se dit en mots, comme un badge.

**La gestion (jalon 4)**
- Chaque geste du DG est une action de `js/partie.js` ; rejouer le journal redonne la même partie, et c'est la sauvegarde — `check_gestion`.
- Le plafond tient après chaque action, le marché ferme à la date limite, les relances restent dans leur nombre — `check_gestion`.
- Le mandat se lit au classement du split, jamais à une série (les séries, puis les trois, les deux premiers, premier) ; le premier split de la première run laisse bâtir (les huit premiers, séries ou pas) ; ta vedette prend la case du haut du classeur ; une partie d'avant la version 7 garde ses mandats aux séries — `check_gestion`, `check_meta`.
- Deux modes (`MODES`, js/meta.js) : le 18-0 (la roulette, le split d'un coup, les séries partie par partie, aucune carte ni décision ni jeton ; la collection, pas les médailles) et le Rogue, qui part faible — ses cases au loto (la vedette, le classeur tiré de la collection, ceux qui restent ; jamais au choix), puis le pack de départ de bouche-trous ; la roulette et les gardés y sont refusés — `check_gestion`, `check_meta`, smoke.
- Un lien d'origine passe par les canaux et se mesure en paires, comme une carte — `check_rogue` ; un champion entraîné ne se montre jamais en parties.
- La boîte se déduit de l'état, jamais gardée ; un événement joue sur la gestion, pas sur le moteur, tant qu'il n'est pas mesuré en paires.

**Le méta et le direct (jalon 6)**
- Le méta ne compte rien : il garde le résumé de chaque partie et tes achats ; médailles, rang, collection et panthéon s'en recomptent, et la même partie notée deux fois ne paie qu'une fois — `check_meta`.
- Un déblocage, une exigence passent par une règle qui existe, posés au départ de la run et gardés dans sa sauvegarde ; jamais par le moteur. Le plafond d'une run est porté par son effectif (`plafondDe`). Une édition ou un galon ne change rien au jeu.
- Un trophée, un galon, un record se lisent dans les feuilles, par une colonne, jamais par un vote ; les seuils des galons sont mesurés sur le moteur — `check_meta`.
- Le direct rejoue la feuille, il ne décide rien ; le commentateur et la Faille tirent leur hasard de `hasard()`, et la même graine redit la même partie — `check_commentaire`, `check_terrain`.
- Un pouvoir du coach lit ce qui est déjà joué au début d'une phase (lignes, milieu, fin) et frappe la phase par les canaux ; il ne tire aucun dé ; seul, il reste sous 1,5 victoire (grandi d'un talent, 2,5), joue dans 25 à 75 % des parties et se voit sur sa signature ; le personnage complet reste sous 4 — `check_rogue`, MOTEUR.md § 11.
- Le coach est un personnage choisi au départ, qui fait la run : son expérience se recompte des résultats, jamais gardée ; son niveau ne descend pas ; un talent se règle dans la boîte — `check_gestion`. Une partie d'avant la version 4 garde son coach acheté et sa confiance.
- Un adjoint est un échange sur les canaux : ni cadeau ni piège sur une équipe ordinaire (sous 1 victoire), visible sur sa signature — `check_rogue` ; un parmi trois aux journées 6 et 12, trois au plus — `check_gestion`.
- Au direct, les dix joueurs et leur champion se placent d'après la feuille (la phase, qui vient de tuer, d'aider ou de tomber, un mort à sa fontaine) — `check_terrain`.
- La Faille est lue de la feuille : un moment ne se nomme que si la feuille le porte (un gank, le jungler ; un combat, trois éliminations ; une poussée, personne ne meurt autour) ; seule la place est illustrative, et cohérente (une ligne tombe dans l'ordre, le nexus par une ligne ouverte) — `check_terrain`. La carte est un dessin à nous, jamais celle du jeu.

**Les images**
- Photos des joueurs et logos des équipes : copiés une fois dans `img/lp/`, hors du dépôt, par l'Action « Publier » qui garde son cache (le serveur de Leaguepedia refuse les autres sites ; on ne contourne pas ça). En local : `node scripts/images.mjs` (Pillow pour le recadrage). La photo d'un joueur est celle de son split, sinon la plus proche ; chaque portrait est recadré comme au hockey — la tête par la transparence, à la même place d'un 5:7, le fond transparent gardé (`scripts/recadrer.py`).
- Champions : Data Dragon, demandé à Riot, gardé par le travailleur de service.
- La carte d'un joueur est un carton 5:7 recto verso (Cap 82-0), dans la série de son année : chaque série s'inspire de l'esprit du client et des sites de l'esport de son année, sans en copier ni police, ni logo, ni élément ; ses polices sont libres (OFL, `fonts/POLICES.txt`). Le fond de la fenêtre est l'illustration de son champion (Data Dragon).

**L'interface**
- Mobile d'abord : rien ne déborde à 390 px ; la page ne défile jamais à l'horizontale.
- Un seul retour, un niveau à la fois (js/pile.js) ; rien de sélectionnable.
- Toute commande visible doit fonctionner — `scripts/smoke.mjs`.
- Rien sous 44 × 44 de ce qu'un doigt touche, et tout s'atteint (rien sous le pli sans défilement, rien de coupé) — smoke ; rien à moins de 8 px des bords de l'écran — `essai_rogue`.
- Le split en sections, les mêmes que Cap 82-0 (JP : *même séparation des pages*) : au Rogue, cinq portes dans la barre du bas — Bureau (Boîte, Proprio, Coach, Vestiaire), Joueurs, Cinq, Marché (agents, packs, plan de jeu, Album), Ligue (classement, calendrier, meneurs, séries, Palmarès) ; au 18-0, quatre, sans le Marché, le Bureau sans proprio ni coach. Une maison par sujet ; une décision se règle dans la boîte.
- Ce qu'un texte affirme d'une partie (une suite, une panne, la une) est arrivé dans les feuilles déjà jouées, et il dit les vrais chiffres.
- Le noir est le décor.
- Le système de Cap 82-0 : sept tailles, trois rayons, les couleurs en jetons de `:root`, la condensée pour les titres, chiffres et boutons ; une action principale par écran, en bas ; le retour dans le tableau indicateur.

**Le code et les tests**
- Modules ES natifs, pas de build step, aucune dépendance npm.
- `sw.js` liste tout ce que la page charge — `check_coquille`.
- Zéro code inutile : aucune déclaration morte, aucun `export` ni import de trop, aucune classe CSS sans élément — `check_mort`.
- Chaque script passe par `scripts/verdict.mjs`, qui pose le code de sortie.
- Français québécois, partout.

## Le vocabulaire

- **split** : une saison d'une ligue (LCK 2019 · Printemps) ; c'est l'unité du découpage des données.
- **rôle** : haut, jungle, milieu, bas, soutien — la case d'un joueur dans le cinq.
- **vestiaire** : l'équipe d'un split où l'on pige.
- **champion** : le personnage joué ; on ne dit pas « perso ». Sa **classe** (tank, mage…) vient de Data Dragon.
- **plafond** : ce que ton cinq peut coûter (15 points) ; le **coût** d'un joueur suit son niveau.
- **niveau** : ce que le joueur valait dans son split, à son rôle — Remplaçant, Régulier, Pilier, ★ Étoile, ★ Phénomène. Pas « Soutien » : c'est un rôle.
- **sous-cote** : un axe caché de son jeu (ligne, pression, dégâts, implication, survie, vision, objectifs, bassin) ; jamais à l'écran.
- **badge** : ce qu'il fait, à un palier — Bronze, Argent, Or, Platine (« 🗡️ Bourreau de ligne Or ») ; deux au plus.
- **carte** : le carton 5:7 d'un joueur, recto verso ; sa **série** est celle de son année (Pionnier 2011 … Aurore 2025) ; son **édition** (Base, Cadre, Hors-cadre, Or, Holo) suit ses copies à ta collection et change la carte entière, jamais le jeu. Pas « finition ».
- **bassin** : les champions qu'un joueur a joués dans le split, avec ses parties et sa fiche sur chacun.
- **remplacement** : la formule qu'une sous-cote prend quand son époque ne mesure pas la stat de tête.
- **repêchage** : les bannissements et les champions d'une série de saison, ou d'une partie d'une série de séries ; le **confort** est ce qu'un joueur perd loin de son plus joué.
- **canal** : une prise du moteur par où passe un effet (ligne, combat, objectifs, tardif, rythme, siège, fin, confort).
- **run** : plusieurs splits de suite sous le **mandat** du proprio ; le **bilan** d'un split, et **ceux qui restent** (au loto, jamais au choix). Les deux **modes** : **le 18-0** (juste le repêchage, le split d'un coup, rien d'autre) et **le Rogue** (la run).
- **le départ** d'une run de Rogue : ses **cases** — **ton joueur de concession** (la vedette, choisie une fois, qui revient à chaque run), **le classeur** (des **lotos** de trois cartes de ta collection, par niveau) —, puis **le pack de départ** de **bouche-trous** (des Remplaçants et de bas Réguliers tirés au hasard). Pas « plombier ».
- **marché** : les agents libres d'une journée, jusqu'à la **date limite** ; le **banc**, le sixième joueur ; les **relances** de la roulette.
- **boîte** : les messages du proprio, de l'entraîneur, du DG, du dépisteur ; un **événement** se tranche.
- **commanditaire** : il paie les parties qui remplissent son objectif ; **lien d'origine** : des joueurs qui ont joué ensemble pour vrai ; **entraînement** : un champion qui entre au bassin, « entraîné ».
- **stratégie** (le plan de match) : ce que ton cinq priorise ; son **fit**, ce que tes joueurs savent en faire ; l'**identité** d'une vraie équipe, ce qu'elle prenait de plus que son split.
- **plan de jeu** : les trois cartes actives au plus ; **jetons**, **pack** : comme dans Cap 82-0. Le **coach** : un personnage choisi au départ, son **expérience**, son **niveau** (1 à 5) ; un **pouvoir** s'ouvre à un niveau et joue une **phase** (la phase de lignes, le milieu de partie, la fin de partie) quand sa condition tient ; un **talent** fait grandir un pouvoir ; son **staff**, ses **adjoints** (chacun un échange). Le **palier** de confiance : la règle d'avant la version 4.
- **médailles** 🏅 : la monnaie du méta, gagnée par les runs ; elles achètent les **déblocages** et **ton club** (son nom, sa couleur) ; leur total à vie fait ton **rang**. Les **exigences** 🔺 : après un premier titre, les crans qu'une run monte au départ ; pas « difficulté » à l'écran.
- **collection** : les joueurs passés chez toi ; une **carte** y a ses **copies** (une par run), qui font son **édition** ; un **album** par split.
- **trophée** : décerné au bilan d'un split, par une colonne ; **galon** : ce qu'un de tes joueurs a fait chez toi, gravé à sa carte ; **record**, **panthéon** : le meilleur de tes runs.
- **pack de joueurs** : trois vrais joueurs tirés par leur niveau ; un **pack de cartes** donne des cartes de plan de jeu.
- **le direct** : une partie rejouée dans le temps ; **la Faille** : sa carte ; un **moment** : ce qui s'y passe, nommé — gank, plongée sous la tour, duel, escarmouche, combat d'équipe, bataille (du dragon, de l'âme, du Nashor), poussée de côté, assaut final. **Hier soir** : ta dernière série, au Bureau ; **ce soir** : la partie qui vient, son affiche et son face-à-face ; le **sommaire** : une partie jouée, en un écran ; **la une** : le fait le plus lourd d'hier soir, dit par une voix ; les **nouvelles** : qui est en feu, qui est en panne.

## Tester

`python3 -m http.server 8000` puis `localhost:8000`. `node scripts/tout.mjs` enchaîne les vérifications rapides ; `node scripts/smoke.mjs http://localhost:8000` joue le parcours entier à 390 px (Playwright, installé à part ; `CHROMIUM=<chemin>` pour un Chromium déjà là) ; `node scripts/essai_rogue.mjs http://localhost:8000` joue un premier split et mesure chaque écran (une minute). L'Action `verifier.yml` fait les trois à chaque PR. `node scripts/check_profondeur.mjs` (sept secondes) juge la courbe d'une run avec trois robots : il n'est pas au CI, il est rouge tant que la première run n'est pas dure (le jalon 8, P3, P5, P11).
