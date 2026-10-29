/*
 * LE SOIR : ce qui entoure une partie de ton cinq, comme dans Cap 82-0 —
 * « Ce soir » avant (les deux équipes face à face, leur cinq, leur plan), le
 * sommaire après (les trois étoiles, le pointage, les chiffres face à face,
 * la Faille de la partie), la route des prochaines journées, la forme de tes
 * joueurs, la une d'hier soir et ce qui se passe autour de la ligue.
 *
 * Rien que du HTML tiré de la ligue (js/sim.js) et de ses feuilles
 * (js/palmares.js) ; aucune cote : de vraies stats, le niveau, des mots. Une
 * voix dit une opinion, jamais un chiffre ; le fait sous elle dit les chiffres.
 */
import { esc, virgule } from './util.js';
import { classement } from './sim.js';
import { horloge, vedetteDe, taDerniere } from './split.js';
import { statsDuSplit, profilDEquipe, dernieresParties } from './palmares.js';
import { repechageDe } from './repechage.js';
import { iconeChampion } from './images.js';
import { hasard, graineDe, piger } from './hasard.js';

const ROLES = { haut: 'Haut', jungle: 'Jungle', milieu: 'Milieu', bas: 'Bas', soutien: 'Soutien' };
const rangMot = k => (k === 1 ? '1er' : `${k}e`);
const rangDe = (L, i) => classement(L).findIndex(l => l.i === i) + 1;
const ficheDe = (L, i) => { const l = classement(L).find(x => x.i === i); return `${l.v}-${l.d}`; };

/* La forme d'une équipe : ses cinq dernières parties, de la plus ancienne à la plus récente, en pastilles. */
const forme = (L, i) => `<span class="forme">${dernieresParties(L, i, 5).reverse().map(x => `<i class="${x.gagne ? 'bon' : 'mauvais'}">${x.gagne ? 'V' : 'D'}</i>`).join('') || '<small>Aucune partie</small>'}</span>`;

/** LA ROUTE : tes prochaines journées, en puces — l'adversaire, ton côté, son rang. */
export function laRoute(L, n = 6) {
  if (L.series || L.jour >= L.journees.length) return '';
  const puces = L.journees.slice(L.jour, L.jour + n).map((jour, k) => {
    const s = jour.find(x => x.a === 0 || x.b === 0);
    const i = s.a === 0 ? s.b : s.a;
    return `<li class="${k === 0 ? 'ce-soir' : ''}"><small>${k === 0 ? 'Ce soir' : `J${L.jour + k + 1}`}</small><b>${esc(L.equipes[i].nom)}</b><small>${s.a === 0 ? 'bleu' : 'rouge'} · ${rangMot(rangDe(L, i))}</small></li>`;
  }).join('');
  return `<h3>La route</h3><ol class="route">${puces}</ol>`;
}

/** La partie de ce soir, en une carte qui ouvre « Ce soir » ; `s` : ta série qui vient. */
export function carteCeSoir(L, s) {
  if (!s) return '';
  const nous = s.a === 0 ? 0 : 1;
  const i = nous ? s.a : s.b;
  const quand = L.series ? `Les séries · partie ${s.parties.length + 1} de ${s.bo} · ${s.v[nous]}-${s.v[1 - nous]}` : `Journée ${L.jour + 1} · ce soir · côté ${s.a === 0 ? 'bleu' : 'rouge'}`;
  return `<button class="ce-soir-carte" data-soir><span class="jeu-id"><small>${quand}</small><b>${esc(L.equipes[i].nom)}</b>
    <small>${L.equipes[i].split ? `${esc(L.equipes[i].split)} · ` : ''}${rangMot(rangDe(L, i))} · ${ficheDe(L, i)}</small></span><span class="prix">Ce soir ›</span></button>`;
}

