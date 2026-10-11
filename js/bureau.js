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
import { MARCHE, MANDATS, ELAN, OBJECTIF, EVENEMENTS, COMMANDITAIRES, ENTRAINEMENT, mandatDe, objectifsDe, gainsDe, partiesCommanditees, aTravailler, dateLimite, marcheOuvert, masseDe, placements, cleDe } from './gestion.js';
import { taSerie, enAttente, GARDES } from './partie.js';
import { STRATEGIES, lireFit, identiteDe } from './strategie.js';
import { jetonsDe, valeurDesGains, LIENS, liensDe, dire } from './rogue.js';
import { iconeChampion } from './images.js';

const victoires = n => `${n} victoire${n > 1 ? 's' : ''}`;
const message = (ico, qui, titre, texte, extra = '') => `<li class="message"><span class="message-de">${ico} ${esc(qui)}</span><b>${esc(titre)}</b><p>${texte}</p>${extra}</li>`;

/** Le mandat du split en cours, en une phrase. */
export function phraseMandat(n) {
  const [, mot] = mandatDe(n);
  const suite = n < MANDATS.length ? ` Au split suivant : ${mandatDe(n + 1)[1]}.` : '';
  return `Split ${n} de ta run : le proprio veut ${mot}.${suite} Un titre gagne la run.`;
}

/* ---- LA STRATÉGIE ---- */
const AXES_MOTS = { objectifs: 'objectifs', vision: 'vision', ligne: 'ligne', pression: 'pression', implication: 'implication', survie: 'survie', degats: 'dégâts' };
const CLASSE_FIT = { 'Sur mesure': 'fit-haut', 'Bon fit': 'fit-bon', 'Fit moyen': 'fit-moyen', 'À contre-emploi': 'fit-bas' };

/* Ce qu'une stratégie demande, rôle par rôle, avec son signe (✓ ≈ ✗). */
const demandes = (id, cinq) => {
  const { demandes: d } = lireFit(id, cinq);
  return `<span class="demandes">${d.map(([r, axe, signe]) => `<span class="demande">${ROLES[r]} · ${AXES_MOTS[axe]} <b>${signe}</b></span>`).join('')}</span>`;
};

/** L'identité d'une équipe de la ligue (sa vraie partie), en une phrase ; null si rien ne ressort. */
function identite(P, ctx, i) {
  const a = P.adversaires[i - 1];
  if (!a) return null;
  const { split } = ctx.splits.get(a.id);
  const x = identiteDe(split, split.equipes.find(e => e.nom === a.e));
  if (!x) return null;
  const [ico, nom] = STRATEGIES[x.id];
  return `${ico} ${nom[0].toLowerCase()}${nom.slice(1)} : ${x.sien.toFixed(1).replace('.', ',')} par partie, ${x.moyenne.toFixed(1).replace('.', ',')} en moyenne dans leur split`;
}

/** Le panneau du plan de match, sur l'écran du split. */
export function panneauStrategie(P) {
  const cinq = P.L.equipes[0].cinq;
  if (!P.strategie) {
    return `<button id="ouvrir-strategie" class="plan-match"><span class="plan-tete">Ton plan de match</span><b>Aucune stratégie</b><small>Ton cinq joue sa partie. Choisis ce que tu priorises : les dragons, le Nashor, la pression de côté…</small></button>`;
  }
  const [ico, nom, texte] = STRATEGIES[P.strategie];
  const { mot } = lireFit(P.strategie, cinq);
  return `<button id="ouvrir-strategie" class="plan-match"><span class="plan-tete">Ton plan de match · <span class="${CLASSE_FIT[mot]}">${mot}</span></span><b>${ico} ${esc(nom)}</b><small>${esc(texte)}</small>${demandes(P.strategie, cinq)}</button>`;
}

/** L'écran de la stratégie : chacune, son fit pour ton cinq, ce qu'elle demande, ce qu'elle fait. */
export function ecranStrategie(P, ctx) {
  const L = P.L;
  const cinq = L.equipes[0].cinq;
  const s = taSerie(L);
  const enFace = s ? identite(P, ctx, s.a === 0 ? s.b : s.a) : null;
  const items = Object.entries(STRATEGIES).map(([id, [ico, nom, texte, , gain, prix]]) => {
    const { mot } = lireFit(id, cinq);
    return `<li><button class="strategie${P.strategie === id ? ' active' : ''}" data-strategie="${id}">
      <span class="plan-tete"><span class="${CLASSE_FIT[mot]}">${mot}</span></span><b>${ico} ${esc(nom)}</b><small>${esc(texte)}</small>
      ${demandes(id, cinq)}
      <small class="fait">Gagne selon le fit : ${dire(gain, 0.1).map(esc).join(' · ')}. Coûte toujours : ${dire(prix, 0.1).map(esc).join(' · ') || 'rien'}.</small></button></li>`;
  }).join('');
  return `<h2>La stratégie</h2>
    <p class="sous">Ce que ton cinq priorise, à chaque partie. Son gain suit ce que tes joueurs savent faire (le fit) ; son prix se paie toujours. À contre-emploi, elle coûte plus qu'elle ne rapporte.</p>
    ${enFace ? `<p class="mandat">En face, ${esc(L.equipes[s.a === 0 ? s.b : s.a].nom)} priorise ${esc(enFace)}.</p>` : ''}
    <ul class="cartes-jeu">${items}<li><button class="strategie${P.strategie ? '' : ' active'}" data-strategie=""><b>Aucune stratégie</b><small>Ton cinq joue sa partie, sans rien prioriser.</small></button></li></ul>`;
}

