# Les données — d'où elles viennent, ce que chaque époque mesure

## Ce qu'on bâtit

- **Les Mondiaux, de 2011 (saison 1) à 2025.** C'est là que vivent les équipes des autres régions (PCS, VCS, CBLOL, LJL…).
- **Les quatre grandes ligues** : LCS (avec NA LCS et LTA Nord), LEC (avec EU LCS), LCK (avec OGN Champions), LPL. Leurs splits ne s'écrivent pas à la main : `scripts/catalogue.mjs` les lit dans la table `Tournaments` de Leaguepedia, saison régulière et séries ensemble, sans qualifications, promotions ni relégations.

Un split = un shard (`data/splits/<id>.json`). Tout se juge **dans le split** : un CS/min de 2011 contre les CS/min de 2011.

## Les sources

### Leaguepedia (toutes les années)

- L'API Cargo de lol.fandom.com. `ScoreboardGames` (une ligne par partie : vainqueur, durée, tours, dragons, Nashor, hérauts, larves, inhibiteurs) et `ScoreboardPlayers` (une ligne par joueur par partie : K/M/A, or, CS, dégâts, score de vision, objets, sorts d'invocateur).
- Le script demande d'abord à l'API quels champs la table a (`cargofields`) et ne demande que ceux-là.
- **Licence** : CC BY-SA 3.0, attribution dans chaque shard (`source`) et au pied de la page. Les shards dérivés sont sous la même licence.
- **Par la page d'export, pas par l'API.** Mesuré le 10 octobre 2026 : l'API (`api.php?action=cargoquery`) refuse l'anonyme après la première requête, depuis un conteneur comme depuis GitHub. `Special:CargoExport` rend les mêmes tables sans compte et sans cette limite, en JSON typé (une valeur absente en `null`, les objets en tableau, le texte échappé pour le HTML, qu'on décode). Les quinze Mondiaux se bâtissent en quelques minutes.

### Data Dragon (Riot)

La **classe** de chaque champion (Tank, Combattant, Mage, Assassin, Tireur, Soutien), lue sur la dernière version. Un champion à deux classes compte pour moitié dans chacune. Les champions que Data Dragon ne reconnaît pas sont listés à la fin du build.

`data/champions.json` garde, pour chaque champion joué dans les shards, son id de Data Dragon (les images), ses classes (le repêchage, js/repechage.js) et le nom français de son ultime (Data Dragon fr_FR, le commentateur du direct) ; et les objets complétés que les joueurs des shards achetaient, par leur nom anglais : leur id, leur nom français, leur prix et la version de Data Dragon du Mondial de leur année (le sommaire, ses icônes). `node scripts/build_splits.mjs --champions` le refait sans rebâtir de split.

### Les images

- **Photos des joueurs** : la table `PlayerImages` de Leaguepedia (une photo par joueur par tournoi). Le build garde celle du tournoi même, sinon la même année (l'été d'abord), sinon la plus proche ; les photos d'All-Star passent après. Mesuré sur les Mondiaux : 1 420 photos pour 1 498 joueurs-splits.
- **Les portraits sont recadrés à la copie** (`scripts/recadrer.py`, repris du recadrage de Cap 82-0) : les photos de Leaguepedia sont pour la plupart les détourées des séances officielles des ligues et de Riot, la tête n'importe où dans un grand vide transparent, à toutes les tailles ; la tête est trouvée par la transparence et posée toujours à la même place d'un portrait 5:7 (320 × 448, WebP, le fond transparent gardé) ; une photo opaque garde son cadre, serré par le haut. Les portraits officiels de lolesports (l'API publique du site de Riot) seraient la source la plus uniforme pour les joueurs récents ; ils ne couvrent pas les années d'avant 2019, et la demande n'a pas pu être essayée d'ici (voir LIVRAISON.md, jalon 7 C).
- **Logos** : la table `Teams` (248 sur 281 équipes des Mondiaux).
- **Le serveur d'images** de Leaguepedia rend 404 à une page d'un autre site (le référent est vérifié). On ne contourne pas ça : `scripts/images.mjs` copie chaque image une fois, à la taille de la carte, dans `img/lp/`. Ce dossier n'est pas dans le dépôt (18 Mo pour les seuls Mondiaux) : l'Action « Publier » le remplit au déploiement et le garde en cache.
- **Les licences** : les photos de Leaguepedia ont chacune la leur, souvent des photos de Riot Games ou des ligues. Elles servent ici à un jeu de fan gratuit, avec l'attribution au pied de la page ; une photo qu'un ayant droit demande de retirer se retire.
- **Champions** : Data Dragon (l'icône carrée, l'illustration au fond de la carte), permis par la politique « fan content » de Riot.

### Oracle's Elixir (2014 →, pas encore branché)

Les écarts d'or, d'XP et de CS à 10 et 15 min, les plaques, le premier sang, la première tour, les balises, les monstres de la jungle adverse. Le site répond 403 aux robots : il faudra déposer ses CSV dans `data/sources/` ou les télécharger par l'Action, et lire ses conditions avant d'en commiter quoi que ce soit.

## Ce que chaque époque mesure (mesuré sur les Mondiaux, 10 octobre 2026)

| Mondiaux | Mesuré | Absent, donc remplacé ou neutre |
|---|---|---|
| 2011-2013 | K/M/A, or, CS, champions, objets | Tours et dragons de l'équipe (pression et objectifs neutres), dégâts, vision |
| 2014-2017 | + tours, dragons, Nashor, hérauts | Dégâts, vision |
| 2018-2019 | + score de vision | Dégâts |
| 2020 → | Tout ce que Leaguepedia a : toutes les formules de tête | — |

Les rôles de 2011 sont parfois mêlés chez Leaguepedia (un joueur au milieu et en haut).

`check_cotes` écrit, split par split, quelles formules son époque emploie : c'est la vraie version de ce tableau.

## Les remplacements (js/cotes.js)

Chaque sous-cote a une liste de formules, de la meilleure à la plus pauvre. Un split prend la première dont toutes les stats y sont mesurées (pour au moins 60 % des joueurs).

| Sous-cote | Formule de tête | Remplacements |
|---|---|---|
| Ligne | CS/min et or/min | CS/min seul, or/min seul |
| Pression | tours de l'équipe et CS/min | tours de l'équipe ; les plaques prendront la tête avec Oracle's Elixir |
| Dégâts | part des dégâts et dégâts/min | part des éliminations et de l'or ; part des éliminations |
| Implication | participation aux éliminations | — |
| Survie | morts par partie | — |
| Vision | score de vision/min | aucun : la sous-cote reste neutre, et le badge 👁️ ne se décerne pas |
| Objectifs | dragons, hérauts, Nashor (×2), larves (×½) de l'équipe | tours de l'équipe |
| Bassin | nombre effectif de champions | — |

Les **classes des champions** joués s'y ajoutent pour les badges (Première ligne, Assassin, Mage de contrôle, Engageur, Enchanteur).

Un joueur de peu de parties tire vers la moyenne (z × pj / (pj + 3)), une partie hors norme ne compte pas pour plus de trois écarts types, et moins de trois parties ne font pas une Étoile.

## Le format d'un shard

```
{ id, nom, ligue, annee, pages, source, ddragon, parties,
  matchs: [[équipe bleue, équipe rouge, durée, côté gagnant (1 bleu, 2 rouge),
            éliminations ×2, or ×2, tours ×2, dragons ×2, Nashor ×2, hérauts ×2, inhibiteurs ×2]],
  equipes: [{ nom, v, d,
    obj: { tours, dragons, barons, herauts, larves, inhib : [somme, parties mesurées] },
    joueurs: [{ n, r, pj, v, min, k, m, a, eqK, eqOr, eqDeg,
      or, cs, deg, vision : [somme, parties mesurées, minutes de ces parties],
      champs: [[champion, pj, v]], sorts: ['FT', …] (la paire de sorts la plus jouée sur chaque champion, dans l'ordre de champs),
      classes: { tank: 0,4, … }, objets: [les 8 plus achetés] }] }] }
```

`matchs` : une ligne par partie, chaque nombre du côté bleu puis du rouge, null quand Leaguepedia ne le mesure pas (de 2011 à 2013 : ni éliminations d'équipe, ni or, ni tours). Le côté bleu est `Team1` chez Leaguepedia. Le moteur s'y mesure (MOTEUR.md).

`r` : haut, jungle, milieu, bas, soutien. `eqK`, `eqOr`, `eqDeg` : les totaux de son équipe dans ses parties (la part d'un joueur s'y mesure). `v`/`d` : parties gagnées et perdues.
