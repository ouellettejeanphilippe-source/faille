/*
 * LE BUREAU DU DG : la boîte de réception, le marché et ton effectif, le
 * bilan d'un split et ceux qui restent. Rien que du HTML tiré de la partie
 * (js/partie.js) et des règles (js/gestion.js) ; aucune cote : le niveau,
 * le coût, les vraies parties.
 *
 * La boîte n'est jamais gardée : ses messages se déduisent de l'état, comme
 * dans Cap 82-0 — le proprio (le mandat, les objectifs, l'élan), l'entraîneur
 * (les événements), le DG (le marché, le banc), le dépisteur (ta prochaine série).
 */
import { esc } from './util.js';
import { PLAFOND } from './cotes.js';
import { ROLES, vignette, coutHtml } from './fiche.js';
import { MARCHE, MANDATS, ELAN, OBJECTIF, EVENEMENTS, mandatDe, objectifsDe, gainsDe, dateLimite, marcheOuvert, masseDe, placements, cleDe } from './gestion.js';
import { taSerie, enAttente, GARDES } from './partie.js';
import { jetonsDe, valeurDesGains } from './rogue.js';

const victoires = n => `${n} victoire${n > 1 ? 's' : ''}`;
const message = (ico, qui, titre, texte, extra = '') => `<li class="message"><span class="message-de">${ico} ${esc(qui)}</span><b>${esc(titre)}</b><p>${texte}</p>${extra}</li>`;

/** Le mandat du split en cours, en une phrase. */
export function phraseMandat(n) {
  const [, mot] = mandatDe(n);
  const suite = n < MANDATS.length ? ` Au split suivant : ${mandatDe(n + 1)[1]}.` : '';
  return `Split ${n} de ta run : le proprio veut ${mot}.${suite} Un titre gagne la run.`;
}

/** Le nombre de messages qui attendent une décision. */
export const aTraiter = P => (enAttente(P) ? 1 : 0);

/** La boîte de réception. */
export function ecranBoite(P) {
  const L = P.L;
  const out = [];
  const ev = enAttente(P);
  if (ev) {
    const E = EVENEMENTS[ev.id];
    out.push(message(E.ico, E.qui, `${E.titre} · à trancher`, esc(E.texte),
      `<div class="choix">${ev.choix.map(c => `<button data-choix="${c}"><b>${esc(E.choix[c][0])}</b><small>${esc(E.choix[c][1])}</small></button>`).join('')}</div>`));
  }
  out.push(message('🏢', 'Le proprio', 'Ton mandat', esc(phraseMandat(P.run.n))));
  for (const o of objectifsDe(L).filter(x => x.etat !== 'avenir').reverse()) {
    const sur = `${o.fin - o.debut} séries`;
    const texte = {
      encours: `Gagne ${o.cible} de tes ${sur} : ${o.v} jusqu'ici. +${OBJECTIF.jetons} 🪙 si c'est fait.`,
      atteint: `Objectif atteint, ${victoires(o.v)} pour ${o.cible} demandées : +${OBJECTIF.jetons} 🪙.`,
      rate: `Objectif raté : ${victoires(o.v)} pour ${o.cible} demandées.`,
    }[o.etat];
    out.push(message('🏢', 'Le proprio', `Journées ${o.debut + 1} à ${o.fin}`, esc(texte)));
  }
  if (gainsDe(L).elan) out.push(message('🏢', 'Le proprio', 'L\'élan', esc(`${ELAN.suite} victoires de suite : +${ELAN.jetons} 🪙.`)));
  for (const [cle, choix] of Object.entries(P.decisions).filter(([k]) => k.startsWith(`${P.run.n}-`))) {
    const E = EVENEMENTS[cle.split('-')[1]];
    out.push(message(E.ico, E.qui, E.titre, esc(`Tu as choisi : ${E.choix[choix][0].toLowerCase()}. ${E.choix[choix][1]}`)));
  }
  out.push(message('📋', 'Le DG', 'Le marché', esc(marcheOuvert(L)
    ? `Ouvert jusqu'à la journée ${dateLimite(L)} : ${MARCHE.offre} agents libres par journée, Pilier au plus, ${MARCHE.prix} 🪙 la signature.${P.bons ? ` Le club paie ta prochaine (${P.bons}).` : ''}`
    : 'La date limite des échanges est passée : ton effectif est fixé. Ton banc peut encore jouer.')));
  const s = taSerie(L);
  if (s) {
    const eux = L.equipes[s.a === 0 ? s.b : s.a];
    const fetiches = Object.entries(ROLES).map(([r, mot]) => {
      const c = eux.cinq[r].bassin[0];
      return c ? `${esc(eux.cinq[r].n)} (${mot}) : ${esc(c[0])}, ${c[1]} partie${c[1] > 1 ? 's' : ''}` : null;
    }).filter(Boolean).join(' · ');
    out.push(message('🔎', 'Le dépisteur', `Contre ${eux.nom}`, `Leurs plus joués — ${fetiches}. Ils bannissent tes plus joués.`));
  }
  return `<h2>La boîte</h2><ul class="boite">${out.join('')}</ul>`;
}

/* Une case de l'effectif : le rôle (ou le banc), le joueur, son coût, et ce qu'on peut en faire. */
function caseEffectif(etiquette, c, extra = '') {
  return `<li class="case${c ? ' pleine' : ''}"><span class="case-role">${etiquette}</span>${c ? vignette(c) : ''}<span class="qui">${c
    ? `<b>${esc(c.n)}</b><small>${esc(c.niveau)} · ${esc(c.equipe)} · ${esc(c.split)}</small>` : '<small>Personne</small>'}</span>${c ? coutHtml(c.cout) : ''}${extra}</li>`;
}

