/*
 * LES SPLITS, UN SHARD CHACUN. Le découpage se fait par split (ici, un
 * Mondial), comme Cap 82-0 le fait par saison : la valeur d'un joueur se juge
 * contre SON split. Une méta de 2011 n'est pas celle de 2024, et les stats
 * non plus : chaque époque a ses colonnes (docs/donnees.md).
 *
 * Le shard garde les TOTAUX bruts, et pour chaque stat qui peut manquer, le
 * nombre de parties où elle a été mesurée. Les formules (js/cotes.js) jugent
 * ensuite ce qui est mesuré et remplacent ce qui ne l'est pas. Le script ne
 * remplit rien : une stat absente reste absente.
 *
 * Les sources :
 *   Leaguepedia (scripts/lib/leaguepedia.mjs) — les parties, les joueurs,
 *     leurs stats, leurs objets.
 *   Data Dragon (Riot) — la classe de chaque champion.
 *
 *   node scripts/build_splits.mjs                  # tous les splits de scripts/splits.json
 *   node scripts/build_splits.mjs mondial-2013     # seulement celui-là
 *   node scripts/build_splits.mjs mondial lck-2019 # ceux dont l'id commence ainsi
 *
 * Sortie : data/splits/<id>.json et data/index.json.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargo } from './lib/leaguepedia.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DDRAGON = 'https://ddragon.leagueoflegends.com';
const SOURCE = 'Leaguepedia (lol.fandom.com), CC BY-SA 3.0 ; classes des champions : Data Dragon (Riot Games)';

/* LES CLASSES DES CHAMPIONS, de Data Dragon : { nom normalisé → ['tank', 'combattant'] }. */
const CLASSES = { Tank: 'tank', Fighter: 'combattant', Mage: 'mage', Assassin: 'assassin', Marksman: 'tireur', Support: 'soutien' };
const normal = s => String(s).toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
// Les noms que Leaguepedia et Data Dragon n'écrivent pas pareil.
const ALIAS = { nunu: 'nunuwillump', wukong: 'monkeyking' };
async function classesDesChampions() {
  const [version] = await (await fetch(`${DDRAGON}/api/versions.json`)).json();
  const { data } = await (await fetch(`${DDRAGON}/cdn/${version}/data/en_US/champion.json`)).json();
  const table = new Map();
  for (const c of Object.values(data)) {
    const fiche = { id: c.id, tags: c.tags.map(t => CLASSES[t]).filter(Boolean) };
    table.set(normal(c.id), fiche);
    table.set(normal(c.name), fiche);
  }
  const ficheDe = nom => table.get(ALIAS[normal(nom)] || normal(nom)) || null;
  return { version, ficheDe, de: nom => ficheDe(nom)?.tags || null };
}

/*
 * Le chemin d'une image de Leaguepedia sur son serveur d'images : MediaWiki
 * range un fichier sous les deux premiers caractères du md5 de son nom
 * (« e/e6/SKT_T1_K_Piglet.jpg »). Le calcul se fait ici : le navigateur n'a
 * pas de md5.
 */
const cheminImage = f => {
  if (!f) return null;
  const nom = String(f).replace(/ /g, '_');
  const h = crypto.createHash('md5').update(nom).digest('hex');
  return `${h[0]}/${h.slice(0, 2)}/${encodeURIComponent(nom)}`;
};

/* Les noms par paquets, pour une clause IN. */
const paquets = (xs, n = 40) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const enIN = xs => xs.map(x => `'${String(x).replace(/'/g, "\\'")}'`).join(',');
/* L'année d'un tournoi : « 2016 Season », sinon « Season 3 » (2013). */
const anneeDe = t => { const m = String(t).match(/\b(20\d\d)\b/); if (m) return Number(m[1]); const s = String(t).match(/Season (\d)\b/); return s ? 2010 + Number(s[1]) : null; };

/*
 * LA PHOTO D'UN JOUEUR DANS CE SPLIT (table PlayerImages : une photo par
 * joueur par tournoi). La meilleure : celle du tournoi même ; sinon celle de
 * la même année, l'été d'abord (le Mondial suit l'été) ; sinon la plus proche,
 * le passé avant l'avenir. Les photos d'All-Star passent après.
 */
async function photosDe(noms, split) {
  const choix = new Map();
  for (const lot of paquets(noms)) {
    const lignes = await cargo('PlayerImages', { fichier: 'FileName', n: 'Link', tournoi: 'Tournament' }, `Link IN (${enIN(lot)})`);
    const par = new Map();
    for (const l of lignes) if (l.fichier) (par.get(l.n) || par.set(l.n, []).get(l.n)).push(l);
    for (const [n, ls] of par) {
      const cout = l => {
        const t = String(l.tournoi || '');
        if (split.pages.some(p => t.startsWith(p))) return 0;
        const a = anneeDe(t);
        const ecart = a === null ? 50 : Math.abs(a - split.annee) * 10 + (a > split.annee ? 5 : 0);
        return ecart + (/All-Star/i.test(t) ? 3 : 0) + (/Summer|World/i.test(t) ? 0 : 1);
      };
      choix.set(n, ls.sort((a, b) => cout(a) - cout(b))[0].fichier);
    }
  }
  return choix;
}

