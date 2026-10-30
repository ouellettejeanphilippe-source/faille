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
 *   Data Dragon (Riot) — la classe de chaque champion ; pour data/champions.json,
 *     le nom français de son ultime, et les objets complétés (leur id, leur nom
 *     français, leur prix) tels que le Data Dragon du Mondial de leur année les donne.
 *
 *   node scripts/build_splits.mjs                  # tous les splits de scripts/splits.json
 *   node scripts/build_splits.mjs mondial-2013     # seulement celui-là
 *   node scripts/build_splits.mjs mondial lck-2019 # ceux dont l'id commence ainsi
 *   node scripts/build_splits.mjs --champions      # aucun split : data/champions.json seulement
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

/* L'ULTIME DE CHAQUE CHAMPION, en français (Data Dragon fr_FR, champion/<id>.json) : { nom → nom de l'ultime }. */
async function ultimesDe(version, champions) {
  const out = {};
  for (let k = 0; k < champions.length; k += 8) {
    await Promise.all(champions.slice(k, k + 8).map(async ([c, fi]) => {
      const rep = await fetch(`${DDRAGON}/cdn/${version}/data/fr_FR/champion/${fi.id}.json`);
      if (!rep.ok) return;
      const d = (await rep.json()).data[fi.id];
      if (d && d.spells && d.spells[3]) out[c] = d.spells[3].name;
    }));
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1)));
}

/*
 * LES OBJETS COMPLÉTÉS que les joueurs des shards achetaient (leurs `objets`),
 * par leur nom anglais (celui de Leaguepedia) : [id, nom français, prix, la
 * version de Data Dragon où les lire]. On cherche du plus récent au plus vieux
 * dans le Data Dragon du Mondial de chaque année ; un objet est complété quand
 * il ne se construit plus en un autre qui s'achète (une botte améliorée, un
 * objet d'Ornn ou un enchantement ne comptent pas), qu'il s'achète, coûte 900
 * ou plus et n'est ni une potion ni une balise.
 */
