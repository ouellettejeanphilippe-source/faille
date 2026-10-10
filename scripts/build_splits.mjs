/*
 * LES SPLITS, UN SHARD CHACUN. Le découpage se fait par split, comme Cap 82-0
 * le fait par saison : la valeur d'un joueur se juge contre SA ligue et SON
 * split (une méta de 2015 n'est pas celle de 2024).
 *
 * La source : l'API Cargo de Leaguepedia (lol.fandom.com), sous licence
 * CC BY-SA 3.0 — l'attribution est dans chaque shard et au pied de la page.
 * Leaguepedia limite le débit : une requête à la fois, une pause entre
 * chacune, et on attend quand l'API dit « ratelimited ». Lancer à la main ou
 * par l'Action, jamais en boucle serrée.
 *
 *   node scripts/build_splits.mjs                  # tous les splits de scripts/splits.json
 *   node scripts/build_splits.mjs lck-2019-ete     # seulement ceux-là
 *
 * Sortie : data/splits/<id>.json et data/index.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const API = 'https://lol.fandom.com/api.php';
const AGENT = 'faille/0.1 (jeu de fan, github.com/ouellettejeanphilippe-source/faille)';
const PAUSE = 3000;          // entre deux requêtes
const PAGE = 500;            // le maximum de Cargo
const SOURCE = 'Leaguepedia (lol.fandom.com), CC BY-SA 3.0';

const dormir = ms => new Promise(r => setTimeout(r, ms));

async function cargo(tables, champs, where) {
  const lignes = [];
  for (let offset = 0; ; offset += PAGE) {
    const url = `${API}?${new URLSearchParams({ action: 'cargoquery', format: 'json', tables, fields: champs.join(','), where, limit: PAGE, offset })}`;
    let rep;
    for (let essai = 0; ; essai++) {
      await dormir(PAUSE);
      rep = await (await fetch(url, { headers: { 'User-Agent': AGENT } })).json();
      if (!rep.error) break;
      if (rep.error.code !== 'ratelimited' || essai >= 6) throw new Error(`${tables} : ${rep.error.info}`);
      const attente = 30000 * 2 ** essai;
      console.log(`  limite de débit, on attend ${attente / 1000} s`);
      await dormir(attente);
    }
    const page = rep.cargoquery.map(x => x.title);
    lignes.push(...page);
    if (page.length < PAGE) return lignes;
  }
}

const nb = x => Number(x) || 0;
const ROLES = { Top: 'haut', Jungle: 'jungle', Mid: 'milieu', Bot: 'bas', Support: 'soutien' };

async function construire(split) {
  const ou = `OverviewPage='${split.page.replace(/'/g, "\\'")}'`;
  const parties = await cargo('ScoreboardGames', ['GameId', 'Team1', 'Team2', 'WinTeam', 'Gamelength_Number'], ou);
  const lignes = await cargo('ScoreboardPlayers',
    ['Link', 'Team', 'Role', 'Champion', 'Kills', 'Deaths', 'Assists', 'Gold', 'CS', 'DamageToChampions', 'PlayerWin', 'GameId'], ou);
  const duree = new Map(parties.map(p => [p.GameId, nb(p['Gamelength Number'])]));

  const equipes = new Map();
  const equipe = n => {
    if (!equipes.has(n)) equipes.set(n, { nom: n, v: 0, d: 0, joueurs: new Map() });
    return equipes.get(n);
  };
  for (const p of parties) {
    for (const t of [p.Team1, p.Team2]) equipe(t)[t === p.WinTeam ? 'v' : 'd']++;
  }
  for (const l of lignes) {
    const role = ROLES[l.Role];
    if (!role) continue;
    const eq = equipe(l.Team);
    const cle = `${l.Link}|${role}`;
    if (!eq.joueurs.has(cle)) eq.joueurs.set(cle, { n: l.Link, r: role, pj: 0, v: 0, k: 0, m: 0, a: 0, or: 0, cs: 0, deg: 0, min: 0, champs: {} });
    const j = eq.joueurs.get(cle);
    j.pj++; j.v += l.PlayerWin === 'Yes' ? 1 : 0;
    j.k += nb(l.Kills); j.m += nb(l.Deaths); j.a += nb(l.Assists);
    j.or += nb(l.Gold); j.cs += nb(l.CS); j.deg += nb(l.DamageToChampions);
    j.min += duree.get(l.GameId) || 0;
    j.champs[l.Champion] = (j.champs[l.Champion] || 0) + 1;
  }

  const par = (x, min) => (min ? Math.round((x / min) * 10) / 10 : 0);
  return {
    ...split, source: SOURCE, parties: parties.length,
    equipes: [...equipes.values()].sort((a, b) => b.v - a.v || a.d - b.d).map(e => ({
      nom: e.nom, v: e.v, d: e.d,
      joueurs: [...e.joueurs.values()].sort((a, b) => b.pj - a.pj).map(j => ({
        n: j.n, r: j.r, pj: j.pj, v: j.v, k: j.k, m: j.m, a: j.a,
        or_min: par(j.or, j.min), cs_min: par(j.cs, j.min), deg_min: Math.round(j.min ? j.deg / j.min : 0),
        champs: Object.entries(j.champs).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c),
      })),
    })),
  };
}

const tous = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/splits.json'), 'utf8'));
const voulus = process.argv.slice(2);
const dossier = path.join(ROOT, 'data/splits');
fs.mkdirSync(dossier, { recursive: true });
for (const s of tous.filter(s => !voulus.length || voulus.includes(s.id))) {
  console.log(`${s.nom}…`);
  const shard = await construire(s);
  if (!shard.parties) throw new Error(`${s.nom} : aucune partie (la page « ${s.page} » existe-t-elle ?)`);
  fs.writeFileSync(path.join(dossier, `${s.id}.json`), JSON.stringify(shard));
  console.log(`  ${shard.parties} parties, ${shard.equipes.length} équipes`);
}

// L'index : ce qui est sur le disque, pas ce qui était demandé.
const index = tous.filter(s => fs.existsSync(path.join(dossier, `${s.id}.json`))).map(({ id, nom, ligue, annee }) => ({ id, nom, ligue, annee }));
fs.writeFileSync(path.join(ROOT, 'data/index.json'), `${JSON.stringify({ source: SOURCE, splits: index }, null, 1)}\n`);
console.log(`data/index.json : ${index.length} split(s)`);
