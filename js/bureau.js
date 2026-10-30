/*
 * LE BUREAU DU DG, en sections (la carte des écrans de Cap 82-0) : le
 * Bureau (la boîte, hier soir, la prochaine série), l'Effectif (ton cinq et
 * ses stats dans ta ligue, ton plan, les liens, l'entraînement), le Marché
 * (les agents libres) ; puis le bilan d'un split et ceux qui restent. Rien
 * que du HTML tiré de la partie (js/partie.js) et des règles
 * (js/gestion.js) ; aucune cote : le niveau, le coût, les vraies parties.
 *
 * La boîte n'est jamais gardée : ses messages se déduisent de l'état, comme
 * dans Cap 82-0 — le proprio (le mandat, les objectifs, l'élan), l'entraîneur
 * (les événements), le DG (le marché, le banc), le dépisteur (ta prochaine série).
 * Une décision se règle dans la boîte, sur place.
 */
import { esc, virgule } from './util.js';
import { ROLES, vignette, coutHtml } from './fiche.js';
import { MARCHE, MANDATS, ELAN, OBJECTIF, EVENEMENTS, COMMANDITAIRES, ENTRAINEMENT, objectifsDe, gainsDe, partiesCommanditees, aTravailler, dateLimite, marcheOuvert, masseDe, plafondDe, placements, cleDe } from './gestion.js';
import { taSerie, enAttente, gardesDe, mandatDuSplit, coachDeLaPartie, parCases } from './partie.js';
import { STRATEGIES, lireFit, identiteDe } from './strategie.js';
import { jetonsDe, valeurDesGains, LIENS, liensDe, dire, CARTES, COACHS, XP, TALENT, ADJOINTS, ADJOINTS_MAX, pouvoirsDuPersonnage } from './rogue.js';
import { carteDuCoach } from './boutique.js';
import { iconeChampion } from './images.js';
import { classement } from './sim.js';
import { hierSoir } from './split.js';
import { carteCeSoir, laRoute, laUne, nouvelles, autourDeLaLigue } from './soir.js';
import { statsDuSplit, kda, TROPHEES, GALONS } from './palmares.js';
import { medaillesDeLaPartie } from './meta.js';

const victoires = n => `${n} victoire${n > 1 ? 's' : ''}`;
const message = (ico, qui, titre, texte, extra = '') => `<li class="message"><span class="message-de">${ico} ${esc(qui)}</span><b>${esc(titre)}</b><p>${texte}</p>${extra}</li>`;
const rangMot = k => (k === 1 ? '1er' : `${k}e`);