/* Le logo de chaque équipe (table Teams). */
async function logosDe(noms) {
  const logos = new Map();
  for (const lot of paquets(noms)) {
    for (const l of await cargo('Teams', { nom: 'Name', logo: 'Image' }, `Name IN (${enIN(lot)})`)) if (l.logo) logos.set(l.nom, l.logo);
  }
  return logos;
}

const nb = x => (x === null || x === undefined ? null : Number(x));
const ROLES = { top: 'haut', jungle: 'jungle', mid: 'milieu', middle: 'milieu', bot: 'bas', adc: 'bas', 'ad carry': 'bas', bottom: 'bas', support: 'soutien' };
const roleDe = l => ROLES[String(l.role || l.roleJeu || '').toLowerCase()] || null;
/* Une stat qui peut manquer : [somme, parties où elle est mesurée, minutes de ces parties]. */
const MESURABLES = ['or', 'cs', 'deg', 'vision'];
const OBJECTIFS = ['tours', 'dragons', 'barons', 'herauts', 'larves', 'inhib'];

async function construire(split, ctx) {
  // Un split peut couvrir plusieurs pages (la saison et ses séries) : chacune est un préfixe.
  const ou = split.pages.map(p => `OverviewPage LIKE '${p.replace(/'/g, "\\'")}%'`).join(' OR ');
  const parties = await cargo('ScoreboardGames', {
    id: 'GameId', eq1: 'Team1', eq2: 'Team2', gagnant: 'WinTeam', duree: 'Gamelength_Number',
    tours1: 'Team1Towers', tours2: 'Team2Towers', dragons1: 'Team1Dragons', dragons2: 'Team2Dragons',
    barons1: 'Team1Barons', barons2: 'Team2Barons', herauts1: 'Team1RiftHeralds', herauts2: 'Team2RiftHeralds',
    larves1: 'Team1VoidGrubs', larves2: 'Team2VoidGrubs', inhib1: 'Team1Inhibitors', inhib2: 'Team2Inhibitors',
  }, ou);
  const lignes = await cargo('ScoreboardPlayers', {
    n: 'Link', eq: 'Team', role: 'Role', roleJeu: 'IngameRole', champion: 'Champion', k: 'Kills', m: 'Deaths', a: 'Assists',
    or: 'Gold', cs: 'CS', deg: 'DamageToChampions', vision: 'VisionScore', objets: 'Items', gagne: 'PlayerWin', id: 'GameId',
  }, ou);
  const partie = new Map(parties.map(p => [p.id, p]));

  // Les totaux de chaque équipe dans chaque partie : la part d'un joueur s'y mesure.
  const totauxEq = new Map();
  for (const l of lignes) {
    const cle = `${l.id}|${l.eq}`;
    const t = totauxEq.get(cle) || { k: 0, or: 0, deg: 0 };
    t.k += nb(l.k) || 0; t.or += nb(l.or) || 0; t.deg += nb(l.deg) || 0;
    totauxEq.set(cle, t);
  }

  const equipes = new Map();
  const equipe = n => {
    if (!equipes.has(n)) equipes.set(n, { nom: n, v: 0, d: 0, obj: Object.fromEntries(OBJECTIFS.map(o => [o, [0, 0]])), joueurs: new Map() });
    return equipes.get(n);
  };
  for (const p of parties) {
    for (const [cote, t] of [['1', p.eq1], ['2', p.eq2]]) {
      const eq = equipe(t);
      eq[t === p.gagnant ? 'v' : 'd']++;
      for (const o of OBJECTIFS) {
        const x = nb(p[`${o}${cote}`]);
        if (x !== null) { eq.obj[o][0] += x; eq.obj[o][1]++; }
      }
    }
  }

  let sansRole = 0;
  for (const l of lignes) {
    const r = roleDe(l);
    const p = partie.get(l.id);
    if (!r || !p) { sansRole++; continue; }
    const eq = equipe(l.eq);
    const cle = `${l.n}|${r}`;
    if (!eq.joueurs.has(cle)) {
      eq.joueurs.set(cle, { n: l.n, r, pj: 0, v: 0, min: 0, k: 0, m: 0, a: 0, eqK: 0, eqOr: 0, eqDeg: 0,
        ...Object.fromEntries(MESURABLES.map(s => [s, [0, 0, 0]])), champs: new Map(), classes: {}, objets: new Map() });
    }
    const j = eq.joueurs.get(cle);
    const duree = nb(p.duree) || 0;
    const tot = totauxEq.get(`${l.id}|${l.eq}`);
    const gagne = [true, 1, '1', 'Yes'].includes(l.gagne);
    j.pj++; j.v += gagne ? 1 : 0; j.min += duree;
    j.k += nb(l.k) || 0; j.m += nb(l.m) || 0; j.a += nb(l.a) || 0; j.eqK += tot.k;
    for (const s of MESURABLES) {
      const x = nb(l[s]);
      if (x === null || !duree) continue;
      j[s][0] += x; j[s][1]++; j[s][2] += duree;
      if (s === 'or') j.eqOr += tot.or;
      if (s === 'deg') j.eqDeg += tot.deg;
    }
    const c = j.champs.get(l.champion) || [0, 0];
    c[0]++; c[1] += gagne ? 1 : 0;
    j.champs.set(l.champion, c);
    const tags = ctx.classes.de(l.champion);
    if (tags) for (const t of tags) j.classes[t] = (j.classes[t] || 0) + 1 / tags.length;
    else ctx.inconnus.add(l.champion);
    // Un objet porte parfois sa fenêtre de temps (« Liandry's Torment (0.0 - 10.23) ») : on garde le nom.
    const objets = Array.isArray(l.objets) ? l.objets : String(l.objets || '').split(';;');
    for (const o of objets.map(s => String(s).replace(/\s*\([\d.\s-]+\)$/, '').trim()).filter(Boolean)) j.objets.set(o, (j.objets.get(o) || 0) + 1);
  }
  if (sansRole) console.log(`  ${sansRole} ligne(s) sans rôle reconnu ou sans partie, écartées`);

  // Les images : une photo par joueur (celle de ce split, sinon la plus proche), un logo par équipe.
  const photos = await photosDe([...new Set([...equipes.values()].flatMap(e => [...e.joueurs.values()].map(j => j.n)))], split);
  const logos = await logosDe([...equipes.keys()]);

  const r1 = x => Math.round(x * 10) / 10;
  return {
    ...split, source: SOURCE, ddragon: ctx.classes.version, parties: parties.length,
    equipes: [...equipes.values()].sort((a, b) => b.v - a.v || a.d - b.d).map(e => ({
      nom: e.nom, v: e.v, d: e.d, obj: e.obj, logo: cheminImage(logos.get(e.nom)),
      joueurs: [...e.joueurs.values()].sort((a, b) => b.pj - a.pj).map(j => ({
        n: j.n, photo: cheminImage(photos.get(j.n)), r: j.r, pj: j.pj, v: j.v, min: r1(j.min), k: j.k, m: j.m, a: j.a, eqK: j.eqK, eqOr: j.eqOr, eqDeg: j.eqDeg,
        ...Object.fromEntries(MESURABLES.map(s => [s, [j[s][0], j[s][1], r1(j[s][2])]])),
        champs: [...j.champs.entries()].sort((a, b) => b[1][0] - a[1][0]).map(([c, [pj, v]]) => [c, pj, v]),
        classes: Object.fromEntries(Object.entries(j.classes).map(([c, x]) => [c, Math.round((x / j.pj) * 100) / 100])),
        objets: [...j.objets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([o]) => o),
      })),
    })),
  };
}

