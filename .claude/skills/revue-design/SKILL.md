---
name: revue-design
description: "Juge un devis de Faille (une tranche de parité, un écran, un système, une histoire) avant qu'on le code : complet, cohérent avec les règles fermes et avec son jumeau de Cap 82-0, faisable, et prouvable. Fait relire par les agents du terrain en adversaires, rend un verdict. Ne change rien sans accord."
argument-hint: "<chemin du devis, ou le sujet : ecrans | adjoints | histoires | serie-cle | boutique | run>"
user-invocable: true
---

# Revue de design — un devis jugé avant le code

Le devis : `$ARGUMENTS`. Un chemin se lit ; un sujet se cherche dans `docs/parite-cap82.md` et dans `LIVRAISON.md`.

Adapté de la commande `/revue-design` de Cap 82-0, elle-même tirée de `/design-review` de Claude-Code-Game-Studios (Donchitos, licence MIT : https://github.com/Donchitos/Claude-Code-Game-Studios), ramenée au gabarit de ce dépôt (`docs/gabarits/devis.md`).

## 1. Les huit parties

Un devis complet a ses huit parties (le gabarit les nomme) : **ce que JP a dit**, **ce que le joueur ressent**, **les règles du jeu** (assez précises pour qu'un autre les code sans deviner), **les chiffres** (chaque formule, ses variables, leur plage, un exemple fait), **les cas limites** (le cinq incomplet, le joueur parti, la vieille sauvegarde, les séries, le 18-0), **ce qu'il touche** (les fichiers, les règles fermes de `CLAUDE.md`, la version de sauvegarde), **les réglages** et **les critères d'acceptation**. Plus une neuvième, propre à Faille : **le jumeau** — ce que Cap 82-0 fait du même sujet aujourd'hui (fichier, règle, juge), et ce que la transposition garde, change ou laisse. Une partie manquante se nomme ; elle ne se devine pas.

## 2. Les critères se prouvent

Chaque critère est vérifiable par un script nommé, existant ou à écrire : « sous 1,5 victoire seul — `check_rogue` », « la Boîte tient en un écran à 390 × 844 — smoke », « poster un adjoint : deux touchers ». « Plus le fun », « bien balancé », « plus clair » sont refusés tels quels : un chiffre et une mesure, ou « à juger par JP à l'essai ».

## 3. Les règles fermes et les décisions

Pour chaque règle de `CLAUDE.md` que le devis touche : la nommer, et dire si le devis la défait (alors JP tranche) ou la respecte. Pour une question de principe, la décision de Cap 82-0 (`docs/decisions.md` de `ouellettejeanphilippe-source/hockey`, Grep sur le mot clé) est le point de départ ; chercher aussi ce qui y a été essayé et retiré (« essayé », « retiré », « parti »).

## 4. Les relecteurs en adversaires

Selon le terrain, fais relire en parallèle (l'outil Agent, un message, plusieurs appels), chacun avec le devis et la consigne de **chercher ce qui casse**, pas de l'approuver :

| Le devis touche | Les relecteurs |
|---|---|
| un écran, un parcours, une mise en scène | `faille-ux`, `faille-design` |
| une histoire, une voix, une scène | `faille-recit`, `faille-equilibre` |
| un adjoint, un pouvoir, une carte, une stratégie, la série clé | `faille-equilibre`, `faille-design` |
| les jetons, les packs, les médailles | `faille-economie`, `faille-design` |
| la courbe d'une run | `faille-design`, `faille-economie`, `faille-equilibre` |

## 5. Le verdict

```
## Revue — <devis>, <date>

**Verdict** : APPROUVÉ | À REPRENDRE | À REFAIRE
| Partie | État | Ce qui manque |
|---|---|---|
| … | ✓ / à préciser / absent | … |

**Ce qui casse** (des relecteurs, triés du plus grave) : …
**Le jumeau** : fidèle / transposé (comment) / s'en écarte (pourquoi)
**Les règles fermes touchées** : <règle> — respectée / défaite
**Les critères sans preuve** : …
**À trancher par JP** : une ligne chacun
```

Tu ne modifies rien. Si JP dit « go », les corrections partent dans le devis lui-même, puis le code, tranche par tranche.