/* Une rangée face à face : le mot, ta valeur, la leur, deux barres qui se regardent ; `mieux` : plus haut est mieux pour qui le porte. */
function faceAFace(mot, a, b, dec = 1, mieux = true) {
  if (a === null || b === null) return '';
  const max = Math.max(a, b, 1e-9);
  const gagne = mieux ? (a > b ? 0 : a < b ? 1 : -1) : (a < b ? 0 : a > b ? 1 : -1);
  return `<li class="faf"><span class="faf-v${gagne === 0 ? ' fort' : ''}">${virgule(a, dec)}</span><span class="faf-barres"><i class="faf-toi" style="width:${Math.round((100 * a) / max)}%"></i><i class="faf-eux" style="width:${Math.round((100 * b) / max)}%"></i></span><span class="faf-v${gagne === 1 ? ' fort' : ''}">${virgule(b, dec)}</span><small>${mot}</small></li>`;
}

/* Le profil d'une équipe par partie : dans ta ligue s'il a joué, sinon (eux) son vrai split. */
function profilOuSplit(L, i, ctx, adversaires) {
  const p = profilDEquipe(L, i);
  if (p || i === 0) return p;
  const a = adversaires[i - 1];
  const e = a && ctx.splits.get(a.id).split.equipes.find(x => x.nom === a.e);
  if (!e) return null;
  const pj = Math.max(1, e.v + e.d);
  const par = o => (e.obj && e.obj[o] && e.obj[o][1] ? e.obj[o][0] / e.obj[o][1] : 0);
  return { pj, v: e.v, k: e.joueurs.reduce((s, j) => s + j.k, 0) / pj, m: e.joueurs.reduce((s, j) => s + j.m, 0) / pj, tours: par('tours'), dragons: par('dragons'), barons: par('barons'), herauts: par('herauts'), duree: null, split: true };
}

/** « CE SOIR » : l'affiche, les deux équipes face à face, leur cinq et ce qu'il joue, ce qu'ils priorisent. `identite` : leur plan en mots, ou null. */
export function ecranCeSoir(P, ctx, s, identite) {
  const L = P.L;
  const nous = s.a === 0 ? 0 : 1;
  const i = nous ? s.a : s.b;
  const eux = L.equipes[i];
  const a = profilOuSplit(L, 0, ctx, P.adversaires), b = profilOuSplit(L, i, ctx, P.adversaires);
  const lignes = a && b ? [
    faceAFace('Éliminations par partie', a.k, b.k),
    faceAFace('Morts par partie', a.m, b.m, 1, false),
    faceAFace('Tours par partie', a.tours, b.tours),
    faceAFace('Dragons par partie', a.dragons, b.dragons),
    faceAFace('Nashor par partie', a.barons, b.barons, 2),
  ].join('') : '';
  const ref = P.adversaires[i - 1];
  const shard = ref && ctx.splits.get(ref.id);
  const leurCinq = Object.entries(ROLES).map(([r, mot]) => {
    const j = eux.cinq[r];
    const sj = shard && shard.split.equipes.find(e => e.nom === ref.e).joueurs.find(x => x.n === j.n && x.r === r);
    const niveau = sj ? shard.profils.joueurs.get(sj).niveau : '';
    const fet = j.bassin[0];
    const src = fet && iconeChampion(ctx.champions, fet[0]);
    return `<li><span class="dt-champ">${src ? `<img src="${src}" alt="" loading="lazy">` : esc(mot.slice(0, 2))}</span><span class="dt-qui"><b>${esc(j.n)}</b><small>${mot}${niveau ? ` · ${esc(niveau)}` : ''}${fet ? ` · ${esc(fet[0])}, ${fet[1]} partie${fet[1] > 1 ? 's' : ''}` : ''}</small></span>
      ${sj ? `<span class="dt-kma">KDA ${virgule((sj.k + sj.a) / Math.max(1, sj.m))}</span>` : ''}</li>`;
  }).join('');
  return `<h2>Ce soir</h2>
    <div class="affiche"><div class="affiche-equipe aff-toi"><small>${L.equipes[0].split ? '' : 'Ton club'}</small><b>${esc(L.equipes[0].nom)}</b><small>${rangMot(rangDe(L, 0))} · ${ficheDe(L, 0)}</small>${forme(L, 0)}</div>
      <span class="affiche-contre">${L.series ? `${s.v[nous]}-${s.v[1 - nous]}` : 'contre'}</span>
      <div class="affiche-equipe"><small>${esc(eux.split || '')}</small><b>${esc(eux.nom)}</b><small>${rangMot(rangDe(L, i))} · ${ficheDe(L, i)}</small>${forme(L, i)}</div></div>
    ${lignes ? `<h3>Face à face${b && b.split ? ' · eux : leur vrai split' : ' · dans ta ligue'}</h3><ul class="faces">${lignes}</ul>` : '<p class="sous">Les chiffres face à face viennent avec ta première partie.</p>'}
    ${identite ? `<p class="mandat">Ils priorisent ${esc(identite)}.</p>` : ''}
    <h3>Leur cinq</h3><ol class="dt-camp rouge soir-cinq">${leurCinq}</ol>
    <p class="sous">Ils bannissent tes plus joués ; leur fétiche se voit à côté de chacun.</p>
    <div class="actionbar"><button id="soir-jouer" class="go">Jouer ce soir</button><button id="soir-regarder">▶ Regarder</button></div>`;
}