/** Le mandat du split en cours, en une phrase. */
export function phraseMandat(P) {
  if (P.mode === 'dixhuit') return 'Le 18-0 : un split, ses séries, le titre ou rien. Aucune carte, aucune décision.';
  const n = P.run.n;
  const [cle, mot] = mandatDuSplit(P);
  const suite = cle !== MANDATS[MANDATS.length - 1][0] ? ` Au split suivant : ${mandatDuSplit(P, n + 1)[1]}.` : '';
  return `Split ${n} de ta run${P.exig ? ` (🔺 ${P.exig})` : ''} : le proprio veut ${mot}.${suite} Un titre gagne la run.`;
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
export function planAdverse(P, ctx, i) {
  const a = P.adversaires[i - 1];
  if (!a) return null;
  const { split } = ctx.splits.get(a.id);
  const x = identiteDe(split, split.equipes.find(e => e.nom === a.e));
  if (!x) return null;
  const [ico, nom] = STRATEGIES[x.id];
  return `${ico} ${nom[0].toLowerCase()}${nom.slice(1)} : ${virgule(x.sien)} par partie, ${virgule(x.moyenne)} en moyenne dans leur split`;
}

/** Le panneau du plan de match, à l'Effectif. */
function panneauStrategie(P) {
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
  const enFace = s ? planAdverse(P, ctx, s.a === 0 ? s.b : s.a) : null;
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

/* À FAIRE : la décision qui attend, réglée ici, sous sa voix — un événement, un talent du coach, un adjoint pour le staff. */
function aFaire(P) {
  const ev = enAttente(P);
  if (!ev) return '';
  if (ev.id === 'talent') {
    // Un talent : ton coach monte de niveau, un de ses pouvoirs grandit — ce qu'il ferait alors, en mots.
    const co = COACHS[P.R.coach.id];
    const grandis = pouvoirsDuPersonnage(P.R.coach.id, 5, ev.choix);
    return message(co.ico, co.nom, 'Un talent · à choisir', esc(`Niveau ${coachDeLaPartie(P).n} : un de mes pouvoirs grandit de ${Math.round(100 * TALENT)} %, ouvert ou pas encore. Lequel ?`),
      `<div class="choix">${ev.choix.map(id => { const x = grandis.find(g => g.id === id); return `<button data-choix="${id}"><b>${esc(x.nom)}</b><small>${esc(x.condition)} : ${dire(x.effet, 0.1).map(esc).join(', ')}</small></button>`; }).join('')}</div>`);
  }
  if (ev.id === 'adjoint' || ev.id === 'quiPart') {
    // Le staff : un adjoint parmi trois, ou qui part quand il y en a un de trop.
    const co = COACHS[P.R.coach.id];
    const bouton = id => (id === 'aucun' ? '<button data-choix="aucun"><b>Personne cette fois</b><small>Le staff reste comme il est.</small></button>'
      : `<button data-choix="${id}"><b>${ADJOINTS[id][0]} ${esc(ADJOINTS[id][1])}</b><small>${echange(id)}</small></button>`);
    const [titre, texte] = ev.id === 'adjoint'
      ? ['Un adjoint pour ton staff · à choisir', `Trois candidats, gratuits. Chacun est un échange : ce qu'il donne, ce qu'il coûte, à chaque partie. Ton staff : ${P.staff.length}/${ADJOINTS_MAX}.`]
      : ['Qui part ? · à trancher', `Le staff tient ${ADJOINTS_MAX} adjoints : un des ${ADJOINTS_MAX + 1} s'en va.`];
    return message(co.ico, co.nom, titre, esc(texte), `<div class="choix">${ev.choix.map(bouton).join('')}</div>`);
  }
  const E = EVENEMENTS[ev.id];
  return message(E.ico, E.qui, `${E.titre} · à trancher`, esc(E.texte),
    `<div class="choix">${ev.choix.map(c => `<button data-choix="${c}"><b>${esc(E.choix[c][0])}</b><small>${esc(E.choix[c][1])}</small></button>`).join('')}</div>`);
}

/** LA BANDE DES CHIFFRES du Bureau, comme Cap 82-0 : ta fiche, ton rang, tes jetons. */
export function bandeChiffres(P) {
  const L = P.L;
  const c = classement(L);
  const k = c.findIndex(l => l.i === 0);
  const ecart = c[k].pv - c[k].pd;
  return `<div class="bande"><div><small>Fiche</small><b>${c[k].v}-${c[k].d}</b><small>${ecart >= 0 ? '+' : ''}${ecart} en parties</small></div>
    <div><small>Rang</small><b>${rangMot(k + 1)}</b><small>sur ${L.equipes.length}</small></div>
    ${P.mode === 'dixhuit' ? `<div><small>Séries</small><b>${L.series ? (L.series.champion === null ? 'en cours' : L.series.champion === 0 ? 'titre' : 'finies') : 'à venir'}</b><small>six équipes</small></div>` : `<div><small>Jetons</small><b>🪙 ${jetonsDe(L, P.R)}</b><small>à dépenser</small></div>`}</div>`;
}

/** LA BOÎTE : la partie de ce soir, ton plan, à faire, hier soir, la une, les nouvelles, autour de la ligue. */
export function vueBoite(P, ctx) {
  const L = P.L;
  const s = taSerie(L);
  const faire = aFaire(P);
  const une = laUne(L);
  const nouv = nouvelles(L);
  const autour = autourDeLaLigue(L);
  const cadeau = P.cadeau && L.jour === 0 ? message('🎁', 'Le proprio', 'Un cadeau pour ta run', esc(`Un pack argent offert : ${P.cadeau.map(c => `${CARTES[c][0]} ${CARTES[c][1]}`).join(', ')}. Ils sont au Marché, au plan de jeu.`)) : '';
  const [ico, nom] = P.strategie ? STRATEGIES[P.strategie] : ['🧭', 'Aucune stratégie'];
  const dix = P.mode === 'dixhuit';
  return `${carteCeSoir(L, s)}
    ${s && !dix ? `<button id="ouvrir-strategie" class="ligne-plan"><small>Ton plan</small><b>${ico} ${esc(nom)}</b><span>›</span></button>` : ''}
    ${dix ? '' : `<h3 class="a-faire">À faire${faire ? ' · 1 à régler' : ''}</h3>
    ${faire || cadeau ? `<ul class="boite">${faire}${cadeau}</ul>` : '<p class="sous">Rien à régler : la journée t\'attend.</p>'}`}
    <h3>Hier soir</h3>${hierSoir(L)}
    ${une ? `<div class="une"><small>La une</small><b>${esc(une.titre)}</b><p>${esc(une.voix)} : « ${esc(une.mot)} »</p><small>${esc(une.fait)}</small></div>` : ''}
    ${nouv.length ? `<h3>Nouvelles</h3><ul class="nouvelles">${nouv.map(x => `<li class="${x.feu ? 'feu' : 'panne'}"><b>${x.feu ? '🔥' : '🧊'} ${esc(x.n)}</b><small>${x.feu ? 'En feu' : 'La panne sèche'} — ${esc(x.mot)}</small></li>`).join('')}</ul>` : ''}
    ${autour.length ? `<h3>Autour de la ligue</h3><ul class="autour">${autour.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}`;
}

/** LE PROPRIO : ton mandat et où tu en es, ses objectifs de six journées, l'élan, ton commanditaire. */
export function vueProprio(P) {
  const L = P.L;
  const c = classement(L);
  const k = c.findIndex(l => l.i === 0);
  const [cle] = mandatDuSplit(P);
  const dedans = !L.series && k < 6;
  const etat = L.series ? 'Les séries sont commencées.' : cle === 'series' ? (dedans ? `Tu es ${rangMot(k + 1)} : dans les séries.` : `Tu es ${rangMot(k + 1)} : hors des séries.`) : `Tu es ${rangMot(k + 1)}${k < 2 ? ' : tu attendrais en demi-finale' : dedans ? ' : dans les séries' : ' : hors des séries'}.`;
  const objectifs = objectifsDe(L).map(o => {
    const texte = {
      avenir: `Gagne-en ${o.cible} sur ${o.fin - o.debut}`,
      encours: `Gagne-en ${o.cible} sur ${o.fin - o.debut} : ${o.v} jusqu'ici`,
      atteint: `Atteint : ${victoires(o.v)} pour ${o.cible}`,
      rate: `Raté : ${victoires(o.v)} pour ${o.cible}`,
    }[o.etat];
    return `<li class="objectif ${o.etat}"><b>Journées ${o.debut + 1} à ${o.fin}</b><small>${esc(texte)} · +${OBJECTIF.jetons} 🪙</small></li>`;
  }).join('');
  let commanditaire = '<p class="sous">Le commanditaire se choisit avant la première journée.</p>';
  if (L.commanditaire) {
    const [cico, cnom, objectif, jetons] = COMMANDITAIRES[L.commanditaire];
    const parties = partiesCommanditees(L);
    const ok = parties.filter(Boolean).length;
    commanditaire = `<ul class="liens"><li class="actif"><b>${cico} ${esc(cnom)}</b><small>${esc(`Objectif : ${objectif}. ${ok} partie${ok > 1 ? 's' : ''} réussie${ok > 1 ? 's' : ''} sur ${parties.length} : +${ok * jetons} 🪙 jusqu'ici.`)}</small></li></ul>`;
  }
  const deja = Object.entries(P.decisions).filter(([x]) => x.startsWith(`${P.run.n}-`) && x.split('-')[1] !== 'commanditaire' && EVENEMENTS[x.split('-')[1]])
    .map(([x, choix]) => { const E = EVENEMENTS[x.split('-')[1]]; return `<li><b>${E.ico} ${esc(E.titre)}</b><small>${esc(E.choix[choix][0])}</small></li>`; }).join('');
  return `<div class="mandat-carte"><small>🏢 Le proprio · ton mandat</small><b>${esc(mandatDuSplit(P)[1])}</b><p>${esc(etat)}</p>
      <span class="piste mandat-piste"><span class="rempli" style="width:${Math.round((100 * L.jour) / L.journees.length)}%"></span></span><small>Journée ${Math.min(L.jour, L.journees.length)} sur ${L.journees.length}</small></div>
    <p class="mandat">${esc(phraseMandat(P))}</p>
    <h3>Ses objectifs · six journées à la fois</h3><ul class="objectifs">${objectifs}</ul>
    ${gainsDe(L).elan ? `<p class="etat">L'élan : ${ELAN.suite} victoires de suite, +${ELAN.jetons} 🪙.</p>` : `<p class="sous">L'élan : ${ELAN.suite} victoires de suite paient ${ELAN.jetons} 🪙.</p>`}
    <h3>Ton commanditaire</h3>${commanditaire}
    ${deja ? `<h3>Ce que tu as tranché</h3><ul class="liens">${deja}</ul>` : ''}
    <h3>Le marché</h3><p class="sous">${esc(marcheOuvert(L) ? `Ouvert jusqu'à la journée ${dateLimite(L)} : des agents libres chaque journée, ${MARCHE.prix} 🪙 la signature.${P.bons ? ` Le club paie ta prochaine (${P.bons}).` : ''}` : 'La date limite des échanges est passée : ton effectif est fixé. Ton banc peut encore jouer.')}</p>`;
}

