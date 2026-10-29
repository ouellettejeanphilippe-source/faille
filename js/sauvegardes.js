/*
 * LES PARTIES SAUVEGARDÉES (repris de Cap 82-0, js/sauvegardes.js) —
 * plusieurs, et le méta à côté.
 *
 * Un INDEX (`faille-parties`) dit quelle partie est active et, pour chacune,
 * son titre et un résumé lisible au menu ; chaque partie a sa clé
 * (`faille-partie-<id>`) qui porte sa sauvegarde (js/partie.js : la graine,
 * les déblocages, le club, le journal). Une partie pèse quelques ko : elle se
 * rejoue de sa graine. La partie unique d'avant (`faille-partie`) entre une
 * fois dans l'index.
 *
 * Une partie s'EXPORTE en fichier (pour un autre appareil) et un tel fichier
 * s'importe : il garde son id, donc une partie importée deux fois reste une
 * partie, et le méta ne la paie qu'une fois (js/meta.js).
 *
 * Le navigateur peut refuser le stockage (navigation privée) : tout est dans
 * un try, le jeu continue sans. Ce module ne touche pas au DOM.
 */
const INDEX = 'faille-parties';
const ANCIENNE = 'faille-partie';
const META = 'faille-meta';
const OPTIONS = 'faille-options';
const cle = id => `faille-partie-${id}`;

const lire = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const ecrire = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const effacer = k => { try { localStorage.removeItem(k); } catch { /* rien à effacer */ } };

/** L'index : { actif, parties: [{ id, titre, resume, cree, maj }] }. */
export function lireIndex() {
  const ix = lire(INDEX);
  return ix && Array.isArray(ix.parties) ? ix : { actif: null, parties: [] };
}

/** La partie unique d'avant l'index y entre une fois, sous l'id donné. */
export function migrer(id) {
  const vieille = lire(ANCIENNE);
  if (!vieille) return;
  const ix = lireIndex();
  if (ecrire(cle(id), vieille)) {
    ix.parties.push({ id, titre: 'Ta run', resume: null, cree: Date.now(), maj: Date.now() });
    ix.actif = ix.actif || id;
    ecrire(INDEX, ix);
    effacer(ANCIENNE);
  }
}

export const lirePartie = id => (id ? lire(cle(id)) : null);
export const partieActive = () => { const ix = lireIndex(); return ix.parties.find(p => p.id === ix.actif) || null; };

/** Écrit une partie (la crée au besoin) et la rend active. */
export function ecrirePartie(id, sv, titre, resume) {
  const ix = lireIndex();
  let e = ix.parties.find(p => p.id === id);
  if (!e) { e = { id, cree: Date.now() }; ix.parties.push(e); }
  Object.assign(e, { titre, resume, maj: Date.now() });
  ix.actif = id;
  ecrire(cle(id), sv);
  ecrire(INDEX, ix);
}

/** Rend une partie active ; null pour n'en avoir aucune (l'écran titre, sans « Continuer »). */
export function activer(id) {
  const ix = lireIndex();
  ix.actif = id;
  ecrire(INDEX, ix);
}

export function supprimer(id) {
  const ix = lireIndex();
  ix.parties = ix.parties.filter(p => p.id !== id);
  if (ix.actif === id) ix.actif = null;
  effacer(cle(id));
  ecrire(INDEX, ix);
}

/** Le fichier d'une partie, en texte : son id, son titre, sa sauvegarde. */
export function exporter(id) {
  const e = lireIndex().parties.find(p => p.id === id);
  return JSON.stringify({ faille: 1, id, titre: e ? e.titre : 'Ta run', resume: e ? e.resume : null, sv: lirePartie(id) });
}

/** Importe un fichier de partie ; rend son id. Lance une erreur si ce n'en est pas un. */
export function importer(texte) {
  let f;
  try { f = JSON.parse(texte); } catch { throw new Error('ce fichier n\'est pas une partie de Faille'); }
  if (!f || f.faille !== 1 || typeof f.id !== 'string' || !f.sv || !Array.isArray(f.sv.log)) throw new Error('ce fichier n\'est pas une partie de Faille');
  ecrirePartie(f.id, f.sv, f.titre || 'Ta run', f.resume || null);
  return f.id;
}

/* LE MÉTA (js/meta.js) et les options : à côté des parties. */
export const lireMeta = () => lire(META);
export const ecrireMeta = m => ecrire(META, m);
export const lireOptions = () => ({ sons: true, ...(lire(OPTIONS) || {}) });
export const ecrireOptions = o => ecrire(OPTIONS, o);