/** Le nombre de messages qui attendent une décision. */
export const aTraiter = P => (enAttente(P) ? 1 : 0);

/** La boîte de réception. */
export function ecranBoite(P, ctx) {
  const L = P.L;
  const out = [];
  const ev = enAttente(P);
  if (ev) {
    const E = EVENEMENTS[ev.id];
    out.push(message(E.ico, E.qui, `${E.titre} · à trancher`, esc(E.texte),
      `<div class="choix">${ev.choix.map(c => `<button data-choix="${c}"><b>${esc(E.choix[c][0])}</b><small>${esc(E.choix[c][1])}</small></button>`).join('')}</div>`));
  }
  out.push(message('🏢', 'Le proprio', 'Ton mandat', esc(phraseMandat(P.run.n))));
  if (L.commanditaire) {
    const [ico, nom, objectif, jetons] = COMMANDITAIRES[L.commanditaire];
    const parties = partiesCommanditees(L);
    const ok = parties.filter(Boolean).length;
    out.push(message('💼', nom, `${ico} Ton commanditaire`, esc(`Objectif : ${objectif}. ${ok} partie${ok > 1 ? 's' : ''} réussie${ok > 1 ? 's' : ''} sur ${parties.length} : +${ok * jetons} 🪙 jusqu'ici.`)));
  }
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
    const id = identite(P, ctx, s.a === 0 ? s.b : s.a);
    out.push(message('🔎', 'Le dépisteur', `Contre ${eux.nom}`, `${id ? `Ils priorisent ${esc(id)}. ` : ''}Leurs plus joués — ${fetiches}. Ils bannissent tes plus joués.`));
  }
  return `<h2>La boîte</h2><ul class="boite">${out.join('')}</ul>`;
}

/* Une case de l'effectif : le rôle (ou le banc), le joueur, son coût, et ce qu'on peut en faire. */
function caseEffectif(etiquette, c, extra = '') {
  return `<li class="case${c ? ' pleine' : ''}"><span class="case-role">${etiquette}</span>${c ? vignette(c) : ''}<span class="qui">${c
    ? `<b>${esc(c.n)}</b><small>${esc(c.niveau)} · ${esc(c.equipe)} · ${esc(c.split)}</small>` : '<small>Personne</small>'}</span>${c ? coutHtml(c.cout) : ''}${extra}</li>`;
}

/* Les liens d'origine de ton cinq, et ce qu'ils font, en mots. */
function lesLiens(P) {
  const actifs = liensDe(P.eff.cinq);
  const tous = Object.entries(LIENS).map(([id, [ico, nom, , eff]]) => `<li class="${actifs.includes(id) ? 'actif' : ''}"><b>${ico} ${esc(nom)}</b><small>${dire(eff, 0.1).map(esc).join(' · ')}</small></li>`).join('');
  return `<h3>Les liens d'origine · ${actifs.length}</h3>
    <p class="sous">Des joueurs qui ont joué ensemble pour vrai : le duo du bas ou du centre d'un même vestiaire, trois d'un même vestiaire, trois aux couleurs d'un même club.</p>
    <ul class="liens">${tous}</ul>`;
}

/* L'entraînement : un joueur à la fois travaille un champion que les autres jouaient à son rôle. `qui` : le rôle ouvert. */
function lEntrainement(P, ctx, qui) {
  const E = P.entrainement;
  const L = P.L;
  let corps;
  if (E) corps = `<p class="etat">${esc(E.n)} travaille ${esc(E.champion)} : prêt après la journée ${E.debut + ENTRAINEMENT.journees}.</p>`;
  else if (L.jour >= L.journees.length) corps = '<p class="sous">On s\'entraîne pendant la saison.</p>';
  else {
    corps = `<div class="entr-roles">${Object.entries(ROLES).map(([r, mot]) => `<button data-entr-role="${r}"${qui === r ? ' class="actif"' : ''}>${mot}</button>`).join('')}</div>`;
    const c = qui && P.eff.cinq[qui];
    if (c) {
      const champs = aTravailler(ctx.splits.get(c.ref.id).split, c);
      corps += `<p class="sous">${esc(c.n)} peut travailler ce que les autres jouaient à son rôle en ${esc(c.split)} :</p><div class="repe-puces">${champs.map(x => {
        const src = iconeChampion(ctx.champions, x);
        return `<button class="champ" data-entr-champ="${esc(x)}">${src ? `<img src="${src}" alt="" loading="lazy">` : '<span class="ico-vide"></span>'}<small>${esc(x)}</small></button>`;
      }).join('') || '<small>Rien de neuf à son rôle.</small>'}</div>`;
    }
  }
  const faits = Object.values(P.eff.cinq).flatMap(c => c.moteur.bassin.filter(b => b[3]).map(b => `${esc(c.n)} : ${esc(b[0])}`));
  return `<h3>L'entraînement</h3>
    <p class="sous">Un joueur à la fois, ${ENTRAINEMENT.journees} journées : le champion entre dans son bassin, « entraîné ». Au repêchage, il lui coûte moins de confort que hors de son bassin, mais plus que ses vrais champions.</p>
    ${corps}${faits.length ? `<p class="sous">Déjà entraînés : ${faits.join(' · ')}.</p>` : ''}`;
}

/** Le marché : ton effectif (le cinq et le banc), ses liens, l'entraînement, puis les agents libres de la journée. `offre` : les contrats offerts. */
export function ecranMarche(P, offre, ctx, qui) {
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
    ${lesLiens(P)}
    ${lEntrainement(P, ctx, qui)}
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
