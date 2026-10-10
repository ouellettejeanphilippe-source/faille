/*
 * LES COTES CACHÉES — une seule implémentation, partagée par le navigateur et
 * les scripts (la règle de Cap 82-0). Aucune cote ne va dans le DOM : ce qui
 * s'affiche est le niveau et les badges.
 *
 * Un joueur n'a pas UNE cote : il a des SOUS-COTES, une par axe de son jeu
 * (la ligne, la pression, les dégâts…). Chacune est un écart à la moyenne
 * des joueurs du MÊME rôle dans le MÊME split : un CS/min de 2011 se juge
 * contre les CS/min de 2011, jamais contre ceux de 2024.
 *
 * LES REMPLACEMENTS. Les stats changent d'une époque à l'autre (pas de score
 * de vision en 2011, pas de plaques avant 2019, des dégâts mal comptés au
 * début). Chaque axe a donc une liste de formules, de la meilleure à la plus
 * pauvre ; un split prend la première dont toutes les stats y sont mesurées.
 * La pression se lit sur les plaques quand elles existent, sinon sur les
 * tours de l'équipe et le CS ; les dégâts sur la part des dégâts, sinon sur
 * la part des éliminations et de l'or. Un axe qu'aucune formule ne mesure
 * reste neutre (zéro), et aucun badge ne se décerne sur lui : on ne remplit
 * jamais une stat qu'on n'a pas, on la lit autrement ou on se tait.
 */

/* LES STATS, tirées des totaux du shard (scripts/build_splits.mjs). null = non mesurée pour ce joueur. */
const parMin = s => j => (j[s] && j[s][1] ? j[s][0] / j[s][2] : null);
const part = (s, eq) => j => (j[s] && j[s][1] && j[eq] ? j[s][0] / j[eq] : null);
const objEq = (e, o) => (e.obj && e.obj[o] && e.obj[o][1] ? e.obj[o][0] / e.obj[o][1] : null);
const CLASSES = ['tank', 'combattant', 'mage', 'assassin', 'tireur', 'soutien'];

const STATS = {
  cs_min: parMin('cs'),
  or_min: parMin('or'),
  part_or: part('or', 'eqOr'),
  deg_min: parMin('deg'),
  part_deg: part('deg', 'eqDeg'),
  vision_min: parMin('vision'),
  kp: j => (j.eqK ? (j.k + j.a) / j.eqK : null),
  part_k: j => (j.eqK ? j.k / j.eqK : null),
  morts: j => j.m / j.pj,
  tours_eq: (j, e) => objEq(e, 'tours'),
  // Les objectifs neutres de l'équipe par partie ; le Nashor compte double, les larves pour moitié.
  objectifs_eq: (j, e) => {
    const d = objEq(e, 'dragons');
    if (d === null) return null;
    return d + 2 * (objEq(e, 'barons') || 0) + (objEq(e, 'herauts') || 0) + 0.5 * (objEq(e, 'larves') || 0);
  },
  // Le nombre effectif de champions : l'exponentielle de l'entropie de son bassin (3 champions joués pareil = 3).
  bassin: j => {
    const n = j.champs.reduce((s, c) => s + c[1], 0);
    return n ? Math.exp(-j.champs.reduce((s, [, pj]) => s + (pj / n) * Math.log(pj / n), 0)) : null;
  },
  ...Object.fromEntries(CLASSES.map(c => [`cls_${c}`, j => (Object.keys(j.classes || {}).length ? j.classes[c] || 0 : null)])),
};

/*
 * LES AXES ET LEURS FORMULES, de la meilleure à la plus pauvre. Une formule :
 * un nom (pour la page des règles) et ses stats, chacune avec son poids ; un
 * poids négatif veut dire « moins, c'est mieux ».
 */
