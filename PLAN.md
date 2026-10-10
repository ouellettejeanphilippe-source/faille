# Plan — l'état court

## Où on en est

Jalon 3 livré. La roulette sort un split et une équipe ; le vestiaire montre le niveau, les badges et les vraies stats ; on signe un joueur par rôle, puis on joue le split contre neuf vrais vestiaires, une journée à la fois, et les séries. Avant chacune de tes séries, le repêchage des champions ; entre deux journées, la boutique (packs, plan de jeu, coach). Pas encore de plafond, ni de partie de rogue sur plusieurs splits.

## Décisions prises

- **Un dépôt à part, pas un fork de Cap 82-0.** On reprend la plomberie (verdict, code mort, coquille, retour) et les principes ; le moteur, les cotes et les données se réécrivent.
- **Le découpage par split**, comme Cap 82-0 par saison : la valeur se juge contre sa ligue et son split.
- **Leaguepedia d'abord** (API Cargo, CC BY-SA 3.0) : alignements, parties, stats par joueur. Lente et limitée en débit, d'où l'Action.
- **On commence par les Mondiaux** (2011 → 2025), puis LCS, LEC, LCK et LPL. Les autres régions vivent dans les Mondiaux.
- **Des sous-cotes, pas une cote**, et chacune a ses remplacements par époque (docs/donnees.md) : on remonte à la saison 1 sans inventer de stats.
- **Le nom : Faille**, sans « League of Legends » ni « LoL » (politique de Riot).
- **Le moteur joue des événements, pas un pointage** (MOTEUR.md) : la durée, les éliminations et l'or émergent ; le tempo vient du split de chaque équipe, les parts de chaque joueur de ses vraies stats, et les sept réglages sont jugés contre les vraies parties rejouées.
- **Ta ligue, comme dans Cap 82-0** : ton cinq contre neuf vrais vestiaires de toutes les époques, tirés par la même roulette ; les sous-cotes, jugées dans leur split, se comparent d'une époque à l'autre.

- **Tout effet passe par les canaux du moteur et se mesure en paires** (MOTEUR.md §6 à §8), comme dans Cap 82-0 : une carte change la forme de la partie plus que sa force, et une rare se voit sur la feuille.
- **Le repêchage est le deck d'une série** : le bassin de chaque joueur est celui de son vrai split ; jouer loin de son plus joué coûte (le confort), et la composition se compte contre celle des vraies équipes, pour qu'un repêchage ordinaire ne change rien.

## Dépendances

Aucune. Une dépendance npm demande une raison écrite ici.
