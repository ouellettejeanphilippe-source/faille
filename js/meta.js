/*
 * LE MÉTA : ce qui reste d'une run à l'autre (repris de Cap 82-0, « le méta »
 * de son js/rogue.js). Une run gagne des MÉDAILLES 🏅 ; elles achètent des
 * DÉBLOCAGES (ce que ta prochaine run aura de plus) et ton CLUB (son nom, sa
 * couleur) ; leur total à vie fait ton RANG. Chaque joueur passé chez toi
 * entre dans ta COLLECTION, avec ses galons.
 *
 * RIEN DE COMPTÉ, COMME LES JETONS. Le méta garde, pour chaque partie, son
 * RÉSUMÉ (resumeDe : ses splits joués, leurs trophées, galons et records, les
 * cartes passées chez toi) et la liste de tes achats ; les médailles, le
 * rang, la collection et le panthéon se recomptent de là. Noter une partie
 * deux fois la note pareil : un rechargement, une partie importée deux fois
 * ne paient jamais deux fois.
 *
 * LE MOTEUR N'EN SAIT RIEN. Les déblocages se posent au départ d'une run
 * (js/partie.js les garde dans sa sauvegarde, avec ton club) et passent par
 * les règles qui existent : des jetons de départ, une case du classeur, un
 * agent libre, un pack offert, un mandat pardonné, de meilleurs bouche-trous.
 * Aucune cote, aucun canal.
 *
 * Pur, sans DOM ni stockage : js/sauvegardes.js lit et écrit, l'écran montre.
 */

/* Ce que vaut un split joué, en médailles. */
export const MEDAILLES = { split: 1, mandat: 2, ronde: 1, titre: 3, run: 5 };

/* Les rangs, au total des médailles gagnées à vie (jamais dépensées). */
export const RANGS = [[0, 'Club de quartier'], [8, 'Académie'], [25, 'Équipe de ligue'], [50, 'Contendant'], [90, 'Puissance mondiale'], [150, 'Dynastie']];

/*
 * LES DÉBLOCAGES : ce qu'ils posent au départ d'une run (`effet`), leur prix
 * en médailles, le rang qu'ils demandent, et le déblocage qui doit précéder.
 */
export const DEBLOCAGES = {
  bourse: { ico: '🪙', nom: 'La bourse de départ', mot: '10 jetons de plus au départ de chaque run', prix: 6, rang: 0, effet: { jetons: 10 } },
  bouchetrous: { ico: '🧰', nom: 'Des bouche-trous moins pires', mot: 'les bouche-trous de ton pack de départ sortent un cran plus haut', prix: 8, rang: 0, effet: { bouchetrous: 1 } },
  coach: { ico: '🧑‍🏫', nom: 'Le coach d\'expérience', mot: 'ton coach commence la run au niveau 2', prix: 8, rang: 0, effet: { xp: 8, coachGratuit: 1 } },
  cadeau: { ico: '🎁', nom: 'Le cadeau du proprio', mot: 'un pack argent de cartes offert au premier split', prix: 8, rang: 1, effet: { cadeau: 1 } },
  classeur: { ico: '📒', nom: 'Une page de plus au classeur', mot: 'une case Pilier au départ de chaque run, tirée de ta collection', prix: 10, rang: 1, effet: { pilier: 1 } },
  depisteur: { ico: '🔎', nom: 'Le dépisteur chevronné', mot: 'un agent libre de plus à chaque journée', prix: 12, rang: 2, effet: { offre: 1 } },
  noyau: { ico: '🤝', nom: 'Le noyau', mot: 'une case de plus parmi ceux qui restent, entre deux splits', prix: 14, rang: 2, effet: { gardes: 1 } },
  mecene: { ico: '💰', nom: 'Le mécène', mot: '15 jetons de plus au départ de chaque run', prix: 16, rang: 3, apres: 'bourse', effet: { jetons: 15 } },
  etoile: { ico: '⭐', nom: 'La page des étoiles', mot: 'une case ★ Étoile au départ de chaque run, tirée de ta collection', prix: 18, rang: 3, apres: 'classeur', effet: { etoile: 1 } },
  sursis: { ico: '🕊️', nom: 'Le proprio patient', mot: 'le premier mandat manqué d\'une run ne la finit pas', prix: 20, rang: 3, effet: { sursis: 1 } },
};

/*
 * LES EXIGENCES 🔺 (Cap 82-0, l'Ascension de Slay the Spire) : après un
 * premier titre, une run peut partir plus haut. Chaque cran ajoute sa
 * contrainte à celles d'avant, par une règle qui existe, et ses médailles
 * valent PRIME_EXIGENCE de plus par cran. Gagner au plus haut ouvre le suivant.
 */
