/*
 * LA FAILLE AU DIRECT : où se passe ce que la feuille dit (la glace de Cap
 * 82-0, js/glace.js : la position d'un tir, illustrative, lue de la feuille).
 * Le moteur (js/sim.js) joue des événements ; ce module les LIT et dit ce
 * qu'ils étaient sur la carte : un gank, une plongée sous la tour, un duel en
 * ligne, une escarmouche, un combat d'équipe, la bataille du Nashor ou du
 * dragon, une poussée de côté, le héraut qui charge, l'assaut final.
 *
 * Ce qui est LU (jamais inventé) : qui a tué qui, quand, avec quelles aides ;
 * la ligne d'une élimination de la phase de lignes ; les objectifs et les
 * tours, leur camp et leur minute. Le moteur d'aujourd'hui (js/moteur.js,
 * `moteur: 2`) en dit plus, et la carte le lit : chaque combat et son lieu
 * (une ligne, une fosse, la jungle, la base), la ligne et le palier de chaque
 * tour, les plaques, chaque inhibiteur qui tombe et qui repousse, la fuite au
 * Flash et la Téléportation, les larves, Atakhan. Ce qui est ILLUSTRATIF : la
 * position exacte sur la carte — et, pour une partie du moteur d'avant (une
 * vieille sauvegarde), la ligne d'une tour (il comptait les tours sans les
 * placer) — tirée d'un dé à graine, donc revoir la même partie redonne la
 * même carte. Les tours d'une ligne tombent dans l'ordre, et l'assaut final
 * passe par une ligne ouverte jusqu'au nexus.
 *
 * Pur : le direct (js/direct.js) dessine, scripts/check_terrain.mjs vérifie.
 *
 * La carte : 100 × 100, la base bleue en bas à gauche, la rouge en haut à
 * droite ; le haut longe la gauche puis le haut, le bas longe le bas puis la
 * droite, le milieu en diagonale ; la rivière de l'autre diagonale, le
 * Nashor (et le héraut) au nord, le dragon au sud.
 */
import { hasard, graineDe } from './hasard.js';
import { nomCourt } from './util.js';
import { LIGNES_FIN } from './canaux.js';

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

/*
 * LE DÉCOR DE LA JUNGLE, côté bleu (le rouge en est le symétrique par le
 * centre) : ses deux bois, de part et d'autre du milieu, sous la rivière ;
 * ses six camps — le buff bleu, le buff rouge, les loups, les rapaces, le
 * grog, les krugs ; les deux crabes de la rivière.
 */
const miroir = ([x, y]) => [100 - x, 100 - y];
const BOIS_BLEU = [[[16, 30], [16, 82], [42, 56]], [[20, 86], [72, 86], [46, 60]]];
export const BOIS = [BOIS_BLEU, BOIS_BLEU.map(b => b.map(miroir))];
const CAMPS_BLEU = [['bleu', [24, 50]], ['grog', [17.5, 44]], ['loups', [27, 62]], ['rouge', [50, 76]], ['rapaces', [43, 68]], ['krugs', [56, 82]]];
export const CAMPS = [CAMPS_BLEU, CAMPS_BLEU.map(([k, p]) => [k, miroir(p)])];
export const CRABES = [[40, 40], [60, 60]];
/* Les murs des bois, entre les camps : des blocs, un dessin à nous. */
const MURS_BLEU = [
  [[19, 36], [25, 38], [24, 41], [19, 40]], [[27, 43], [33, 47], [31, 50], [26, 47]], [[19, 64], [25, 66], [23, 72], [18, 70]], [[31, 54], [36, 52], [37, 57], [33, 58]],
  [[33, 80], [39, 78], [41, 83], [34, 84]], [[52, 69], [58, 71], [56, 74], [50, 73]], [[62, 80], [68, 79], [67, 84], [62, 84]], [[36, 70], [40, 73], [37, 76], [33, 73]],
];
export const MURS = [...MURS_BLEU, ...MURS_BLEU.map(m => m.map(miroir))];
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

