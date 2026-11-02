# Gabarit — le devis d'une tranche, d'un écran ou d'un système

Copier ce fichier, remplir chaque partie, puis le faire juger par `/revue-design <chemin>` avant de coder. Une partie qui ne s'applique pas dit pourquoi en une ligne ; elle ne disparaît pas. Repris du gabarit de Cap 82-0 (`docs/gabarits/devis.md`), lui-même adapté du gabarit de GDD de Claude-Code-Game-Studios (Donchitos, licence MIT), avec une partie de plus : le jumeau.

## 0. Le jumeau

Ce que Cap 82-0 fait du même sujet aujourd'hui : le fichier, le symbole, la règle ferme, le juge, et la refonte qui l'a posé (V2x). Ce que la transposition garde, ce qu'elle change pour le LoL et pourquoi, ce qu'elle laisse (« ∅ », et pourquoi). La ligne de `docs/parite-cap82.md` qu'elle coche.

## 1. Ce que JP a dit

Ses mots, en italique, avec la date (JP, 2 nov. 2026 : *…*).

## 2. Ce que le joueur ressent

Le fantasme en une phrase. Le pic visé et la journée ordinaire : ce qui doit être spectaculaire, ce qui doit rester rapide. La boucle nourrie : la partie, la journée, le split, la run, la carrière.

## 3. Les règles du jeu

Ce qui arrive, quand, à qui, dans quel ordre ; ce que le joueur voit et touche, écran par écran (le parcours toucher par toucher). Assez précis pour qu'un autre le code sans deviner. Chaque geste est une action du journal (`faire()`, js/partie.js).

## 4. Les chiffres

Chaque formule : son nom, son expression, ses variables (symbole, plage, sens), son résultat et ses bornes, un exemple fait à la main. Les effets en vraies stats de partie (éliminations, dragons, tours, or, durée), jamais en cote ni en victoires à l'écran. Une borne de Cap 82-0 (par saison de 82) se ramène à un split de 18 parties.

## 5. Les cas limites

Le cinq incomplet, le banc, le joueur parti, les séries en BO5, le 18-0 (rien de tout ça n'y joue ?), la fin du split, la vieille sauvegarde (la `VERSION` de js/partie.js), le hors-ligne (`sw.js`), le clavier.

## 6. Ce qu'il touche

Les fichiers ; les règles fermes de `CLAUDE.md` (nommées : respectée ou défaite) ; les canaux du moteur (`sommerEffets`) ; la version de sauvegarde ; ce qui part.

## 7. Les réglages

Les constantes, leur valeur, leur plage sûre, ce qui casse au-delà.

## 8. Les critères d'acceptation

Chacun vérifiable, avec le script qui le prouve, existant ou à écrire (nommé, et son jumeau de Cap 82-0) :

- [ ] … — `check_…`
- [ ] … — smoke (…)
- [ ] À juger par JP à l'essai : … (seulement ce qui ne se mesure pas)

## Les tranches

Une petite PR chacune, dans l'ordre ; chaque tranche nomme son juge.
