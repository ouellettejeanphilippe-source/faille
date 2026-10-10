/*
 * LES COTES (js/cotes.js) — leurs remplacements, et ce qu'elles valent.
 *
 * Deux parties :
 *
 *   1. Sur des splits D'ESSAI bâtis ici (deux époques, mêmes joueurs) :
 *      un split moderne prend les formules de tête, un split de 2011 sans
 *      dégâts ni vision prend les remplacements, la vision y reste neutre et
 *      son badge ne s'y décerne pas ; un joueur meilleur partout vaut plus ;
 *      une partie seule ne fait pas un phénomène.
 *
 *   2. Sur les vrais splits de data/splits/ : la force d'équipe tirée des
 *      cotes doit suivre la vraie fiche. Chaque split dit aussi quelles
 *      formules son époque emploie.
 *
 *   node scripts/check_cotes.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { profilsDuSplit, AXES } from '../js/cotes.js';
import { hasard } from '../js/hasard.js';
import { exiger, borne, informer, verdict } from './verdict.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ROLES = ['haut', 'jungle', 'milieu', 'bas', 'soutien'];

/* Un split d'essai : 10 équipes, des stats tirées autour d'une moyenne ; `moderne` décide des colonnes mesurées. */
function splitDEssai(moderne, graine) {
  const de = hasard(graine);
  const autour = (m, e) => m * (1 + (de() - 0.5) * e);
  const equipes = [];
  for (let t = 0; t < 10; t++) {
    const joueurs = ROLES.map(r => {
      const pj = 6 + Math.floor(de() * 6), min = pj * 32;
      const k = Math.round(autour(pj * 3, 1)), eqK = pj * 14;
      return {
        n: `J${t}-${r}`, r, pj, v: 0, min, k, m: Math.round(autour(pj * 2.5, 1)), a: Math.round(autour(pj * 6, 1)), eqK,
        eqOr: pj * 60000, eqDeg: moderne ? pj * 80000 : 0,
        or: [autour(pj * 12000, 0.5), pj, min], cs: [autour(min * 7, 0.5), pj, min],
        deg: moderne ? [autour(pj * 16000, 0.8), pj, min] : [0, 0, 0],
        vision: moderne ? [autour(min * 1.5, 0.8), pj, min] : [0, 0, 0],
        champs: [['A', Math.ceil(pj / 2), 0], ['B', Math.floor(pj / 2), 0]],
        classes: { tank: de() < 0.3 ? 1 : 0, mage: de() < 0.3 ? 1 : 0 },
      };
    });
    const pj = joueurs[0].pj;
    equipes.push({ nom: `E${t}`, v: 0, d: 0, joueurs, obj: {
      tours: [autour(pj * 6, 0.6), pj], dragons: [autour(pj * 2, 0.6), pj], barons: [autour(pj * 0.6, 1), pj],
      herauts: moderne ? [pj, pj] : [0, 0], larves: [0, 0], inhib: [pj, pj],
    } });
  }
  return { equipes };
}

/* 1. Les remplacements. */
const moderne = splitDEssai(true, 2024), ancien = splitDEssai(false, 2011);
const pm = profilsDuSplit(moderne), pa = profilsDuSplit(ancien);
exiger('un split moderne prend la formule de tête des dégâts', pm.formules.degats === AXES.degats[0], pm.formules.degats?.nom);
exiger('un split de 2011 lit les dégâts par remplacement', pa.formules.degats === AXES.degats[1], pa.formules.degats?.nom);
exiger('la vision non mesurée reste neutre', pa.formules.vision === null && [...pa.joueurs.values()].every(p => p.sous.vision === null));
exiger('aucun « Gardien de la vision » sans vision mesurée', [...pa.joueurs.values()].every(p => !p.badges.some(b => b.nom === 'Gardien de la vision')));
exiger('les objectifs se lisent sans les hérauts', pa.formules.objectifs === AXES.objectifs[0]);
exiger('chaque joueur a son niveau', [...pm.joueurs.values(), ...pa.joueurs.values()].every(p => p.niveau));

/* Un joueur meilleur partout vaut plus ; une partie seule ne fait pas un phénomène. */
const essai = splitDEssai(true, 7);
const [a, b] = essai.equipes.slice(0, 2).map(e => e.joueurs.find(j => j.r === 'milieu'));
Object.assign(b, structuredClone(a), { n: 'meilleur', k: a.k * 2, m: Math.max(1, Math.round(a.m / 2)), cs: [a.cs[0] * 1.3, a.cs[1], a.cs[2]], or: [a.or[0] * 1.3, a.or[1], a.or[2]], deg: [a.deg[0] * 1.5, a.deg[1], a.deg[2]] });
const pe = profilsDuSplit(essai);
exiger('meilleur partout, plus de valeur', pe.joueurs.get(b).valeur > pe.joueurs.get(a).valeur);
const solo = essai.equipes[2].joueurs.find(j => j.r === 'bas');
Object.assign(solo, { pj: 1, min: 32, k: 15, m: 0, a: 10, eqK: 25, cs: [400, 1, 32], or: [20000, 1, 32], deg: [60000, 1, 32], eqOr: 60000, eqDeg: 80000 });
exiger('une partie seule ne fait pas un phénomène', profilsDuSplit(essai).joueurs.get(solo).niveau !== '★ Phénomène');

/* 2. Les vrais splits. */
const dossier = path.join(ROOT, 'data/splits');
const fichiers = fs.existsSync(dossier) ? fs.readdirSync(dossier).filter(f => f.endsWith('.json')).sort() : [];
const paires = [];
for (const f of fichiers) {
  const split = JSON.parse(fs.readFileSync(path.join(dossier, f), 'utf8'));
  const { formules, joueurs } = profilsDuSplit(split);
  const force = split.equipes.filter(e => e.v + e.d >= 3).map(e => {
    const pj = e.joueurs.reduce((s, j) => s + j.pj, 0);
    return [e.joueurs.reduce((s, j) => s + j.pj * joueurs.get(j).valeur, 0) / pj, e.v / (e.v + e.d)];
  });
  paires.push(...force);
  const remplaces = Object.entries(formules).filter(([axe, fo]) => fo !== AXES[axe][0]).map(([axe, fo]) => `${axe} : ${fo ? fo.nom : 'non mesuré'}`);
  informer(split.nom, `${split.equipes.length} équipes, r = ${correlation(force).toFixed(2)} · ${remplaces.join(' ; ') || 'toutes les formules de tête'}`);
}

function correlation(ps) {
  if (ps.length < 3) return NaN;
  const mx = ps.reduce((s, p) => s + p[0], 0) / ps.length, my = ps.reduce((s, p) => s + p[1], 0) / ps.length;
  const c = ps.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0);
  const vx = ps.reduce((s, [x]) => s + (x - mx) ** 2, 0), vy = ps.reduce((s, [, y]) => s + (y - my) ** 2, 0);
  return c / Math.sqrt(vx * vy);
}

/*
 * La borne vient de la première mesure (les quinze Mondiaux, 10 octobre 2026) : r = 0,85 sur 279 équipes, de 0,78
 * à 0,98 d'un Mondial à l'autre. Attention, une part est circulaire : l'or et la participation d'une équipe qui gagne
 * montent PARCE qu'elle gagne. Une corrélation qui frôlerait 1 dirait que les cotes ne lisent plus que la fiche.
 */
if (fichiers.length) borne('force d\'équipe et vraie fiche, tous splits', correlation(paires), 0.75, 0.95);
else informer('force d\'équipe et vraie fiche, tous splits', 'aucun split bâti');

verdict('Les cotes');
