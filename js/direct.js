/*
 * UNE PARTIE EN DIRECT (repris de Cap 82-0, js/direct.js). Le moteur a déjà
 * joué la partie et gardé sa feuille ; ce module ne décide de rien : il la
 * REJOUE dans le temps, un événement à la fois, pour que le résultat se
 * découvre comme à la diffusion plutôt que d'un coup dans un tableau. Rien
 * ne se montre avant que l'horloge y arrive :
 *
 *   la Faille     la carte (js/terrain.js) : les tours debout et tombées, les
 *                 éliminations là où elles arrivent, les objectifs à leur
 *                 fosse, et ce qui se passe, nommé — un gank, une plongée sous
 *                 la tour, un combat d'équipe, la bataille du Nashor, une
 *                 poussée de côté, l'assaut final ;
 *   le pointage   les éliminations, les tours, les dragons, le Nashor ;
 *   la courbe     l'avance d'or, minute par minute ;
 *   le fil        le commentateur (js/commentaire.js), et le titre de chaque moment.
 *
 * On n'y entre pas d'office : « ▶ Regarder » sur hier soir et sur la feuille
 * d'une série. Une minute de partie passe en une seconde ; ×4 et ×16 vont
 * plus vite, « La fin » saute au nexus.
 */
import { esc } from './util.js';
import { horloge, vedetteDe } from './split.js';
import { commenter } from './commentaire.js';
import { terrainDe, TRACES, FOSSES, BASES, GENRES } from './terrain.js';
import { LIGNES_FIN } from './sim.js';
import { jouerSon } from './sons.js';

const VITESSES = [1, 4, 16];     // minutes de partie par seconde
const PAS_MS = 100;
const COURBE_MAX = 10000;        // l'avance d'or qui touche le bord de la courbe
const VU = 1.5;                  // combien de minutes un événement reste sur la carte
const TIENT = 2.5;               // combien de minutes un moment nommé reste en titre
const ICONES = { dragon: '🐉', nashor: '🟣', heraut: '🦀', inhib: '💢', nexus: '💥' };

let D = null;

/* Ce que la feuille dit à l'instant t : les éliminations, les tours, les dragons, les Nashor de chaque camp. */
function compte(f, t) {
  const c = [0, 1].map(() => ({ k: 0, tours: 0, dragons: 0, barons: 0 }));
  const cle = { elim: 'k', tour: 'tours', dragon: 'dragons', nashor: 'barons' };
  for (const x of f.fil) if (x.t <= t && cle[x.quoi]) c[x.camp][cle[x.quoi]]++;
  return c;
}

/* La courbe de l'or jusqu'à t : le bleu au-dessus du milieu, le rouge dessous. */
function courbe(f, t) {
  const n = Math.max(1, Math.ceil(f.duree));
  const pts = [[0, 20]];
  f.courbe.forEach((v, m) => { if (m + 1 <= t) pts.push([((m + 1) / n) * 100, 20 - (Math.max(-COURBE_MAX, Math.min(COURBE_MAX, v)) / COURBE_MAX) * 18]); });
  return `<svg class="dt-courbe" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="20" x2="100" y2="20"/><polyline points="${pts.map(p => p.join(',')).join(' ')}"/></svg>`;
}

/* LA FAILLE à l'instant t : le décor, les tours, ce qui vient d'arriver, le moment en cours. */
function faille(T, t) {
  const decor = `<rect class="tf-sol" x="0" y="0" width="100" height="100" rx="3"/>
    <path class="tf-riviere" d="M4 4 L96 96"/>
    ${Object.values(TRACES).map(pts => `<polyline class="tf-ligne" points="${pts.map(p => p.join(',')).join(' ')}"/>`).join('')}
    ${Object.values(FOSSES).map(([x, y]) => `<circle class="tf-fosse" cx="${x}" cy="${y}" r="4.5"/>`).join('')}
    ${BASES.map(([x, y], c) => `<circle class="tf-base camp-${c}" cx="${x}" cy="${y}" r="6"/>`).join('')}`;
  const tours = T.tours.map(tr => `<rect class="tf-tour camp-${tr.camp}${tr.tombe !== null && tr.tombe <= t ? ' tombee' : ''}" x="${(tr.x - 1.4).toFixed(1)}" y="${(tr.y - 1.4).toFixed(1)}" width="2.8" height="2.8"/>`).join('');
  const recents = T.evenements.filter(e => e.t <= t && t - e.t < VU).map(e => {
    const x = e.x.toFixed(1), y = e.y.toFixed(1);
    if (e.quoi === 'elim') return `<circle class="tf-elim camp-${e.camp}" cx="${x}" cy="${y}" r="1.7"/>`;
    if (e.quoi === 'tour') return `<circle class="tf-boum camp-${e.camp}" cx="${x}" cy="${y}" r="3.2"/>`;
    return `<text class="tf-ico" x="${x}" y="${y}">${ICONES[e.quoi]}</text>`;
  }).join('');
  const a = T.actions.filter(x => x.t <= t && t - x.t < TIENT).pop();
  const zone = a ? `<circle class="tf-zone camp-${a.camp}" cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="8"/>` : '';
  const phase = t < LIGNES_FIN ? 'La phase de lignes' : t < 28 ? 'Le milieu de partie' : 'La fin de partie';
  return `<div class="tf"><svg class="tf-carte" viewBox="0 0 100 100" aria-hidden="true">${decor}${tours}${zone}${recents}</svg>
    <p class="tf-action${a ? ` camp-${a.camp}` : ''}">${a ? `${GENRES[a.genre][0]} ${esc(a.texte)}` : esc(phase)}</p></div>`;
}

