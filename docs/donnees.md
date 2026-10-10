# Les données — d'où elles viennent, ce que chaque époque mesure

## Ce qu'on bâtit

- **Les Mondiaux, de 2011 (saison 1) à 2025.** C'est là que vivent les équipes des autres régions (PCS, VCS, CBLOL, LJL…).
- **Les quatre grandes ligues** : LCS (avec NA LCS et LTA Nord), LEC (avec EU LCS), LCK (avec OGN Champions), LPL. Leurs splits ne s'écrivent pas à la main : `scripts/catalogue.mjs` les lit dans la table `Tournaments` de Leaguepedia, saison régulière et séries ensemble, sans qualifications, promotions ni relégations.

Un split = un shard (`data/splits/<id>.json`). Tout se juge **dans le split** : un CS/min de 2011 contre les CS/min de 2011.

## Les sources

### Leaguepedia (toutes les années)

- L'API Cargo de lol.fandom.com. `ScoreboardGames` (une ligne par partie : vainqueur, durée, tours, dragons, Nashor, hérauts, larves, inhibiteurs) et `ScoreboardPlayers` (une ligne par joueur par partie : K/M/A, or, CS, dégâts, score de vision, objets).
- Le script demande d'abord à l'API quels champs la table a (`cargofields`) et ne demande que ceux-là.
- **Licence** : CC BY-SA 3.0, attribution dans chaque shard (`source`) et au pied de la page. Les shards dérivés sont sous la même licence.
- **Débit** : anonyme, on ne passe pas. Mesuré le 10 octobre 2026, depuis un conteneur comme depuis les machines de GitHub : la première requête passe, la suivante est refusée pendant plus d'une demi-heure. Il faut un **mot de passe de robot** :
  1. un compte Fandom, connecté sur lol.fandom.com ;
  2. `Special:BotPasswords` : un nom de robot (ex. « faille »), avec les droits de base ; la page donne un identifiant « Compte@faille » et un mot de passe ;
  3. dans le dépôt GitHub, Settings → Secrets and variables → Actions : `LEAGUEPEDIA_USER` (l'identifiant) et `LEAGUEPEDIA_PASS` (le mot de passe).

  En local : `LEAGUEPEDIA_USER=… LEAGUEPEDIA_PASS=… node scripts/build_splits.mjs mondial`.

### Data Dragon (Riot)

La **classe** de chaque champion (Tank, Combattant, Mage, Assassin, Tireur, Soutien), lue sur la dernière version. Un champion à deux classes compte pour moitié dans chacune. Les champions que Data Dragon ne reconnaît pas sont listés à la fin du build.

### Oracle's Elixir (2014 →, pas encore branché)

Les écarts d'or, d'XP et de CS à 10 et 15 min, les plaques, le premier sang, la première tour, les balises, les monstres de la jungle adverse. Le site répond 403 aux robots : il faudra déposer ses CSV dans `data/sources/` ou les télécharger par l'Action, et lire ses conditions avant d'en commiter quoi que ce soit.

## Ce que chaque époque mesure (à confirmer au premier build)

| Époque | Mesuré | Absent |
|---|---|---|
| 2011-2013 | K/M/A, champions, or et CS (souvent), tours, dragons, Nashor | Dégâts, vision, hérauts, plaques |
| 2014-2015 | + dégâts (selon les parties) | Vision, hérauts, plaques |
| 2016-2018 | + score de vision, hérauts, dragons par élément | Plaques |
| 2019 → | + plaques (Oracle's Elixir seulement) | — |
| 2024 → | + larves du néant | — |

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
  equipes: [{ nom, v, d,
    obj: { tours, dragons, barons, herauts, larves, inhib : [somme, parties mesurées] },
    joueurs: [{ n, r, pj, v, min, k, m, a, eqK, eqOr, eqDeg,
      or, cs, deg, vision : [somme, parties mesurées, minutes de ces parties],
      champs: [[champion, pj, v]], classes: { tank: 0,4, … }, objets: [les 8 plus achetés] }] }] }
```

`r` : haut, jungle, milieu, bas, soutien. `eqK`, `eqOr`, `eqDeg` : les totaux de son équipe dans ses parties (la part d'un joueur s'y mesure). `v`/`d` : parties gagnées et perdues.
