/*
 * UNE PARTIE EN DIRECT (repris de Cap 82-0, js/direct.js). Le moteur a déjà
 * joué la partie et gardé sa feuille ; ce module ne décide de rien : il la
 * REJOUE dans le temps, un événement à la fois, pour que le résultat se
 * découvre comme à la diffusion plutôt que d'un coup dans un tableau. Rien
 * ne se montre avant que l'horloge y arrive :
 *
 *   la Faille     la carte (js/terrain.js) : ses bois, ses camps, sa rivière
 *                 et ses crabes, les tours et les inhibiteurs debout ou
 *                 tombés ; les dix joueurs, l'icône de leur champion et leur
 *                 nom, qui vont et viennent ; les éliminations là où elles
 *                 arrivent, les objectifs à leur fosse ; ce qui se passe,
 *                 nommé — un gank, une plongée sous la tour, un combat
 *                 d'équipe, la bataille du Nashor, une poussée de côté ;
 *   les joueurs   les dix, leur champion, leurs éliminations, morts et aides ;
 *   le pointage   les éliminations, les tours, les dragons, le Nashor ;
 *   la courbe     l'avance d'or, minute par minute ;
 *   le fil        le commentateur (js/commentaire.js), le titre de chaque
 *                 moment, et les pouvoirs du coach quand ils jouent.
 *
 * La carte se dessine une fois ; à chaque pas, seuls bougent les joueurs (ils
 * glissent : la feuille de style les anime), les tours qui tombent et les
 * marques du moment. On n'y entre pas d'office : « ▶ Regarder » sur hier soir
 * et sur la feuille d'une série. Une minute de partie passe en une seconde ;
 * ×4 et ×16 vont plus vite, « La fin » saute au nexus.
 */
import { esc } from './util.js';
import { horloge, vedetteDe } from './split.js';
import { commenter } from './commentaire.js';
import { terrainDe, positionsDe, rappelsDe, vaguesDe, TRACES, FOSSES, BASES, BOIS, CAMPS, CRABES, MURS, GENRES } from './terrain.js';
import { LIGNES_FIN, MILIEU_FIN } from './sim.js';
import { COACHS, pouvoirDe } from './rogue.js';
import { jouerSon } from './sons.js';

const VITESSES = [1, 4, 16];     // minutes de partie par seconde
const PAS_MS = 100;
const COURBE_MAX = 10000;        // l'avance d'or qui touche le bord de la courbe
const VU = 1.5;                  // combien de minutes un événement reste sur la carte
const TIENT = 2.5;               // combien de minutes un moment nommé reste en titre
const ICONES = { dragon: '🐉', nashor: '🟣', heraut: '🦀', inhib: '💢', nexus: '💥' };
const VITESSE = 110;             // ce qu'un joueur marche, en unités de la carte par minute de partie (la traverser : moins d'une minute)
const COUP = 0.2;                // combien de temps le trait d'une élimination reste
const SAUT = 3;                  // un pas plus long que ça (« La fin ») : on ne marche pas, on y est
const ROLES = { haut: 'Haut', jungle: 'Jungle', milieu: 'Milieu', bas: 'Bas', soutien: 'Soutien' };

let D = null;

/* Ce que la feuille dit à l'instant t : les comptes de chaque camp, et ceux de chaque joueur. */
function compte(f, t) {
  const c = [0, 1].map(() => ({ k: 0, tours: 0, dragons: 0, barons: 0, j: [0, 1, 2, 3, 4].map(() => ({ k: 0, m: 0, a: 0 })) }));
  const cle = { elim: 'k', tour: 'tours', dragon: 'dragons', nashor: 'barons' };
  for (const x of f.fil) {
    if (x.t > t) break;
    if (cle[x.quoi]) c[x.camp][cle[x.quoi]]++;
    if (x.quoi === 'elim') {
      c[x.camp].j[x.tueur].k++;
      c[1 - x.camp].j[x.victime].m++;
      for (const i of x.aides) c[x.camp].j[i].a++;
    }
  }
  return c;
}

/* La courbe de l'or jusqu'à t : le bleu au-dessus du milieu, le rouge dessous. */
function courbe(f, t) {
  const n = Math.max(1, Math.ceil(f.duree));
  const pts = [[0, 20]];
  f.courbe.forEach((v, m) => { if (m + 1 <= t) pts.push([((m + 1) / n) * 100, 20 - (Math.max(-COURBE_MAX, Math.min(COURBE_MAX, v)) / COURBE_MAX) * 18]); });
  return `<svg class="dt-courbe" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="20" x2="100" y2="20"/><polyline points="${pts.map(p => p.join(',')).join(' ')}"/></svg>`;
}

