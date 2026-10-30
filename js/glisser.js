/*
 * LES GESTES DU DOIGT (repris de Cap 82-0 ; JP : *navigation plus fluide sur mobile avec swipe*).
 *
 * BALAYER D'UN ONGLET À L'AUTRE. Un geste horizontal franc (au moins SEUIL pixels, deux fois plus large que haut) passe
 * à l'onglet voisin de la barre la plus proche du doigt : la plus basse de l'écran (les vues des Joueurs), sinon les
 * sous-onglets de la section (Boîte, Proprio, Coach…), sinon les sections. Au bout d'une barre, on passe à la section
 * voisine. Le geste TOUCHE l'onglet comme un doigt l'aurait fait : chaque écran garde sa logique. Ce qui se balaie déjà en
 * largeur (un tableau, une barre d'onglets qui défile, la Faille du direct) garde son geste ; une couche posée par-dessus
 * ne balaie pas les sections.
 *
 * LE GESTE SE VOIT. Dès que le doigt part en largeur, le nom de l'onglet où il mène sort du bord sous lui
 * (`.glisse-indice`) et se remplit au seuil : on sait où l'on va avant de lâcher. Un coup vif compte même court (`VIF`).
 * Une carte soulevée (js/deposer.js, `carte-soulevee`) n'est pas un balayage.
 *
 * TIRER UNE COUCHE VERS LE BAS LA FERME, comme un téléphone ferme une feuille : depuis le haut de son contenu, elle suit
 * le doigt ; lâchée assez bas (ou d'un coup vif), elle fait le même retour d'un niveau qu'Échap et le bouton d'Android
 * (`retour`, js/pile.js). Le direct et l'ouverture d'un pack ont leurs propres gestes : on ne les tire pas.
 */
import { retour } from './pile.js';

const SEUIL = 60;
const VIF = { px: 28, ms: 250 };     // un coup vif : au moins 28 px en moins de 250 ms
const TIRE = { px: 110, ms: 260 };   // la couche se ferme tirée de 110 px, ou d'un coup vif
const visible = el => !!el && !el.hidden && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
const ongletsDe = barre => [...barre.querySelectorAll('button')].filter(b => visible(b) && !b.disabled);
const actif = liste => liste.findIndex(b => b.classList.contains('on'));
/* Le doigt part de quelque chose qui a son propre geste en largeur. */
function aSonGeste(el) {
  for (let x = el; x && x !== document.body; x = x.parentElement) {
    if (x.matches('input, textarea, select, canvas, .sousnav, #direct, #ouverture')) return true;
    if (x.scrollWidth > x.clientWidth + 4 && /(auto|scroll)/.test(getComputedStyle(x).overflowX)) return true;
  }
  return false;
}
/* Les couches qu'on tire pour fermer. */
const COUCHE = '.couche:not(#direct, #ouverture)';
/* L'onglet où mène un balayage : la barre la plus basse de l'écran du split, sinon la section voisine — jamais depuis une
   couche posée par-dessus. */
function destination(cible, sens) {
  if (cible.closest && cible.closest('.couche')) return null;
  const barres = [...document.querySelectorAll('#split .sousnav')].filter(b => visible(b) && actif(ongletsDe(b)) >= 0);
  for (const b of barres.reverse()) {
    const liste = ongletsDe(b), i = actif(liste);
    if (liste[i + sens]) return liste[i + sens];
  }
  const nav = document.getElementById('nav');
  if (!visible(nav)) return null;
  const liste = ongletsDe(nav), i = actif(liste);
  return i < 0 ? null : liste[i + sens] || null;
}
const nomDe = b => ((b.querySelector('.navtab-lbl') || b).textContent || '').trim();

