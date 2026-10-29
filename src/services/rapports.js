import { dateLongue } from '../donnees-exemple.js';
import { formaterTelephone } from '../telephone.js';
import { syntheseReponses } from './courriers.js';
import { listerActivitesAdmin, listerParticipants, noterOperation, trouverActiviteAdmin } from './donnees.js';
import { verifierHorsMaintenance } from './maintenance.js';
import { session } from './session.js';

/**
 * Statistiques, rapports d'activité et lignes d'export (cahier des charges, section 8, et module 11).
 *
 * Un rapport est d'abord un brouillon, préparé automatiquement avec les chiffres, puis relu, complété
 * et approuvé par l'administrateur. Il ne sort en PDF qu'après l'approbation, et ne se modifie plus.
 *
 * VERSION DE DÉMONSTRATION : les chiffres sont calculés sur les données fictives de cet onglet.
 */
const CLE_STOCKAGE = 'sereh.demonstration.rapports';
const A_COMPLETER = /\[À compléter[^\]]*\]/g;

const attendre = () => new Promise((resoudre) => setTimeout(resoudre, 280));
const maintenant = () => new Date().toISOString();
const auteur = () => session.utilisateur?.nom ?? 'Administrateur';

function lireEtat() {
    try {
        const etat = JSON.parse(window.sessionStorage.getItem(CLE_STOCKAGE) ?? 'null');

        if (Array.isArray(etat?.rapports)) {
            return etat;
        }
    } catch {
        // Stockage indisponible : aucun rapport.
    }

    return { rapports: [], exempleCree: false };
}

const etat = lireEtat();

function enregistrerEtat() {
    try {
        window.sessionStorage.setItem(CLE_STOCKAGE, JSON.stringify(etat));
    } catch {
        // Stockage indisponible : les rapports valent pour cette page seulement.
    }
}

/** Écrit l'état complet dans l'onglet, pour qu'une sauvegarde le contienne même sans modification. */
export function persisterEtat() {
    enregistrerEtat();
}

const pourcentage = (partie, total) => (total > 0 ? Math.round((partie / total) * 100) : null);

/**
 * Statistiques d'une activité : inscriptions, présence (pointage réel), répartition par sexe et par
 * Sous-Comité, et réponses des membres du bureau aux courriers liés.
 */
export async function statistiquesActivite(activiteId) {
    const [activite, personnes, reponses] = await Promise.all([trouverActiviteAdmin(activiteId), listerParticipants({ activiteId }), syntheseReponses(activiteId)]);
    const admises = personnes.filter((personne) => personne.statut === 'admise');
    const presentes = admises.filter((personne) => personne.pointeA);
    const sousComites = new Map();

    for (const personne of admises) {
        const nom = personne.sousComite || 'Non précisé';
        const ligne = sousComites.get(nom) ?? { libelle: nom, admis: 0, presents: 0 };
        ligne.admis++;
        ligne.presents += Number(Boolean(personne.pointeA));
        sousComites.set(nom, ligne);
    }

    const parSexe = [['homme', 'Hommes'], ['femme', 'Femmes']].map(([sexe, libelle]) => ({
        libelle,
        admis: admises.filter((personne) => personne.sexe === sexe).length,
        presents: presentes.filter((personne) => personne.sexe === sexe).length,
    }));

    return {
        activite: activite ? { id: activite.id, titre: activite.titre, edition: activite.edition, date: activite.date, heure: activite.heure, lieu: activite.lieu, organisateur: activite.organisateur, capacite: activite.capacite, statut: activite.statut } : null,
        inscriptions: {
            recues: personnes.length,
            admises: admises.length,
            enAttente: personnes.filter((personne) => personne.statut === 'en_attente').length,
            annulees: personnes.filter((personne) => personne.statut === 'annulee').length,
            accompagnateurs: personnes.filter((personne) => personne.role === 'accompagnateur' && personne.statut !== 'annulee').length,
        },
        presence: { admis: admises.length, presents: presentes.length, absents: admises.length - presentes.length, taux: pourcentage(presentes.length, admises.length) },
        parSexe,
        parSousComite: [...sousComites.values()].sort((a, b) => b.admis - a.admis),
        reponses,
        calculeLe: maintenant(),
    };
}

