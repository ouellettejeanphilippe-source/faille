/*
 * LA FAILLE AU DIRECT : où se passe ce que la feuille dit (la glace de Cap
 * 82-0, js/glace.js : la position d'un tir, illustrative, lue de la feuille).
 * Le moteur (js/sim.js) joue des événements ; ce module les LIT et dit ce
 * qu'ils étaient sur la carte : un gank, une plongée sous la tour, un duel en
 * ligne, une escarmouche, un combat d'équipe, la bataille du Nashor ou du
 * dragon, une poussée de côté, le héraut qui charge, l'assaut final.
 *
 * Ce qui est LU (jamais inventé) : qui a tué qui, quand, avec quelles aides ;
 * la ligne d'une élimination de la phase de lignes (le moteur la tire) ; les
 * objectifs et les tours, leur camp et leur minute. Ce qui est ILLUSTRATIF :
 * la position exacte sur la carte et la ligne d'une tour (le moteur compte
 * les tours sans les placer) — tirées d'un dé à graine, donc revoir la même
 * partie redonne la même carte. Les tours d'une ligne tombent dans l'ordre,
 * et l'assaut final passe par une ligne ouverte jusqu'au nexus.
 *
 * Pur : le direct (js/direct.js) dessine, scripts/check_terrain.mjs vérifie.
 *
 * La carte : 100 × 100, la base bleue en bas à gauche, la rouge en haut à
 * droite ; le haut longe la gauche puis le haut, le bas longe le bas puis la
 * droite, le milieu en diagonale ; la rivière de l'autre diagonale, le
 * Nashor (et le héraut) au nord, le dragon au sud.
 */
import { hasard, graineDe } from './hasard.js';
import { LIGNES_FIN } from './sim.js';

const LIGNES = ['haut', 'milieu', 'bas'];
export const TRACES = { haut: [[10, 90], [10, 10], [90, 10]], milieu: [[10, 90], [90, 10]], bas: [[10, 90], [90, 90], [90, 10]] };
export const FOSSES = { nashor: [31, 29], dragon: [69, 71] };
export const BASES = [[7, 93], [93, 7]];
/* Les tours d'un camp sur une ligne, de l'extérieure à celle de l'inhibiteur (u : la part du chemin depuis la base bleue). */
const U_TOURS = [0.31, 0.21, 0.13];
const U_INHIB = 0.075;
const NEXUS = [[[13, 82], [18, 87]], [[82, 13], [87, 18]]];
/* Les coins de la jungle et de la rivière où un combat sans objectif se passe. */
const COINS = [['dans la rivière', [42, 42]], ['dans la rivière', [58, 58]], ['dans la jungle bleue', [30, 63]], ['dans la jungle bleue', [40, 74]], ['dans la jungle rouge', [70, 37]], ['dans la jungle rouge', [60, 26]], ['au milieu', [50, 50]]];
const OU = { haut: 'au haut', milieu: 'au milieu', bas: 'au bas' };
const FENETRE = 1;   // deux éliminations à plus d'une minute l'une de l'autre ne font pas le même combat

/** Un point sur une ligne, à la part `u` de son chemin depuis la base bleue. */
function pointSur(ligne, u) {
  const pts = TRACES[ligne];
  const segs = pts.slice(1).map((p, i) => [pts[i], p, Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])]);
  let reste = u * segs.reduce((s, x) => s + x[2], 0);
  for (const [a, b, l] of segs) {
    if (reste <= l) return [a[0] + ((b[0] - a[0]) * reste) / l, a[1] + ((b[1] - a[1]) * reste) / l];
    reste -= l;
  }
  return pts[pts.length - 1];
}
/** Où se dresse une tour : son camp (0 bleu), sa ligne, son rang (0 l'extérieure, 2 celle de l'inhibiteur). */
const tourEn = (camp, ligne, k) => pointSur(ligne, camp ? 1 - U_TOURS[k] : U_TOURS[k]);
const inhibEn = (camp, ligne) => pointSur(ligne, camp ? 1 - U_INHIB : U_INHIB);

export const GENRES = {
  duel: ['⚔️', 'Duel'],
  gank: ['🐺', 'Gank'],
  plongee: ['🗡️', 'Plongée sous la tour'],
  escarmouche: ['✴️', 'Escarmouche'],
  combat: ['💥', 'Combat d\'équipe'],
  batailleNashor: ['🟣', 'Bataille du Nashor'],
  batailleDragon: ['🐉', 'Bataille du dragon'],
  batailleAme: ['🐉', 'Bataille de l\'âme'],
  volNashor: ['🟣', 'Le Nashor en douce'],
  heraut: ['🦀', 'Le héraut charge'],
  poussee: ['🪓', 'Poussée de côté'],
  assaut: ['🏰', 'L\'assaut final'],
};

