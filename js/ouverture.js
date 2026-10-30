/*
 * L'OUVERTURE D'UN PACK (Cap 82-0, js/gerant.js `brancherPaquet` ; JP : *ouverture de pack avec du juice*).
 * Un pack ne se lit pas dans une liste : il s'ouvre, en plein écran, au-dessus de tout.
 *
 *   fermé      le paquet flotte, sa lueur dit ce qu'il cache (bleu, blanc, or) ; « Touche pour ouvrir » ;
 *   déchiré    il tremble, le rabat part, la lumière éclate, des éclats volent (DECHIRE ms) ;
 *   la pile    les cartes une à une, la meilleure en dernier : celle du dessus en grand se retourne, deux autres
 *              face cachée derrière ; elle se glisse au doigt, se touche, ou Entrée, Espace, → ;
 *   le walkout quand la dernière est une ★ (ou une carte légendaire), trois temps sur des rayons qui tournent —
 *              l'année, le rôle, le logo — avant qu'elle monte ; un toucher saute l'annonce ;
 *   l'étalage  toutes les cartes à plat, puis « Continuer », qui rend l'écran d'où le pack est parti.
 *
 * Le module ne décide de rien : le pack est déjà tiré et appliqué (le journal le garde) ; on le dévoile.
 * Rien de son spectacle ne tire un dé : les éclats ont des angles fixes.
 */
import { esc } from './util.js';
import { jouerSon } from './sons.js';

const DECHIRE = 460;
const WALKOUT_PAS = 650;
const GLISSE = 60;      // px : un glissé plus court revient en place
const ECLATS = 16;

/**
 * Le paquet, petit (une tuile de la boutique) ou grand (l'ouverture) : son métal, sa marque, ce qu'il contient.
 * `metal` : bronze, argent, or, recrues, pros, legendes, depart.
 */
export const paquetHtml = (metal, marque, n) => `<span class="paquet-corps paquet-${metal}">
  <span class="paquet-rabat paquet-haut" aria-hidden="true"></span>
  <span class="paquet-face"><span class="paquet-faille" aria-hidden="true"></span>
    <span class="paquet-marque"><small>Faille</small><b>${esc(marque)}</b></span><span class="paquet-n">${esc(n)}</span></span>
  <span class="paquet-rabat paquet-bas" aria-hidden="true"></span>
</span>`;

let fermerActif = null;

/**
 * Ouvre un pack dans `el` (la couche #ouverture). `pack` : { metal, marque, n, titre, sous } ; `cartes` :
 * [{ html, eclat }] dans l'ordre du dévoilement (eclat 0 ordinaire, 1 rare, 2 la vedette) ; `walkout` :
 * [trois morceaux de HTML] annoncés avant la dernière, ou null ; `fin` : rappelé quand on continue.
 */