/** Une ligne par activité, pour comparer les activités entre elles. */
export async function statistiquesGenerales() {
    const activites = await listerActivitesAdmin({ archivees: 'toutes' });

    return activites.map((activite) => ({
        id: activite.id,
        titre: activite.titre,
        edition: activite.edition,
        date: activite.date,
        archivee: Boolean(activite.archivee),
        admis: activite.nombres.admises,
        presents: activite.nombres.presents,
        accompagnateurs: activite.nombres.accompagnateurs,
        taux: pourcentage(activite.nombres.presents, activite.nombres.admises),
    }));
}

/* ------------------------------------------------------------------------------------------------
 * Rapports d'activité
 * ---------------------------------------------------------------------------------------------- */

function texteIntroduction(activite) {
    const passee = activite.statut === 'terminee';
    const nom = activite.edition ? `${activite.titre} (${activite.edition})` : activite.titre;

    return `L’activité « ${nom} » ${passee ? 's’est tenue' : 'est prévue'} le ${dateLongue(activite.date)} à ${activite.heure}, à ${activite.lieu}. Organisation : ${activite.organisateur || 'AEEMCI — Secrétariat régional du Hambol'}.`;
}

async function nouveauBrouillon(activiteId, { approuve = false } = {}) {
    const chiffres = await statistiquesActivite(activiteId);

    if (!chiffres.activite) {
        throw new Error('Activité introuvable.');
    }

    return {
        id: `rapport-${crypto.randomUUID().slice(0, 8)}`,
        activiteId,
        titre: `Rapport d’activité : ${chiffres.activite.titre}${chiffres.activite.edition ? ` (${chiffres.activite.edition})` : ''}`,
        statut: approuve ? 'approuve' : 'brouillon',
        sections: {
            introduction: texteIntroduction(chiffres.activite),
            deroulement: approuve
                ? 'Récitations et méditations se sont succédé toute la nuit, dans le calme. Texte d’exemple : il montre un rapport approuvé.'
                : '[À compléter : déroulement, intervenants et faits marquants.]',
            conclusion: approuve
                ? 'Bilan d’exemple : une bonne affluence, à renouveler avec plus de places. Recommandation : ouvrir les inscriptions plus tôt.'
                : '[À compléter : bilan, difficultés rencontrées et recommandations.]',
        },
        chiffres,
        creeLe: maintenant(),
        creePar: approuve ? 'Administrateur de démonstration' : auteur(),
        modifieLe: maintenant(),
        approuveLe: approuve ? maintenant() : null,
        approuvePar: approuve ? 'Administrateur de démonstration' : null,
        exemple: approuve,
    };
}

/** Un rapport d'exemple déjà approuvé, pour la première activité archivée. */
async function creerExempleSiBesoin() {
    if (etat.exempleCree) {
        return;
    }

    etat.exempleCree = true;

    try {
        etat.rapports.push(await nouveauBrouillon('nuit-du-coran-2025', { approuve: true }));
    } catch {
        // Activité d'exemple absente (démonstration restaurée) : pas de rapport d'exemple.
    }

    enregistrerEtat();
}

export async function listerRapports() {
    await attendre();
    await creerExempleSiBesoin();

    return structuredClone(etat.rapports).sort((a, b) => b.modifieLe.localeCompare(a.modifieLe));
}

export async function trouverRapport(id) {
    await attendre();
    await creerExempleSiBesoin();
    const rapport = etat.rapports.find((candidat) => candidat.id === id);

    return rapport ? structuredClone(rapport) : null;
}

/** Prépare un brouillon de rapport, avec les chiffres du moment et des passages à compléter. */
export async function genererBrouillon(activiteId) {
    await attendre();
    verifierHorsMaintenance();
    const rapport = await nouveauBrouillon(activiteId);
    etat.rapports.push(rapport);
    noterOperation('Brouillon de rapport généré', rapport.titre, 'rapports');
    enregistrerEtat();

    return rapport.id;
}

function brouillon(id) {
    const rapport = etat.rapports.find((candidat) => candidat.id === id);

    if (rapport?.statut !== 'brouillon') {
        throw new Error('Ce rapport est approuvé : il ne se modifie plus. Générez un nouveau brouillon si besoin.');
    }

    return rapport;
}