const SON = { elim: 'elim', dragon: 'objectif', heraut: 'objectif', nashor: 'objectif', tour: 'tour', inhib: 'tour' };

/* Les gestes du bas : redessinés seulement quand ils changent, pour qu'un toucher ne tombe jamais entre deux images. */
function gestes() {
  const fini = D.t >= D.f.duree;
  D.el.querySelector('.dt-gestes').innerHTML = fini
    ? '<button class="go" data-retour>Fermer</button>'
    : `<button id="dt-pause">${D.minuterie ? 'Pause' : 'Reprendre'}</button><button id="dt-vite">Vitesse ×${D.vitesse}</button><button id="dt-fin" class="go">La fin</button>`;
}

function dessiner() {
  const { f, noms, lignes, t, el, toi, T } = D;
  const fini = t >= f.duree;
  const c = compte(f, t);
  const avance = f.courbe[Math.min(f.courbe.length, Math.floor(t)) - 1] || 0;
  const cote = x => `<div class="dt-equipe ${x ? 'rouge' : 'bleu'}${toi === x ? ' dt-toi' : ''}${fini && f.gagnant === x ? ' gagne' : ''}">
    <small>${x ? 'Rouge' : 'Bleu'}</small><b>${esc(noms[x])}</b>
    <span class="dt-obj">🏰 ${c[x].tours} · 🐉 ${c[x].dragons} · 🟣 ${c[x].barons}</span></div>`;
  const vus = lignes.filter(x => x.t <= t).reverse();
  const v = fini ? vedetteDe(f) : null;
  el.querySelector('.dt-vue').innerHTML = `<div class="direct-tete">${cote(0)}<div class="dt-centre"><b class="dt-k">${c[0].k}<span>–</span>${c[1].k}</b><span class="dt-horloge">${horloge(Math.min(t, f.duree))}</span>
      <small class="dt-or">${avance ? `${esc(avance > 0 ? noms[0] : noms[1])} +${(Math.abs(avance) / 1000).toFixed(1).replace('.', ',')} k` : 'Or égal'}</small></div>${cote(1)}</div>
    ${faille(T, t)}
    ${courbe(f, t)}
    ${fini ? `<p class="dt-fin${toi === f.gagnant ? ' bon' : toi === null ? '' : ' mauvais'}"><b>Victoire de ${esc(noms[f.gagnant])}</b> en ${horloge(f.duree)} · ⭐ ${esc(v.n)} ${v.k}/${v.m}/${v.a}</p>` : ''}
    <ol class="dt-fil">${vus.map(x => `<li class="dt-ligne ${x.camp ? 'rouge' : 'bleu'}${x.quoi === 'nexus' ? ' nexus' : ''}${x.quoi === 'action' ? ' dt-moment' : ''}"><span class="temps">${horloge(x.t)}</span><span>${esc(x.texte)}</span></li>`).join('') || '<li class="dt-ligne"><span class="temps">0:00</span><span>Les sbires arrivent dans leurs lignes. Bonne partie !</span></li>'}</ol>`;
}

function avancer() {
  const avant = D.t;
  D.t = Math.min(D.f.duree, D.t + (D.vitesse * PAS_MS) / 1000);
  // Un son au plus par pas : le dernier événement qui vient d'arriver.
  const neuf = D.lignes.filter(x => x.t > avant && x.t <= D.t && SON[x.quoi]).pop();
  if (neuf) jouerSon(SON[neuf.quoi]);
  if (D.t >= D.f.duree) {
    arreter();
    jouerSon(D.toi === null ? 'objectif' : D.toi === D.f.gagnant ? 'victoire' : 'defaite');
    gestes();
  }
  dessiner();
}

function arreter() {
  if (D && D.minuterie) { clearInterval(D.minuterie); D.minuterie = null; }
}

/**
 * Ouvre le direct dans `el`. `feuille` : la feuille ; `noms` : [bleu, rouge] ;
 * `champs` : [bleu, rouge] → { rôle : champion }, ou null ; `graine` : celle
 * de la partie (le commentateur, la carte) ; `toi` : ton camp (0, 1) ou null.
 */
export function ouvrirDirect(el, { feuille, noms, champs, graine, toi }) {
  arreter();
  const T = terrainDe(feuille, noms, graine);
  // Le fil : le commentateur, et le titre de chaque moment au bout de ses événements.
  const lignes = [...commenter(feuille, noms, champs, graine), ...T.actions.map(a => ({ t: a.t, quoi: 'action', camp: a.camp, texte: `${GENRES[a.genre][0]} ${a.texte}` }))]
    .sort((a, b) => a.t - b.t || (a.quoi === 'action') - (b.quoi === 'action'));
  D = { f: feuille, noms, toi, el, T, lignes, t: 0, vitesse: VITESSES[0], minuterie: null };
  el.innerHTML = '<div class="dt-vue"></div><div class="actionbar dt-gestes"></div>';
  D.minuterie = setInterval(avancer, PAS_MS);
  gestes();
  dessiner();
  if (!el.dataset.branche) {
    el.dataset.branche = '1';
    el.addEventListener('click', ev => {
      const b = ev.target.closest('button');
      if (!b || !D) return;
      if (b.id === 'dt-pause') {
        if (D.minuterie) arreter(); else D.minuterie = setInterval(avancer, PAS_MS);
        gestes();
      } else if (b.id === 'dt-vite') {
        D.vitesse = VITESSES[(VITESSES.indexOf(D.vitesse) + 1) % VITESSES.length];
        gestes();
      } else if (b.id === 'dt-fin') {
        D.t = D.f.duree - 1e-9;
        avancer();
      }
    });
  }
}

/** Arrête le direct (sa couche se ferme). */
export function fermerDirect() { arreter(); D = null; }