const pts = l => l.map(p => p.join(',')).join(' ');
const initiales = n => esc(String(n).replace(/\s*\(.*\)$/, '').slice(0, 2).toUpperCase());

/* LA FAILLE, dessinée une fois : le sol, les bois et leurs camps, la rivière et ses crabes, les lignes, les fosses, les bases, les tours ; puis les dix joueurs. */
function carte(T, joueurs) {
  const bois = BOIS.flatMap((b, c) => b.map(poly => `<polygon class="tf-bois camp-${c}" points="${pts(poly)}"/>`)).join('')
    + MURS.map(m => `<polygon class="tf-mur" points="${pts(m)}"/>`).join('');
  const camps = CAMPS.flatMap((cs, c) => cs.map(([k, [x, y]]) => `<circle class="tf-camp tf-camp-${k}" cx="${x}" cy="${y}" r="${k === 'bleu' || k === 'rouge' ? 1.9 : 1.3}"/>`)).join('');
  const crabes = CRABES.map(([x, y]) => `<circle class="tf-crabe" cx="${x}" cy="${y}" r="1.2"/>`).join('');
  const lignes = Object.values(TRACES).map(l => `<polyline class="tf-ligne" points="${pts(l)}"/>`).join('');
  const fosses = Object.entries(FOSSES).map(([k, [x, y]]) => `<circle class="tf-fosse" cx="${x}" cy="${y}" r="4.5"/><text class="tf-fosse-ico" x="${x}" y="${y}">${ICONES[k === 'dragon' ? 'dragon' : 'nashor']}</text>`).join('');
  const bases = BASES.map(([x, y], c) => `<circle class="tf-base camp-${c}" cx="${x}" cy="${y}" r="6"/>`).join('');
  const tours = T.tours.map((tr, k) => `<rect class="tf-tour camp-${tr.camp}" data-tour="${k}" x="${(tr.x - 1.4).toFixed(1)}" y="${(tr.y - 1.4).toFixed(1)}" width="2.8" height="2.8"/>`).join('');
  const inhibs = T.inhibs.map((x, k) => `<rect class="tf-inhib camp-${x.camp}" data-inhib="${k}" x="${(x.x - 1.2).toFixed(1)}" y="${(x.y - 1.2).toFixed(1)}" width="2.4" height="2.4" transform="rotate(45 ${x.x.toFixed(1)} ${x.y.toFixed(1)})"/>`).join('');
  const qui = joueurs.flatMap((eq, c) => eq.map((j, i) => `<g class="tf-joueur camp-${c}" data-j="${c}-${i}">
      <circle class="tf-anneau" r="2.6"/>${j.icone ? `<image href="${j.icone}" x="-2.3" y="-2.3" width="4.6" height="4.6" clip-path="url(#tf-rond)"/>` : `<text class="tf-init" y="0.1">${initiales(j.n)}</text>`}
      <text class="tf-nom" y="5.8">${esc(j.n.replace(/\s*\(.*\)$/, ''))}</text></g>`)).join('');
  return `<div class="tf"><svg class="tf-carte" viewBox="0 0 100 100" aria-hidden="true">
    <defs><clipPath id="tf-rond" clipPathUnits="objectBoundingBox"><circle cx="0.5" cy="0.5" r="0.5"/></clipPath></defs>
    <rect class="tf-sol" x="0" y="0" width="100" height="100" rx="3"/>${bois}<path class="tf-riviere" d="M4 4 L96 96"/>${lignes}${camps}${crabes}${fosses}${bases}${tours}${inhibs}
    <g class="tf-sbires"></g><g class="tf-marques"></g><g class="tf-joueurs">${qui}</g></svg>
    <p class="tf-action"></p></div>`;
}