const tous = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/splits.json'), 'utf8'));
const voulus = process.argv.slice(2);
const dossier = path.join(ROOT, 'data/splits');
fs.mkdirSync(dossier, { recursive: true });
const ctx = { classes: await classesDesChampions(), inconnus: new Set() };
let echecs = 0;
for (const s of tous.filter(s => !voulus.length || voulus.some(v => s.id.startsWith(v)))) {
  console.log(`${s.nom}…`);
  try {
    const shard = await construire(s, ctx);
    if (!shard.parties) throw new Error(`aucune partie (les pages « ${s.pages.join(' », « ')} » existent-elles ?)`);
    fs.writeFileSync(path.join(dossier, `${s.id}.json`), JSON.stringify(shard));
    console.log(`  ${shard.parties} parties, ${shard.equipes.length} équipes`);
  } catch (err) {
    echecs++;
    console.log(`  ✗ ${err.message}`);
  }
}
if (ctx.inconnus.size) console.log(`Champions sans classe (Data Dragon) : ${[...ctx.inconnus].join(', ')}`);

// Les champions joués, nom → id de Data Dragon (ses images) : data/champions.json, pour la page.
const champions = { ...(fs.existsSync(path.join(ROOT, 'data/champions.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'data/champions.json'), 'utf8')).ids : {}) };
for (const f of fs.readdirSync(dossier).filter(f => f.endsWith('.json'))) {
  for (const e of JSON.parse(fs.readFileSync(path.join(dossier, f), 'utf8')).equipes) {
    for (const j of e.joueurs) for (const [c] of j.champs) { const fi = ctx.classes.ficheDe(c); if (fi) champions[c] = fi.id; }
  }
}
fs.writeFileSync(path.join(ROOT, 'data/champions.json'), `${JSON.stringify({ version: ctx.classes.version, ids: Object.fromEntries(Object.entries(champions).sort()) })}\n`);

// L'index : ce qui est sur le disque, pas ce qui était demandé.
const index = tous.filter(s => fs.existsSync(path.join(dossier, `${s.id}.json`))).map(({ id, nom, ligue, annee }) => ({ id, nom, ligue, annee }));
fs.writeFileSync(path.join(ROOT, 'data/index.json'), `${JSON.stringify({ source: SOURCE, splits: index }, null, 1)}\n`);
console.log(`data/index.json : ${index.length} split(s)`);
process.exitCode = echecs ? 1 : 0;