/* Le type d'un dragon, en une icône (le pointage du direct, le sommaire) : les quatre élémentaires, Hextech, Chimtech, l'ancestral. */
export const DRAGONS = { infernal: '🔥', montagne: '⛰️', ocean: '🌊', nuage: '🌪️', hextech: '⚡', chimtech: '🧪', ancestral: '🐲' };

export const GENRES = {
  duel: ['⚔️', 'Duel'],
  contre: ['🛡️', 'Gank déjoué'],
  batailleAncestral: ['🐲', 'Bataille de l\'ancestral'],
  vol: ['⚡', 'Volé au Châtiment'],
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
/* Le bilan d'un échange : « 3-1 pour T1 », ou « 2-2 » quand personne ne l'emporte. */
const bilan = (k, noms, camp) => `${Math.max(...k)}-${Math.min(...k)}${k[0] === k[1] ? '' : ` pour ${noms[camp]}`}`;
const pres = (p, de, r) => [borner(p[0] + (de() * 2 - 1) * r), borner(p[1] + (de() * 2 - 1) * r)];

/**
 * LA FAILLE D'UNE PARTIE. `f` : la feuille ; `noms` : [bleu, rouge] ;
 * `graine` : celle de la partie. Rend :
 *   evenements  chaque événement du fil, à sa place : { t, quoi, camp, x, y, ligne?, k? }
 *   tours       les 22 tours : { camp (à qui elle est), ligne (null : le nexus), k, x, y, tombe (minute, ou null) }
 *   inhibs      les six inhibiteurs : { camp, ligne, x, y, chutes: [[à terre, debout]] } (inhibATerre)
 *   actions     les moments nommés : { t (sa fin), debut, genre, camp, x, y, texte }
 */
export function terrainDe(f, noms, graine) {
  const de = hasard(graineDe(graine, 'terrain'));
  const fil = f.fil;
  // Le moteur d'aujourd'hui dit le combat, son lieu, la ligne et le palier de chaque tour ; celui d'avant, non.
  const v2 = f.moteur === 2;
  const nom = (camp, i) => nomCourt(f.equipes[camp].joueurs[i].n);
  const role = (camp, i) => f.equipes[camp].joueurs[i].r;
  const pos = new Map();      // événement du fil → [x, y]
  const actions = [];
  const agir = (genre, camp, debut, t, lieu, detail, p) => actions.push({ t, debut, genre, camp, x: p[0], y: p[1], texte: `${GENRES[genre][1]}${lieu ? ` ${lieu}` : ''}${detail ? ` · ${detail}` : ''}` });
  const OBJECTIFS = ['nashor', 'dragon', 'heraut', 'larves', 'atakhan'];

  // 1. LES COMBATS : ceux du moteur (son numéro de combat) ; d'avant, les éliminations à moins d'une minute l'une de l'autre.
  const elims = fil.filter(x => x.quoi === 'elim');
  const grappes = [];
  if (v2) {
    const par = new Map();
    for (const x of elims) {
      if (!par.has(x.combat)) { const g = { elims: [] }; par.set(x.combat, g); grappes.push(g); }
      par.get(x.combat).elims.push(x);
    }
  } else {
    for (const x of elims) {
      const g = grappes[grappes.length - 1];
      if (g && x.t - g.elims[g.elims.length - 1].t <= FENETRE && !!x.ligne === !!g.elims[0].ligne) g.elims.push(x);
      else grappes.push({ elims: [x] });
    }
  }
  const pris = new Set();
  for (const g of grappes) {
    g.debut = g.elims[0].t;
    g.fin = g.elims[g.elims.length - 1].t;
    // Une élimination seule n'est pas un combat : l'objectif pris autour se dit pris sans bataille. Au moteur d'aujourd'hui,
    // l'objectif d'une bataille est celui pris juste après, à la fosse du combat.
    const fosse = g.elims[0].lieu === 'dragon' || g.elims[0].lieu === 'nashor';
    g.objectif = g.elims.length > 1 && (!v2 || fosse)
      ? fil.find(x => OBJECTIFS.includes(x.quoi) && x.quoi !== 'larves' && !pris.has(x) && (v2 ? x.t >= g.fin && x.t <= g.fin + 0.6 : x.t >= g.debut - FENETRE / 2 && x.t <= g.fin + FENETRE)) : null;
    if (g.objectif) pris.add(g.objectif);
  }
  // Où se tient le front d'une ligne à l'instant t (la part du chemin depuis la base bleue) : poussé vers le camp qui y a perdu des tours.
  const front = (l, t) => {
    const perdues = [0, 1].map(c => fil.filter(x => x.quoi === 'tour' && x.ligne === l && x.camp === 1 - c && x.t <= t).length);
    return Math.max(0.15, Math.min(0.85, 0.5 + 0.12 * (perdues[1] - perdues[0])));
  };

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
      // Au moteur d'aujourd'hui, un gank ou une plongée qui tourne mal pour qui l'a lancé : un gank déjoué.
      const dejoue = v2 && (ici[0].genre === 'gank' || ici[0].genre === 'plongee') && !jungle && !(k[0] && k[1]);
      const genre = dejoue ? 'contre' : k[0] && k[1] ? 'escarmouche' : ici.length > 1 ? (jungle ? 'plongee' : 'escarmouche') : jungle ? 'gank' : !ici[0].aides.length ? 'duel' : null;
      // Une plongée se passe sous la tour de la victime ; le reste, autour du milieu de la ligne.
      const u = genre === 'plongee' ? (camp ? U_TOURS[0] + 0.02 : 1 - U_TOURS[0] - 0.02) : 0.5 + (camp ? -0.06 : 0.06) + (de() * 2 - 1) * 0.07;
      const centre = pointSur(ligne, u);
      g.centre = centre;
      for (const x of ici) pos.set(x, pres(centre, de, 2.5));
      if (!genre) continue;
      const x0 = ici[0];
      const detail = ici.length === 1 ? `${nom(x0.camp, x0.tueur)} sur ${nom(1 - x0.camp, x0.victime)}` : bilan(k, noms, camp);
      agir(genre, camp, ici[0].t, ici[ici.length - 1].t, OU[ligne], detail, centre);
    }
  }

  // 3. APRÈS LES LIGNES : escarmouches et combats d'équipe, à l'objectif disputé, sur une ligne, dans la jungle ou la base.
  const lieuDe = { dragon: '', nashor: '', heraut: 'au héraut', larves: 'aux larves', atakhan: 'chez Atakhan' };
  for (const g of grappes.filter(x => !x.elims[0].ligne)) {
    const k = [0, 1].map(c => g.elims.filter(x => x.camp === c).length);
    const camp = k[0] >= k[1] ? 0 : 1;
    const o = g.objectif;
    const l = g.elims[0].lieu;
    let lieu, centre;
    if (o) [lieu, centre] = [lieuDe[o.quoi], FOSSES[o.quoi === 'dragon' ? 'dragon' : 'nashor']];
    else if (v2 && (l === 'dragon' || l === 'nashor')) [lieu, centre] = [l === 'dragon' ? 'au dragon' : 'au Nashor', FOSSES[l]];
    else if (v2 && LIGNES.includes(l)) [lieu, centre] = [OU[l], pointSur(l, front(l, g.debut))];
    else if (v2 && l === 'base') [lieu, centre] = ['dans la base', pointSur('milieu', camp ? 0.2 : 0.8)];
    else [lieu, centre] = COINS[Math.floor(de() * COINS.length)];
    g.centre = centre;
    for (const x of g.elims) pos.set(x, pres(centre, de, 5));
    const gros = g.elims.length >= 4 || (g.elims.length >= 3 && k[0] && k[1]);
    const ames = o && o.quoi === 'dragon' && (o.ame || (!v2 && fil.filter(x => x.quoi === 'dragon' && x.camp === o.camp && x.t <= o.t).length === 4));
    const genre = o && o.quoi === 'nashor' ? 'batailleNashor' : o && o.quoi === 'dragon' ? (o.ancestral ? 'batailleAncestral' : ames ? 'batailleAme' : 'batailleDragon') : gros ? 'combat' : g.elims.length === 1 ? null : 'escarmouche';
    if (!genre) continue;
    const ace = k.some(n => n >= 5) ? ' · tous à terre !' : '';
    // Le pentakill ou le quadruplé d'un joueur, au détail du combat.
    const gros5 = g.elims.find(x => x.multi >= 4);
    const exploit = gros5 ? ` · ${gros5.multi === 5 ? 'pentakill' : 'quadruplé'} de ${nom(gros5.camp, gros5.tueur)} !` : '';
    agir(genre, camp, g.debut, Math.max(g.fin, o ? o.t : 0), lieu, `${bilan(k, noms, camp)}${ace}${exploit}`, centre);
  }
  // Une élimination seule, hors des lignes et des combats : quelqu'un s'est fait prendre dans la jungle.
  for (const x of elims) if (!pos.has(x)) pos.set(x, pres(COINS[Math.floor(de() * COINS.length)][1], de, 6));
  // La fuite au Flash et la Téléportation : au combat qu'elles touchent.
  const centreDu = new Map(grappes.map(g => [g.elims[0].combat, g.centre]));
  for (const x of fil.filter(y => y.quoi === 'fuite' || y.quoi === 'tp')) {
    pos.set(x, pres(centreDu.get(x.combat) || COINS[Math.floor(de() * COINS.length)][1], de, 4));
  }

  // 4. LES OBJECTIFS : à leur fosse (les larves et le héraut à celle du Nashor ; Atakhan à l'une des deux). Un Nashor pris sans combat se dit ; un vol aussi.
  const fosseAtakhan = de() < 0.5 ? 'nashor' : 'dragon';
  for (const x of fil.filter(y => OBJECTIFS.includes(y.quoi))) {
    pos.set(x, pres(FOSSES[x.quoi === 'dragon' ? 'dragon' : x.quoi === 'atakhan' ? fosseAtakhan : 'nashor'], de, 1.5));
    if (x.vol) agir('vol', x.camp, x.t, x.t, '', `${x.quoi === 'nashor' ? 'le Nashor' : x.quoi === 'heraut' ? 'le héraut' : x.ancestral ? 'l\'ancestral' : 'le dragon'} pour ${noms[x.camp]}`, FOSSES[x.quoi === 'dragon' ? 'dragon' : 'nashor']);
    else if (x.quoi === 'nashor' && !pris.has(x)) agir('volNashor', x.camp, x.t, x.t, '', `pour ${noms[x.camp]}`, FOSSES.nashor);
  }

  // 5. LES TOURS : la ligne de chacune ; au moteur d'avant, illustrative, puis l'ordre de chaque ligne.
  const tours = fil.filter(x => x.quoi === 'tour');
  const g = f.gagnant;
  const ligneDe = new Map();
  const genreDe = new Map();
  let assaut;
  if (v2) {
    for (const x of tours) {
      ligneDe.set(x, x.ligne);
      if (x.heraut) genreDe.set(x, 'heraut');
      else if (x.cote && !elims.some(e => Math.abs(e.t - x.t) <= FENETRE)) genreDe.set(x, 'poussee');
    }
    // L'assaut final : la ligne du dernier inhibiteur que le gagnant a fait tomber.
    assaut = [...fil].reverse().find(x => x.quoi === 'inhib' && x.camp === g)?.ligne || 'milieu';
  } else {
    // L'assaut final du moteur d'avant : trois tours d'une ligne s'il en manque, puis les deux du nexus, juste avant l'inhibiteur.
    // Ce sont les dernières tours du gagnant avant lui : deux s'il en avait déjà trois, sinon de quoi en avoir cinq.
    const avantInhib = fil.findIndex(x => x.quoi === 'inhib' || x.quoi === 'nexus');
    let suite = 0;
    for (let i = avantInhib - 1; i >= 0 && fil[i].quoi === 'tour' && fil[i].camp === g && fil[i].t === f.duree; i--) suite++;
    const nFinales = tours.filter(x => x.camp === g).length > 5 ? 2 : Math.min(suite, 5);
    const lesFinales = new Set(fil.slice(avantInhib - nFinales, avantInhib));
    const finale = x => lesFinales.has(x);
    const compte = [0, 1].map(() => ({ haut: 0, milieu: 0, bas: 0 }));
    const choisir = (camp, voulues) => {
      const libres = voulues.filter(l => compte[camp][l] < 3);
      const l = libres.length ? libres[Math.floor(de() * libres.length)] : LIGNES.find(x => compte[camp][x] < 3);
      compte[camp][l]++;
      return l;
    };
    for (const x of tours.filter(y => !finale(y))) {
      const heraut = fil.find(y => y.quoi === 'heraut' && y.camp === x.camp && y.t === x.t);
      const combat = grappes.find(gr => !gr.elims[0].ligne && x.t >= gr.debut - FENETRE && x.t <= gr.fin + FENETRE);
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
    assaut = LIGNES.reduce((m, l) => (compte[g][l] > compte[g][m] ? l : m), 'milieu');
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
  }
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
  // Les plaques : à la tour extérieure qui les perd.
  for (const x of fil.filter(y => y.quoi === 'plaque')) pos.set(x, pres(tourEn(1 - x.camp, x.ligne, 0), de, 1));
  for (const x of fil.filter(y => y.quoi === 'inhib')) pos.set(x, inhibEn(1 - x.camp, x.ligne || assaut));
  for (const x of fil.filter(y => y.quoi === 'repousse')) pos.set(x, inhibEn(x.camp, x.ligne));
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
    if (x.quoi === 'elim') Object.assign(ev, { ligne: x.ligne, tueur: x.tueur, victime: x.victime, aides: x.aides, retour: x.retour });
    return ev;
  });
  // Les inhibiteurs : à terre de leur chute à leur retour (le moteur d'aujourd'hui) ; d'avant, celui de la ligne d'assaut tombe avec le nexus.
  const inhibs = [0, 1].flatMap(camp => LIGNES.map(l => {
    const [x, y] = inhibEn(camp, l);
    const chutes = [];
    if (v2) {
      for (const e of fil) {
        if (e.quoi === 'inhib' && e.camp === 1 - camp && e.ligne === l) chutes.push([e.t, Infinity]);
        if (e.quoi === 'repousse' && e.camp === camp && e.ligne === l && chutes.length) chutes[chutes.length - 1][1] = e.t;
      }
    } else if (camp === 1 - g && l === assaut) {
      const tInhib = (fil.find(e => e.quoi === 'inhib') || {}).t;
      if (tInhib !== undefined) chutes.push([tInhib, Infinity]);
    }
    return { camp, ligne: l, x, y, chutes };
  }));
  return { evenements, tours: lesTours, inhibs, actions: actions.sort((a, b) => a.t - b.t) };
}

