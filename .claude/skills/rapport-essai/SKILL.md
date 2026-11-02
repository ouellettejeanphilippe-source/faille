---
name: rapport-essai
description: "Transforme les notes d'essai de JP (une run du Rogue, un 18-0, un direct sur la Faille, ses reproches tels quels) en rapport : chaque reproche ramené à sa cause dans le code, son jumeau dans Cap 82-0, une correction, et le check qui la prouvera. À utiliser après une session de jeu."
argument-hint: "[rogue | dixhuit | direct] <les notes de JP, telles quelles>"
user-invocable: true
---

# Rapport d'essai

Les notes : `$ARGUMENTS`. Le premier mot dit le mode ; sinon, devine-le des notes et dis-le.

Adapté de la commande `/rapport-essai` de Cap 82-0, elle-même tirée de `/playtest-report` de Claude-Code-Game-Studios (Donchitos, licence MIT : https://github.com/Donchitos/Claude-Code-Game-Studios).

## 1. Garder les mots de JP

Chaque reproche se cite tel quel, en italique, comme le journal le fait (JP : *les matchs sur la Faille feelent pas tant vrai*). Un reproche vague (« c'est laid », « c'est pas comme hockey ») se garde aussi : c'est à toi de le préciser en regardant le code, pas à JP de le reformuler.

## 2. Lire le terrain

`CLAUDE.md` (les règles fermes), `LIVRAISON.md` (le journal : un reproche qui revient après une correction le dit), `docs/parite-cap82.md` (« pas comme hockey » se lit là : le système de Cap 82-0 dont il parle, et son état ici).

## 3. Ramener chaque reproche à sa cause

Pour chacun : le fichier, la fonction ou la constante qui le fait, et pourquoi. Lis le code ; ne devine pas. Si Cap 82-0 a déjà réglé le même reproche, cite sa correction (son journal, sa décision). Si tu ne trouves pas la cause, dis-le et propose comment la trouver.

Range-les par domaine : la partie (le moteur, la Faille du direct, le commentateur), la journée, le split, la run, l'économie, les écrans.

## 4. Le rapport

```
## Essai — <mode>, <date>

| # | JP | La cause | Cap 82-0 | La correction | La preuve | Qui |
|---|---|---|---|---|---|---|
| 1 | *<ses mots>* | <fichier · constante ou fonction> | <son jumeau, ou —> | <le réglage> | <check existant, ou à écrire> | <agent> |

**Par où commencer** : <les deux ou trois qui paient le plus, et pourquoi>
**Ce qui revient** : <les reproches déjà « corrigés » au journal>
**À trancher par JP** : <les choix de goût>
```

« Qui » nomme l'agent : `faille-design`, `faille-equilibre`, `faille-economie`, `faille-ux` (un écran, un parcours), `faille-recit` (une histoire, une voix).

## 5. Ensuite

Ne corrige rien dans cette commande : le rapport sert à choisir. Si JP dit « go », les corrections partent une par une, chacune avec son check et sa ligne au journal.
