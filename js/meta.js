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
 * les règles qui existent : des jetons de départ, une relance, un gardé, un
 * agent libre, un pack offert, un coach payé, un mandat pardonné. Aucune
 * cote, aucun canal.
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
  coach: { ico: '🧑‍🏫', nom: 'Le coach fidèle', mot: 'le premier coach de la run ne coûte rien', prix: 8, rang: 0, effet: { coachGratuit: 1 } },
  cadeau: { ico: '🎁', nom: 'Le cadeau du proprio', mot: 'un pack argent de cartes offert au premier split', prix: 8, rang: 1, effet: { cadeau: 1 } },
  roulette: { ico: '🎲', nom: 'La roulette généreuse', mot: 'une relance de plus de chaque sorte, à chaque repêchage', prix: 10, rang: 1, effet: { relances: 1 } },
  depisteur: { ico: '🔎', nom: 'Le dépisteur chevronné', mot: 'un agent libre de plus à chaque journée', prix: 12, rang: 2, effet: { offre: 1 } },
  noyau: { ico: '🤝', nom: 'Le noyau', mot: 'un joueur de plus gardé entre deux splits', prix: 14, rang: 2, effet: { gardes: 1 } },
  mecene: { ico: '💰', nom: 'Le mécène', mot: '15 jetons de plus au départ de chaque run', prix: 16, rang: 3, apres: 'bourse', effet: { jetons: 15 } },
  sursis: { ico: '🕊️', nom: 'Le proprio patient', mot: 'le premier mandat manqué d\'une run ne la finit pas', prix: 20, rang: 3, effet: { sursis: 1 } },
};

/** Ce que posent des déblocages, sommés : { jetons, coachGratuit, cadeau, relances, offre, gardes, sursis }. */
export function effetDe(deb) {
  const e = { jetons: 0, coachGratuit: 0, cadeau: 0, relances: 0, offre: 0, gardes: 0, sursis: 0 };
  for (const id of deb) if (DEBLOCAGES[id]) for (const [k, v] of Object.entries(DEBLOCAGES[id].effet)) e[k] += v;
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

export const nouveauMeta = () => ({ v: 1, parties: {}, achats: [], club: 'faille', couleur: 'faille' });

/** Le club que portera la prochaine run : { nom, code, couleur }. */
export function clubDe(m) {
  const c = CLUBS[m.club] || CLUBS.faille;
  return { nom: c.nom, code: c.code, couleur: (COULEURS[m.couleur] || COULEURS.faille).hex };
}

/** Les déblocages achetés : ce que la prochaine run aura de plus. */
export const deblocagesDe = m => m.achats.filter(c => c.startsWith('deb:')).map(c => c.slice(4)).filter(id => DEBLOCAGES[id]);
export const possede = (m, genre, id) => (genre !== 'deb' && ARTICLES[genre][id].prix === 0) || m.achats.includes(`${genre}:${id}`);

/* Les médailles d'une partie résumée. */
export function medaillesDeLaPartie(r) {
  return r.passes.reduce((s, p) => s + MEDAILLES.split + (p.rempli ? MEDAILLES.mandat : 0) + (p.rondes || 0) * MEDAILLES.ronde + (p.champion ? MEDAILLES.titre : 0), 0)
    + (r.fin === 'gagnee' ? MEDAILLES.run : 0);
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
  graine: P.graine, debut, club: P.club, deb: P.deb, fin: P.run.fin, n: P.run.n,
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

/* LA COLLECTION. Une carte par joueur d'un split (sa clé : split|équipe|nom|rôle) ; sa finition suit ses copies. */
export const FINITIONS = [[5, 'Holo'], [3, 'Or'], [2, 'Argent'], [1, 'Base']];
export const finitionDe = copies => (FINITIONS.find(([n]) => copies >= n) || FINITIONS[FINITIONS.length - 1])[1];

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
