/*
 * LE PLAN DE MATCH (Cap 82-0, scripts/check_plan_de_match.mjs, la V17 ; docs/parite-cap82.md B6). Chaque plan contre
 * « Ta partie », EN PAIRES : les mêmes dés, de chaque côté de la carte. Ce juge :
 *
 *   1. TA PARTIE ne change rien : les effets d'un cinq sans plan, et la partie d'après un plan, sans lui, se rejoue au
 *      caractère près (le moteur ne garde rien d'une partie à l'autre) ;
 *   2. LA BORNE d'une commune de Cap 82-0 (±1 V sur 82), ramenée à un split : joué à chaque partie, un plan vaut au
 *      plus ±BORNE victoire sur un split de 18, en moyenne des ligues d'essai (le banc de check_rogue, d'autres graines) ;
 *   3. IL SE VOIT sur la feuille, sur sa signature, là où il se joue ;
 *   4. AUCUN NE DOMINE : contre huit adversaires, chaque plan est le meilleur (au bruit près) contre au moins un, et
 *      aucun n'est le meilleur contre tous. Ton cinq : une vraie équipe du milieu, d'une époque à héraut. Les huit : un
 *      favori, un faible, et un témoin par plan, trouvés au balai de 184 adversaires depuis 2016 (le 3 nov. 2026, 500
 *      parties chacun) : chaque plan y était le meilleur contre 11 à 46 d'entre eux, et tous valaient moins de ±0,1 V
 *      en moyenne. Le balai est la preuve qu'aucun ne domine ; les témoins le gardent vrai quand un plan change.
 *
 * `N` : parties par adversaire et par plan (2000). `FILS` : processus (2).
 *
 *   node scripts/check_plan_de_match.mjs            (une quinzaine de secondes)
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PLANS, effetDuPlan, planJoue, anneeEntre } from '../js/strategie.js';
import { jouerPartie } from '../js/moteur.js';
import { effetsDeToi } from '../js/rogue.js';
import { lireSplits } from './lib/vestiaires.mjs';
import { banc } from './lib/paires.mjs';
import { planSurLeBanc } from './lib/effets.mjs';
import { exiger, borne, informer, verdict } from './verdict.mjs';

const N = Number(process.env.N ?? 2000);
const FILS = Math.max(1, Number(process.env.FILS ?? 2));
const ICI = fileURLToPath(import.meta.url);
const SPLIT = 18;
/* La borne d'une commune de Cap 82-0, ±1 V sur 82, ramenée à un split de 18. */
const BORNE = Math.round((SPLIT / 82) * 100) / 100;
const TOI = 'mondial-2018|Team Vitality';
const ADVERSAIRES = [
  ['le favori', 'mondial-2023|T1'], ['le faible', 'mondial-2022|100 Thieves'],
  ['témoin des dragons', 'mondial-2024|Fnatic'], ['témoin du héraut', 'mondial-2021|RED Canids'],
  ['témoin de la poussée', 'mondial-2024|paiN Gaming'], ['témoin des combats', 'mondial-2016|Flash Wolves'],
  ['témoin de l\'agression', 'mondial-2020|JD Gaming'], ['témoin du tardif', 'mondial-2017|Misfits Gaming'],
];
/* Ce qui doit se voir de chaque plan, par partie où il se joue, contre la même partie sans lui (scripts/lib/paires.mjs `profil`). */
const SIGNATURE = { dragons: ['nos_dragons', 0.3], heraut: ['nos_herauts', 0.1], split: ['nos_tours', 0.3], combats: ['k', 0.3], agression: ['duree', -0.3], tardif: ['duree', 1] };
const CLES = Object.keys(PLANS);

const splits = lireSplits();
const equipe = cle => { const [id, nom] = cle.split('|'); const s = splits.find(x => x.split.id === id); return s && s.equipes.get(nom); };

/* UN ADVERSAIRE (un processus fils) : ta partie, puis chaque plan qui s'y joue, `n` parties en paires. */
function mesurer(i, n) {
  const toi = equipe(TOI), eux = equipe(ADVERSAIRES[i][1]);
  const annee = anneeEntre(toi, eux);
  const partie = (e, g) => (g % 2 ? jouerPartie(eux, toi, 5000 + g, [null, e]) : jouerPartie(toi, eux, 5000 + g, [e, null]));
  const sans = Array.from({ length: n }, (_, g) => (partie(null, g).gagnant === g % 2 ? 1 : 0));
  const out = {};
  for (const cle of CLES.filter(c => planJoue(c, annee))) {
    const e = effetDuPlan(cle, annee);
    let s = 0, s2 = 0;
    for (let g = 0; g < n; g++) {
      const d = (partie(e, g).gagnant === g % 2 ? 1 : 0) - sans[g];
      s += d; s2 += d * d;
    }
    const m = s / n;
    out[cle] = { dv: m * SPLIT, se: (Math.sqrt(Math.max(0, s2 / n - m * m) / n)) * SPLIT };
  }
  return { annee, sans: sans.reduce((a, x) => a + x, 0) / n, out };
}
if (process.env.ADV) {
  process.stdout.write(JSON.stringify(mesurer(Number(process.env.ADV), Number(process.env.NADV))));
  process.exit(0);
}
const lancer = i => new Promise((ok, ko) => {
  const p = spawn(process.execPath, [ICI], { env: { ...process.env, ADV: String(i), NADV: String(N) } });
  let o = '', e = '';
  p.stdout.on('data', d => { o += d; }); p.stderr.on('data', d => { e += d; });
  p.on('close', c => (c ? ko(new Error(e)) : ok(JSON.parse(o))));
});