/** Un inhibiteur de terrainDe, à terre à l'instant t ? */
export const inhibATerre = (x, t) => x.chutes.some(([a, b]) => a <= t && t < b);

/*
 * LES DIX JOUEURS SUR LA CARTE, à l'instant t : où chacun VEUT être
 * (illustratif, lu de la feuille) ; le direct les fait marcher jusque-là.
 *   tombé       là où il est tombé, un instant, puis à sa fontaine le temps de
 *               revenir (plus long en fin de partie) ;
 *   dans le coup il marche vers le combat qui vient, s'y trouve, puis y reste un
 *               moment (qui tue, qui aide, qui tombe) ;
 *   au rappel   en phase de lignes, chacun rentre une ou deux fois à sa base et
 *               repart ;
 *   sinon       selon la phase : en phase de lignes, chacun dans la sienne et
 *               le jungler d'un camp à l'autre de ses bois ; ensuite, le haut
 *               pousse sa ligne de côté et les autres tournent ensemble — le
 *               milieu, la rivière du dragon, celle du Nashor — ou vont à
 *               l'objectif qui vient ; à l'assaut final, le gagnant dans la base
 *               adverse.
 * Rend [bleu, rouge] → cinq { x, y, mort, corps, rappel }, dans l'ordre des rôles.
 */
