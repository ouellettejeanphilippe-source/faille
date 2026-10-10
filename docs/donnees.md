# Les données — d'où elles viennent, à quelles conditions

## Leaguepedia (la source du jalon 0)

- **Quoi** : l'API Cargo de lol.fandom.com. Tables `ScoreboardGames` (une ligne par partie) et `ScoreboardPlayers` (une ligne par joueur par partie), filtrées par `OverviewPage` (ex. `LCK/2019 Season/Spring Season`).
- **Licence** : CC BY-SA 3.0. L'attribution est dans chaque shard (`source`) et au pied de la page. Les shards dérivés sont donc sous la même licence.
- **Débit** : l'API répond `ratelimited` vite. `build_splits.mjs` fait une requête à la fois, une pause de 3 s, et attend 30 s, 60 s, 120 s… quand on le freine. Depuis un conteneur partagé, la limite peut durer : l'Action « Bâtir les splits » passe par les machines de GitHub.
- **Images** : les licences varient d'une image à l'autre sur Leaguepedia. Aucune photo de joueur pour l'instant.

## Oracle's Elixir (à évaluer pour le moteur)

Des CSV de parties pro (2014 →) avec l'or, l'XP et le CS à 10 et 15 min, les objectifs par équipe. Idéal pour calibrer le moteur. Lire ses conditions avant de redistribuer quoi que ce soit ; au besoin, ne garder dans le dépôt que les repères agrégés (moyennes, écarts).

## Riot Games

- **Politique « fan content »** (« Legal Jibber Jabber ») : projet gratuit, rien qui laisse croire qu'il est officiel, la mention légale au pied de la page. À relire avant toute monétisation.
- **Data Dragon** : les images des champions, permises sous cette même politique. Pas encore utilisé.
- **L'API de Riot** sert aux parties classées, pas à l'historique pro : pas notre source.

## Le format d'un shard

```
{ id, nom, ligue, annee, page, source, parties,
  equipes: [{ nom, v, d,
    joueurs: [{ n, r, pj, v, k, m, a, or_min, cs_min, deg_min, champs }] }] }
```

`r` : haut, jungle, milieu, bas, soutien. `v`/`d` : parties gagnées et perdues (pas les séries). `champs` : les trois champions les plus joués.