/* L'indice sous le doigt : le nom de l'onglet où l'on va, qui sort du bord avec le geste et se remplit au seuil. */
function montrerIndice(geste, dx) {
  const sens = dx < 0 ? 1 : -1;
  if (geste.sens !== sens) {
    geste.sens = sens;
    geste.vers = destination(geste.cible, sens);
    if (geste.indice) { geste.indice.remove(); geste.indice = null; }
    if (geste.vers) {
      const el = document.createElement('div');
      el.className = 'glisse-indice';
      el.setAttribute('aria-hidden', 'true');
      el.dataset.cote = sens > 0 ? 'd' : 'g';
      el.textContent = sens > 0 ? `${nomDe(geste.vers)} ›` : `‹ ${nomDe(geste.vers)}`;
      document.body.appendChild(el);
      geste.indice = el;
    }
  }
  if (!geste.indice) return;
  const p = Math.min(1, Math.abs(dx) / SEUIL);
  geste.indice.style.transform = `translate(${(sens > 0 ? 1 : -1) * (1 - p) * 100}%, -50%)`;
  if ((p >= 1) !== geste.indice.classList.contains('pret')) {
    geste.indice.classList.toggle('pret', p >= 1);
    if (p >= 1 && navigator.vibrate) navigator.vibrate(6);
  }
}
/* Le haut du contenu sous le doigt : rien entre lui et la couche n'est défilé. */
function auHaut(el, couche) {
  for (let x = el; x; x = x.parentElement) {
    if (x.scrollTop > 0) return false;
    if (x === couche) return true;
  }
  return true;
}
function relacherCouche(c, fermer) {
  c.style.transition = 'transform 200ms ease-out';
  c.style.transform = '';
  setTimeout(() => { c.style.transition = ''; }, 220);
  if (fermer) retour();
}

export function brancherGlisser() {
  let geste = null;
  const finir = () => {
    if (geste && geste.indice) geste.indice.remove();
    if (geste && geste.couche && geste.mode === 'tire') relacherCouche(geste.couche, false);
    geste = null;
  };
  document.addEventListener('carte-soulevee', finir);
  document.addEventListener('touchstart', ev => {
    finir();
    if (ev.touches.length !== 1) return;
    const t = ev.touches[0], cible = ev.target;
    const couche = cible.closest && cible.closest(COUCHE);
    const tirable = !!couche && !cible.closest('input, textarea, select, canvas') && auHaut(cible, couche);
    const balayable = !aSonGeste(cible);
    if (!tirable && !balayable) return;
    geste = { x: t.clientX, y: t.clientY, t0: ev.timeStamp, cible, couche: tirable ? couche : null, balayable, mode: null, sens: 0, vers: null, indice: null };
  }, { passive: true });
  document.addEventListener('touchmove', ev => {
    if (!geste || geste.mode === 'defile') return;
    const t = ev.touches[0], dx = t.clientX - geste.x, dy = t.clientY - geste.y;
    if (!geste.mode) {
      // Vers le bas depuis le haut d'une couche : on la tire (la page ne rebondit pas pendant qu'on décide).
      if (geste.couche && dy > 0 && dy >= 1.2 * Math.abs(dx)) {
        if (ev.cancelable) ev.preventDefault();
        if (dy > 8) geste.mode = 'tire';
        else return;
      } else if (geste.balayable && Math.abs(dx) > 12 && Math.abs(dx) > 1.5 * Math.abs(dy)) geste.mode = 'balaie';
      else if (Math.abs(dy) > 12 || Math.abs(dx) > 12) { geste.mode = 'defile'; return; }
      else return;
    }
    if (geste.mode === 'tire') {
      if (ev.cancelable) ev.preventDefault();
      // La couche suit le doigt vers le bas ; vers le haut, elle résiste.
      geste.couche.style.transition = 'none';
      geste.couche.style.transform = `translateY(${dy > 0 ? dy : dy / 4}px)`;
    } else montrerIndice(geste, dx);
  }, { passive: false });
  document.addEventListener('touchend', ev => {
    if (!geste) return;
    const g = geste;
    geste = null;
    if (g.indice) g.indice.remove();
    const t = ev.changedTouches[0], dx = t.clientX - g.x, dy = t.clientY - g.y, ms = ev.timeStamp - g.t0;
    if (g.mode === 'tire') { relacherCouche(g.couche, dy >= TIRE.px || (dy >= VIF.px && ms <= TIRE.ms)); return; }
    if (g.mode !== 'balaie' || Math.abs(dx) < 2 * Math.abs(dy)) return;
    if (Math.abs(dx) < SEUIL && !(Math.abs(dx) >= VIF.px && ms <= VIF.ms)) return;
    const vers = g.vers && g.sens === (dx < 0 ? 1 : -1) ? g.vers : destination(g.cible, dx < 0 ? 1 : -1);
    if (!vers) return;
    vers.click();
    vers.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, { passive: true });
  document.addEventListener('touchcancel', finir, { passive: true });
}