const ROLES5 = ['haut', 'jungle', 'milieu', 'bas', 'soutien'];
const DE_LA_LIGNE = { haut: ['haut', 'jungle'], milieu: ['milieu', 'jungle'], bas: ['bas', 'soutien', 'jungle'] };
const RETOUR = t => 0.25 + t / 45;     // le temps de revenir d'une mort, en minutes de partie
const CORPS = 0.3;                     // combien de temps un mort reste là où il est tombé
const VU_DANS_LE_COUP = 0.75;
const APPROCHE = 0.6;                  // on marche vers un combat la dernière demi-minute
const RAPPEL = [0.15, 0.55];           // la canalisation, puis le temps à la base
const autour = ([x, y], i, r = 2.6) => [borner(x + r * Math.cos((i * 2 * Math.PI) / 5)), borner(y + r * Math.sin((i * 2 * Math.PI) / 5))];
/* Où un camp se tient groupé, à tour de rôle, quand rien ne presse : le milieu, la rivière du dragon, la rivière du Nashor — chacun de son côté. */
const RONDE = (camp, t) => [pointSur('milieu', camp ? 0.62 : 0.38), camp ? [72, 56] : [56, 74], pointSur('milieu', camp ? 0.6 : 0.4), camp ? [44, 27] : [27, 44]][Math.floor(t / 2.5) % 4];
const POUSSEE_VUE = 2;                 // le haut part vers la tour qu'il fera tomber, jusqu'à deux minutes avant

