# Faille — instructions pour l'agent

## Le projet en une phrase

Jeu web statique en français québécois : la roulette sort un split et une équipe pro de League of Legends, tu piges un joueur dans ce vestiaire, tu bâtis ton cinq (haut, jungle, milieu, bas, soutien) sous un plafond, et tu simules le split puis les séries.

Hébergé sur GitHub Pages. Aucun backend, aucune dépendance npm, aucun framework. Le petit frère de Cap 82-0 (`ouellettejeanphilippe-source/hockey`) : quand une question de principe se pose, la réponse de Cap 82-0 (son `CLAUDE.md`, son `docs/decisions.md`) est le point de départ.

## Avant de coder

Lis `LIVRAISON.md` — le plan de travail : les jalons, chaque item avec son fichier et le script qui le prouve. Coche les cases et ajoute une ligne au journal.

`PLAN.md` garde l'état court et les décisions prises. `docs/donnees.md` dit d'où viennent les données et sous quelles conditions. `MOTEUR.md` est la spécification du moteur et sa calibration.

## Structure

```
index.html            la page unique
style.css             tous les styles, mobile d'abord (390 px), sur le système de Cap 82-0
fonts/                Barlow Condensed (OFL 1.1), la condensée de Cap 82-0
sw.js                 travailleur de service : la coquille hors ligne (FICHIERS)
data/index.json       la liste des splits bâtis
data/splits/<id>.json un shard par split : équipes, fiches, joueurs et leurs vraies stats, chemins de leurs images
data/champions.json   les champions joués : nom → id de Data Dragon (leurs images) et leurs classes
img/lp/               les photos des joueurs et les logos des équipes, HORS DU DÉPÔT : copiés au déploiement (pages.yml, scripts/images.mjs)

js/main.js            le contrôleur : chaque geste passe par faire() (une action du journal), la sauvegarde, le méta, les écrans
js/partie.js          la run en journal d'actions : appliquer, rejouer, la sauvegarde (la graine, les déblocages, le club, le journal)
js/gestion.js         les règles du DG : relances, marché et banc, packs de joueurs, le joueur qui vieillit, mandats, objectifs, événements, commanditaires, entraînement
js/bureau.js          les sections Bureau (la boîte, hier soir), Effectif et agents libres ; la stratégie ; le bilan d'un split
js/meta.js            le méta entre les runs, rien de compté : médailles, rang, déblocages, ton club, la collection, le panthéon
js/palmares.js        le palmarès d'un split, lu dans ses feuilles : stats, meneurs, trophées, galons, records
js/sauvegardes.js     les parties (un index, une clé chacune, l'export et l'import), le méta et les options, dans le stockage
js/menu.js            l'écran titre, le menu, les parties, le départ d'une run
js/vitrine.js         les déblocages et ton club, le palmarès, la collection et ses albums
js/regles.js          la page des règles, chaque chiffre lu de sa constante
js/direct.js          une partie en direct : la Faille, le pointage, la courbe de l'or, le fil
js/terrain.js         la Faille du direct : chaque événement à sa place, chaque moment nommé (gank, plongée, combat, bataille, poussée…)
js/commentaire.js     le commentateur du direct : des phrases montées pièce par pièce, tirées en paquet
js/sons.js            les sons, synthétisés (Web Audio)
js/cotes.js           les cotes cachées : sous-cotes et leurs remplacements par époque, valeur, niveau, badges ; le plafond et le coût
js/fiche.js           la carte d'un joueur, habillée selon l'époque de son split ; ses petites images au vestiaire
js/images.js          d'où vient chaque image (img/lp, Data Dragon)
js/data.js            le chargeur (index, shard, champions)
js/sim.js             le moteur : une partie par événements, le split au jour le jour, les séries (MOTEUR.md)
js/strategie.js       la stratégie : sept plans de match, leur fit sur les joueurs, l'identité des vraies équipes (MOTEUR.md §10)
js/split.js           la Ligue (classement, calendrier, meneurs, séries), hier soir, la feuille d'une série
js/repechage.js       le repêchage des champions : bannissements, bassins, confort, composition (MOTEUR.md §7)
js/tableau-repechage.js l'écran du repêchage
js/rogue.js           les jetons, les packs, les cartes de plan de jeu, les coachs, les liens d'origine (MOTEUR.md §8, §9)
js/boutique.js        le Marché : les packs de joueurs, le plan de jeu (cartes, coach, packs de cartes)
js/hasard.js          tout le hasard du jeu, à graine
js/pile.js            le retour, un niveau à la fois (repris de Cap 82-0)
js/util.js            les petits outils partagés

scripts/build_splits.mjs   Leaguepedia + Data Dragon → data/ (lent : l'API limite le débit)
scripts/catalogue.mjs      la table Tournaments → scripts/splits.json (les splits des quatre ligues)
scripts/images.mjs         les photos et les logos des shards → img/lp/, une fois chacun
scripts/splits.json        les splits à bâtir : les Mondiaux, puis le catalogue
scripts/lib/leaguepedia.mjs l'API Cargo, sa pause et ses attentes
scripts/verdict.mjs        le juge partagé : chaque script pose son code de sortie
scripts/tout.mjs           enchaîne les vérifications rapides
scripts/lib/vestiaires.mjs les vraies équipes des shards, pour les scripts du moteur
scripts/calibrer.mjs       cherche les réglages du moteur contre les repères (scripts/lib/reperes.mjs) ; ne juge rien
scripts/check_*.mjs        les vérifications (graine, coquille, code mort, cotes, plafond, gestion, méta, feuilles, commentaire, terrain, rogue)
scripts/smoke.mjs          le test de fumée à 390 px (Playwright) : le parcours entier, du titre à la reprise
scripts/lib/robot.mjs      un DG robot qui joue des runs entières (check_meta)
```