const t0 = Date.now();
const manquent = [TOI, ...ADVERSAIRES.map(a => a[1])].filter(c => !equipe(c));
exiger('ton cinq et les huit adversaires sont dans les shards', !manquent.length, manquent.join(', ') || `${TOI} contre ${ADVERSAIRES.length}`);
if (manquent.length) verdict('Le plan de match');

/* ---------- 1 : Ta partie ne change rien, et un plan ne laisse rien derrière lui ---------- */
{
  exiger('Ta partie : les effets d\'un cinq sans plan', JSON.stringify(effetsDeToi([], effetDuPlan(null, 2020), [])) === JSON.stringify(effetsDeToi([], null, [])));
  const toi = equipe(TOI), eux = equipe(ADVERSAIRES[0][1]);
  const sig = f => JSON.stringify([f.duree, f.gagnant, f.equipes.map(e => [e.k, e.tours, e.dragons, e.barons, e.herauts]), f.fil.length]);
  const photo = () => JSON.stringify([toi, eux]);
  const avant = [sig(jouerPartie(toi, eux, 77)), photo()];
  for (const cle of CLES) jouerPartie(toi, eux, 78, [effetDuPlan(cle, 2023), null]);
  exiger('un plan ne laisse rien derrière lui : la partie d\'après, sans plan, se rejoue au caractère près', sig(jouerPartie(toi, eux, 77)) === avant[0] && photo() === avant[1]);
  exiger('le héraut ne se joue pas avant 2016, les autres partout', !planJoue('heraut', 2015) && planJoue('heraut', 2016) && CLES.filter(c => c !== 'heraut').every(c => planJoue(c, 2011)) && effetDuPlan('heraut', 2014) === null);
}

/* ---------- 2 et 3 : la borne et la signature, sur le banc ---------- */
{
  const { mesurer: surLeBanc } = banc(splits, Number(process.env.LIGUES ?? 48), 1100);
  const v = x => x.toFixed(2).replace('.', ',');
  for (const cle of CLES) {
    const [ico, nom] = PLANS[cle];
    const m = surLeBanc(planSurLeBanc(cle));
    borne(`${ico} ${nom} : victoires de plus par split, joué à chaque partie (la borne d'une commune)`, m.dv, -BORNE, BORNE);
    const [c, seuil] = SIGNATURE[cle];
    exiger(`${ico} ${nom} se voit sur la feuille : ${c}`, Math.sign(m.forme[c]) === Math.sign(seuil) && Math.abs(m.forme[c]) >= Math.abs(seuil), `${v(m.forme[c])} par partie où il se joue (au moins ${v(seuil)})`);
  }
}

/* ---------- 4 : aucun ne domine ---------- */
const res = [];
for (let i = 0; i < ADVERSAIRES.length; i += FILS) res.push(...await Promise.all(ADVERSAIRES.slice(i, i + FILS).map((_, j) => lancer(i + j))));
const v = x => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(2).replace('.', ',')}`;
const meilleurs = res.map((r, i) => {
  const d = Object.entries(r.out);
  const max = Math.max(...d.map(([, x]) => x.dv));
  const se = Math.max(...d.map(([, x]) => x.se)) * Math.SQRT2;
  const tete = d.filter(([, x]) => x.dv >= max - se).map(([c]) => c);
  informer(`${ADVERSAIRES[i][0]} · ${ADVERSAIRES[i][1].replace('|', ' · ')} (${r.annee})`, `${Math.round(100 * r.sans)} % sans plan · ${d.map(([c, x]) => `${PLANS[c][0]} ${v(x.dv)}`).join(' ')} V · le meilleur : ${tete.map(c => PLANS[c][0]).join('')} (± ${v(se).slice(1)})`);
  return tete;
});
for (const cle of CLES) exiger(`${PLANS[cle][0]} ${PLANS[cle][1]} : le meilleur contre au moins un adversaire`, meilleurs.some(t => t.includes(cle)));
const partout = CLES.filter(c => meilleurs.every(t => t.length === 1 && t[0] === c));
exiger('aucun plan n\'est le meilleur contre tous', partout.length === 0, partout.map(c => PLANS[c][1]).join(', ') || `${meilleurs.length} adversaires`);
informer('le temps', `${((Date.now() - t0) / 1000).toFixed(0)} s, ${N} parties par adversaire et par plan`);
verdict('Le plan de match');