/*
 * LES TROIS ÉTOILES d'une partie : les éliminations, les aides et les morts de
 * chacun, la victoire en plus ; la troisième d'abord, comme à l'aréna.
 */
const note = (j, gagne) => j.k + 0.6 * j.a - 0.5 * j.m + (gagne ? 2 : 0);
function troisEtoiles(f, noms) {
  return f.equipes.flatMap((e, x) => e.joueurs.map(j => ({ ...j, x, nom: noms[x], score: note(j, f.gagnant === x) })))
    .sort((a, b) => b.score - a.score).slice(0, 3).reverse();
}

/** LE SOMMAIRE d'une partie jouée : les étoiles, le pointage, la Faille de la partie (`carte` : son dessin), les chiffres face à face, les dix joueurs. */
export function ecranSommaire(L, s, k, champions, carte) {
  const p = s.parties[k];
  const f = p.feuille;
  const camps = [p.bleu, p.rouge];
  const noms = camps.map(i => L.equipes[i].nom);
  const rp = repechageDe(s, k);
  const champ = (x, r) => rp && rp.choix[camps[x] === s.a ? 0 : 1][r];
  const etoiles = troisEtoiles(f, noms).map((j, n) => `<li><span class="etoiles">${'★'.repeat(n + 1)}</span><span class="dt-qui"><b>${esc(j.n)}</b><small>${esc(j.nom)}${champ(j.x, j.r) ? ` · ${esc(champ(j.x, j.r))}` : ''}</small></span><span class="dt-kma">${j.k}/${j.m}/${j.a}</span></li>`).join('');
  const pointage = [0, 1].map(x => `<li class="score-camp ${x ? 'rouge' : 'bleu'}${f.gagnant === x ? ' gagne' : ''}"><b>${esc(noms[x])}</b><span class="score-k">${f.equipes[x].k}</span><small>${virgule(f.equipes[x].or / 1000)} k d'or</small></li>`).join('');
  const lignes = [
    ['Éliminations', 'k', 0], ['Or (k)', 'or', 1, 1000], ['Tours', 'tours', 0], ['Dragons', 'dragons', 0], ['Hérauts', 'herauts', 0], ['Nashor', 'barons', 0],
  ].map(([mot, c, dec, div = 1]) => faceAFace(mot, f.equipes[0][c] / div, f.equipes[1][c] / div, dec)).join('');
  const joueurs = [0, 1].map(x => `<ol class="dt-camp ${x ? 'rouge' : 'bleu'}">${f.equipes[x].joueurs.map(j => {
    const c = champ(x, j.r);
    const src = c && iconeChampion(champions, c);
    return `<li><span class="dt-champ">${src ? `<img src="${src}" alt="" loading="lazy">` : esc(ROLES[j.r].slice(0, 2))}</span><span class="dt-qui"><b>${esc(j.n)}</b><small>${c ? esc(c) : ROLES[j.r]}</small></span><span class="dt-kma">${j.k}/${j.m}/${j.a}<small>${virgule(j.or / 1000)} k</small></span></li>`;
  }).join('')}</ol>`).join('');
  const quand = s.cle.startsWith('j') ? `Journée ${Number(s.cle.slice(1).split('-')[0]) + 1}` : `Les séries · partie ${k + 1}`;
  return `<h2>${quand} · ${horloge(f.duree)}</h2>
    <h3>Les trois étoiles</h3><ol class="etoiles-liste">${etoiles}</ol>
    <ul class="score">${pointage}</ul>
    ${carte}
    <h3>Face à face · bleu, rouge</h3><ul class="faces">${lignes}</ul>
    <h3>Les dix joueurs</h3><div class="dt-joueurs">${joueurs}</div>
    <div class="actionbar"><button class="go" data-direct="${s.cle}|${k}">▶ Regarder la partie</button><button data-serie="${s.cle}">La feuille</button></div>`;
}