export const AXES = {
  ligne: [
    { nom: 'CS/min et or/min', stats: [['cs_min', 1], ['or_min', 1]] },
    { nom: 'CS/min', stats: [['cs_min', 1]] },
    { nom: 'or/min', stats: [['or_min', 1]] },
  ],
  pression: [
    { nom: 'tours de l\'équipe et CS/min', stats: [['tours_eq', 1], ['cs_min', 0.5]] },
    { nom: 'tours de l\'équipe', stats: [['tours_eq', 1]] },
  ],
  degats: [
    { nom: 'part des dégâts et dégâts/min', stats: [['part_deg', 1], ['deg_min', 0.5]] },
    { nom: 'part des éliminations et de l\'or (remplacement)', stats: [['part_k', 1], ['part_or', 1]] },
    { nom: 'part des éliminations (remplacement)', stats: [['part_k', 1]] },
  ],
  implication: [{ nom: 'participation aux éliminations', stats: [['kp', 1]] }],
  survie: [{ nom: 'morts par partie', stats: [['morts', -1]] }],
  vision: [{ nom: 'score de vision/min', stats: [['vision_min', 1]] }],
  objectifs: [
    { nom: 'dragons, hérauts, Nashor et larves de l\'équipe', stats: [['objectifs_eq', 1]] },
    { nom: 'tours de l\'équipe (remplacement)', stats: [['tours_eq', 1]] },
  ],
  bassin: [{ nom: 'nombre effectif de champions', stats: [['bassin', 1]] }],
  // Ce qu'il rend pour ce qu'il coûte : beaucoup d'éliminations touchées avec peu de l'or de l'équipe. Le joueur
  // qui laisse les ressources aux autres et reste partout (Faker au Mondial 2024 : la plus petite part de l'or des
  // milieux, une participation dans la moyenne, champion du monde) ; les dégâts ne le voient pas.
  economie: [{ nom: 'participation aux éliminations et part de l\'or (moins, c\'est mieux)', stats: [['kp', 1], ['part_or', -1]] }],
};

/* Ce que pèse chaque axe dans la valeur, par rôle. À calibrer : check_cotes dit si la force suit le classement. */
const POIDS = {
  haut: { ligne: 0.3, pression: 0.15, degats: 0.15, implication: 0.1, survie: 0.15, bassin: 0.05, economie: 0.1 },
  jungle: { implication: 0.25, objectifs: 0.2, ligne: 0.1, survie: 0.15, degats: 0.05, vision: 0.1, bassin: 0.05, economie: 0.1 },
  milieu: { ligne: 0.2, degats: 0.15, implication: 0.15, survie: 0.15, pression: 0.05, bassin: 0.1, economie: 0.2 },
  bas: { degats: 0.3, ligne: 0.25, survie: 0.2, implication: 0.15, bassin: 0.1 },
  soutien: { implication: 0.3, vision: 0.25, survie: 0.2, objectifs: 0.1, bassin: 0.15 },
};

/*
 * LES BADGES : ce que le joueur fait, lu sur ses sous-cotes et sur les
 * classes de ses champions. Chaque entrée : [icône, nom, { axe ou cls_… : poids }].
 * Un badge dont un axe n'est mesuré par aucune formule ne se décerne pas.
 */
const PREMIERE_LIGNE = ['🛡️', 'Première ligne', { cls_tank: 1, survie: 0.5 }];
const BOURREAU = ['🗡️', 'Bourreau de ligne', { ligne: 1 }];
const CHEF = ['🧩', 'Chef d\'orchestre', { economie: 1, implication: 0.5 }];
const BADGES = {
  haut: [['🪓', 'Pousseur', { pression: 1, implication: -0.5 }], PREMIERE_LIGNE, BOURREAU, ['💥', 'Combattant', { cls_combattant: 1, degats: 0.5 }], CHEF],
  jungle: [['⚡', 'Ganker', { implication: 1 }], ['🐉', 'Chasseur d\'objectifs', { objectifs: 1 }], ['🌾', 'Fermier', { ligne: 1, implication: -0.5 }], PREMIERE_LIGNE, CHEF],
  milieu: [['🔪', 'Assassin', { cls_assassin: 1, degats: 0.5 }], ['🔮', 'Mage de contrôle', { cls_mage: 1, implication: 0.5 }], ['🎯', 'Carry', { degats: 1 }], BOURREAU, CHEF],
  bas: [['💎', 'Hypercarry', { degats: 1, ligne: 0.5 }], ['🪨', 'Le rocher', { survie: 1 }], BOURREAU],
  soutien: [['🚪', 'Engageur', { cls_tank: 1, implication: 0.5 }], ['✨', 'Enchanteur', { cls_soutien: 1, survie: 0.5 }], ['👁️', 'Gardien de la vision', { vision: 1 }], ['🤝', 'Omniprésent', { implication: 1 }]],
};
const BASSIN_PROFOND = ['🎭', 'Bassin profond', { bassin: 1 }];
const PALIERS = [[2, 'Platine'], [1.5, 'Or'], [1, 'Argent'], [0.5, 'Bronze']];