/** LE COACH : le personnage et son staff, et la route des prochaines journées. */
export const vueCoach = P => `${tonCoach(P) || '<p class="sous">Une partie d\'avant le coach-personnage : ton coach s\'achète au Marché, au plan de jeu.</p>'}${laRoute(P.L)}`;

/** LE VESTIAIRE : la forme de tes joueurs, tes liens d'origine, l'entraînement, ton histoire dans la run. `qui` : le rôle ouvert à l'entraînement. */
export function vueVestiaire(P, ctx, qui) {
  const nouv = nouvelles(P.L);
  const histoire = P.run.passes.map(p => `<li><b>Split ${p.n} · ${p.champion ? 'champion' : p.rempli ? 'mandat rempli' : p.sursis ? 'pardonné' : 'mandat manqué'}</b><small>${p.fiche[0]}-${p.fiche[1]}, ${rangMot(p.rang)}${p.galons.length ? ` · ${p.galons.map(g => `${GALONS[g.id][0]} ${esc(g.n)}`).join(', ')}` : ''}</small></li>`).join('');
  return `<h3>Ce qui court</h3>${nouv.length ? `<ul class="nouvelles">${nouv.map(x => `<li class="${x.feu ? 'feu' : 'panne'}"><b>${x.feu ? '🔥' : '🧊'} ${esc(x.n)}</b><small>${esc(x.mot)}</small></li>`).join('')}</ul>` : '<p class="sous">Personne en feu, personne en panne : ça se lit sur les trois dernières parties.</p>'}
    ${lesLiens(P)}
    ${P.mode === 'dixhuit' ? '' : lEntrainement(P, ctx, qui)}
    <h3>Ton histoire · split ${P.run.n}</h3>${histoire ? `<ul class="liens">${histoire}</ul>` : '<p class="sous">Ton premier split de la run.</p>'}`;
}