const borner = v => Math.max(2, Math.min(98, v));
const pres = (p, de, r) => [borner(p[0] + (de() * 2 - 1) * r), borner(p[1] + (de() * 2 - 1) * r)];

/**
 * LA FAILLE D'UNE PARTIE. `f` : la feuille ; `noms` : [bleu, rouge] ;
 * `graine` : celle de la partie. Rend :
 *   evenements  chaque événement du fil, à sa place : { t, quoi, camp, x, y, ligne?, k? }
 *   tours       les 22 tours : { camp (à qui elle est), ligne (null : le nexus), k, x, y, tombe (minute, ou null) }
 *   actions     les moments nommés : { t (sa fin), debut, genre, camp, x, y, texte }
 */
export function terrainDe(f, noms, graine) {
  const de = hasard(graineDe(graine, 'terrain'));
  const fil = f.fil;
  const nom = (camp, i) => f.equipes[camp].joueurs[i].n;
  const role = (camp, i) => f.equipes[camp].joueurs[i].r;
  const pos = new Map();      // événement du fil → [x, y]
  const actions = [];
  const agir = (genre, camp, debut, t, lieu, detail, p) => actions.push({ t, debut, genre, camp, x: p[0], y: p[1], texte: `${GENRES[genre][1]}${lieu ? ` ${lieu}` : ''}${detail ? ` · ${detail}` : ''}` });

  // 1. LES COMBATS : les éliminations à moins d'une minute l'une de l'autre, et les objectifs pris pendant.
  const elims = fil.filter(x => x.quoi === 'elim');
  const grappes = [];
  for (const x of elims) {
    const g = grappes[grappes.length - 1];
    if (g && x.t - g.elims[g.elims.length - 1].t <= FENETRE && !!x.ligne === !!g.elims[0].ligne) g.elims.push(x);
    else grappes.push({ elims: [x] });
  }
  const pris = new Set();
  for (const g of grappes) {
    g.debut = g.elims[0].t;
    g.fin = g.elims[g.elims.length - 1].t;
    // Une élimination seule n'est pas un combat : l'objectif pris autour se dit pris sans bataille.
    g.objectif = g.elims.length > 1 ? fil.find(x => ['nashor', 'dragon', 'heraut'].includes(x.quoi) && !pris.has(x) && x.t >= g.debut - FENETRE / 2 && x.t <= g.fin + FENETRE) : null;
    if (g.objectif) pris.add(g.objectif);
  }

  // 2. LA PHASE DE LIGNES : chaque ligne a ses éliminations ; on en nomme le genre.
  const tuesEnLigne = [[0, 0, 0], [0, 0, 0]];
  for (const g of grappes.filter(x => x.elims[0].ligne)) {
    for (const ligne of LIGNES) {
      const ici = g.elims.filter(x => x.ligne === ligne);
      if (!ici.length) continue;
      for (const x of ici) tuesEnLigne[x.camp][LIGNES.indexOf(ligne)]++;
      const k = [0, 1].map(c => ici.filter(x => x.camp === c).length);
      const camp = k[0] >= k[1] ? 0 : 1;
      const jungle = ici.filter(x => x.camp === camp).some(x => [x.tueur, ...x.aides].some(i => role(camp, i) === 'jungle'));
      // Deux camps qui tuent : une escarmouche ; un camp qui en prend deux avec son jungler : une plongée sous la tour ;
      // le jungler dans le coup : un gank ; personne d'autre : un duel ; le reste se dit au fil, sans titre.
      const genre = k[0] && k[1] ? 'escarmouche' : ici.length > 1 ? (jungle ? 'plongee' : 'escarmouche') : jungle ? 'gank' : !ici[0].aides.length ? 'duel' : null;
      // Une plongée se passe sous la tour de la victime ; le reste, autour du milieu de la ligne.
      const u = genre === 'plongee' ? (camp ? U_TOURS[0] + 0.02 : 1 - U_TOURS[0] - 0.02) : 0.5 + (camp ? -0.06 : 0.06) + (de() * 2 - 1) * 0.07;
      const centre = pointSur(ligne, u);
      for (const x of ici) pos.set(x, pres(centre, de, 2.5));
      if (!genre) continue;
      const x0 = ici[0];
      const detail = ici.length === 1 ? `${nom(x0.camp, x0.tueur)} sur ${nom(1 - x0.camp, x0.victime)}` : `${Math.max(...k)}-${Math.min(...k)} pour ${noms[camp]}`;
      agir(genre, camp, ici[0].t, ici[ici.length - 1].t, OU[ligne], detail, centre);
    }
  }

  // 3. APRÈS LES LIGNES : escarmouches et combats d'équipe, à l'objectif disputé ou dans la jungle.
  for (const g of grappes.filter(x => !x.elims[0].ligne)) {
    const k = [0, 1].map(c => g.elims.filter(x => x.camp === c).length);
    const camp = k[0] >= k[1] ? 0 : 1;
    const o = g.objectif;
    let lieu, centre;
    if (o) [lieu, centre] = [{ dragon: '', nashor: '', heraut: 'au héraut' }[o.quoi], FOSSES[o.quoi === 'dragon' ? 'dragon' : 'nashor']];
    else [lieu, centre] = COINS[Math.floor(de() * COINS.length)];
    for (const x of g.elims) pos.set(x, pres(centre, de, 5));
    const gros = g.elims.length >= 4 || (g.elims.length >= 3 && k[0] && k[1]);
    const ames = o && o.quoi === 'dragon' && fil.filter(x => x.quoi === 'dragon' && x.camp === o.camp && x.t <= o.t).length === 4;
    const genre = o && o.quoi === 'nashor' ? 'batailleNashor' : o && o.quoi === 'dragon' ? (ames ? 'batailleAme' : 'batailleDragon') : gros ? 'combat' : g.elims.length === 1 ? null : 'escarmouche';
    if (!genre) continue;
    const ace = k.some(n => n >= 5) ? ' · tous à terre !' : '';
    agir(genre, camp, g.debut, Math.max(g.fin, o ? o.t : 0), lieu, `${Math.max(...k)}-${Math.min(...k)} pour ${noms[camp]}${ace}`, centre);
  }
  // Une élimination seule, hors des lignes et des combats : quelqu'un s'est fait prendre dans la jungle.
  for (const x of elims) if (!pos.has(x)) pos.set(x, pres(COINS[Math.floor(de() * COINS.length)][1], de, 6));

  // 4. LES OBJECTIFS : à leur fosse. Un Nashor pris sans combat se dit.
  for (const x of fil.filter(y => ['dragon', 'heraut', 'nashor'].includes(y.quoi))) {
    pos.set(x, pres(FOSSES[x.quoi === 'dragon' ? 'dragon' : 'nashor'], de, 1.5));
    if (x.quoi === 'nashor' && !pris.has(x)) agir('volNashor', x.camp, x.t, x.t, '', `pour ${noms[x.camp]}`, FOSSES.nashor);
  }

  // 5. LES TOURS : une ligne pour chacune, illustrative ; puis l'ordre de chaque ligne.
  const tours = fil.filter(x => x.quoi === 'tour');
  // L'assaut final du moteur : trois tours d'une ligne s'il en manque, puis les deux du nexus, juste avant l'inhibiteur.
  // Ce sont les dernières tours du gagnant avant lui : deux s'il en avait déjà trois, sinon de quoi en avoir cinq.
  const g = f.gagnant;
  const avantInhib = fil.findIndex(x => x.quoi === 'inhib' || x.quoi === 'nexus');
  let suite = 0;
  for (let i = avantInhib - 1; i >= 0 && fil[i].quoi === 'tour' && fil[i].camp === g && fil[i].t === f.duree; i--) suite++;
  const nFinales = tours.filter(x => x.camp === g).length > 5 ? 2 : Math.min(suite, 5);
  const lesFinales = new Set(fil.slice(avantInhib - nFinales, avantInhib));
  const finale = x => lesFinales.has(x);
  const ligneDe = new Map();
  const genreDe = new Map();
  const compte = [0, 1].map(() => ({ haut: 0, milieu: 0, bas: 0 }));
  const choisir = (camp, voulues) => {
    const libres = voulues.filter(l => compte[camp][l] < 3);
    const l = libres.length ? libres[Math.floor(de() * libres.length)] : LIGNES.find(x => compte[camp][x] < 3);
    compte[camp][l]++;
    return l;
  };
  for (const x of tours.filter(y => !finale(y))) {
    const heraut = fil.find(y => y.quoi === 'heraut' && y.camp === x.camp && y.t === x.t);
    const combat = grappes.find(g => !g.elims[0].ligne && x.t >= g.debut - FENETRE && x.t <= g.fin + FENETRE);
    let l;
    if (heraut) { l = choisir(x.camp, ['milieu', 'haut']); genreDe.set(x, 'heraut'); }
    else if (x.t < LIGNES_FIN) {
      // En phase de lignes : la ligne où ce camp a le plus tué.
      const t = tuesEnLigne[x.camp];
      l = choisir(x.camp, LIGNES.filter((_, i) => t[i] === Math.max(...t)));
    } else if (combat) l = choisir(x.camp, combat.objectif ? [combat.objectif.quoi === 'dragon' ? 'bas' : 'haut', 'milieu'] : ['milieu']);
    else if (!elims.some(e => Math.abs(e.t - x.t) <= FENETRE)) { l = choisir(x.camp, ['haut', 'bas']); genreDe.set(x, 'poussee'); }
    else {
      // Une élimination tout près, sans combat : la tour tombe là où on vient de tuer.
      const proche = elims.filter(e => e.ligne && Math.abs(e.t - x.t) <= FENETRE).pop();
      l = choisir(x.camp, [proche ? proche.ligne : 'milieu']);
    }
    ligneDe.set(x, l);
  }
  // L'assaut final : la ligne la plus ouverte du gagnant, complétée au besoin par ses tours les plus récentes.
  const assaut = LIGNES.reduce((m, l) => (compte[g][l] > compte[g][m] ? l : m), 'milieu');
  const finales = tours.filter(finale);
  const lanes = Math.max(0, finales.length - 2);
  const recentes = tours.filter(y => !finale(y) && y.camp === g && ligneDe.get(y) !== assaut).reverse();
  while (compte[g][assaut] + lanes < 3 && recentes.length) {
    const y = recentes.shift();
    compte[g][ligneDe.get(y)]--;
    ligneDe.set(y, assaut);
    compte[g][assaut]++;
  }
  finales.forEach((y, i) => ligneDe.set(y, i < lanes ? assaut : null));
  // Dans l'ordre du temps : l'extérieure, puis l'intérieure, puis celle de l'inhibiteur ; le nexus en dernier.
  const debout = [0, 1].map(camp => [...LIGNES.flatMap(l => [0, 1, 2].map(k => ({ camp, ligne: l, k, tombe: null }))), { camp, ligne: null, k: 0, tombe: null }, { camp, ligne: null, k: 1, tombe: null }]);
  const rangDe = new Map();
  for (const x of tours) {
    const proie = 1 - x.camp;
    const l = ligneDe.get(x);
    const tour = debout[proie].find(y => y.ligne === l && y.tombe === null);
    tour.tombe = x.t;
    const p = l ? tourEn(proie, l, tour.k) : NEXUS[proie][tour.k];
    pos.set(x, p);
    rangDe.set(x, tour.k);
    if (genreDe.get(x) === 'poussee') agir('poussee', x.camp, x.t, x.t, OU[l], `${noms[x.camp]} fait tomber une tour`, p);
    if (genreDe.get(x) === 'heraut') agir('heraut', x.camp, x.t, x.t, OU[l], `une tour tombe pour ${noms[x.camp]}`, p);
  }
  for (const x of fil.filter(y => y.quoi === 'inhib')) pos.set(x, inhibEn(1 - x.camp, assaut));
  for (const x of fil.filter(y => y.quoi === 'nexus')) {
    pos.set(x, BASES[1 - x.camp]);
    agir('assaut', x.camp, x.t, x.t, OU[assaut], `${noms[x.camp]} entre dans la base`, BASES[1 - x.camp]);
  }

  const lesTours = debout.flat().map(y => {
    const [x, yy] = y.ligne ? tourEn(y.camp, y.ligne, y.k) : NEXUS[y.camp][y.k];
    return { ...y, x, y: yy };
  });
  const evenements = fil.filter(x => pos.has(x)).map(x => {
    const ev = { t: x.t, quoi: x.quoi, camp: x.camp, x: pos.get(x)[0], y: pos.get(x)[1] };
    if (x.quoi === 'tour') Object.assign(ev, { ligne: ligneDe.get(x), k: rangDe.get(x) });
    if (x.quoi === 'elim') Object.assign(ev, { ligne: x.ligne });
    return ev;
  });
  return { evenements, tours: lesTours, actions: actions.sort((a, b) => a.t - b.t) };
}
