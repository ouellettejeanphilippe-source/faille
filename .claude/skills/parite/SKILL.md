---
name: parite
description: "Refait l'audit de parité avec Cap 82-0 : ce que le code de Cap 82-0 fait aujourd'hui, système par système, contre ce que Faille en fait (jumeau, périmé, partiel, absent, sans objet), les écarts de règle, et le plan numéroté qui en sort. Met à jour docs/parite-cap82.md. À lancer quand Cap 82-0 a livré une refonte, ou avant de planifier un jalon."
argument-hint: "[tout | coeur | economie | recit | ecrans | hors-rogue] [depuis <commit de Cap 82-0>]"
user-invocable: true
---

# Parité — Faille contre Cap 82-0

Le terrain : `$ARGUMENTS` (vide : `tout`). Le but, de JP (2 nov. 2026) : *que Faille soit « exactement » le même jeu, mais avec LoL*.

Adapté de trois commandes de Claude-Code-Game-Studios (Donchitos, licence MIT : https://github.com/Donchitos/Claude-Code-Game-Studios) : `/reverse-document` (ce que le code FAIT, observé, jamais ce qu'il devrait faire), `/map-systems` (chaque système, sa catégorie, ses dépendances, ses couches) et `/adopt` (les écarts classés par gravité, un plan numéroté qu'on coche).

## 1. Avoir Cap 82-0 sous la main

Cap 82-0 est `ouellettejeanphilippe-source/hockey`. S'il n'est pas dans la session, l'ajouter (`add_repo`), le cloner à côté, puis noter son commit (`git -C <hockey> log -1 --format=%h`). Lire, dans l'ordre : son `CLAUDE.md`, `.claude/rules/*.md` (les règles fermes par terrain), sa dernière `docs/refonte-v*.md`, le journal de `LIVRAISON.md`, `docs/structure.md`. Avec `depuis <commit>`, partir de `git log <commit>..HEAD` et des fichiers qu'il touche : seuls les systèmes qui ont bougé se refont.

## 2. Relire l'index d'ici

`docs/parite-cap82.md` porte l'index précédent (son commit de Cap 82-0 est dans son bandeau). On le met à jour, on ne le réécrit pas : une ligne cochée qui ne l'est plus le dit.

## 3. Les relecteurs, un par terrain, en parallèle

L'outil Agent, un seul message, un appel par terrain demandé. Chacun lit LES DEUX dépôts, en lecture seule :

| Terrain | Agent | Ce qu'il couvre |
|---|---|---|
| `coeur` | `faille-design` | la boucle, le jour à jour, le duel (la série clé), le coach-personnage, l'entraîneur, les adjoints, les cartes, les moments, la courbe de la run |
| `economie` | `faille-economie` | les jetons, les packs, la boutique, le mandat, les médailles, les déblocages, le prestige, ton club, les exigences, la collection et les lotos |
| `recit` | `faille-recit` | les histoires, les voix, les scènes, les fils et leurs retours, les verdicts, les défis, les galons, le panthéon, les causes, le commentateur |
| `ecrans` | `faille-ux` | les sections et sous-onglets, la Boîte, Ce soir, le duel, le bilan, la carte, le pack, le menu, les gestes, le clavier |
| `hors-rogue` | `general-purpose` | les autres modes (le 82-0 ↔ le 18-0, l'exhibition, Sur table, Sur glace), les données et les cotes, la plomberie et les scripts, l'APK et l'exe |

La consigne de chacun : une ligne par système, au format de l'index (§ 4) ; chaque affirmation vérifiée par Grep ou Read dans les deux dépôts et citée (fichier : symbole), sinon « non vérifié » ; aucun chiffre inventé ; les écarts de règle à part ; les questions que le code ne tranche pas, à part. Un relecteur qui ne trouve rien le dit : une section vide écrit « rien trouvé », elle ne disparaît pas.

## 4. L'index

Une table par catégorie (Cœur, Gameplay, Progression, Économie, Persistance, Interface, Son, Récit, Méta, Outillage), colonnes fixes :

`| # | Système (Cap 82-0) | Cap 82-0 : fichier · symbole · juge | Faille : fichier · symbole | État | Transposition | Dépend de | Gravité |`

- **État** : `=` jumeau · `≈` transposé, mais d'une version périmée de Cap 82-0 (dire laquelle) · `◐` partiel (dire ce qui manque) · `✗` absent · `∅` sans objet au LoL (dire pourquoi).
- **Gravité** : **Bloquant** (sans lui, la boucle n'est pas la même) · **Haut** · **Moyen** · **Bas**.
- **Transposition** : le jumeau LoL en une ligne, dans le vocabulaire de `CLAUDE.md` (un split pour une saison, une partie pour un match, une phase pour une période, le cinq pour l'alignement).

Puis : la carte des dépendances en couches (Fondation → Cœur → Fonctions → Présentation → Finition), les écarts de règle (la règle de Cap 82-0 citée, le code de Faille qui la contredit), ce qui ne se transpose pas, et « À trancher par JP » (une ligne chacune, en options).

## 5. Le plan

Les écarts Bloquant et Haut deviennent des tranches dans `LIVRAISON.md` (le jalon de la parité), dans l'ordre des couches : une tranche, une petite PR, son fichier, son jumeau dans Cap 82-0 et le script qui la prouve (le jumeau d'un `check_*` de Cap 82-0, nommé). Un item du jalon 7 que Cap 82-0 a défait depuis se barre et dit par quoi il est remplacé.

## 6. Écrire

Le bandeau en tête de `docs/parite-cap82.md` dit la date, le commit de Cap 82-0 et celui de Faille lus, et que l'index rapporte ce que le code fait : une intention devinée porte « INTENTION INCONNUE ». Une entrée au journal de `LIVRAISON.md`. Aucun code du jeu ne change dans cette commande : le plan sert à choisir ; JP dit « go » tranche par tranche.
