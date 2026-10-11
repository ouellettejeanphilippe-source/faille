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

js/main.js            le contrôleur : chaque geste passe par faire() (une action du journal), la sauvegarde, les écrans
js/partie.js          la run en journal d'actions : appliquer, rejouer, la sauvegarde
js/gestion.js         les règles du DG : relances, marché et banc, mandats, objectifs, événements, commanditaires, entraînement
js/bureau.js          la boîte de réception, le marché et l'effectif, le bilan d'un split
js/cotes.js           les cotes cachées : sous-cotes et leurs remplacements par époque, valeur, niveau, badges ; le plafond et le coût
js/fiche.js           la carte d'un joueur, habillée selon l'époque de son split ; ses petites images au vestiaire
js/images.js          d'où vient chaque image (img/lp, Data Dragon)
js/data.js            le chargeur (index, shard, champions)
js/sim.js             le moteur : une partie par événements, le split au jour le jour, les séries (MOTEUR.md)
js/split.js           l'écran du split : la journée, le classement, les séries, la feuille d'une série
js/repechage.js       le repêchage des champions : bannissements, bassins, confort, composition (MOTEUR.md §7)
js/tableau-repechage.js l'écran du repêchage
js/rogue.js           les jetons, les packs, les cartes de plan de jeu, les coachs, les liens d'origine (MOTEUR.md §8, §9)
js/boutique.js        l'écran de la boutique
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
scripts/check_*.mjs        les vérifications (graine, coquille, code mort, cotes, plafond, gestion, feuilles, rogue)
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
- La feuille de match se ferme par construction (les éliminations des joueurs font celles de l'équipe et les morts de l'autre…) — `check_feuilles`.

**Le rogue (jalon 3)**
- Tout ce qui change une partie (repêchage, carte, coach) passe par les canaux de `js/sim.js` (`sommerEffets`), et par rien d'autre ; neutres, ils rejouent la partie calibrée — `check_graine`, `check_feuilles`.
- Mesuré en paires, ou pas mesuré : une carte reste dans la borne de sa rareté, une rare se voit sur la feuille — `check_rogue`.
- Les jetons se recomptent des résultats et des achats, jamais gardés ; une carte ne sort qu'une fois ; la couleur d'une carte se lit sur ses canaux.
- Ce qu'un effet fait s'écrit en mots (`dire`), jamais en cote.

**La gestion (jalon 4)**
- Chaque geste du DG est une action de `js/partie.js` ; rejouer le journal redonne la même partie, et c'est la sauvegarde — `check_gestion`.
- Le plafond tient après chaque action, le marché ferme à la date limite, les relances restent dans leur nombre — `check_gestion`.
- Un lien d'origine passe par les canaux et se mesure en paires, comme une carte — `check_rogue` ; un champion entraîné ne se montre jamais en parties.
- La boîte se déduit de l'état, jamais gardée ; un événement joue sur la gestion, pas sur le moteur, tant qu'il n'est pas mesuré en paires.

**Les images**
- Photos des joueurs et logos des équipes : copiés une fois dans `img/lp/`, hors du dépôt, par l'Action « Publier » qui garde son cache (le serveur de Leaguepedia refuse les autres sites ; on ne contourne pas ça). En local : `node scripts/images.mjs`. La photo d'un joueur est celle de son split, sinon la plus proche.
- Champions : Data Dragon, demandé à Riot, gardé par le travailleur de service.
- La carte d'un joueur s'inspire de l'esprit de l'interface de LoL de son époque, sans en copier ni police, ni logo, ni élément.

**L'interface**
- Mobile d'abord : rien ne déborde à 390 px ; la page ne défile jamais à l'horizontale.
- Un seul retour, un niveau à la fois (js/pile.js) ; rien de sélectionnable.
- Toute commande visible doit fonctionner.
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
- **repêchage** : les bannissements et les champions d'une série ; le **confort** est ce qu'un joueur perd loin de son plus joué.
- **canal** : une prise du moteur par où passe un effet (ligne, combat, objectifs, tardif, rythme, siège, fin, confort).
- **run** : plusieurs splits de suite sous le **mandat** du proprio ; le **bilan** d'un split, et ceux qu'on **garde**.
- **marché** : les agents libres d'une journée, jusqu'à la **date limite** ; le **banc**, le sixième joueur ; les **relances** de la roulette.
- **boîte** : les messages du proprio, de l'entraîneur, du DG, du dépisteur ; un **événement** se tranche.
- **commanditaire** : il paie les parties qui remplissent son objectif ; **lien d'origine** : des joueurs qui ont joué ensemble pour vrai ; **entraînement** : un champion qui entre au bassin, « entraîné ».
- **plan de jeu** : les trois cartes actives au plus ; **jetons**, **pack**, **coach** et son **palier** : comme dans Cap 82-0.

## Tester

`python3 -m http.server 8000` puis `localhost:8000`. `node scripts/tout.mjs` enchaîne les vérifications rapides ; l'Action `verifier.yml` le fait à chaque PR.
