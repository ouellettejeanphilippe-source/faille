/*
 * LES EFFETS QUE L'ÉCRAN CHIFFRE (js/impact.js), un registre pour scripts/impact.mjs, check_impact et check_chiffres :
 * chaque carte du plan de jeu, chaque adjoint, chaque lien d'origine, chaque pouvoir du coach (seul, puis grandi d'un
 * talent), chaque plan de match, et une classe de plus que la référence au repêchage (la composition se somme de là).
 * Pour chacun : sa clé dans js/impacts.js, ce que le banc de mesure lui donne (scripts/lib/paires.mjs) et sa
 * signature — une empreinte de sa définition, pour qu'un effet qu'on retouche sans remesurer se voie.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { graineDe } from '../../js/hasard.js';
import { CARTES, COACHS, LIENS, ADJOINTS, effetDeLAdjoint, pouvoirsDuPersonnage } from '../../js/rogue.js';
import { PLANS, effetDuPlan, planJoue, anneeEntre } from '../../js/strategie.js';
import { REFERENCE, effetsDeComposition } from '../../js/repechage.js';

const ROOT = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

/* L'empreinte d'une valeur : son texte (une fonction par sa source), haché. */
export const empreinte = v => graineDe(0, JSON.stringify(v, (k, x) => (typeof x === 'function' ? String(x) : x)));

/* Le moteur qu'on mesure : ce qui joue une partie et ses canaux. Une table mesurée sur un autre moteur est périmée. */
const FICHIERS_DU_MOTEUR = ['js/moteur.js', 'js/canaux.js', 'js/strategie.js', 'js/sim.js', 'js/repechage.js'];
export const empreinteDuMoteur = () => empreinte(FICHIERS_DU_MOTEUR.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')));

/*
 * UN PLAN DE MATCH SUR LE BANC : posé série par série (comme au jeu, contre l'adversaire du soir et dans l'année de leur
 * partie), sur chaque équipe qui le porte ; la forme ne se lit que là où il se joue (le héraut, dès 2016).
 */
export const planSurLeBanc = id => ({
  serie: (L, s, traitee) => {
    const e = effetDuPlan(id, anneeEntre(L.equipes[s.a], L.equipes[s.b]));
    s.effets = [traitee(s.a) ? e : null, traitee(s.b) ? e : null];
  },
  garder: (L, s) => planJoue(id, anneeEntre(L.equipes[s.a], L.equipes[s.b])),
});

/** [{ cle, genre ('fixe', 'pouvoir'), sig, opts }] : opts, ce que `mesurer` reçoit. */
export function effetsAChiffrer() {
  const out = [];
  for (const [id, carte] of Object.entries(CARTES)) out.push({ cle: `carte:${id}`, genre: 'fixe', sig: empreinte(carte), opts: { effet: carte[3] } });
  for (const [id, a] of Object.entries(ADJOINTS)) out.push({ cle: `adjoint:${id}`, genre: 'fixe', sig: empreinte(a), opts: { effet: effetDeLAdjoint(id) } });
  for (const [id, lien] of Object.entries(LIENS)) out.push({ cle: `lien:${id}`, genre: 'fixe', sig: empreinte(lien), opts: { effet: lien[3] } });
  for (const [id, co] of Object.entries(COACHS)) {
    const grandis = pouvoirsDuPersonnage(id, 5, co.pouvoirs.map(p => p.id));
    for (const x of co.pouvoirs) {
      out.push({ cle: `pouvoir:${x.id}`, genre: 'pouvoir', sig: empreinte(x), opts: { pouvoirs: [x], pouvoir: x.id } });
      const g = grandis.find(p => p.id === x.id);
      out.push({ cle: `pouvoir:${x.id}:grandi`, genre: 'pouvoir', sig: empreinte(g), opts: { pouvoirs: [g], pouvoir: x.id } });
    }
  }
  for (const cl of Object.keys(REFERENCE)) {
    const effet = effetsDeComposition({ ...REFERENCE, [cl]: REFERENCE[cl] + 1 });
    out.push({ cle: `classe:${cl}`, genre: 'fixe', sig: empreinte(effet), opts: { effet } });
  }
  for (const [id, x] of Object.entries(PLANS)) out.push({ cle: `plan:${id}`, genre: 'fixe', sig: empreinte(x), opts: planSurLeBanc(id) });
  return out;
}