export const EXIGENCES = [
  { nom: 'Le proprio pressé', mot: 'chaque mandat monte d\'un cran : la demi-finale dès le premier split', effet: { mandat: 1 } },
  { nom: 'La bourse serrée', mot: '10 jetons de moins au départ', effet: { jetons: -10 } },
  { nom: 'Le plafond serré', mot: 'un point de moins sous le plafond', effet: { plafond: -1 } },
  { nom: 'Le classeur mince', mot: 'une case de moins au classeur, la meilleure', effet: { cases: -1 } },
  { nom: 'Le vestiaire mince', mot: 'un joueur de moins gardé entre deux splits', effet: { gardes: -1 } },
  { nom: 'Les packs chers', mot: 'les packs coûtent un quart de plus', effet: { cherte: 0.25 } },
];
export const PRIME_EXIGENCE = 0.25;

/*
 * Ce que posent des déblocages et `exig` crans d'exigences, sommés : { jetons, xp, coachGratuit, cadeau,
 * offre, gardes, sursis, mandat, plafond, cherte, bouchetrous, pilier, etoile, cases }. `coachGratuit` ne
 * sert qu'aux parties d'avant la version 4, où le coach s'achetait ; `xp`, l'expérience de départ du
 * coach-personnage ; `bouchetrous`, le cran du pack de départ ; `pilier`, `etoile`, `cases`, les cases du
 * classeur (js/partie.js casesDe) ; `gardes`, celles de ceux qui restent.
 */
export function effetDe(deb, exig = 0) {
  const e = { jetons: 0, xp: 0, coachGratuit: 0, cadeau: 0, offre: 0, gardes: 0, sursis: 0, mandat: 0, plafond: 0, cherte: 0, bouchetrous: 0, pilier: 0, etoile: 0, cases: 0 };
  const sources = [...deb.filter(id => DEBLOCAGES[id]).map(id => DEBLOCAGES[id].effet), ...EXIGENCES.slice(0, exig).map(x => x.effet)];
  for (const src of sources) for (const [k, v] of Object.entries(src)) e[k] += v;
  return e;
}

/*
 * TON CLUB : un nom (avec son code de trois lettres) et une couleur, inventés,
 * jamais empruntés à un vrai club. Cosmétique : la couleur teint la Faille de
 * l'interface, le nom est celui de ton cinq dans la ligue.
 */
export const CLUBS = {
  faille: { nom: 'Faille', code: 'FAI', prix: 0, rang: 0 },
  lynx: { nom: 'Les Lynx', code: 'LYX', prix: 4, rang: 0 },
  boreal: { nom: 'Boréal', code: 'BOR', prix: 4, rang: 0 },
  corsaires: { nom: 'Les Corsaires', code: 'COR', prix: 6, rang: 1 },
  orage: { nom: 'Orage', code: 'ORA', prix: 6, rang: 1 },
  spectres: { nom: 'Les Spectres', code: 'SPC', prix: 8, rang: 2 },
  aurore: { nom: 'Aurore', code: 'AUR', prix: 8, rang: 2 },
  phenix: { nom: 'Phénix', code: 'PHX', prix: 12, rang: 3 },
  nebuleuse: { nom: 'Nébuleuse', code: 'NEB', prix: 12, rang: 4 },
  dynastie: { nom: 'La Dynastie', code: 'DYN', prix: 20, rang: 5 },
};
export const COULEURS = {
  faille: { nom: 'Faille', hex: '#3fb6c9', prix: 0, rang: 0 },
  braise: { nom: 'Braise', hex: '#e8743b', prix: 3, rang: 0 },
  emeraude: { nom: 'Émeraude', hex: '#3fc98a', prix: 3, rang: 0 },
  amethyste: { nom: 'Améthyste', hex: '#a37cf0', prix: 5, rang: 1 },
  cramoisi: { nom: 'Cramoisi', hex: '#e0525e', prix: 5, rang: 1 },
  glacier: { nom: 'Glacier', hex: '#8ec9ff', prix: 7, rang: 2 },
  neon: { nom: 'Rose néon', hex: '#f06bbd', prix: 7, rang: 2 },
  royal: { nom: 'Or royal', hex: '#d9b04a', prix: 12, rang: 4 },
};

/* Ce qu'un achat est : un déblocage, un club ou une couleur. */
const ARTICLES = { deb: DEBLOCAGES, club: CLUBS, couleur: COULEURS };
const article = cle => { const [genre, id] = cle.split(':'); return ARTICLES[genre] && ARTICLES[genre][id] ? { genre, id, ...ARTICLES[genre][id] } : null; };

