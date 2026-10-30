# Plan — l'état court

## Où on en est

Jalon 3 livré. La roulette sort un split et une équipe ; le vestiaire montre le niveau, les badges et les vraies stats ; on signe un joueur par rôle, puis on joue le split contre neuf vrais vestiaires, une journée à la fois, et les séries. Avant chacune de tes séries, le repêchage des champions ; entre deux journées, la boutique (packs, plan de jeu, coach). Ton cinq tient sous un plafond de 15 points (le coût suit le niveau). L'interface suit celle de Cap 82-0 : son tableau indicateur, sa condensée, une action principale par écran. Jalon 4 livré : une run de plusieurs splits sous le mandat du proprio, sauvegardée ; la roulette à relances ; le marché et le banc ; la boîte de réception. Les jeux de gestion de LoL y ont mis leur part : les commanditaires de Teamfight Manager, les liens de LoL Esports Manager, l'entraînement des champions. Jalon 5 : la stratégie est au centre — prioriser les dragons, le Nashor, pousser en solitaire… selon ce que tes joueurs savent faire. Jalon 6 : le jeu complet de Cap 82-0. Un écran titre et plusieurs parties (exportées, importées) ; le méta entre les runs — les médailles, le rang, les déblocages, ton club, la collection et ses finitions, le palmarès ; les packs de joueurs ; le joueur gardé qui vieillit ; les trophées et les galons du bilan ; le split en quatre sections (Bureau, Effectif, Marché, Ligue) ; le direct d'une partie, son commentateur et la Faille dessinée, où se voient le gank, la plongée, le combat d'équipe, la bataille du Nashor, la poussée de côté. Jalon 7, en cours : tout Cap 82-0, mode par mode. 7 A livré : deux modes — le 18-0 (la roulette, le split d'un coup, les séries partie par partie, rien d'autre) et le Rogue, qui part faible (ta vedette, le classeur tiré de ta collection, ceux qui restent au loto, le pack de bouche-trous) —, et l'exhibition. À suivre : les cartes en carton d'une série par année, les photos d'action, les histoires de la semaine, la série clé.

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

- **Le coût suit le niveau, et rien d'autre** : il n'y a pas de salaires publics, et un coût tiré finement de la cote la laisserait lire à l'écran. Cinq paliers, le même qu'affiche le niveau.
- **La peau de Cap 82-0** : mêmes jetons, même condensée (Barlow Condensed, OFL), même coquille ; la carte d'un joueur garde ses habillages d'époque.

- **La partie est un journal d'actions** : chaque geste du DG s'inscrit, et rejouer le journal sous la même graine redonne la même partie. La sauvegarde ne garde rien de compté, comme les jetons ; le hasard de la roulette et du marché se tire hors du moteur et le journal garde ce qui est sorti.
- **Les événements ne touchent pas au moteur** : ils jouent sur la gestion (jetons, un pack, une signature payée), pour ne pas ajouter d'effet non mesuré en paires. Un événement qui changerait une partie passera par les canaux et par `check_rogue`.

- **Les idées des autres jeux de gestion de LoL passent par nos règles** : un commanditaire juge la vraie feuille contre le tempo réel ; un lien passe par les canaux et se mesure en paires ; un champion entraîné se lit par le confort et ne se montre jamais comme de vraies parties.

- **La stratégie suit les joueurs, comme les systèmes de Cap 82-0** : son gain et son exécution suivent le fit (les sous-cotes demandées), son prix se paie toujours. À contre-emploi, elle coûte. Pour qu'elle compte, les objectifs devaient compter : le moteur a été recalibré sur ce qu'ils valent dans les vraies parties, pas sur une envie.

- **Le méta ne compte rien, comme les jetons** : il garde le résumé de chaque partie et tes achats ; médailles, rang, collection et panthéon s'en recomptent, et noter deux fois la même partie ne paie pas deux fois. Il ne touche pas au moteur : un déblocage se pose au départ d'une run par une règle qui existe (des jetons, une relance, un gardé…), et la sauvegarde le garde avec la graine.
- **La Faille du direct est lue de la feuille, pas jouée** (la glace de Cap 82-0) : qui tue qui, quand, avec qui, la ligne d'une élimination de la phase de lignes, les objectifs. Ce qui est illustratif (la place exacte, la ligne d'une tour) vient d'un dé à graine et reste cohérent : une ligne tombe dans l'ordre, le nexus par une ligne ouverte. Un moment ne se nomme que si la feuille le porte (`check_terrain`).
- **Faille est Cap 82-0 au complet, pas un extrait** (JP, 29 oct. : *même chose pour TOUT*) : deux modes, le 18-0 (le repêchage, le split d'un coup, les séries en direct, rien d'autre) et le Rogue (le jour à jour, une run qui part faible et se bâtit par les packs, le classeur, les histoires, la série clé) ; une carte est un carton 5:7 recto verso, dans la série de son année. Le jalon 7 de LIVRAISON.md liste chaque règle jumelle et son script ; ce qui ne se transpose pas (Sur table, les blessures, le gardien) y est dit tel quel.
- **Le Rogue part faible, et personne ne se garde au choix** (Cap 82-0 ; JP : *même pige initiale de joueurs moins bons*) : le cinq du Rogue sort de cases au loto (ta vedette, ton classeur, ceux qui restent) et d'un pack de bouche-trous ; la roulette reste au 18-0. La première run est dure, c'est voulu : le marché, les packs et la collection qui grossit relèvent les suivantes. Ce que le classeur tire, la sauvegarde le garde (`col`), pour rejouer pareil.
- **La collection est une vitrine** : une finition (Base, Argent, Or, Holo) et des galons ne changent rien au jeu. Une carte qui jouerait passerait par les canaux et `check_rogue`.

## Dépendances

Aucune dans le jeu. Une dépendance npm demande une raison écrite ici.

- **Playwright, à la CI seulement** (`verifier.yml`, `npm install --no-save`) : le test de fumée (`scripts/smoke.mjs`) joue le parcours entier dans Chromium. Rien du jeu ne le charge, et le dépôt ne le garde pas.
