---
name: equilibrer
description: "Mesure l'équilibre d'un sujet du Rogue de Faille (une carte de plan de jeu, une stratégie, un coach, un pouvoir, un adjoint, un lien, le repêchage, un pack, la courbe des runs) avec les juges du dépôt, en paires, et propose un réglage chiffré. Ne change rien sans accord."
argument-hint: "[sujet : cartes | strategies | pouvoirs | adjoints | liens | repechage | packs | runs | <nom>]"
user-invocable: true
---

# Équilibrer — le Rogue de Faille, mesuré

Le sujet : `$ARGUMENTS` (vide : tout ce que `check_rogue` mesure).

Adapté de la commande `/equilibrer` de Cap 82-0 (`ouellettejeanphilippe-source/hockey`), elle-même tirée de `/balance-check` de Claude-Code-Game-Studios (Donchitos, licence MIT : https://github.com/Donchitos/Claude-Code-Game-Studios).

## 1. Lire avant de mesurer

- `CLAUDE.md`, « Le rogue » et « Le méta et le direct » : les bornes du sujet (la rareté d'une carte, le 1,5 et le 2,5 victoires d'un pouvoir, le 4 du personnage complet, le 1 d'un adjoint, le fit d'une stratégie).
- `MOTEUR.md`, la section du sujet (§7 le repêchage, §8 les cartes, §9 les liens, §10 les stratégies, §11 les pouvoirs).
- Le code du sujet : la constante qui le règle, son fichier.

## 2. Le juge

| Sujet | Juge | Temps |
|---|---|---|
| cartes, coachs, pouvoirs, adjoints, stratégies, liens, classes, repêchage | `node scripts/check_rogue.mjs` | ~45 s |
| la forme d'une partie (durée, éliminations, objectifs) | `node scripts/check_feuilles.mjs` | ~3 s |
| les packs, les jetons, la run | `node scripts/check_gestion.mjs` · `check_meta.mjs` | ~3 s chacun |
| la courbe des runs (la première dure, l'attentif contre le distrait) | `check_profondeur` — à écrire (le jumeau de Cap 82-0, docs/parite-cap82.md) | — |

Dis la commande et sa durée avant de la lancer. Un repère décimal se juge sur plusieurs graines, jamais sur une seule.

## 3. Lancer et lire

Cite le verdict tel que `scripts/verdict.mjs` l'imprime : les lignes rouges, les chiffres contre leurs bornes.

## 4. Rapporter

En français québécois, avec les mots du vocabulaire :

```
## Équilibre — <sujet> (<date>, <commit>)

Mesuré : <commande> — <durée>

| Ce qu'on mesure | Borne | Mesuré | État |
|---|---|---|---|
| <carte, pouvoir…> | <±V par split> | <V> | sous la borne / au-dessus / mort / piège |

**Le problème** : <une phrase, chiffrée>
**Le réglage proposé** : `<CONSTANTE>` (<fichier>) de <avant> à <après> — effet attendu : <V>
**Le jumeau** : ce que Cap 82-0 fait du même problème (<règle>, <juge>)
**La preuve** : <le juge, et ce qu'il doit dire après>
**À trancher par JP** : <s'il y a lieu>
```

« Mort » : ne se voit jamais sur la feuille d'une partie où il joue. « Piège » : le prendre fait perdre.

## 5. Appliquer, seulement si JP dit oui

Un réglage à la fois. Un moteur qui ne rejoue plus une partie pareil monte `VERSION` (js/partie.js) et garde l'ancien pour les vieilles sauvegardes ; le juge relancé ; `node scripts/tout.mjs` ; une ligne au journal de `LIVRAISON.md`. Pour un avis de design, passe la main à `faille-design` ; pour l'argent de la run, à `faille-economie`.