/** LES NOUVELLES DU VESTIAIRE : qui est en feu, qui est en panne, sur tes trois dernières parties contre sa moyenne chez toi. */
export function nouvelles(L) {
  const recentes = dernieresParties(L, 0, 3);
  if (recentes.length < 3) return [];
  const st = statsDuSplit(L).filter(l => l.i === 0);
  const out = [];
  for (const l of st) {
    const rec = recentes.map(x => x.f.equipes[x.x].joueurs.find(j => j.n === l.n && j.r === l.r)).filter(Boolean);
    if (rec.length < 3 || l.pj < 5) continue;
    const r = rec.reduce((s, j) => s + j.k + j.a, 0) / rec.length;
    const m = (l.k + l.a) / l.pj;
    if (r >= 1.5 * m && r >= 8) out.push({ n: l.n, feu: true, mot: `${virgule(r)} éliminations et aides par partie sur ses trois dernières, ${virgule(m)} en moyenne` });
    else if (r <= 0.5 * m && m >= 5) out.push({ n: l.n, feu: false, mot: `${virgule(r)} éliminations et aides par partie sur ses trois dernières, ${virgule(m)} en moyenne` });
  }
  // Trois en panne, c'est le cinq qui l'est : une nouvelle, à ses éliminations d'équipe.
  if (out.filter(x => !x.feu).length >= 3) {
    const p = profilDEquipe(L, 0);
    const r = recentes.reduce((s, x) => s + x.f.equipes[x.x].k, 0) / recentes.length;
    return [...out.filter(x => x.feu), { n: 'Le cinq', feu: false, mot: `${virgule(r)} éliminations par partie sur ses trois dernières, ${virgule(p.k)} en moyenne` }];
  }
  return out;
}

/* Les suites de victoires ou de défaites d'une équipe, en saison : ce qui court maintenant. */
function suiteDe(L, i) {
  const res = L.journees.slice(0, L.jour).map(j => j.find(s => s.a === i || s.b === i)).filter(Boolean).map(s => s.gagnant === i);
  let n = 0;
  for (let k = res.length - 1; k >= 0 && res[k] === res[res.length - 1]; k--) n++;
  return res.length ? { n, gagne: res[res.length - 1] } : { n: 0, gagne: null };
}