/** Les rappels de la phase de lignes : [camp][rôle] → les minutes où il rentre (une ou deux fois, hors des combats). */
export function rappelsDe(T, f, graine) {
  const de = hasard(graineDe(graine, 'rappels'));
  return [0, 1].map(camp => ROLES5.map((r, i) => {
    const out = [];
    for (const [a, b] of [[5.5, 8.5], [10, 12.5]]) {
      if (de() < 0.25) continue;
      const t = a + de() * (b - a);
      const occupe = T.evenements.some(e => e.quoi === 'elim' && Math.abs(e.t - t) < 1 && ((e.camp === camp && [e.tueur, ...e.aides].includes(i)) || (e.camp !== camp && e.victime === i)));
      if (!occupe) out.push(Math.round(t * 20) / 20);
    }
    return out;
  }));
}

export function positionsDe(T, f, t, rappels = null) {
  const pos = [0, 1].map(camp => ROLES5.map((r, i) => {
    const u = camp ? 1 - 0.42 : 0.42;
    if (t >= f.duree - 0.75 && camp === f.gagnant) return { p: autour(pointSur('milieu', camp ? 0.12 : 0.88), i, 3.5) };
    if (t < LIGNES_FIN) {
      // Au rappel : la canalisation sur place, puis la fontaine ; le direct le fait marcher de retour.
      const rp = rappels && rappels[camp][i].find(x => t >= x && t < x + RAPPEL[1]);
      if (rp !== undefined && t >= rp + RAPPEL[0]) return { p: autour(BASES[camp], i, 3) };
      const vague = 0.03 * Math.sin(t * 1.3 + i + camp);
      if (r === 'jungle') return { p: CAMPS[camp][Math.floor((t + 0.8 * camp) / 1.6) % CAMPS[camp].length][1], rappel: rp !== undefined };
      if (r === 'soutien') return { p: autour(pointSur('bas', u + (camp ? 0.03 : -0.03) + vague), 1, 1.5), rappel: rp !== undefined };
      return { p: pointSur(r, u + vague), rappel: rp !== undefined };
    }
    // Après les lignes : le haut pousse une ligne de côté — celle de la tour qu'il va faire tomber, sinon la sienne —, les autres tournent ensemble.
    if (r === 'haut') {
      const cible = T.actions.find(a => a.genre === 'poussee' && a.camp === camp && a.t >= t && a.t - t < POUSSEE_VUE);
      return { p: cible ? [cible.x, cible.y] : pointSur('haut', camp ? 0.42 : 0.58) };
    }
    const prochain = T.evenements.find(e => (e.quoi === 'dragon' || e.quoi === 'nashor' || e.quoi === 'heraut') && e.t >= t && e.t - t < 1.5);
    const groupe = prochain ? [prochain.x + (camp ? 4 : -4), prochain.y + (camp ? -4 : 4)] : RONDE(camp, t);
    return { p: autour(groupe, i) };
  }));
  // Dans le coup : il marche vers le combat qui vient, puis y reste ; le plus récent l'emporte. En phase de lignes,
  // seuls ceux de la ligne y vont (et le jungler) : une aide comptée de l'autre bout de la carte ne la traverse pas.
  for (const e of T.evenements) {
    if (e.quoi !== 'elim' || e.t - t > APPROCHE || t - e.t >= VU_DANS_LE_COUP) continue;
    [e.tueur, ...e.aides].filter(i => !e.ligne || DE_LA_LIGNE[e.ligne].includes(ROLES5[i])).forEach(i => { pos[e.camp][i] = { p: autour([e.x, e.y], i, 2) }; });
    pos[1 - e.camp][e.victime] = { p: autour([e.x, e.y], e.victime, 1.2) };
  }
  // La poussée de côté : le haut reste un moment au pied de la tour qu'il vient de faire tomber.
  for (const a of T.actions) if (a.genre === 'poussee' && a.t <= t && t - a.t < VU_DANS_LE_COUP) pos[a.camp][0] = { p: [a.x, a.y] };
  // Tombé : un instant là où il est tombé, puis à sa fontaine le temps de revenir.
  for (const e of T.evenements) {
    if (e.quoi !== 'elim' || e.t > t || t - e.t >= (e.retour ?? RETOUR(e.t))) continue;
    pos[1 - e.camp][e.victime] = t - e.t < CORPS ? { p: [e.x, e.y], corps: true } : { p: autour(BASES[1 - e.camp], e.victime, 3), mort: true };
  }
  return pos.map(eq => eq.map(({ p, mort, corps, rappel }) => ({ x: p[0], y: p[1], mort: !!mort, corps: !!corps, rappel: !!rappel })));
}

