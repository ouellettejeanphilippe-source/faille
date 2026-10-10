# Plan — l'état court

## Où on en est

Jalon 2 livré. La roulette sort un split et une équipe ; le vestiaire montre le niveau, les badges et les vraies stats ; on signe un joueur par rôle, puis on joue le split contre neuf vrais vestiaires, une journée à la fois, et les séries. Pas encore de plafond.

## Décisions prises

- **Un dépôt à part, pas un fork de Cap 82-0.** On reprend la plomberie (verdict, code mort, coquille, retour) et les principes ; le moteur, les cotes et les données se réécrivent.
- **Le découpage par split**, comme Cap 82-0 par saison : la valeur se juge contre sa ligue et son split.
- **Leaguepedia d'abord** (API Cargo, CC BY-SA 3.0) : alignements, parties, stats par joueur. Lente et limitée en débit, d'où l'Action.
- **On commence par les Mondiaux** (2011 → 2025), puis LCS, LEC, LCK et LPL. Les autres régions vivent dans les Mondiaux.
- **Des sous-cotes, pas une cote**, et chacune a ses remplacements par époque (docs/donnees.md) : on remonte à la saison 1 sans inventer de stats.
- **Le nom : Faille**, sans « League of Legends » ni « LoL » (politique de Riot).
- **Le moteur joue des événements, pas un pointage** (MOTEUR.md) : la durée, les éliminations et l'or émergent ; le tempo vient du split de chaque équipe, les parts de chaque joueur de ses vraies stats, et les sept réglages sont jugés contre les vraies parties rejouées.
- **Ta ligue, comme dans Cap 82-0** : ton cinq contre neuf vrais vestiaires de toutes les époques, tirés par la même roulette ; les sous-cotes, jugées dans leur split, se comparent d'une époque à l'autre.

## Dépendances

Aucune. Une dépendance npm demande une raison écrite ici.