/* Les stats d'un de tes joueurs dans ta ligue, en une ligne : parties, moyenne K/M/A, KDA. */
function ligneStats(st, c) {
  const l = st.find(x => x.i === 0 && x.n === c.n && x.r === c.r);
  if (!l) return 'Pas encore joué chez toi';
  const moy = x => virgule(x / l.pj).replace(/,0$/, '');
  return `${l.pj} PJ · ${moy(l.k)}/${moy(l.m)}/${moy(l.a)} par partie · KDA ${virgule(kda(l))}`;
}

/** Les stats d'un de tes joueurs dans ta ligue, en une ligne (pour sa carte). */
export const chezToi = (L, c) => ligneStats(statsDuSplit(L), c);

/* Une case de l'effectif : le rôle (ou le banc), le joueur, son coût, ses stats chez toi, et ce qu'on peut en faire. */
function caseEffectif(etiquette, c, st, extra = '') {
  return `<li class="case${c ? ' pleine' : ''}"${c ? ` data-contrat="${esc(cleDe(c.ref))}" tabindex="0"` : ''}><span class="case-role">${etiquette}</span>${c ? vignette(c) : ''}<span class="qui">${c
    ? `<b>${esc(c.n)}</b><small>${esc(c.niveau)} · ${esc(c.equipe)} · ${esc(c.split)}</small><small class="chez-toi">${ligneStats(st, c)}</small>` : '<small>Personne</small>'}</span>${c ? coutHtml(c.cout) : ''}${extra}</li>`;
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

/* Un adjoint en mots : ce qu'il donne, ce qu'il coûte. */
const echange = id => esc(`Donne : ${dire(ADJOINTS[id][2], 0.1).join(', ')}. Coûte : ${dire(ADJOINTS[id][3], 0.1).join(', ')}.`);

/* TON COACH, le personnage (version 4) : son niveau, son expérience, ses pouvoirs et ses talents ; son staff. */
function tonCoach(P) {
  if (P.v < 4 || !P.R.coach) return '';
  const c = coachDeLaPartie(P);
  return `<h3>Ton coach</h3><div class="coach-carte">${carteDuCoach(c.id, { niveau: c.n, talents: P.talents, xp: c.xp, prochain: c.prochain })}</div>
    <p class="sous">L'expérience : ${XP.serie} par série gagnée, ${XP.ronde} par ronde de séries gagnée, ${XP.titre} pour un titre, et ${XP.couleur} de plus par série gagnée avec une carte de sa couleur au plan.</p>
    <h3>Son staff · ${P.staff.length}/${ADJOINTS_MAX}</h3>
    ${P.staff.length ? `<ul class="liens">${P.staff.map(id => `<li class="actif"><b>${ADJOINTS[id][0]} ${esc(ADJOINTS[id][1])}</b><small>${echange(id)}</small></li>`).join('')}</ul>` : ''}
    <p class="sous">Un adjoint parmi trois, gratuit, aux journées 6 et 12 de chaque split ; chacun est un échange, qui paie quand il s'emboîte avec ta stratégie, tes cartes, ton coach.</p>`;
}

/** LE CINQ (les Lignes de Cap 82-0) : ton plan de match, ton cinq et ton banc (leurs stats chez toi), et ce qu'on fait du banc. */
export function vueCinq(P) {
  const st = statsDuSplit(P.L);
  const b = P.eff.banc;
  const cinq = Object.entries(ROLES).map(([r, mot]) => caseEffectif(mot, P.eff.cinq[r], st)).join('');
  const banc = caseEffectif('Banc', b, st, b ? `<span class="case-gestes"><button data-geste="permuter">Faire jouer</button><button data-geste="relacher">Relâcher</button></span>` : '');
  const dix = P.mode === 'dixhuit';
  return `${dix ? '' : panneauStrategie(P)}
    <h3>Ton effectif · ${masseDe(P.eff)} / ${plafondDe(P.eff)} pts</h3>
    <p class="sous">${dix ? 'Touche un joueur pour sa carte. Au 18-0, ton cinq est fixé : ce qu\'il vaut, c\'est ce qu\'il était.' : 'Touche un joueur pour sa carte. Ton banc, compté sous le plafond, prend la place du titulaire de son rôle quand tu le fais jouer.'}</p>
    <ol class="alignement">${cinq}${dix ? '' : banc}</ol>`;
}

/*
 * LES JOUEURS, en tableau, comme Cap 82-0 : ta saison à ce jour (dans ta
 * ligue) ou leur vraie saison (leur split) ; un en-tête trie, un nom ouvre la
 * carte. De vraies stats seulement.
 */
const COLONNES = { pj: 'PJ', k: 'É', m: 'M', a: 'A', kda: 'KDA', or: 'Or/min' };
export function vueJoueurs(P, ctx, vue = 'saison', tri = 'kda') {
  const st = statsDuSplit(P.L);
  const tous = [...Object.entries(ROLES).map(([r]) => P.eff.cinq[r]), P.eff.banc].filter(Boolean);
  const lignes = tous.map(c => {
    let l;
    if (vue === 'saison') l = st.find(x => x.i === 0 && x.n === c.n && x.r === c.r) || { pj: 0, k: 0, m: 0, a: 0, or: 0, min: 0 };
    else {
      const j = ctx.splits.get(c.ref.id).split.equipes.find(e => e.nom === c.ref.e).joueurs.find(x => x.n === c.n && x.r === c.r);
      l = { pj: j.pj, k: j.k, m: j.m, a: j.a, or: j.or[1] ? j.or[0] : 0, min: j.or[1] ? j.or[2] : 0 };
    }
    return { c, l, val: { pj: l.pj, k: l.k, m: -l.m, a: l.a, kda: kda(l), or: l.min ? l.or / l.min : 0 } };
  }).sort((x, y) => y.val[tri] - x.val[tri]);
  const tete = Object.entries(COLONNES).map(([k, mot]) => `<th><button class="tri${tri === k ? ' on' : ''}" data-tri="${k}">${mot}${tri === k ? ' ▾' : ''}</button></th>`).join('');
  const corps = lignes.map(({ c, l }) => `<tr data-contrat="${esc(cleDe(c.ref))}" tabindex="0"><td class="tj-qui">${vignette(c)}<span><b>${esc(c.n)}</b><small>${c === P.eff.banc ? 'Banc' : ROLES[c.r]} · ${esc(c.niveau)}</small></span></td>
    <td>${l.pj}</td><td>${l.k}</td><td>${l.m}</td><td>${l.a}</td><td>${virgule(kda(l))}</td><td>${l.min ? Math.round(l.or / l.min) : '—'}</td></tr>`).join('');
  return `<div class="sousnav vues"><button class="soustab${vue === 'saison' ? ' on' : ''}" data-vue-joueurs="saison">Cette saison</button><button class="soustab${vue === 'vraie' ? ' on' : ''}" data-vue-joueurs="vraie">Vraie saison</button></div>
    <div class="tableau-joueurs"><table><thead><tr><th>Joueur</th>${tete}</tr></thead><tbody>${corps}</tbody></table></div>
    <p class="sous">${vue === 'saison' ? 'Leurs parties chez toi, dans ta ligue.' : 'Leur vrai split, celui de leur carte.'} É : éliminations, M : morts, A : aides.</p>`;
}

/** LES AGENTS LIBRES : la masse, les jetons, et les joueurs de la journée. `offre` : les contrats offerts (null : on cherche). */
export function vueAgents(P, offre) {
  const L = P.L;
  const jetons = jetonsDe(L, P.R);
  const paie = P.bons || jetons >= MARCHE.prix;
  let agents;
  if (!marcheOuvert(L)) agents = '<p class="sous">La date limite des échanges est passée : ton effectif est fixé jusqu\'au bilan.</p>';
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
  return `<p class="etat">Masse : ${masseDe(P.eff)} / ${plafondDe(P.eff)} pts · 🪙 ${jetons}${P.bons ? ' · le club paie ta prochaine signature' : ` · ${MARCHE.prix} 🪙 la signature`}${marcheOuvert(L) ? ` · jusqu'à la journée ${dateLimite(L)}` : ''}</p>
    <h3>Les agents libres · journée ${L.jour + 1}</h3>
    ${agents}`;
}

/* Le palmarès d'un split, au bilan : tes trophées, les galons de tes joueurs. */
function palmaresDuBilan(pass) {
  const t = pass.trophees.map(x => `<li class="trophee"><span class="jeu-ico">${TROPHEES[x.id][0]}</span><span class="jeu-id"><b>${esc(TROPHEES[x.id][1])}</b><small>${esc(x.n)} · ${ROLES[x.r]}</small></span></li>`).join('');
  const g = pass.galons.map(x => `<li class="trophee"><span class="jeu-ico">${GALONS[x.id][0]}</span><span class="jeu-id"><b>${esc(x.n)} · ${esc(GALONS[x.id][1])}</b><small>${esc(x.quoi)}</small></span></li>`).join('');
  return `${t ? `<h3>Tes trophées</h3><ul class="trophees">${t}</ul>` : ''}${g ? `<h3>Les galons, gravés à leur carte</h3><ul class="trophees">${g}</ul>` : ''}`;
}

/** Le bilan d'un split fini, et ceux qui restent (ou la fin de la run). `gardes` : les clés choisies ; `vieux` : clé → la version qui vieillit. */
export function ecranBilan(P, gardes, vieux = new Map()) {
  const pass = P.run.passes[P.run.passes.length - 1];
  const mot = MANDATS.find(([k]) => k === pass.mandat)[1];
  const dix = P.mode === 'dixhuit';
  const titre = pass.champion ? (dix ? 'Le 18-0 : champion !' : 'Champion du split !') : dix ? 'Le 18-0 est joué' : pass.rempli ? 'Mandat rempli' : pass.sursis ? 'Le proprio pardonne' : 'Mandat manqué';
  const gagne = valeurDesGains(P.R.reports[P.R.reports.length - 1]);
  const tete = `<div class="ecran-tete"><h1>${titre}</h1><p class="sous">${dix ? 'Le 18-0' : `Split ${pass.n} · le proprio voulait ${mot}`}. Ta saison : ${pass.fiche[0]}-${pass.fiche[1]}, ${rangMot(pass.rang)} au classement.${pass.sursis ? ' Le proprio patient te garde une fois.' : ''}</p></div>
    ${dix ? '<p class="etat">Tes cinq joueurs sont à ta collection. Le 18-0 ne compte pas aux médailles.</p>' : `<p class="etat">Ce split t'a rapporté ${gagne} 🪙 ; tu en as ${jetonsDe(null, P.R)}. Tes cartes et ton coach te suivent.</p>`}
    ${palmaresDuBilan(pass)}`;
  if (P.etape === 'fin') {
    const lignes = P.run.passes.map(p => `<li><span class="rang">${p.n}</span><span class="equipe"><b>${p.champion ? 'Champion' : dix ? 'Sans titre' : p.rempli ? 'Mandat rempli' : p.sursis ? 'Pardonné' : 'Mandat manqué'}</b><small>${MANDATS.find(([k]) => k === p.mandat)[1]}</small></span><span class="fiche">${p.fiche[0]}-${p.fiche[1]}</span></li>`).join('');
    const med = medaillesDeLaPartie({ passes: P.run.passes, fin: P.run.fin, exig: P.exig, mode: P.mode });
    return `${tete}<h3>${dix ? (P.run.fin === 'gagnee' ? 'Ton cinq a tout gagné' : 'Ton cinq a joué son split') : P.run.fin === 'gagnee' ? `La run est gagnée en ${P.run.passes.length} split${P.run.passes.length > 1 ? 's' : ''}` : 'La run est finie'}</h3>
      <ol class="classement">${lignes}</ol>
      ${dix ? '' : `<p class="medailles-run">🏅 ${med} médaille${med > 1 ? 's' : ''} pour ta run : elles achètent des déblocages et ton club, au menu.</p>`}
      <div class="actionbar"><button id="bilan-nouvelle" class="go">Une nouvelle partie</button><button id="bilan-titre">L'écran titre</button></div>`;
  }
  const max = gardesDe(P);
  const tous = [...Object.entries(ROLES).map(([r, m]) => [m, P.eff.cinq[r]]), ['Banc', P.eff.banc]].filter(([, c]) => c);
  if (parCases(P)) {
    // Ceux qui restent (version 5) se tirent au loto au prochain départ, jamais au choix.
    const lignes = tous.map(([m, c]) => `<li class="case pleine"><span class="case-role">${m}</span>${vignette(c)}<span class="qui"><b>${esc(c.n)}</b><small>${esc(c.niveau)} · ${esc(c.split)}</small></span>${coutHtml(c.cout)}</li>`).join('');
    return `${tete}<h3>Ceux qui restent</h3>
      <p class="sous">Au prochain départ, ${max} case${max > 1 ? 's' : ''} te les offre${max > 1 ? 'nt' : ''} au loto, par niveau : tu en gardes un par case, ou personne. Un joueur qui a joué un split réel plus récent y vieillit. Le pack de départ comble le reste.</p>
      <ol class="alignement">${lignes}</ol>
      <div class="actionbar"><button id="bilan-suivant" class="go">Split ${pass.n + 1} : ${mandatDuSplit(P, pass.n + 1)[1]}</button></div>`;
  }
  const cases = tous.map(([m, c]) => {
    const cle = cleDe(c.ref);
    const pris = gardes.has(cle);
    const v = vieux.get(cle);
    const age = v ? `<small class="vieillit">Vieillit : ${esc(v.split)} · ${esc(v.niveau)} · ${v.cout} pt${v.cout > 1 ? 's' : ''}</small>` : '';
    return `<li class="case pleine${pris ? ' garde' : ''}"><span class="case-role">${m}</span>${vignette(c)}<span class="qui"><b>${esc(c.n)}</b><small>${esc(c.niveau)} · ${esc(c.split)}</small>${age}</span>${coutHtml(v ? v.cout : c.cout)}
      <button class="garder" data-garder="${esc(cle)}"${!pris && gardes.size >= max ? ' disabled' : ''}>${pris ? 'Gardé' : 'Garder'}</button></li>`;
  }).join('');
  return `${tete}<h3>Ceux qui restent · ${gardes.size}/${max}</h3>
    <p class="sous">Garde jusqu'à ${max} joueurs : ils gardent leur place sous le plafond, la roulette comble le reste. Un joueur qui a joué le Mondial suivant y vieillit : il devient sa version de ce split-là.</p>
    <ol class="alignement">${cases}</ol>
    <div class="actionbar"><button id="bilan-suivant" class="go">Split ${pass.n + 1} : ${mandatDuSplit(P, pass.n + 1)[1]}</button></div>`;
}