/*
 * LES VAGUES DE SBIRES (illustratives) : de chaque base, une vague toutes les
 * trente secondes dès 1:05, qui marche vers le choc ; le choc se tient au
 * milieu de la ligne, repoussé vers le camp qui y a perdu plus de tours.
 * Rend [{ x, y, camp }] : quelques points par ligne.
 */
const SBIRES = 1.08, VAGUE = 0.5, MARCHE = 0.42;
export function vaguesDe(T, f, t) {
  if (t < SBIRES || t >= f.duree) return [];
  const out = [];
  for (const l of LIGNES) {
    const perdues = [0, 1].map(c => T.tours.filter(x => x.camp === c && x.ligne === l && x.tombe !== null && x.tombe <= t).length);
    const choc = Math.max(0.2, Math.min(0.8, 0.5 + 0.08 * (perdues[1] - perdues[0])));
    const age = (t - SBIRES) % VAGUE;
    const avance = Math.min(1, age / MARCHE);
    [0, 1].forEach(camp => {
      const depart = camp ? 0.95 : 0.05;
      const u = depart + (choc - depart) * avance;
      const p = pointSur(l, u);
      out.push({ x: p[0], y: p[1], camp }, { ...(([x, y]) => ({ x, y }))(pointSur(l, choc + (camp ? 0.012 : -0.012))), camp });
    });
  }
  return out;
}