const NIVEAUX = [[0.97, '★ Phénomène'], [0.9, '★ Étoile'], [0.7, 'Pilier'], [0.4, 'Régulier'], [0, 'Remplaçant']];
const RETENUE = 3;           // un joueur de peu de parties tire vers la moyenne : z × pj / (pj + RETENUE)
const Z_MAX = 3;             // une partie hors norme ne compte pas pour plus de trois écarts types
const PJ_ETOILE = 3;          // moins de trois parties : pas assez pour être une Étoile, Pilier au plus
const MESURE_MIN = 0.6;      // une stat est mesurée dans un split si elle l'est pour 60 % des joueurs

const moyEt = xs => {
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  return [m, Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length)];
};

/**
 * Les profils de tout un split. Rend { formules, joueurs } : `formules` dit,
 * axe par axe, quelle formule le split emploie (null : non mesuré) ;
 * `joueurs` est une Map (joueur du shard → { sous, valeur, niveau, badges }).
 */
export function profilsDuSplit(split) {
  const tous = split.equipes.flatMap(e => e.joueurs.map(j => ({ j, e })));
  const valeurs = new Map(tous.map(x => [x.j, Object.fromEntries(Object.entries(STATS).map(([s, f]) => [s, f(x.j, x.e)]))]));

  // Les stats que ce split mesure.
  const mesurees = new Set(Object.keys(STATS).filter(s => tous.filter(x => valeurs.get(x.j)[s] !== null).length >= MESURE_MIN * tous.length));
  const formules = Object.fromEntries(Object.entries(AXES).map(([axe, fs]) => [axe, fs.find(f => f.stats.every(([s]) => mesurees.has(s))) || null]));

  // Les écarts, rôle par rôle : la moyenne et l'écart type des joueurs du rôle.
  const z = new Map(tous.map(x => [x.j, {}]));
  for (const r of Object.keys(POIDS)) {
    const du = tous.filter(x => x.j.r === r);
    for (const s of mesurees) {
      const xs = du.map(x => valeurs.get(x.j)[s]).filter(v => v !== null);
      if (xs.length < 2) continue;
      const [m, et0] = moyEt(xs);
      const et = et0 > 1e-9 * Math.max(1, Math.abs(m)) ? et0 : 0;   // des valeurs identiques : un écart de virgule flottante n'est pas un écart
      for (const x of du) {
        const v = valeurs.get(x.j)[s];
        z.get(x.j)[s] = v === null || !et ? 0 : Math.max(-Z_MAX, Math.min(Z_MAX, (v - m) / et)) * (x.j.pj / (x.j.pj + RETENUE));
      }
    }
  }

  const joueurs = new Map();
  for (const { j } of tous) {
    const zj = z.get(j);
    const sous = {};
    for (const [axe, f] of Object.entries(formules)) {
      if (!f) { sous[axe] = null; continue; }
      const norme = Math.sqrt(f.stats.reduce((s, [, p]) => s + p * p, 0));
      sous[axe] = f.stats.reduce((s, [st, p]) => s + p * (zj[st] || 0), 0) / norme;
    }
    const poids = POIDS[j.r] || {};
    const valeur = Object.entries(poids).reduce((s, [axe, p]) => s + p * (sous[axe] || 0), 0);
    const lire = k => (k.startsWith('cls_') ? (mesurees.has(k) ? zj[k] || 0 : null) : sous[k]);
    const badges = [...(BADGES[j.r] || []), BASSIN_PROFOND].map(([ico, nom, recette]) => {
      const parts = Object.entries(recette).map(([k, p]) => [lire(k), p]);
      if (parts.some(([v]) => v === null)) return null;
      const score = parts.reduce((s, [v, p]) => s + v * p, 0) / Math.sqrt(parts.reduce((s, [, p]) => s + p * p, 0));
      const palier = PALIERS.find(([seuil]) => score >= seuil);
      return palier ? { ico, nom, palier: palier[1], score } : null;
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 2).map(({ ico, nom, palier }) => ({ ico, nom, palier }));
    joueurs.set(j, { sous, valeur, badges, pj: j.pj });
  }

  // Le niveau : le rang de la valeur parmi les joueurs du même rôle dans le split.
  for (const r of Object.keys(POIDS)) {
    const du = tous.filter(x => x.j.r === r).map(x => joueurs.get(x.j)).sort((a, b) => a.valeur - b.valeur);
    du.forEach((p, i) => {
      const rang = du.length > 1 ? i / (du.length - 1) : 0.5;
      const n = NIVEAUX.findIndex(([seuil]) => rang >= seuil);
      p.niveau = NIVEAUX[p.pj >= PJ_ETOILE ? n : Math.max(n, 2)][1];
    });
  }
  return { formules, joueurs };
}
