# Livraison — le plan de travail

Chaque item : son fichier, ce qu'il apporte, le script qui le prouve. Coche au fur et à mesure.

## Jalon 0 — la coquille

- [x] `scripts/build_splits.mjs` : Leaguepedia → un shard par split, avec la source dans chaque shard.
- [x] `js/main.js` : roulette (split + équipe), vestiaire en vraies stats, un joueur par rôle.
- [x] `js/hasard.js` : le hasard à graine — `check_graine`.
- [x] `sw.js` : la coquille hors ligne — `check_coquille`.
- [x] Zéro code mort — `check_mort`.
- [x] `scripts/splits.json` : les Mondiaux de 2011 à 2025 ; `scripts/catalogue.mjs` pour les splits de LCS, LEC, LCK et LPL.
- [x] Leaguepedia par `Special:CargoExport` (l'API refuse l'anonyme).
- [x] Les quinze Mondiaux bâtis ; ce que chaque époque mesure est dans docs/donnees.md.
- [ ] Le catalogue des quatre ligues, relu, puis leurs splits par tranches d'années.

## Jalon 1 — les cotes

- [x] `js/cotes.js` : huit sous-cotes, chacune avec ses formules de remplacement par époque ; valeur par rôle ; niveau ; badges lus sur les sous-cotes et les classes des champions.
- [x] Le niveau et les badges dans le vestiaire, jamais la cote.
- [x] `check_cotes` : les remplacements sur des splits d'essai de deux époques.
- [x] `check_cotes` : la borne force / fiche posée sur la première mesure (r = 0,85 sur 279 équipes des Mondiaux ; borne 0,75 à 0,95).
- [x] La sous-cote Économie (participation pour la part de l'or) et le badge 🧩 Chef d'orchestre : Faker 2024 passe de Remplaçant à Régulier.
- [ ] Calibrer `POIDS` ; lire les parties à élimination directe à part (Faker 2024 : Régulier sur les chiffres). Avant : Faker 2024 sortait Remplaçant (ses champions utilitaires rendent peu de dégâts). Une part de la corrélation est circulaire (l'or suit la victoire).
- [ ] Oracle's Elixir (2014 →) : les écarts à 15 min prennent la tête de Ligne, les plaques celle de Pression, la jungle adverse un badge 🐺 Envahisseur.
- [ ] Les objets (déjà dans les shards) : leurs étiquettes de Data Dragon pour lire un build (létalité, tank, enchanteur).
- [x] Le plafond : le coût suit le niveau (Remplaçant 1, Régulier 2, Pilier 3, ★ Étoile 5, ★ Phénomène 7), le cinq tient sous 15 ; un joueur ne se signe que si le reste paie les cases vides — `check_plafond` (2 000 repêchages au hasard, tous complets).
- [ ] Le cache IndexedDB des shards, avec une version des cotes dans sa clé (`COTES_VERSION` à créer avec lui).

## Jalon 1 bis — les images et la carte

- [x] Les photos des joueurs (celle de leur split) et les logos des équipes, copiés dans `img/lp/` hors du dépôt, au déploiement — `scripts/images.mjs`, `pages.yml`.
- [x] Les icônes et illustrations des champions (Data Dragon) ; le bassin de champions sur la carte.
- [x] `js/fiche.js` : la carte d'un joueur, quatre habillages d'époque.
- [ ] lolesports : les visages récents des joueurs que Leaguepedia n'a pas, et la ligne du temps des parties (2023 →).

## Jalon 1 ter — l'interface de Cap 82-0

- [x] `style.css` réécrite sur le système de Cap 82-0 : sept tailles, trois rayons, les couleurs en jetons, Barlow Condensed (`fonts/`, OFL 1.1) pour les titres, les chiffres et les boutons ; la lumière de la Faille sur le noir.
- [x] Le tableau indicateur : le retour (un seul, en haut), le plafond restant et sa jauge pendant qu'on bâtit ; la fiche, le rang et les jetons pendant le split.
- [x] Une action principale par écran, collée en bas ; le vestiaire en bandeau d'équipe et en rangées, « Signer » sur chaque rangée ; le cinq en bandes.
- [ ] Une vérification de la feuille de style à la `check_css` de Cap 82-0 (tailles, rayons, couleurs hors des jetons).
- [ ] Les couleurs de chaque équipe (le bandeau du vestiaire, la teinte du décor), comme les vraies couleurs de club de Cap 82-0.

## Jalon 2 — le moteur

- [x] `scripts/build_splits.mjs` : une ligne par partie dans chaque shard (`matchs`) — les repères du moteur s'y mesurent.
- [x] `MOTEUR.md` : la spécification, mesurée sur les 1 355 parties des Mondiaux (durée, éliminations, écart d'or final, dragons, Nashor, tours, côté bleu).
- [ ] L'écart d'or à 15 min et la ligne du temps (premier sang, première tour) : Leaguepedia ne les a pas — Oracle's Elixir ou lolesports.
- [x] `js/sim.js` : une partie par événements, des tours de 30 s, de 15 à 80 min (phase de lignes, escarmouches, objectifs, combat final), tout son hasard par `hasard()`.
- [x] `check_feuilles` : les égalités de la feuille, et chaque vraie partie rejouée contre ce qui s'est passé (13 repères dans l'intervalle de la mesure).
- [x] Le split au jour le jour (BO1, deux rondes), puis les séries (BO5, six équipes) — `check_graine` étendu au split.
- [x] `js/split.js` : la journée, le classement, les séries, la feuille d'une série.
- [ ] Les parties trop courtes : le combat final ne connaît pas les tours encore debout (1 % sous 18,5 min contre 22,1 au réel).

## Jalon 3 — le Rogue

- [x] `js/sim.js` : les canaux (ligne, combat, objectifs, tardif, rythme, siège, fin, confort), sommés en un seul endroit et bornés ; neutres, ils rejouent la partie calibrée au tirage près — MOTEUR.md §6.
- [x] `data/champions.json` : la classe de chaque champion (Data Dragon), par `build_splits.mjs --champions`.
- [x] `js/repechage.js` : le repêchage des champions avant chacune de tes séries — trois bannissements de chaque côté, ton champion pour chacun de tes cinq dans son vrai bassin ; le confort et la composition (contre celle des vraies équipes) par les canaux — MOTEUR.md §7.
- [x] `js/tableau-repechage.js` : l'écran du repêchage ; le repêchage sur la feuille d'une série.
- [x] `js/rogue.js`, `js/boutique.js` : les jetons recomptés des résultats, trois packs, quinze cartes de plan de jeu, quatre coachs et leurs paliers de confiance — MOTEUR.md §8.
- [x] `check_rogue` : chaque carte, chaque coach au palier III, chaque classe et le repêchage mesurés en paires (12 ligues, 120 paires) ; les bornes par rareté, la visibilité des rares ; les packs rejouent, les jetons se recomptent.
- [x] Une partie de rogue sur plusieurs splits : les mandats et la sauvegarde (jalon 4).
- [x] Les médailles et les déblocages entre deux runs (Cap 82-0 : écussons, vestiaire des déblocages) — jalon 6.
- [ ] Ce que l'écran annonce, en chiffres de la mesure (« ≈ +2 éliminations par partie », `check_chiffres` de Cap 82-0) ; pour l'instant, la direction de chaque canal, en mots.
- [ ] Le pivot du tardif, mesuré sur la ligne du temps des parties (Oracle's Elixir) : ses deux cartes coûtent encore un peu.

## Jalon 4 — la gestion (Cap 82-0)

- [x] `js/partie.js` : la run tenue en journal d'actions ; rejouer le journal redonne la même partie — c'est la sauvegarde (`localStorage` : la graine et le journal) — `check_gestion`.
- [x] La run sur plusieurs splits : le mandat du proprio (les séries, la demie, la finale, le titre), le bilan, jusqu'à deux joueurs gardés sous le plafond ; les jetons (recomptés des splits finis), les cartes et le coach suivent ; un titre gagne la run.
- [x] La roulette à relances : Autre split, Autre équipe, Passer, deux de chaque par repêchage — `check_gestion`.
- [x] Le marché en cours de split, jusqu'à la date limite (mi-split) : trois agents libres par journée (Pilier au plus, tirés du dé du split), « qui sort ? » (titulaire ou banc), 8 🪙 la signature ; le banc, un sixième joueur sous le plafond, qu'on fait jouer ou qu'on relâche.
- [x] La boîte de réception : le proprio (le mandat, les objectifs de six journées payés 10 🪙, l'élan à quatre victoires de suite), l'entraîneur (trois défaites de suite : un événement à trancher, qui bloque la journée), le DG (le marché), le dépisteur (les plus joués de ton prochain adversaire).
- [x] Les commanditaires (repris de Teamfight Manager) : un sur trois, choisi avant la première journée ; chacun paie les parties qui remplissent son objectif, lu sur la vraie feuille contre le tempo réel de tes splits — `check_gestion`.
- [x] Les liens d'origine (repris de LoL Esports Manager) : duos et vestiaires qui ont joué ensemble pour vrai, par les canaux, mesurés en paires — `check_rogue`, MOTEUR.md §9.
- [x] L'entraînement des champions (repris de Teamfight Manager) : un joueur travaille un champion que les autres jouaient à son rôle dans son split ; quatre journées plus tard, il entre au bassin, « entraîné » — `check_gestion`.
- [x] Le joueur qui vieillit : un gardé devient sa version du split réel suivant où il a joué — jalon 6, `check_gestion`.
- [ ] Les objectifs du proprio avec leurs chances (« Probable · Jouable · Coriace », Cap 82-0) et d'autres événements (dilemmes en cours de split).
- [ ] Les échanges avec les équipes de la ligue (un joueur contre un joueur), en plus des agents libres.
- [ ] Le banc qui joue une série au lieu d'une saison : choisir ton cinq au repêchage des champions selon les bassins.

## Jalon 5 — la stratégie au centre

- [x] `js/sim.js` : les objectifs comptent — un dragon et l'âme renforcent le camp, le Nashor aussi trois minutes, le héraut fait tomber une tour ; nouveaux canaux `dragons`, `heraut`, `nashor`, `split`. Calibré sur trois nouveaux repères des vraies parties (le camp qui prend plus de dragons, de Nashor, de hérauts gagne 83 %, 92,5 %, 66 %) — `check_feuilles`, `scripts/calibrer.mjs`, MOTEUR.md §4.
- [x] `js/strategie.js` : sept stratégies (dragons, Nashor, héraut et tours, pousser en solitaire, combats à cinq, agression précoce, tardif) ; chacune demande des joueurs, son gain et son exécution suivent le fit, son prix se paie toujours — MOTEUR.md §10.
- [x] `check_rogue` : chaque stratégie en paires, avec les joueurs de chaque équipe — le tiers le mieux ajusté y gagne (+0,5 à +1,1 victoire par saison), le moins bien ajusté y perd ; chacune se voit sur sa signature.
- [x] L'écran : le plan de match en tête du split, l'écran de la stratégie (le fit en mots, ✓ ≈ ✗ par demande, ce qu'elle gagne et coûte) ; le dépisteur dit l'identité réelle de l'adversaire.
- [ ] Une stratégie par série au repêchage des champions, et ce que la composition des champions lui apporte (une composition de siège pour pousser en solitaire…).
- [ ] Contrer l'identité de l'adversaire : contester son objectif favori.
- [ ] La maîtrise d'une stratégie qui monte avec les parties jouées (Cap 82-0).

## Jalon 6 — le jeu complet (Cap 82-0)

JP, 29 oct. : *regarde hockey et utilise-le pour compléter le jeu*, puis, en cours de route : *pendant la simulation, montrer ce qui se passe sur la Faille, genre plongée, bataille du Nashor, combat d'équipe, poussée de côté*.

- [x] `js/menu.js`, `js/sauvegardes.js` : l'écran titre (Continuer, Nouvelle run), le menu en pleine partie, plusieurs parties sauvegardées, chacune exportée en fichier et importée ; la partie unique d'avant entre une fois dans l'index — smoke.
- [x] `js/meta.js` : le méta entre les runs, rien de compté — chaque partie résumée (ses splits, leurs trophées, galons et records, ses cartes) ; les médailles 🏅 (par split joué, mandat rempli, ronde de séries, titre, run gagnée), le rang à vie, huit déblocages posés au départ d'une run par les règles qui existent (jetons, coach, pack offert, relance, agent libre, gardé, mandat pardonné), ton club (nom, couleur) — `check_meta`.
- [x] `js/partie.js` : la sauvegarde v2 garde les déblocages et le club de son départ ; la v1 se relit — `check_gestion` (une run sur deux avec tous les déblocages).
- [x] `js/palmares.js` : les stats de chaque joueur dans ta ligue, les meneurs, cinq trophées par split (chacun par une colonne), six galons (seuils mesurés sur le moteur : chacun dans 5 à 80 % des splits), les records de ta run ; gravés au bilan — `check_meta`.
- [x] La collection (`js/vitrine.js`) : chaque joueur passé chez toi (signé, pigé au marché, sorti d'un pack, vieilli), une copie par run ; ses finitions (Base, Argent, Or, Holo) et ses galons gravés ; l'album d'un split, équipe par équipe — `check_meta`.
- [x] Le palmarès : le panthéon (le meilleur de toutes tes runs), les trophées de tes joueurs, tes runs.
- [x] Les packs de joueurs (`js/gestion.js`) : trois vrais joueurs tirés par leur niveau (recrues, pros, légendes), un seul signé, sans frais, avant la journée suivante, jusqu'à la date limite ; les trois à la collection — `check_gestion` (les niveaux sortent selon leurs chances).
- [x] Le joueur qui vieillit : un gardé devient sa version du plus proche split réel plus récent, le plafond tient avec elle — `check_gestion`.
- [x] Le split en quatre sections, comme Cap 82-0 : le Bureau (la boîte où se règle une décision, hier soir, le dépisteur, le proprio, le commanditaire), l'Effectif (ton plan, tes joueurs et leurs stats chez toi, les liens, l'entraînement), le Marché (agents libres, packs de joueurs, plan de jeu), la Ligue (classement, calendrier, meneurs, séries) ; la barre du bas — smoke.
- [x] Le direct (`js/direct.js`) : une partie rejouée dans le temps, son pointage, la courbe de l'or (la feuille la garde, sans dé), le fil.
- [x] Le commentateur (`js/commentaire.js`) : des phrases montées pièce par pièce, tirées en paquet, la même graine les redit — `check_commentaire`.
- [x] La Faille au direct (`js/terrain.js`) : la carte dessinée (trois lignes, la rivière, les fosses, les 22 tours), les éliminations où elles arrivent (le moteur garde la ligne d'une élimination de la phase de lignes), et chaque moment nommé et lu dans la feuille — gank, plongée sous la tour, duel, escarmouche, combat d'équipe, bataille du dragon, de l'âme et du Nashor, le Nashor en douce, le héraut qui charge, la poussée de côté, l'assaut final — `check_terrain`.
- [x] La page des règles (`js/regles.js`), chaque chiffre lu de sa constante ; les sons, synthétisés (`js/sons.js`), qui se coupent au menu.
- [x] `scripts/smoke.mjs` : le parcours entier à 390 px, du titre à la reprise d'une partie rechargée, zéro erreur console ; dans l'Action `verifier.yml`.
- [x] Les exigences 🔺 après un premier titre (Cap 82-0, `js/meta.js`) : six crans, chacun ajouté aux autres par une règle qui existe (le mandat, les jetons de départ, le plafond porté par l'effectif, les relances, les gardés, le prix des packs) ; chaque cran paie 25 % de médailles de plus, et gagner au plus haut ouvre le suivant — `check_meta`, `check_gestion`.
- [x] Le repêchage des champions à chaque partie d'une série de séries, comme en vrai : ta série se joue partie par partie (`jouerRonde(L, toi)`), un repêchage et ta stratégie avant chacune, le perdant au bleu ; chaque partie garde son dé — `check_graine` (partie par partie comme d'un bloc), `check_gestion`. Une sauvegarde d'avant (version 2) garde l'ancienne règle et se rejoue pareil.
- [x] Les pouvoirs du coach (Cap 82-0, V21), phase par phase : chaque palier de confiance ouvre un pouvoir qui lit la partie au début d'une phase (lignes, milieu, fin) et la frappe le temps de la phase ; le moteur reste neutre sans pouvoir ; douze pouvoirs mesurés en paires — `check_rogue`, MOTEUR.md § 11.
- [x] La Faille détaillée (JP : *avec les champions et nom joueur ?*, *plus détaillé la faille avec jungle et cie*) : les bois et leurs murs, six camps par côté, les crabes, les inhibiteurs ; les dix joueurs, l'icône de leur champion et leur nom, qui bougent selon la phase et les combats (un mort à sa fontaine) ; le tableau des dix joueurs et leur K/M/A en direct — `check_terrain`, smoke.
- [x] Le coach-personnage complet (Cap 82-0, V21) : choisi au départ de la run, il la fait au complet ; son expérience se recompte des résultats (une série, une ronde de séries, un titre, et une de plus par série gagnée à sa couleur) ; ses niveaux 1 à 5 ouvrent ses pouvoirs aux niveaux 1, 3 et 5 ; un talent aux niveaux 2 et 4 fait grandir de moitié le pouvoir choisi, ouvert ou pas encore ; la boutique ne vend plus de coach. Son staff (Cap 82-0) : huit adjoints, chacun un échange sur les canaux (ce qu'il donne, ce qu'il coûte), un parmi trois offert aux journées 6 et 12, trois au plus et « qui part ? » de trop ; ni cadeau ni piège sur une équipe ordinaire (de −0,42 à +0,38 victoire), chacun visible sur sa signature. Sauvegarde v4 ; une partie d'avant garde son coach acheté et sa confiance — `check_rogue` (le pouvoir grandi sous 2,5 victoires, le personnage complet sous 4), `check_gestion` (l'expérience recomptée à la main, le niveau qui ne descend pas, les talents, une run v3), smoke.
- [x] Des parties qui font vraies sur la Faille (JP : *les matchs sur la Faille feelent pas tant vrai*) : les joueurs marchent, convergent vers un combat la demi-minute d'avant et y restent ; ils rentrent à la base en phase de lignes ; un mort gît un instant où il est tombé, puis attend à sa fontaine ; en phase de lignes, seuls ceux de la ligne vont au combat ; le haut pousse sa ligne, les autres tournent ensemble vers l'objectif qui vient ; les sbires avancent vague après vague ; un trait va du tueur à sa victime ; le tableau dit l'or de chacun (la feuille le garde à la minute, sans dé) — `check_terrain`, `check_feuilles`.
- [x] L'interface à la hauteur de Cap 82-0 (JP : *l'interface est pas aussi complète que hockey*), `js/soir.js` : un tableau indicateur sous l'écusson de ton club (ta fiche, ton rang, tes jetons) ; le Bureau en quatre onglets — la Boîte (ce soir, ton plan, à faire, hier soir, la une, les nouvelles du vestiaire, autour de la ligue), le Proprio (ton mandat et sa jauge, les objectifs de six journées, l'élan, le commanditaire), le Coach (son niveau, ses pouvoirs, son staff), le Vestiaire (qui est en feu, qui est en panne, les liens, l'entraînement, ton histoire dans la run) ; « Ce soir » avant chaque partie : l'affiche, la forme des cinq dernières, le face-à-face de vos stats par partie, ce qu'ils priorisent, leur cinq et leur fétiche ; le sommaire d'une partie jouée (la Faille à plat, le pointage, les trois étoiles, les dix joueurs) ; l'Effectif en deux onglets, ton cinq et le tableau de tes joueurs trié par colonne (cette saison chez toi, ou leur vrai split) ; « Jouer ce soir » et « Regarder » dans la barre d'action — smoke.

## Jalon 7 — Tout Cap 82-0, mode par mode

JP, 29 oct. : *je veux qu'on reprenne tout de hockey dans Faille, genre les cartes différentes d'années en années, les background, joueurs en action, etc* ; *même pige initiale de joueurs moins bons, version Cap 82-0 sans décisions et version roguelike, etc, même chose pour TOUT*.

Le principe : chaque règle de Cap 82-0 (`CLAUDE.md`, `docs/decisions.md`) a sa jumelle ici, transposée au vocabulaire de Faille (un split pour une saison, un cinq pour vingt-trois, le plafond en points pour la masse) et prouvée par le script jumeau. Ce qui ne se transpose pas est dit tel quel, en bas. L'ordre : A (les modes et le départ) d'abord, parce que tout le reste s'y accroche ; puis C (les cartes), B, D, E, F, G.

### 7 A — Les deux modes, et le départ du Rogue

- [ ] **Le 18-0** (le 82-0 de Cap 82-0 : *juste le repêchage ; la saison se simule d'un coup, les séries se regardent match par match, aucune carte*) : la roulette et le vestiaire, un joueur par rôle sous le plafond, puis le split entier d'un coup, droit au bilan ; les séries partie par partie, en direct ; le repêchage des champions joué par le jeu ; aucune carte, aucun coach, aucune décision, aucun jeton — `js/menu.js` (le titre : « Le 18-0 », « Le Rogue »), `js/partie.js` (une partie porte son mode), smoke.
- [ ] **L'exhibition** : deux vrais vestiaires, une partie en direct, rien de compté — `js/menu.js`, smoke.
- [ ] **Le Rogue part faible** (les bouche-trous de Cap 82-0, `bouchesTrousDuDepart`) : ta première run ne pige plus un cinq complet au vestiaire ; tes cinq de départ sortent de packs de départ que tu ouvres (un par rôle), tirés du dé de la run dans la bande des Remplaçants et des bas Réguliers de splits au hasard, chacun à ton effectif et à ta collection ; « Des bouche-trous moins pires » les prend un cran plus haut — `js/rogue.js` (`boucheTrousDuDepart`, pur), `js/menu.js`, `check_gestion` (la première run reste dure : le robot ne gagne pas le titre à sa première run), `check_meta`.
- [ ] **Le classeur** (Cap 82-0 `departDuClasseur`, `lotoDeCase`) : au départ d'une run, des cases, chacune d'un niveau (une Régulier sans rien, Pilier et ★ Étoile aux déblocages), un loto de trois cartes de ta collection de ce niveau dont tu gardes une, sous le budget du classeur ; un niveau absent, la case prend celui d'en dessous ; le tirage pur, recharger redonne les mêmes cartes — `js/rogue.js`, `js/menu.js`, `check_gestion`, `check_meta`.
- [ ] **Les lotos entre deux splits** : ceux qui restent (un Pilier et un Régulier de ton cinq fini) et ceux qui te suivent de ta dernière run se tirent en loto par niveau, jamais au choix (JP, Cap 82-0 : *garder des joueurs de run en run devrait être fait dans une loto, pas genre tu peux prendre qui tu veux*) ; le « gardé » d'aujourd'hui devient une case — `js/rogue.js`, `js/bureau.js` (le bilan), `check_gestion`.
- [ ] **Ton joueur de concession** : à la première run, trois ★ Étoiles des splits du dé, tu en choisis une ; il revient au départ de chaque run — `js/meta.js`, `check_meta`.
- [ ] **Le plafond qui mord** (Cap 82-0 `alourdirLaPremiere`) : le plafond du Rogue laisse juste la place d'un cran au départ ; le mandat, les exigences et les déblocages le bougent par `plafondDe` — `js/gestion.js`, `check_plafond`, `check_gestion`.
- [ ] **Le marché signe comme au 18-0** (Cap 82-0, Jalon R : *la liste, et la case calculée*) : la même rangée de vestiaire partout où l'on signe (le marché, un pack, le classeur), la sortie proposée touchée d'avance, le face-à-face stat par stat avant « Signer » — `js/bureau.js`, `js/fiche.js`, smoke.

### 7 B — La vie d'une run (ce que Cap 82-0 raconte)

- [ ] **Les histoires de la semaine** (les dossiers de la V10, V20) : une par deux journées environ, tirée de la graine, qui ne sort que si son fait est vrai dans les feuilles jouées, nomme ses joueurs, dit sa voix et ses options en vraies stats de partie ; son option audacieuse est un dé dont l'issue frappe le joueur nommé ; ses effets par les canaux, mesurés en paires — `js/histoires.js` (neuf), `js/scenes.js` (neuf : la voix, le fait, la réplique sans chiffre), `check_histoires` (neuf : le fait vrai, le mot dit le canal, l'effet se voit sur la feuille), `check_rogue`.
- [ ] **Les fils et leurs retours** : un fil de split par joueur qui en mérite un (la série de victoires, la panne du vrai carry, le duo d'un lien, la recrue), lu dans les feuilles, à la une ; un fil fort ouvre un choix dans la Boîte, et son retour se relit quelques journées plus tard avec ses vrais chiffres — `js/soir.js`, `js/gestion.js`, `check_fils` (neuf : chaque chiffre se recompte dans les feuilles, rien ne lit l'avenir).
- [ ] **Les défis d'un joueur** (les arcs, Jalon P) : ce qu'un arc demande dans SA stat sur ses prochaines parties (des éliminations, des aides, du CS, de la vision, des premiers sangs) ; suivi chaque matin au Vestiaire ; relevé, sa retouche se grave au verso de sa carte pour de bon — `js/defis.js` (neuf), `check_defis` (neuf : né d'un fait relu, mesuré en blocs appariés).
- [ ] **La lancée et le doute** : un joueur qui vient de beaucoup produire finit mieux tant que ça dure ; le vrai carry en panne doute ; jamais au 18-0 — `js/sim.js` (par les canaux), `check_rogue` (neuf cas : absent du 18-0, borné).
- [ ] **Les suivis** : un choix qui promet pour plus tard (l'objectif du proprio, le fil suivi, le commanditaire) se lit chaque matin à sa maison, en vrais chiffres ; un joueur parti fait tomber sa promesse, et ça se dit — `js/bureau.js`, `check_gestion`.
- [ ] **Ce que ton choix a changé** (V3.1, `js/causes.js`) : après une partie, ce qui l'a décidée, cause par cause (une carte, un pouvoir, la stratégie, le repêchage), dite seulement si, retirée seule, elle changeait la partie sur le même dé — `js/causes.js` (neuf), `check_causes` (neuf).
- [ ] **Les galons, les trophées et le panthéon** : déjà là (jalon 6) ; il manque le galon qui monte un badge d'un métal pour le reste de la run, deux au plus, et « son histoire chez toi » gravée à sa carte — `js/palmares.js`, `js/meta.js`, `check_meta`.

### 7 C — Les cartes, comme des cartes

- [ ] **Le carton 5:7, recto verso** (`cartonHtml`, `carteHtml` de Cap 82-0) : la carte d'un joueur devient un carton qu'on retourne ; le recto (la photo, le nom, le rôle, l'équipe et le split, le niveau, les badges en icônes à la couleur de leur palier, les trois champions) ; le verso (les vraies stats, le bassin, les galons, son histoire chez toi, le crédit de la photo) ; « Signer » dessous ; au téléphone, les cartes à choisir se balaient en grand, une à la fois ; ton cinq, cinq cartes debout de front — `js/fiche.js`, `style.css`, smoke (rien ne déborde, cibles de 44 px).
- [ ] **Une série par année**, 2011 → 2025, pas par époque (JP, Cap 82-0 : *chaque année devra être différente*) : chacune complète — le carton, la fenêtre de la photo, la plaque du nom, sa police (OFL, `fonts/`, créditée dans `fonts/POLICES.txt`), ses ornements, son dos rangé autrement —, inspirée du client et des sites de l'esport de cette année-là, sans police, logo ni élément de Riot ; le split choisit la série, l'équipe la palette (ses vraies couleurs), l'édition la parallèle ; une année sans série prend la dernière qui en a une — `js/fiche.js` (`SERIES`, `serieDe`), `style.css` « LES SÉRIES », `check_css` (neuf : tailles, rayons, couleurs hors des jetons ; chaque série a son dos).
- [ ] **Les cinq éditions** (Base, Cadre, Hors-cadre, Or, Holo, `EDITIONS` de Cap 82-0) : l'édition change la carte entière, pas un reflet ; le numéro de la carte et le tirage limité d'une Or ; la finition d'aujourd'hui (Base, Argent, Or, Holo) devient l'édition ; une édition ne change rien au jeu tant qu'elle n'est pas mesurée en paires (la variante de Cap 82-0 monte un badge : à trancher, puis `check_rogue`) — `js/meta.js`, `js/fiche.js`, `check_meta`.
- [ ] **Les doublons** : un joueur déjà à ta collection, tiré de nouveau, compte une copie ; trois copies montent sa carte d'une édition, jusqu'à l'Or ; l'échange d'un doublon offre trois joueurs de splits voisins — `js/meta.js`, `check_meta`.
- [ ] **Le fond de la carte** : l'illustration de son champion le plus joué (Data Dragon) remplit la fenêtre en Base et en Cadre, la carte entière au Hors-cadre, à l'Or et à l'Holo ; la photo d'action (ci-dessous) passe devant quand elle existe — `js/fiche.js`, `js/images.js`.
- [ ] **Les joueurs en action** (`scripts/actions.mjs`, `actions_commons.mjs` de Cap 82-0) : les photos de match libres de Wikimedia Commons et d'Openverse (CC BY, BY-SA, CC0), créditées au dos, recadrées en 5:7 la face au centre, copiées dans `img/lp/actions/` hors du dépôt par l'Action « Publier » ; celle de son split d'abord, sinon la plus proche, sinon le portrait, sinon le champion ; les photos de presse de Riot et de la LCK restent dehors (pas libres) — `scripts/actions.mjs` (neuf), `js/recadrage-action.js` (repris), `js/images.js`, `check_actions` (neuf : chaque photo a sa licence et son auteur).
- [ ] **La carte d'un plan de jeu et la carte du coach** sur le même carton (Cap 82-0 : *ces cartes doivent ressembler aux séries de leur année, pas être une série à part*) : la série du split en cours, les couleurs de son genre, une illustration au trait (un style de dessin, une couleur d'accent) — `js/boutique.js`, `js/fiche.js`, smoke.
- [ ] **Les cartes de la collection s'inclinent** : le reflet holographique des rares, l'inclinaison au téléphone — `style.css`, `js/vitrine.js`.

### 7 D — La grosse série (le duel de Cap 82-0)

- [ ] **La série clé** : une série par split annoncée la veille (le rival, la bête noire, ton ancienne équipe), qui se joue en trois phases comme le duel se joue en trois périodes ; avant chaque phase, l'adversaire annonce son intention (son plan de la phase, qui vise tes joueurs par leur nom) et ton adjoint propose deux ou trois plans en vraies stats de la phase, ou « Garder » ; les phases vues ne bougent pas — `js/duel.js` (neuf), `js/sim.js` (les phases par les canaux), `check_duel` (neuf : deux copies du même vestiaire, l'attentif contre « Garder », un avantage net mais sous 60 %).
- [ ] **La mise doublée** avant la dernière phase : le butin ou la perte double — `js/rogue.js`, `check_gestion`.
- [ ] **Le pronostic d'avant-partie** et **l'entracte en cartons** : ce que le dépisteur lit, ce que l'entracte dit en vraies stats — `js/soir.js`, `check_pronostic` (neuf : le pronostic lit la feuille jusqu'ici, jamais l'avenir).

### 7 E — Ce que l'écran annonce, en chiffres de partie

- [ ] **L'impact en chiffres de partie** (`js/impact.js`, `check_chiffres` de Cap 82-0) : chaque carte, chaque pouvoir, chaque adjoint, chaque stratégie se dit en vraies stats (« ≈ +2 éliminations par partie », « −1 dragon »), jamais en « % » ni en victoires ; ce que l'écran annonce égale ce que le moteur joue, en paires — `js/impact.js` (neuf), `check_chiffres` (neuf), `check_impact` (neuf : la base de la ligue, le témoin à zéro).
- [ ] **Les mots d'une réponse disent ses lignes** (`check_mots`) : son gain nomme les lignes vertes, son prix les rouges, rien n'est promis sans ligne ; une ligne sous le bruit ne se dit pas — `check_mots` (neuf).
- [ ] **Le lexique** : un mot par idée et une icône par sens, vérifiés — `js/lexique.js` (neuf), `check_lexique` (neuf), `check_clarte` (neuf : une ligne à l'écran, le détail dans les règles).

### 7 F — Le méta de Cap 82-0 au complet

- [ ] **Le prestige** : le rang à vie monte par les médailles ET un exploit par rang ; il ajoute des ★ Étoiles et des ★ Phénomènes aux packs sans en fermer aucun — `js/meta.js`, `check_meta`.
- [ ] **Les packs qui montent** : une première run vend le Bronze et l'Époque ; un pack de plus s'ouvre à son jalon, et chaque pack monte de deux crans en médailles — `js/rogue.js`, `js/boutique.js`, `check_meta`.
- [ ] **Ton club** : un nom et SON écusson vendus ensemble, dessinés, jamais empruntés à une vraie équipe ; tes couleurs ; la run commence dans le club de base — `js/meta.js`, `js/fiche.js` (`ecussonHtml`), `check_meta`.
- [ ] **Les exigences**, déjà là (jalon 6) ; il manque `check_profondeur` : trois robots sur les mêmes dés (celui d'avant, l'attentif, le distrait) ; rouge tant que le premier titre arrive avant la run 3 ou que l'attentif gagne d'office après — `scripts/lib/robot.mjs`, `check_profondeur` (neuf).
- [ ] **Le robot « premier Signer »** ne gagne pas le titre — `check_robot` (neuf).

### 7 G — La plomberie de Cap 82-0

- [ ] `check_css` (tailles, rayons, couleurs hors des jetons), `check_sauvegardes` (une partie de chaque version se relit), `check_lisibilite`, `check_emojis` (la police au trait) — neufs.
- [ ] `essai_rogue` : un DG robot joue des runs entières dans le navigateur à 390 px, chaque écran tient en un écran, rien ne colle au bord (8 px) — neuf, sur `scripts/lib/robot.mjs`.
- [ ] La manette et le clavier (`js/manette.js`) : le focus au voisin, l'anneau lumineux en mode clavier seulement — repris.
- [ ] Le cache IndexedDB des shards avec `COTES_VERSION` (jalon 1), `essai_poids` (le premier écran comme un téléphone le vit) — repris.
- [ ] L'APK (Capacitor) et l'exe (Electron), `mobile/`, `desktop/`, seul leur code versionné ; l'application télécharge et recadre les photos sur l'appareil — repris, en dernier.

### Ce qui ne se transpose pas, et pourquoi

- **Sur table** : un jeu de plateau de hockey ; la Faille n'a pas de plateau. Rien à reprendre, sauf si JP veut un plateau de la Faille (une décision à part).
- **Les blessures, les jambes, le jouer blessé, le ballottage, l'infirmerie** : un pro de LoL ne se blesse pas et ne se fatigue pas d'une partie à l'autre dans les données ; le banc reste le sixième joueur, et une absence (visa, maladie, suspension) serait une histoire de la semaine (7 B), jamais une mécanique du moteur.
- **Les unités spéciales, la prolongation, les tirs de barrage, le gardien** : rien d'équivalent ; une partie de LoL se finit toujours.
- **Les salaires réels et la masse** : le coût suit le niveau et rien d'autre (jalon 1) ; le « plafond qui mord » passe par le plafond en points.

## Journal

- 2026-10-10 — Jalon 0 : le dépôt, la coquille, le script Leaguepedia, les vérifications rapides et la CI.
- 2026-10-10 — Jalon 1 commencé : les Mondiaux de 2011 à 2025, le catalogue des quatre ligues, la récolte élargie (objectifs, vision, objets, classes), `js/cotes.js` et ses remplacements par époque, `check_cotes`.
- 2026-10-10 — Leaguepedia refuse l'anonyme par l'API, même depuis GitHub ; la page d'export passe. Les quinze Mondiaux bâtis : r = 0,85 entre la force tirée des cotes et la vraie fiche.
- 2026-10-10 — Les images : photos et logos de Leaguepedia copiés dans img/lp (leur serveur refuse les autres sites), champions de Data Dragon ; la carte d'un joueur et ses quatre époques ; la sous-cote Économie.
- 2026-10-10 — Jalon 2 : les parties dans les shards (`matchs`), le moteur par événements (tours de 30 s, de 15 à 80 min) calibré sur les 1 355 parties des Mondiaux, le split au jour le jour et ses séries, `check_feuilles`. Les shards se rebâtissent par l'Action « Bâtir les splits ».
- 2026-10-10 — Jalon 3 : les canaux du moteur, le repêchage des champions comme deck de série (bannissements, bassins, confort, composition), les jetons, la boutique, les packs, le plan de jeu et les coachs ; `check_rogue` les mesure en paires.
- 2026-10-10 — Le plafond (le coût suit le niveau, `check_plafond`) et l'interface rapprochée de Cap 82-0 : ses jetons, sa condensée, son tableau indicateur, sa barre d'action.
- 2026-10-11 — Jalon 4, la gestion de Cap 82-0 : la run sur plusieurs splits et son mandat, la sauvegarde par journal d'actions, la roulette à relances, le marché et le banc, la boîte de réception ; `check_gestion` joue des runs entières et les rejoue.
- 2026-10-11 — Ce que font les jeux de gestion de LoL, à la manière de Faille : les commanditaires (Teamfight Manager), les liens d'origine (LoL Esports Manager), l'entraînement des champions.
- 2026-10-11 — Jalon 5 : la stratégie au centre. Les objectifs comptent dans le moteur (recalibré sur ce que valent dragons, Nashor et hérauts dans les vraies parties) ; sept stratégies dont le gain suit le fit des joueurs, mesurées en paires.
- 2026-10-29 — Jalon 6, le jeu complet de Cap 82-0 : l'écran titre et les parties, le méta (médailles, déblocages, rang, ton club), la collection et le palmarès, les packs de joueurs, le joueur qui vieillit, les trophées et les galons, le split en quatre sections, le direct et son commentateur, et la Faille où se voient les ganks, les plongées, les combats et les poussées ; le test de fumée en CI.
- 2026-10-29 — Les exigences 🔺 après un premier titre ; ta série de séries partie par partie, un repêchage avant chacune.
- 2026-10-29 — Les pouvoirs du coach, phase par phase ; la Faille détaillée au direct, ses dix joueurs, leurs champions et leur K/M/A.
- 2026-10-29 — Le coach-personnage : choisi au départ, son expérience, ses niveaux, ses talents ; son staff d'adjoints.
- 2026-10-29 — Des parties qui font vraies sur la Faille ; l'interface de Cap 82-0 au complet : le tableau indicateur, le Bureau en quatre onglets (Boîte, Proprio, Coach, Vestiaire), « Ce soir » avant chaque partie, le sommaire d'une partie jouée, le tableau de tes joueurs.
- 2026-10-29 — Le jalon 7 écrit : tout Cap 82-0, mode par mode (JP : *même chose pour TOUT*) — le 18-0 et le Rogue, le départ faible, le classeur et les lotos, les cartes en carton 5:7 avec une série par année, les éditions et les photos d'action, les histoires de la semaine, la série clé, l'impact en chiffres de partie, le prestige, la plomberie ; et ce qui ne se transpose pas.