## Règles fermes

Le pourquoi de chacune est, pour l'instant, dans le `docs/decisions.md` de Cap 82-0.

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
- Tout ce qui change une partie (repêchage, carte, coach) passe par les canaux de `js/sim.js` (`sommerEffets`), et par rien d'autre ; neutres, ils rejouent la partie calibrée — `check_graine`, `check_feuilles`.
- Mesuré en paires, ou pas mesuré : une carte reste dans la borne de sa rareté, une rare se voit sur la feuille — `check_rogue`.
- Les jetons se recomptent des résultats et des achats, jamais gardés ; une carte ne sort qu'une fois ; la couleur d'une carte se lit sur ses canaux.
- Ce qu'un effet fait s'écrit en mots (`dire`), jamais en cote.
- Une stratégie : son gain suit le fit des joueurs, son prix se paie toujours ; le tiers le mieux ajusté y gagne, le moins bien ajusté y perd — `check_rogue`. Le fit se dit en mots, comme un badge.

**La gestion (jalon 4)**
- Chaque geste du DG est une action de `js/partie.js` ; rejouer le journal redonne la même partie, et c'est la sauvegarde — `check_gestion`.
- Le plafond tient après chaque action, le marché ferme à la date limite, les relances restent dans leur nombre — `check_gestion`.
- Un lien d'origine passe par les canaux et se mesure en paires, comme une carte — `check_rogue` ; un champion entraîné ne se montre jamais en parties.
- La boîte se déduit de l'état, jamais gardée ; un événement joue sur la gestion, pas sur le moteur, tant qu'il n'est pas mesuré en paires.