/*
 * LES DEUX MODES (Cap 82-0 : le 82-0 et le Rogue). Le 18-0 : juste le repêchage à la roulette, le split d'un
 * coup, les séries partie par partie, aucune carte ni décision ; il compte à la collection, pas aux médailles.
 * Le Rogue : la run, qui part faible (le classeur, le pack de départ) et se bâtit.
 */
export const MODES = { rogue: { nom: 'Le Rogue', mot: 'La run : un départ faible, le jour à jour, ton coach, le marché, les cartes ; le proprio fixe ton mandat, split après split.' },
  dixhuit: { nom: 'Le 18-0', mot: 'Juste le repêchage : la roulette, ton cinq sous le plafond, puis le split d\'un coup et les séries partie par partie. Aucune carte, aucune décision.' } };
export const modeDe = m => (MODES[m.mode] ? m.mode : 'rogue');

export const nouveauMeta = () => ({ v: 1, parties: {}, achats: [], club: 'faille', couleur: 'faille', exig: 0, coach: 'agresseur', mode: 'rogue', vedette: null });

/** Ton joueur de concession (la clé de sa carte) : choisi à la première run, il revient à chaque départ. */
export const vedetteDe = m => m.vedette || null;
export function choisirVedette(m, cle) {
  if (m.vedette || typeof cle !== 'string' || cle.split('|').length !== 4) return false;
  m.vedette = cle;
  return true;
}

/** Le club que portera la prochaine run : { nom, code, couleur }. */
export function clubDe(m) {
  const c = CLUBS[m.club] || CLUBS.faille;
  return { nom: c.nom, code: c.code, couleur: (COULEURS[m.couleur] || COULEURS.faille).hex };
}

/** Le coach que prendra la prochaine run (un id de COACHS, js/rogue.js). */
export const coachDe = m => m.coach || 'agresseur';

/** Les déblocages achetés : ce que la prochaine run aura de plus. */
export const deblocagesDe = m => m.achats.filter(c => c.startsWith('deb:')).map(c => c.slice(4)).filter(id => DEBLOCAGES[id]);
export const possede = (m, genre, id) => (genre !== 'deb' && ARTICLES[genre][id].prix === 0) || m.achats.includes(`${genre}:${id}`);

/* Les médailles d'une partie résumée, la prime de ses exigences comprise. */
export function medaillesDeLaPartie(r) {
  if (r.mode === 'dixhuit') return 0;
  const base = r.passes.reduce((s, p) => s + MEDAILLES.split + (p.rempli ? MEDAILLES.mandat : 0) + (p.rondes || 0) * MEDAILLES.ronde + (p.champion ? MEDAILLES.titre : 0), 0)
    + (r.fin === 'gagnee' ? MEDAILLES.run : 0);
  return Math.round(base * (1 + PRIME_EXIGENCE * (r.exig || 0)));
}

/** Le plus haut cran d'exigences ouvert : un de plus que le plus haut gagné ; aucun avant un premier titre. */
export function exigenceMax(m) {
  const gagnees = Object.values(m.parties).filter(r => r.fin === 'gagnee');
  return gagnees.length ? Math.min(EXIGENCES.length, Math.max(...gagnees.map(r => r.exig || 0)) + 1) : 0;
}

/** Le cran d'exigences que portera la prochaine run (celui choisi, borné par ce qui est ouvert). */
export const exigenceDe = m => Math.min(m.exig || 0, exigenceMax(m));

/** Choisit le cran d'exigences de la prochaine run ; faux s'il n'est pas ouvert. */
export function choisirExigence(m, n) {
  if (!(n >= 0 && n <= exigenceMax(m))) return false;
  m.exig = n;
  return true;
}

/** Les médailles : gagnées à vie, dépensées, et ce qui reste. */
export function medailles(m) {
  const gagnees = Object.values(m.parties).reduce((s, r) => s + medaillesDeLaPartie(r), 0);
  const depensees = m.achats.reduce((s, c) => s + (article(c) ? article(c).prix : 0), 0);
  return { gagnees, depensees, reste: gagnees - depensees };
}

/** Le rang : son numéro (0 à 5), son nom, et ce qui manque pour le suivant. */
export function rangDe(m) {
  const { gagnees } = medailles(m);
  const k = RANGS.filter(([s]) => gagnees >= s).length - 1;
  const suivant = RANGS[k + 1];
  return { k, nom: RANGS[k][1], suivant: suivant ? { nom: suivant[1], manque: suivant[0] - gagnees } : null };
}