/* La carte à l'instant t : les tours et les inhibiteurs tombés, les marques, le moment, les joueurs à leur place. */
function majCarte(t) {
  const { T, f, el } = D;
  el.querySelectorAll('[data-tour]').forEach(r => { const x = T.tours[r.dataset.tour]; r.classList.toggle('tombee', x.tombe !== null && x.tombe <= t); });
  el.querySelectorAll('[data-inhib]').forEach(r => { const x = T.inhibs[r.dataset.inhib]; r.classList.toggle('tombee', x.tombe !== null && x.tombe <= t); });
  const marques = T.evenements.filter(e => e.t <= t && t - e.t < VU).map(e => {
    const x = e.x.toFixed(1), y = e.y.toFixed(1);
    if (e.quoi === 'elim') return `<text class="tf-croix camp-${e.camp}" x="${x}" y="${y}">✕</text>`;
    if (e.quoi === 'tour') return `<circle class="tf-boum camp-${e.camp}" cx="${x}" cy="${y}" r="3.2"/>`;
    return `<text class="tf-ico" x="${x}" y="${y}">${ICONES[e.quoi]}</text>`;
  });
  const a = T.actions.filter(x => x.t <= t && t - x.t < TIENT).pop();
  if (a) marques.unshift(`<circle class="tf-zone camp-${a.camp}" cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="8"/>`);
  el.querySelector('.tf-marques').innerHTML = marques.join('');
  const phase = t < LIGNES_FIN ? 'La phase de lignes' : t < MILIEU_FIN ? 'Le milieu de partie' : 'La fin de partie';
  const banniere = el.querySelector('.tf-action');
  banniere.className = `tf-action${a ? ` camp-${a.camp}` : ''}`;
  banniere.textContent = a ? `${GENRES[a.genre][0]} ${a.texte}` : phase;
  // Les sbires, vague après vague.
  el.querySelector('.tf-sbires').innerHTML = vaguesDe(T, f, t).map(v => `<circle class="tf-sbire camp-${v.camp}" cx="${v.x.toFixed(1)}" cy="${v.y.toFixed(1)}" r="0.7"/>`).join('');
  // Les joueurs marchent vers où ils veulent être ; un mort et un rappel arrivent d'un coup ; un saut de temps aussi.
  const cibles = positionsDe(T, f, t, D.rappels);
  const pas = Math.max(0, t - D.tVu);
  cibles.forEach((eq, c) => eq.forEach((p, i) => {
    const v = D.vus[c][i];
    const d = Math.hypot(p.x - v.x, p.y - v.y);
    const k = p.mort || p.corps || pas > SAUT || d <= VITESSE * pas ? 1 : (VITESSE * pas) / d;
    v.x += (p.x - v.x) * k;
    v.y += (p.y - v.y) * k;
    const g = el.querySelector(`[data-j="${c}-${i}"]`);
    g.style.transform = `translate(${v.x.toFixed(2)}px, ${v.y.toFixed(2)}px)`;
    g.classList.toggle('mort', p.mort);
    g.classList.toggle('corps', p.corps);
    g.classList.toggle('rappel', p.rappel);
  }));
  D.tVu = t;
  // Un nom se tait quand un autre joueur est trop près : dans un combat, les icônes parlent.
  const tous = D.vus.flat();
  tous.forEach((v, k) => el.querySelector(`[data-j="${Math.floor(k / 5)}-${k % 5}"]`).classList.toggle('serre', tous.some((w, m) => m !== k && Math.hypot(v.x - w.x, v.y - w.y) < 6)));
  // Les coups : un trait du tueur à sa victime, le temps d'un éclair.
  const coups = T.evenements.filter(e => e.quoi === 'elim' && e.t <= t && t - e.t < COUP).map(e => {
    const a = D.vus[e.camp][e.tueur], b = D.vus[1 - e.camp][e.victime];
    return `<line class="tf-coup camp-${e.camp}" x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"/>`;
  }).join('');
  el.querySelector('.tf-marques').insertAdjacentHTML('beforeend', coups);
}