/** Le marché : ton effectif (le cinq et le banc), puis les agents libres de la journée. `offre` : les contrats offerts. */
export function ecranMarche(P, offre) {
  const L = P.L;
  const b = P.eff.banc;
  const cinq = Object.entries(ROLES).map(([r, mot]) => caseEffectif(mot, P.eff.cinq[r])).join('');
  const banc = caseEffectif('Banc', b, b ? `<span class="case-gestes"><button data-geste="permuter">Faire jouer</button><button data-geste="relacher">Relâcher</button></span>` : '');
  const jetons = jetonsDe(L, P.R);
  const paie = P.bons || jetons >= MARCHE.prix;
  let agents;
  if (!marcheOuvert(L)) agents = '<p class="sous">La date limite des échanges est passée.</p>';
  else if (!offre) agents = '<p class="sous">Le dépisteur cherche…</p>';
  else if (!offre.length) agents = '<p class="sous">Personne ne tient sous ton plafond aujourd\'hui.</p>';
  else {
    agents = `<ul class="liste-joueurs">${offre.map(c => {
      const places = placements(P.eff, c).map(pl => {
        const qui = pl.place === 'titulaire'
          ? `${ROLES[c.r]}${pl.descend ? ` · ${esc(pl.descend.n)} au banc` : pl.sort ? ` · ${esc(pl.sort.n)} part` : ''}`
          : `Banc${pl.sort ? ` · ${esc(pl.sort.n)} part` : ''}`;
        return `<button data-agent="${esc(cleDe(c.ref))}" data-place="${pl.place}"${paie ? '' : ' disabled'}>${qui}</button>`;
      }).join('');
      return `<li class="joueur agent">${vignette(c)}<span class="joueur-id"><b>${esc(c.n)}</b><small>${ROLES[c.r]} · ${esc(c.niveau)}</small><small>${esc(c.equipe)} · ${esc(c.split)}</small></span>${coutHtml(c.cout)}
        <span class="places">${places}</span></li>`;
    }).join('')}</ul>`;
  }
  return `<h2>Le marché</h2>
    <p class="etat">Masse : ${masseDe(P.eff)} / ${PLAFOND} pts · 🪙 ${jetons} jetons${P.bons ? ` · le club paie ta prochaine signature` : ` · ${MARCHE.prix} 🪙 la signature`}</p>
    <h3>Ton effectif</h3>
    <p class="sous">Ton banc, compté sous le plafond, prend la place du titulaire de son rôle quand tu le fais jouer.</p>
    <ol class="alignement">${cinq}${banc}</ol>
    <h3>Les agents libres · journée ${L.jour + 1}</h3>
    ${agents}`;
}

/** Le bilan d'un split fini, et ceux qui restent (ou la fin de la run). `gardes` : les clés choisies. */
export function ecranBilan(P, gardes) {
  const pass = P.run.passes[P.run.passes.length - 1];
  const mot = MANDATS.find(([k]) => k === pass.mandat)[1];
  const titre = pass.champion ? 'Champion du split !' : pass.rempli ? 'Mandat rempli' : 'Mandat manqué';
  const gagne = valeurDesGains(P.R.reports[P.R.reports.length - 1]);
  const tete = `<div class="ecran-tete"><h1>${titre}</h1><p class="sous">Split ${pass.n} · le proprio voulait ${mot}. Ta saison : ${pass.fiche[0]}-${pass.fiche[1]}, ${pass.rang}${pass.rang === 1 ? 'er' : 'e'} au classement.</p></div>
    <p class="etat">Ce split t'a rapporté ${gagne} 🪙 ; tu en as ${jetonsDe(null, P.R)}. Tes cartes et ton coach te suivent.</p>`;
  if (P.etape === 'fin') {
    const lignes = P.run.passes.map(p => `<li><span class="rang">${p.n}</span><span class="equipe"><b>${p.champion ? 'Champion' : p.rempli ? 'Mandat rempli' : 'Mandat manqué'}</b><small>${MANDATS.find(([k]) => k === p.mandat)[1]}</small></span><span class="fiche">${p.fiche[0]}-${p.fiche[1]}</span></li>`).join('');
    return `${tete}<h3>${P.run.fin === 'gagnee' ? `La run est gagnée en ${P.run.passes.length} split${P.run.passes.length > 1 ? 's' : ''}` : 'La run est finie'}</h3>
      <ol class="classement">${lignes}</ol>
      <div class="actionbar"><button id="bilan-nouvelle" class="go">Une nouvelle run</button></div>`;
  }
  const tous = [...Object.entries(ROLES).map(([r, m]) => [m, P.eff.cinq[r]]), ['Banc', P.eff.banc]].filter(([, c]) => c);
  const cases = tous.map(([m, c]) => {
    const cle = cleDe(c.ref);
    const pris = gardes.has(cle);
    return `<li class="case pleine${pris ? ' garde' : ''}"><span class="case-role">${m}</span>${vignette(c)}<span class="qui"><b>${esc(c.n)}</b><small>${esc(c.niveau)} · ${esc(c.split)}</small></span>${coutHtml(c.cout)}
      <button class="garder" data-garder="${esc(cle)}"${!pris && gardes.size >= GARDES ? ' disabled' : ''}>${pris ? 'Gardé' : 'Garder'}</button></li>`;
  }).join('');
  return `${tete}<h3>Ceux qui restent · ${gardes.size}/${GARDES}</h3>
    <p class="sous">Garde jusqu'à ${GARDES} joueurs : ils gardent leur coût sous le plafond, la roulette comble le reste.</p>
    <ol class="alignement">${cases}</ol>
    <div class="actionbar"><button id="bilan-suivant" class="go">Split ${pass.n + 1} : ${mandatDe(pass.n + 1)[1]}</button></div>`;
}