/** Pourquoi un article ne s'achète pas (null : il s'achète). `cle` : « deb:bourse », « club:lynx », « couleur:braise ». */
export function refusAchat(m, cle) {
  const a = article(cle);
  if (!a) return 'inconnu';
  if (possede(m, a.genre, a.id)) return 'déjà à toi';
  if (rangDe(m).k < a.rang) return `rang ${RANGS[a.rang][1]}`;
  if (a.apres && !m.achats.includes(`deb:${a.apres}`)) return `après ${DEBLOCAGES[a.apres].nom.toLowerCase()}`;
  if (medailles(m).reste < a.prix) return `${a.prix} 🏅`;
  return null;
}

/** Achète un article ; faux s'il ne s'achète pas. */
export function acheter(m, cle) {
  if (refusAchat(m, cle)) return false;
  m.achats.push(cle);
  return true;
}

/** Porte un club ou une couleur déjà à toi, pour la prochaine run. */
export function porter(m, genre, id) {
  if (!ARTICLES[genre] || !ARTICLES[genre][id] || genre === 'deb' || !possede(m, genre, id)) return false;
  m[genre] = id;
  return true;
}

/*
 * LE RÉSUMÉ D'UNE PARTIE (js/partie.js) : ce que le méta en garde. Ses
 * splits joués (leurs trophées, galons et records y sont déjà, gravés au
 * bilan), sa fin, et les cartes passées chez toi.
 */
export const resumeDe = (P, debut) => ({
  graine: P.graine, debut, club: P.club, deb: P.deb, exig: P.exig, mode: P.mode, fin: P.run.fin, n: P.run.n,
  passes: P.run.passes, cartes: P.cartes,
});

/** Note une partie (idempotent : la même partie se note pareil). Vrai si le résumé a changé. */
export function noter(m, pid, P, debut = Date.now()) {
  if (!P.run.passes.length && !P.cartes.length) return false;
  const avant = m.parties[pid];
  const r = resumeDe(P, avant ? avant.debut : debut);
  const change = !avant || JSON.stringify(avant) !== JSON.stringify(r);
  m.parties[pid] = r;
  return change;
}

/*
 * LA COLLECTION. Une carte par joueur d'un split (sa clé : split|équipe|nom|rôle) ; son ÉDITION suit ses copies
 * (Cap 82-0, js/rarete.js `EDITIONS` : Base, Cadre, Hors-cadre, Or, Holo — chacune change la carte entière,
 * js/fiche.js). [copies qu'il faut, le nom, l'id de la classe `ed-…`].
 */
export const EDITIONS = [[8, 'Holo', 'holo'], [5, 'Or', 'or'], [3, 'Hors-cadre', 'hors'], [2, 'Cadre', 'cadre'], [1, 'Base', 'base']];
export const editionDe = copies => (EDITIONS.find(([n]) => copies >= n) || EDITIONS[EDITIONS.length - 1])[1];

/** La collection recomptée : Map(clé → { copies, galons: [{ id, quoi, run }] }). */
export function collectionDe(m) {
  const c = new Map();
  const runs = Object.values(m.parties).sort((a, b) => a.debut - b.debut);
  runs.forEach((r, k) => {
    for (const cle of r.cartes) {
      const x = c.get(cle) || { copies: 0, galons: [] };
      x.copies++;
      c.set(cle, x);
    }
    for (const p of r.passes) {
      for (const g of p.galons || []) {
        const x = c.get(g.cle) || { copies: 0, galons: [] };
        x.galons.push({ id: g.id, quoi: g.quoi, run: k + 1 });
        c.set(g.cle, x);
      }
    }
  });
  return c;
}

/** Tes runs, de la plus récente à la plus ancienne : [{ pid, ...résumé, medailles }]. */
export const runsDe = m => Object.entries(m.parties).map(([pid, r]) => ({ pid, ...r, medailles: medaillesDeLaPartie(r) })).sort((a, b) => b.debut - a.debut);

/*
 * LE PANTHÉON : le meilleur de toutes tes runs, record par record
 * (js/palmares.js recordsDuSplit), et les trophées de tes joueurs.
 * `moins` : les records où moins, c'est mieux.
 */
export function pantheonDe(m, moins = new Set(['eclair'])) {
  const records = {};
  const trophees = [];
  runsDe(m).slice().reverse().forEach((r, k) => {
    for (const p of r.passes) {
      for (const [id, x] of Object.entries(p.records || {})) {
        const avant = records[id];
        if (!avant || (moins.has(id) ? x.val < avant.val : x.val > avant.val)) records[id] = { ...x, run: k + 1, split: p.n, club: r.club ? r.club.nom : null };
      }
      for (const t of p.trophees || []) trophees.push({ ...t, run: k + 1, split: p.n });
    }
  });
  return { records, trophees };
}