export async function enregistrerRapport(id, sections) {
    await attendre();
    verifierHorsMaintenance();
    const rapport = brouillon(id);
    rapport.sections = { introduction: sections.introduction.trim(), deroulement: sections.deroulement.trim(), conclusion: sections.conclusion.trim() };
    rapport.modifieLe = maintenant();
    enregistrerEtat();
}

/** Recalcule les chiffres d'un brouillon, par exemple après le pointage. */
export async function actualiserChiffres(id) {
    await attendre();
    verifierHorsMaintenance();
    const rapport = brouillon(id);
    rapport.chiffres = await statistiquesActivite(rapport.activiteId);
    rapport.modifieLe = maintenant();
    enregistrerEtat();
}

/** Passages encore entre crochets, à compléter avant l'approbation. */
export function passagesACompleter(rapport) {
    return Object.values(rapport.sections).join('\n').match(A_COMPLETER) ?? [];
}

/**
 * Approuve un rapport relu. Il est ensuite verrouillé, et seulement alors téléchargeable en PDF.
 */
export async function approuverRapport(id, approuve) {
    await attendre();
    verifierHorsMaintenance();
    const rapport = brouillon(id);

    if (!approuve) {
        throw new Error('Cochez la case d’approbation : un rapport n’est publié ou archivé qu’après relecture.');
    }

    if (passagesACompleter(rapport).length > 0) {
        throw new Error('Des passages sont encore à compléter : remplacez chaque « [À compléter …] » avant d’approuver.');
    }

    Object.assign(rapport, { statut: 'approuve', approuveLe: maintenant(), approuvePar: auteur(), modifieLe: maintenant() });
    noterOperation('Rapport approuvé', rapport.titre, 'rapports');
    enregistrerEtat();
}

/** Notifications : brouillons à approuver et activités terminées sans rapport. */
export function evenementsRapports() {
    return etat.rapports
        .filter((rapport) => rapport.statut === 'brouillon')
        .map((rapport) => ({ id: `rapport-${rapport.id}`, le: rapport.creeLe, categorie: 'rapports', urgente: false, titre: 'Rapport à relire et approuver', texte: rapport.titre, lien: { name: 'admin-rapport', params: { id: rapport.id } } }));
}

/* ------------------------------------------------------------------------------------------------
 * Exports. Les coordonnées n'y figurent que si l'administrateur les demande, après confirmation par
 * son mot de passe ; chaque export est noté au journal d'audit.
 * ---------------------------------------------------------------------------------------------- */

const LIBELLES_STATUT = { admise: 'Admise', en_attente: 'En attente', annulee: 'Annulée' };

export async function lignesInscriptions(activiteId, avecCoordonnees = false) {
    const personnes = await listerParticipants({ activiteId });

    return personnes.map((personne) => ({
        Activité: personne.activite ? `${personne.activite.titre}${personne.activite.edition ? ` (${personne.activite.edition})` : ''}` : '',
        Nom: personne.nom,
        Rôle: personne.role === 'accompagnateur' ? 'Accompagnateur' : 'Inscrit',
        'Inscrit par': personne.inscritPar ?? '',
        Sexe: personne.sexe === 'femme' ? 'Femme' : 'Homme',
        ...(avecCoordonnees ? { Téléphone: personne.telephone ? formaterTelephone(personne.telephone) : '' } : {}),
        'Ville / commune': personne.ville ?? '',
        'Sous-Comité': personne.sousComite ?? '',
        Section: personne.section ?? '',
        Statut: LIBELLES_STATUT[personne.statut] ?? personne.statut,
        Source: personne.source ?? '',
        'Reçue le': personne.recueLe ? personne.recueLe.slice(0, 10) : '',
        Présent: personne.pointeA ? 'Oui' : 'Non',
        'Pointé à': personne.pointeA ? new Date(personne.pointeA).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Abidjan' }) : '',
    }));
}

/** Note un export au journal : quoi, combien de lignes, quel format, avec ou sans coordonnées. */
export function journaliserExport(nom, nombreLignes, format, avecCoordonnees) {
    noterOperation(`Export ${format}`, `${nom} · ${nombreLignes} ligne${nombreLignes > 1 ? 's' : ''}${avecCoordonnees ? ' · avec coordonnées' : ''}`, 'exports');
}