**Le méta et le direct (jalon 6)**
- Le méta ne compte rien : il garde le résumé de chaque partie et tes achats ; médailles, rang, collection et panthéon s'en recomptent, et la même partie notée deux fois ne paie qu'une fois — `check_meta`.
- Un déblocage, une exigence passent par une règle qui existe, posés au départ de la run et gardés dans sa sauvegarde ; jamais par le moteur. Le plafond d'une run est porté par son effectif (`plafondDe`). Une finition ou un galon ne change rien au jeu.
- Un trophée, un galon, un record se lisent dans les feuilles, par une colonne, jamais par un vote ; les seuils des galons sont mesurés sur le moteur — `check_meta`.
- Le direct rejoue la feuille, il ne décide rien ; le commentateur et la Faille tirent leur hasard de `hasard()`, et la même graine redit la même partie — `check_commentaire`, `check_terrain`.
- Un pouvoir du coach lit ce qui est déjà joué au début d'une phase (lignes, milieu, fin) et frappe la phase par les canaux ; il ne tire aucun dé ; seul, il reste sous 1,5 victoire, joue dans 25 à 75 % des parties et se voit sur sa signature — `check_rogue`, MOTEUR.md § 11.
- Au direct, les dix joueurs et leur champion se placent d'après la feuille (la phase, qui vient de tuer, d'aider ou de tomber, un mort à sa fontaine) — `check_terrain`.
- La Faille est lue de la feuille : un moment ne se nomme que si la feuille le porte (un gank, le jungler ; un combat, trois éliminations ; une poussée, personne ne meurt autour) ; seule la place est illustrative, et cohérente (une ligne tombe dans l'ordre, le nexus par une ligne ouverte) — `check_terrain`. La carte est un dessin à nous, jamais celle du jeu.

**Les images**
- Photos des joueurs et logos des équipes : copiés une fois dans `img/lp/`, hors du dépôt, par l'Action « Publier » qui garde son cache (le serveur de Leaguepedia refuse les autres sites ; on ne contourne pas ça). En local : `node scripts/images.mjs`. La photo d'un joueur est celle de son split, sinon la plus proche.
- Champions : Data Dragon, demandé à Riot, gardé par le travailleur de service.
- La carte d'un joueur s'inspire de l'esprit de l'interface de LoL de son époque, sans en copier ni police, ni logo, ni élément.

**L'interface**
- Mobile d'abord : rien ne déborde à 390 px ; la page ne défile jamais à l'horizontale.
- Un seul retour, un niveau à la fois (js/pile.js) ; rien de sélectionnable.
- Toute commande visible doit fonctionner — `scripts/smoke.mjs`.
- Le split en quatre sections (Bureau, Effectif, Marché, Ligue), la barre du bas ; une décision se règle dans la boîte.
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
- **carte** : la fiche d'un joueur, habillée selon l'époque (le client d'origine, la saison 4, hextech, l'esport).
- **bassin** : les champions qu'un joueur a joués dans le split, avec ses parties et sa fiche sur chacun.
- **remplacement** : la formule qu'une sous-cote prend quand son époque ne mesure pas la stat de tête.
- **repêchage** : les bannissements et les champions d'une série de saison, ou d'une partie d'une série de séries ; le **confort** est ce qu'un joueur perd loin de son plus joué.
- **canal** : une prise du moteur par où passe un effet (ligne, combat, objectifs, tardif, rythme, siège, fin, confort).
- **run** : plusieurs splits de suite sous le **mandat** du proprio ; le **bilan** d'un split, et ceux qu'on **garde**.
- **marché** : les agents libres d'une journée, jusqu'à la **date limite** ; le **banc**, le sixième joueur ; les **relances** de la roulette.
- **boîte** : les messages du proprio, de l'entraîneur, du DG, du dépisteur ; un **événement** se tranche.
- **commanditaire** : il paie les parties qui remplissent son objectif ; **lien d'origine** : des joueurs qui ont joué ensemble pour vrai ; **entraînement** : un champion qui entre au bassin, « entraîné ».
- **stratégie** (le plan de match) : ce que ton cinq priorise ; son **fit**, ce que tes joueurs savent en faire ; l'**identité** d'une vraie équipe, ce qu'elle prenait de plus que son split.
- **plan de jeu** : les trois cartes actives au plus ; **jetons**, **pack**, **coach** et son **palier** : comme dans Cap 82-0. Un **pouvoir** : ce qu'un palier du coach ouvre ; il joue une **phase** (la phase de lignes, le milieu de partie, la fin de partie) quand sa condition tient.
- **médailles** 🏅 : la monnaie du méta, gagnée par les runs ; elles achètent les **déblocages** et **ton club** (son nom, sa couleur) ; leur total à vie fait ton **rang**. Les **exigences** 🔺 : après un premier titre, les crans qu'une run monte au départ ; pas « difficulté » à l'écran.
- **collection** : les joueurs passés chez toi ; une **carte** y a ses **copies** (une par run) et sa **finition** (Base, Argent, Or, Holo) ; un **album** par split.
- **trophée** : décerné au bilan d'un split, par une colonne ; **galon** : ce qu'un de tes joueurs a fait chez toi, gravé à sa carte ; **record**, **panthéon** : le meilleur de tes runs.
- **pack de joueurs** : trois vrais joueurs tirés par leur niveau ; un **pack de cartes** donne des cartes de plan de jeu.
- **le direct** : une partie rejouée dans le temps ; **la Faille** : sa carte ; un **moment** : ce qui s'y passe, nommé — gank, plongée sous la tour, duel, escarmouche, combat d'équipe, bataille (du dragon, de l'âme, du Nashor), poussée de côté, assaut final. **Hier soir** : ta dernière série, au Bureau.

## Tester

`python3 -m http.server 8000` puis `localhost:8000`. `node scripts/tout.mjs` enchaîne les vérifications rapides ; `node scripts/smoke.mjs http://localhost:8000` joue le parcours entier à 390 px (Playwright, installé à part ; `CHROMIUM=<chemin>` pour un Chromium déjà là). L'Action `verifier.yml` fait les deux à chaque PR.