export function ouvrirPaquet(el, { pack, cartes, walkout = null, fin }) {
  if (fermerActif) fermerActif(false);
  const n = cartes.length;
  const meilleur = Math.max(0, ...cartes.map(c => c.eclat));
  el.innerHTML = `<div class="ouv etat-ferme lueur-${meilleur}">
    <header class="ouv-tete"><small>${esc(pack.sous)}</small><b>${esc(pack.titre)}</b></header>
    <div class="ouv-scene">
      <button type="button" class="paquet" aria-label="Ouvrir le pack"><span class="paquet-lueur" aria-hidden="true"></span>${paquetHtml(pack.metal, pack.marque, pack.n)}<span class="paquet-mot">Touche pour ouvrir</span></button>
      <span class="ouv-eclats" aria-hidden="true">${Array.from({ length: ECLATS }, (_, k) => `<i style="--a:${Math.round((360 * k) / ECLATS + (k % 3) * 7)}deg;--d:${90 + (k % 4) * 28}px"></i>`).join('')}</span>
      <div class="ouv-pile">${cartes.map((c, k) => `<div class="ouv-carte" data-k="${k}" data-eclat="${c.eclat}"><span class="ouv-dos" aria-hidden="true"><span class="paquet-faille"></span><b>Faille</b></span><div class="ouv-face">${c.html}</div></div>`).join('')}</div>
      <div class="ouv-etalage" data-n="${n}">${cartes.map(c => `<div class="ouv-mini" data-eclat="${c.eclat}">${c.html}</div>`).join('')}</div>
    </div>
    <p class="ouv-points" aria-hidden="true"></p>
    <div class="actionbar"><button type="button" class="ouv-tout"${n < 2 ? ' hidden' : ''}>Tout voir</button><button type="button" class="go ouv-fin" hidden>Continuer</button></div>
  </div>`;
  el.hidden = false;
  const racine = el.querySelector('.ouv');
  const scene = el.querySelector('.ouv-scene');
  const pile = [...el.querySelectorAll('.ouv-carte')];
  const points = el.querySelector('.ouv-points');
  let etat = 'ferme', cur = 0, minuteur = 0, x0 = null, dx = 0;
  const mettre = e => { etat = e; racine.className = `ouv etat-${e} lueur-${meilleur}`; };

  const poser = () => {
    pile.forEach((c, k) => { c.dataset.pile = k < cur ? 'passee' : k - cur > 2 ? 'loin' : String(k - cur); c.classList.remove('retournee'); });
    points.innerHTML = n > 1 ? pile.map((_, k) => `<i class="${k === cur ? 'on' : k < cur ? 'vu' : ''}"></i>`).join('') : '';
  };
  const montrer = () => {
    el.querySelector('.walkout')?.remove();
    mettre('pile');
    poser();
    const c = pile[cur];
    // Elle se retourne un instant après être montée : le dos, puis la face.
    requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add('retournee')));
    const e = Number(c.dataset.eclat);
    jouerSon(e === 2 ? 'eclat' : e === 1 ? 'rare' : 'retourne');
    if (e === 2) { scene.classList.remove('flash'); void scene.offsetWidth; scene.classList.add('flash'); }
  };
  const annoncer = () => {
    mettre('walkout');
    poser();
    const wo = document.createElement('div');
    wo.className = 'walkout';
    wo.setAttribute('aria-hidden', 'true');
    wo.innerHTML = walkout.map(x => `<span class="wo-pas">${x}</span>`).join('');
    scene.appendChild(wo);
    walkout.forEach((_, i) => setTimeout(() => { if (etat === 'walkout') { wo.dataset.pas = String(i + 1); jouerSon(i < walkout.length - 1 ? 'battement' : 'eclat'); } }, i * WALKOUT_PAS));
    minuteur = setTimeout(() => { if (etat === 'walkout') montrer(); }, walkout.length * WALKOUT_PAS + 300);
  };
  const suivante = () => (walkout && cur === n - 1 && n > 0 ? annoncer() : montrer());
  const etaler = () => {
    clearTimeout(minuteur);
    el.querySelector('.walkout')?.remove();
    mettre('etale');
    points.innerHTML = '';
    el.querySelector('.ouv-tout').hidden = true;
    const f = el.querySelector('.ouv-fin');
    f.hidden = false;
    f.focus({ preventScroll: true });
    jouerSon('signer');
  };
  const ouvrir = () => {
    mettre('dechire');
    jouerSon('dechire');
    minuteur = setTimeout(() => { if (n) suivante(); else etaler(); }, DECHIRE);
  };
  const avancer = (sens = 'g') => {
    if (etat === 'ferme') { ouvrir(); return; }
    if (etat === 'dechire') { clearTimeout(minuteur); if (n) suivante(); else etaler(); return; }
    if (etat === 'walkout') { clearTimeout(minuteur); montrer(); return; }
    if (etat !== 'pile') return;
    if (cur >= n - 1) { etaler(); return; }
    pile[cur].dataset.sens = sens;
    cur++;
    suivante();
  };
  const fermer = (rappeler = true) => {
    clearTimeout(minuteur);
    window.removeEventListener('keydown', clavier, true);
    fermerActif = null;
    el.hidden = true;
    el.innerHTML = '';
    if (rappeler && fin) fin();
  };
  fermerActif = fermer;

  // Le doigt : la carte du dessus suit le glissé ; assez loin, elle part de son côté ; sinon, un toucher avance.
  const dessus = () => pile[cur];
  scene.addEventListener('pointerdown', ev => {
    if (etat !== 'pile') return;
    x0 = ev.clientX; dx = 0;
    dessus().classList.add('glisse');
  });
  scene.addEventListener('pointermove', ev => {
    if (x0 === null) return;
    dx = ev.clientX - x0;
    dessus().style.setProperty('--glisse', String(dx));
  });
  const lacher = () => {
    if (x0 === null) return;
    const c = dessus();
    c.classList.remove('glisse');
    x0 = null;
    if (Math.abs(dx) < 8) { c.style.removeProperty('--glisse'); avancer(); return; }
    if (Math.abs(dx) >= GLISSE) avancer(dx > 0 ? 'd' : 'g');
    else c.style.removeProperty('--glisse');
  };
  scene.addEventListener('pointerup', lacher);
  scene.addEventListener('pointercancel', lacher);
  scene.addEventListener('click', ev => { if (etat !== 'pile' && etat !== 'etale' && !ev.target.closest('.ouv-etalage')) avancer(); });
  el.querySelector('.ouv-tout').addEventListener('click', etaler);
  el.querySelector('.ouv-fin').addEventListener('click', () => fermer());
  const clavier = ev => {
    if (el.hidden) return;
    if (['Enter', ' ', 'ArrowRight'].includes(ev.key) && etat !== 'etale') { ev.preventDefault(); ev.stopPropagation(); avancer(); }
  };
  window.addEventListener('keydown', clavier, true);
  el.querySelector('.paquet').focus({ preventScroll: true });
  return fermer;
}

/** Le retour (Échap, ‹ Retour) pendant une ouverture : le pack se referme, et l'écran d'où il est parti montre ses cartes. */
export function fermerPaquet() {
  if (!fermerActif) return false;
  fermerActif();
  return true;
}