const VERSIONS_OBJETS = ['16.20', '15.19', '14.18', '13.19', '12.18', '11.19', '10.19', '9.19', '8.19', '7.18', '6.18', '5.18', '4.18', '3.12', '3.6'];
async function objetsDe(noms) {
  const toutes = await (await fetch(`${DDRAGON}/api/versions.json`)).json();
  const versions = VERSIONS_OBJETS.map(p => toutes.find(v => v.startsWith(`${p}.`))).filter(Boolean);
  const objets = {};
  for (const [k, v] of versions.entries()) {
    const en = (await (await fetch(`${DDRAGON}/cdn/${v}/data/en_US/item.json`)).json()).data;
    const fr = (await (await fetch(`${DDRAGON}/cdn/${v}/data/fr_FR/item.json`)).json()).data;
    // La Faille de l'invocateur seulement (la carte 11, la 1 avant 2014) : pas les objets de l'Arène ni de l'Abîme.
    const faille = o => !o.maps || o.maps['11'] || o.maps['1'];
    const achetable = id => en[id] && faille(en[id]) && en[id].gold && en[id].gold.purchasable !== false && !/^Enchantment/.test(en[id].name);
    // Un objet de jungle enchanté : Leaguepedia écrit « Skirmisher's Sabre - Warrior », Data Dragon « Enchantment: Warrior » construit de la lame.
    // Un nom qui revient sous plusieurs id : celui de la Faille a l'id le plus court (les variantes des modes en ont six chiffres).
    const parNom = new Map(Object.entries(en).filter(([, o]) => faille(o)).sort(([a], [b]) => b.length - a.length).map(([id, o]) => [o.name, id]));
    const enchante = nom => {
      const m = nom.match(/^(.+) - (.+)$/);
      const base = m && parNom.get(m[1]);
      const id = base && Object.keys(en).find(x => faille(en[x]) && en[x].name === `Enchantment: ${m[2]}` && (en[x].from || []).includes(base));
      return id ? [id, `${fr[base] ? fr[base].name : m[1]} · ${fr[id] ? fr[id].name.replace(/^Enchantement\s*:\s*/, '') : m[2]}`] : null;
    };
    for (const nom of noms) {
      if (objets[nom]) continue;
      const ench = parNom.has(nom) ? null : enchante(nom);
      const id = parNom.get(nom) || (ench && ench[0]);
      const o = id && en[id];
      if (!o || !o.gold) continue;
      const tags = o.tags || [];
      const botte = tags.includes('Boots') && (o.depth || 1) >= 2;
      const fini = botte || !(o.into || []).some(achetable);
      // Un objet qui ne s'achète pas mais se transforme d'un autre (la Muramana, l'Étreinte du séraphin) est complété aussi.
      const vient = o.gold.purchasable !== false || (o.from || []).some(achetable) || o.gold.total >= 2000;
      if (fini && vient && o.gold.total >= 900 && !tags.includes('Consumable') && !tags.includes('Trinket')) objets[nom] = [id, ench ? ench[1] : fr[id] ? fr[id].name : o.name, o.gold.total, k];
    }
  }
  return { versions, objets: Object.fromEntries(Object.entries(objets).sort(([a], [b]) => (a < b ? -1 : 1))) };
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
/*
 * LES SORTS D'INVOCATEUR en deux lettres (js/moteur.js, SORTS) : le Flash
 * d'abord, puis l'autre ; un sort inconnu (de Dominion, d'un mode retiré) laisse la paire vide.
 */
const CODES_SORTS = { Flash: 'F', Teleport: 'T', Ignite: 'I', Smite: 'S', Heal: 'H', Exhaust: 'E', Barrier: 'B', Cleanse: 'C', Ghost: 'G', Clarity: 'L', Clairvoyance: 'V', Promote: 'P', Revive: 'R' };
function codeDesSorts(sorts) {
  const noms = (Array.isArray(sorts) ? sorts : String(sorts || '').split(',')).map(x => String(x).trim()).filter(Boolean);
  if (noms.length !== 2 || noms.some(n => !CODES_SORTS[n])) return null;
  return noms.map(n => CODES_SORTS[n]).sort((a, b) => (a === 'F' ? -1 : b === 'F' ? 1 : a < b ? -1 : 1)).join('');
}
const ROLES = { top: 'haut', jungle: 'jungle', mid: 'milieu', middle: 'milieu', bot: 'bas', adc: 'bas', 'ad carry': 'bas', bottom: 'bas', support: 'soutien' };
const roleDe = l => ROLES[String(l.role || l.roleJeu || '').toLowerCase()] || null;
/* Une stat qui peut manquer : [somme, parties où elle est mesurée, minutes de ces parties]. */
const MESURABLES = ['or', 'cs', 'deg', 'vision'];
const OBJECTIFS = ['tours', 'dragons', 'barons', 'herauts', 'larves', 'inhib'];
/* Ce que garde la ligne d'une partie (`matchs`), un nombre par côté. */
const PAR_PARTIE = ['k', 'or', 'tours', 'dragons', 'barons', 'herauts', 'inhib'];

async function construire(split, ctx) {
  // Un split peut couvrir plusieurs pages (la saison et ses séries) : chacune est un préfixe.
  const ou = split.pages.map(p => `OverviewPage LIKE '${p.replace(/'/g, "\\'")}%'`).join(' OR ');
  const parties = await cargo('ScoreboardGames', {
    id: 'GameId', eq1: 'Team1', eq2: 'Team2', gagnant: 'WinTeam', duree: 'Gamelength_Number',
    tours1: 'Team1Towers', tours2: 'Team2Towers', dragons1: 'Team1Dragons', dragons2: 'Team2Dragons',
    barons1: 'Team1Barons', barons2: 'Team2Barons', herauts1: 'Team1RiftHeralds', herauts2: 'Team2RiftHeralds',
    larves1: 'Team1VoidGrubs', larves2: 'Team2VoidGrubs', inhib1: 'Team1Inhibitors', inhib2: 'Team2Inhibitors',
    k1: 'Team1Kills', k2: 'Team2Kills', or1: 'Team1Gold', or2: 'Team2Gold',
  }, ou);
  const lignes = await cargo('ScoreboardPlayers', {
    n: 'Link', eq: 'Team', role: 'Role', roleJeu: 'IngameRole', champion: 'Champion', k: 'Kills', m: 'Deaths', a: 'Assists',
    or: 'Gold', cs: 'CS', deg: 'DamageToChampions', vision: 'VisionScore', objets: 'Items', sorts: 'SummonerSpells', gagne: 'PlayerWin', id: 'GameId',
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
        ...Object.fromEntries(MESURABLES.map(s => [s, [0, 0, 0]])), champs: new Map(), classes: {}, objets: new Map(), sorts: new Map() });
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
    // Ses sorts d'invocateur sur ce champion : la paire, en deux lettres (CODES_SORTS), comptée.
    const paire = codeDesSorts(l.sorts);
    if (paire) {
      const parSorts = j.sorts.get(l.champion) || new Map();
      parSorts.set(paire, (parSorts.get(paire) || 0) + 1);
      j.sorts.set(l.champion, parSorts);
    }
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
  // Une ligne par partie, le côté bleu (Team1 chez Leaguepedia) d'abord : les repères du moteur s'y mesurent (MOTEUR.md).
  const chiffre = x => (Number.isFinite(x) ? x : null);
  const matchs = parties.map(p => [p.eq1, p.eq2, chiffre(r1(nb(p.duree) ?? NaN)), p.gagnant === p.eq1 ? 1 : p.gagnant === p.eq2 ? 2 : null,
    ...PAR_PARTIE.flatMap(o => [chiffre(nb(p[`${o}1`])), chiffre(nb(p[`${o}2`]))])]);
  return {
    ...split, source: SOURCE, ddragon: ctx.classes.version, parties: parties.length, matchs,
    equipes: [...equipes.values()].sort((a, b) => b.v - a.v || a.d - b.d).map(e => ({
      nom: e.nom, v: e.v, d: e.d, obj: e.obj, logo: cheminImage(logos.get(e.nom)),
      joueurs: [...e.joueurs.values()].sort((a, b) => b.pj - a.pj).map(j => ({
        n: j.n, photo: cheminImage(photos.get(j.n)), r: j.r, pj: j.pj, v: j.v, min: r1(j.min), k: j.k, m: j.m, a: j.a, eqK: j.eqK, eqOr: j.eqOr, eqDeg: j.eqDeg,
        ...Object.fromEntries(MESURABLES.map(s => [s, [j[s][0], j[s][1], r1(j[s][2])]])),
        champs: [...j.champs.entries()].sort((a, b) => b[1][0] - a[1][0]).map(([c, [pj, v]]) => [c, pj, v]),
        // Ses sorts sur chacun de ses champions, dans l'ordre de `champs` : la paire la plus jouée (« FT »), ou '' si l'export ne les a pas.
        sorts: [...j.champs.entries()].sort((a, b) => b[1][0] - a[1][0]).map(([c]) => {
          const ps = j.sorts.get(c);
          return ps ? [...ps.entries()].sort((a, b) => b[1] - a[1])[0][0] : '';
        }),
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

// Les champions joués, nom → id de Data Dragon (ses images) et ses classes (le repêchage, js/repechage.js) :
// data/champions.json, pour la page.
// Le direct y lit aussi le nom français de l'ultime de chacun (le commentateur) et les objets complétés des joueurs.
const champions = new Map();
const nomsObjets = new Set();
for (const f of fs.readdirSync(dossier).filter(f => f.endsWith('.json'))) {
  for (const e of JSON.parse(fs.readFileSync(path.join(dossier, f), 'utf8')).equipes) {
    for (const j of e.joueurs) {
      for (const [c] of j.champs) { const fi = ctx.classes.ficheDe(c); if (fi) champions.set(c, fi); }
      for (const o of j.objets) nomsObjets.add(o);
    }
  }
}
const tries = [...champions].sort(([a], [b]) => (a < b ? -1 : 1));
const ultimes = await ultimesDe(ctx.classes.version, tries);
const { versions: versionsObjets, objets } = await objetsDe(nomsObjets);
fs.writeFileSync(path.join(ROOT, 'data/champions.json'), `${JSON.stringify({
  version: ctx.classes.version,
  ids: Object.fromEntries(tries.map(([c, fi]) => [c, fi.id])),
  classes: Object.fromEntries(tries.map(([c, fi]) => [c, fi.tags])),
  ultimes,
  versionsObjets,
  objets,
})}\n`);
console.log(`data/champions.json : ${tries.length} champions, ${Object.keys(ultimes).length} ultimes, ${Object.keys(objets).length} objets complétés sur ${nomsObjets.size} noms`);

// L'index : ce qui est sur le disque, pas ce qui était demandé.
const index = tous.filter(s => fs.existsSync(path.join(dossier, `${s.id}.json`))).map(({ id, nom, ligue, annee }) => ({ id, nom, ligue, annee }));
fs.writeFileSync(path.join(ROOT, 'data/index.json'), `${JSON.stringify({ source: SOURCE, splits: index }, null, 1)}\n`);
console.log(`data/index.json : ${index.length} split(s)`);
process.exitCode = echecs ? 1 : 0;