/** AUTOUR DE LA LIGUE : les surprises d'hier soir, les séries de victoires ou de défaites, ton prochain adversaire. */
export function autourDeLaLigue(L) {
  if (!L.jour || L.series) return [];
  const out = [];
  const rang = new Map(classement(L).map((l, k) => [l.i, k + 1]));
  for (const s of L.journees[L.jour - 1]) {
    if (s.a === 0 || s.b === 0) continue;
    const g = s.gagnant, p = s.a === g ? s.b : s.a;
    if (rang.get(g) >= rang.get(p) + 4) out.push(`${esc(L.equipes[g].nom)} (${rangMot(rang.get(g))}) surprend ${esc(L.equipes[p].nom)} (${rangMot(rang.get(p))}).`);
  }
  for (let i = 1; i < L.equipes.length; i++) {
    const x = suiteDe(L, i);
    if (x.n >= 3) out.push(`${esc(L.equipes[i].nom)} : ${x.n} ${x.gagne ? 'victoires' : 'défaites'} de suite.`);
  }
  const s = L.jour < L.journees.length && L.journees[L.jour].find(x => x.a === 0 || x.b === 0);
  if (s) {
    const i = s.a === 0 ? s.b : s.a;
    const x = suiteDe(L, i);
    if (x.n >= 2) out.push(`Ton prochain adversaire, ${esc(L.equipes[i].nom)}, ${x.gagne ? `reste sur ${x.n} victoires` : `traîne ${x.n} défaites de suite`}.`);
  }
  return out.slice(0, 5);
}

/*
 * LA UNE d'hier soir : le fait le plus lourd de ta dernière partie, dit par
 * une voix (une opinion, sans chiffre) et un fait (les chiffres). null s'il
 * n'y a rien à dire.
 */
const VOIX = {
  raclee: ['📺 L\'analyste à la télé', ['Une leçon. Il n\'y avait qu\'une équipe sur la Faille.', 'On a vu un écart de classe, du premier sbire au nexus.', 'Rien à redire : ils ont roulé dessus.']],
  remontee: ['🎙️ Le panel du balado', ['Menés de loin, et ils n\'ont jamais lâché. C\'est ça, une équipe.', 'Je les avais enterrés. Erreur de ma part.', 'Une remontée qu\'on va se raconter longtemps.']],
  vedette: ['📣 Les partisans', ['On a un joueur qui peut gagner une partie tout seul.', 'Laissez-le jouer ses champions : il fait le reste.', 'Le chandail va se vendre.']],
  suite: ['🧢 Le capitaine', ['Le vestiaire a confiance. On ne change rien.', 'On joue ensemble, et ça se voit.', 'Une partie à la fois. Mais oui, ça roule.']],
  crise: ['📺 L\'analyste à la télé', ['Il faut que quelque chose change, et vite.', 'Le vestiaire cherche ses repères.', 'On sent le doute à chaque décision.']],
};
export function laUne(L) {
  const s = taDerniere(L);
  if (!s) return null;
  const p = s.parties[s.parties.length - 1];
  const f = p.feuille;
  const x = p.bleu === 0 ? 0 : 1;
  const nous = f.equipes[x], eux = f.equipes[1 - x];
  const gagne = f.gagnant === x;
  const contre = L.equipes[x ? p.bleu : p.rouge].nom;
  const de = hasard(graineDe(L.graine, `une-${s.cle}-${s.parties.length}`));
  const dire = (genre, titre, fait) => ({ titre, voix: VOIX[genre][0], mot: piger(VOIX[genre][1], de), fait });
  const pire = Math.min(0, ...f.courbe.map(v => (x ? -v : v)));
  const v = vedetteDe(f);
  const suite = !L.series ? suiteDe(L, 0) : { n: 0 };
  if (Math.abs(nous.k - eux.k) >= 15) return dire('raclee', gagne ? 'La raclée' : 'La dégelée', `${nous.k}-${eux.k} en éliminations contre ${contre}, en ${horloge(f.duree)}.`);
  if (gagne && pire <= -4000) return dire('remontee', 'La remontée', `Menés de ${virgule(-pire / 1000)} k d'or, vainqueurs contre ${contre} en ${horloge(f.duree)}.`);
  if (gagne && v.k >= 9) return dire('vedette', `${v.n} en feu`, `${v.k}/${v.m}/${v.a} contre ${contre}.`);
  if (suite.n >= 3) return dire(suite.gagne ? 'suite' : 'crise', suite.gagne ? 'Ça roule' : 'La crise', `${suite.n} ${suite.gagne ? 'victoires' : 'défaites'} de suite.`);
  return null;
}
