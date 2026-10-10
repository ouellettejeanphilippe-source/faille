# Faille — instructions pour l'agent

## Le projet en une phrase

Jeu web statique en français québécois : la roulette sort un split et une équipe pro de League of Legends, tu piges un joueur dans ce vestiaire, tu bâtis ton cinq (haut, jungle, milieu, bas, soutien) sous un plafond, et tu simules le split puis les séries.

Hébergé sur GitHub Pages. Aucun backend, aucune dépendance npm, aucun framework. Le petit frère de Cap 82-0 (`ouellettejeanphilippe-source/hockey`) : quand une question de principe se pose, la réponse de Cap 82-0 (son `CLAUDE.md`, son `docs/decisions.md`) est le point de départ.

## Avant de coder

Lis `LIVRAISON.md` — le plan de travail : les jalons, chaque item avec son fichier et le script qui le prouve. Coche les cases et ajoute une ligne au journal.

`PLAN.md` garde l'état court et les décisions prises. `docs/donnees.md` dit d'où viennent les données et sous quelles conditions.

## Structure

```
index.html            la page unique
style.css             tous les styles, mobile d'abord (390 px)
sw.js                 travailleur de service : la coquille hors ligne (FICHIERS)
data/index.json       la liste des splits bâtis
data/splits/<id>.json un shard par split : équipes, fiches, joueurs et leurs vraies stats

js/main.js            le contrôleur : la roulette, le vestiaire, l'alignement
js/cotes.js           les cotes cachées : sous-cotes et leurs remplacements par époque, valeur, niveau, badges
js/data.js            le chargeur (index, shard)
js/hasard.js          tout le hasard du jeu, à graine
js/pile.js            le retour, un niveau à la fois (repris de Cap 82-0)
js/util.js            les petits outils partagés

scripts/build_splits.mjs   Leaguepedia + Data Dragon → data/ (lent : l'API limite le débit)
scripts/catalogue.mjs      la table Tournaments → scripts/splits.json (les splits des quatre ligues)
scripts/splits.json        les splits à bâtir : les Mondiaux, puis le catalogue
scripts/lib/leaguepedia.mjs l'API Cargo, sa pause et ses attentes
scripts/verdict.mjs        le juge partagé : chaque script pose son code de sortie
scripts/tout.mjs           enchaîne les vérifications rapides
scripts/check_*.mjs        les vérifications (graine, coquille, code mort, cotes)
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
- Chaque sous-cote se juge contre le même rôle dans le même split ; la force d'équipe suit la vraie fiche — `check_cotes`.
- Une stat qu'une époque ne mesure pas n'est jamais inventée : on la lit par une formule de remplacement écrite dans `AXES`, ou l'axe reste neutre et ses badges ne se décernent pas — `check_cotes`.

**Le moteur (jalon 2)**
- Tout le hasard passe par `hasard()` (js/hasard.js) ; la même graine rejoue le même split — `check_graine`.
- Aucun chiffre de calibration inventé : chaque repère vient des vraies parties (durée, éliminations, or à 15 min, côté bleu).

**L'interface**
- Mobile d'abord : rien ne déborde à 390 px ; la page ne défile jamais à l'horizontale.
- Un seul retour, un niveau à la fois (js/pile.js) ; rien de sélectionnable.
- Toute commande visible doit fonctionner.
- Le noir est le décor.

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
- **niveau** : ce que le joueur valait dans son split, à son rôle — Remplaçant, Régulier, Pilier, ★ Étoile, ★ Phénomène. Pas « Soutien » : c'est un rôle.
- **sous-cote** : un axe caché de son jeu (ligne, pression, dégâts, implication, survie, vision, objectifs, bassin) ; jamais à l'écran.
- **badge** : ce qu'il fait, à un palier — Bronze, Argent, Or, Platine (« 🗡️ Bourreau de ligne Or ») ; deux au plus.
- **remplacement** : la formule qu'une sous-cote prend quand son époque ne mesure pas la stat de tête.

## Tester

`python3 -m http.server 8000` puis `localhost:8000`. `node scripts/tout.mjs` enchaîne les vérifications rapides ; l'Action `verifier.yml` le fait à chaque PR.