/* Les dix joueurs : leur champion, leur nom, leurs éliminations, morts et aides jusqu'ici, et leur or. */
function tableau(c, t) {
  const { joueurs, T, f } = D;
  const morts = positionsDe(T, f, t, D.rappels);
  const or = f.orJoueurs[Math.min(f.orJoueurs.length, Math.floor(t)) - 1] || [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
  return `<div class="dt-joueurs">${[0, 1].map(x => `<ol class="dt-camp ${x ? 'rouge' : 'bleu'}">${joueurs[x].map((j, i) => `<li class="${morts[x][i].mort ? 'mort' : ''}">
    <span class="dt-champ">${j.icone ? `<img src="${j.icone}" alt="" loading="lazy">` : initiales(j.n)}</span>
    <span class="dt-qui"><b>${esc(j.n.replace(/\s*\(.*\)$/, ''))}</b><small>${j.champion ? esc(j.champion) : ROLES[j.r]}</small></span>
    <span class="dt-kma">${c[x].j[i].k}/${c[x].j[i].m}/${c[x].j[i].a}<small>${(or[x][i] / 1000).toFixed(1).replace('.', ',')} k</small></span></li>`).join('')}</ol>`).join('')}</div>`;
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
  const { f, noms, lignes, t, el, toi } = D;
  const fini = t >= f.duree;
  const c = compte(f, t);
  const avance = f.courbe[Math.min(f.courbe.length, Math.floor(t)) - 1] || 0;
  const cote = x => `<div class="dt-equipe ${x ? 'rouge' : 'bleu'}${toi === x ? ' dt-toi' : ''}${fini && f.gagnant === x ? ' gagne' : ''}">
    <small>${x ? 'Rouge' : 'Bleu'}</small><b>${esc(noms[x])}</b>
    <span class="dt-obj">🏰 ${c[x].tours} · 🐉 ${c[x].dragons} · 🟣 ${c[x].barons}</span></div>`;
  const vus = lignes.filter(x => x.t <= t).reverse();
  const v = fini ? vedetteDe(f) : null;
  el.querySelector('.dt-tete').innerHTML = `<div class="direct-tete">${cote(0)}<div class="dt-centre"><b class="dt-k">${c[0].k}<span>–</span>${c[1].k}</b><span class="dt-horloge">${horloge(Math.min(t, f.duree))}</span>
      <small class="dt-or">${avance ? `${esc(avance > 0 ? noms[0] : noms[1])} +${(Math.abs(avance) / 1000).toFixed(1).replace('.', ',')} k` : 'Or égal'}</small></div>${cote(1)}</div>`;
  majCarte(t);
  el.querySelector('.dt-bas').innerHTML = `${tableau(c, t)}${courbe(f, t)}
    ${fini ? `<p class="dt-fin${toi === f.gagnant ? ' bon' : toi === null ? '' : ' mauvais'}"><b>Victoire de ${esc(noms[f.gagnant])}</b> en ${horloge(f.duree)} · ⭐ ${esc(v.n)} ${v.k}/${v.m}/${v.a}</p>` : ''}
    <ol class="dt-fil">${vus.map(x => `<li class="dt-ligne ${x.camp ? 'rouge' : 'bleu'}${x.quoi === 'nexus' ? ' nexus' : ''}${x.quoi === 'action' || x.quoi === 'pouvoir' ? ' dt-moment' : ''}"><span class="temps">${horloge(x.t)}</span><span>${esc(x.texte)}</span></li>`).join('') || '<li class="dt-ligne"><span class="temps">0:00</span><span>Les sbires arrivent dans leurs lignes. Bonne partie !</span></li>'}</ol>`;
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
 * `joueurs` : [bleu, rouge] → cinq { n, r, champion, icone } dans l'ordre de
 * la feuille ; `graine` : celle de la partie (le commentateur, la carte) ;
 * `toi` : ton camp (0, 1) ou null.
 */
export function ouvrirDirect(el, { feuille, noms, joueurs, graine, toi }) {
  arreter();
  const T = terrainDe(feuille, noms, graine);
  const champs = joueurs.map(eq => Object.fromEntries(eq.map(j => [j.r, j.champion])));
  // Le fil : le commentateur, le titre de chaque moment au bout de ses événements, et les pouvoirs du coach.
  const pouvoirs = feuille.pouvoirs.map(x => {
    const [coach, p] = pouvoirDe(x.id);
    return { t: x.t, quoi: 'pouvoir', camp: x.camp, texte: `${COACHS[coach].ico} ${p.nom} : ${p.condition}, le coach de ${noms[x.camp]} frappe` };
  });
  const lignes = [...commenter(feuille, noms, champs, graine), ...pouvoirs, ...T.actions.map(a => ({ t: a.t, quoi: 'action', camp: a.camp, texte: `${GENRES[a.genre][0]} ${a.texte}` }))]
    .sort((a, b) => a.t - b.t || (a.quoi === 'action') - (b.quoi === 'action'));
  // Où chacun est vu : à sa fontaine au départ ; il marche de là.
  const vus = [0, 1].map(c => [0, 1, 2, 3, 4].map(() => ({ x: BASES[c][0], y: BASES[c][1] })));
  D = { f: feuille, noms, joueurs, toi, el, T, lignes, t: 0, tVu: 0, vus, rappels: rappelsDe(T, feuille, graine), vitesse: VITESSES[0], minuterie: null };
  el.innerHTML = `<div class="dt-tete"></div>${carte(T, joueurs)}<div class="dt-bas"></div><div class="actionbar dt-gestes"></div>`;
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
