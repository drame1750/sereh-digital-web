import { normaliserTelephone } from '../telephone.js';
import {
    activitesExemple,
    inscriptionsExemple,
    placesDejaPrisesExemple,
    sousComitesExemple,
} from '../donnees-exemple.js';

/**
 * Couche de données de l'application. Tous les écrans passent par ces fonctions, et par elles seules.
 *
 * VERSION DE DÉMONSTRATION : les données sont fictives et gardées dans cet onglet seulement
 * (sessionStorage). Quand Supabase sera branché, chaque fonction appellera la base ; les règles
 * ci-dessous (capacité, groupes, doublons, second passage) seront alors appliquées par le serveur,
 * jamais par le navigateur. Les écrans, eux, ne changeront pas.
 */
export const MODE_DEMONSTRATION = true;

const CLE_STOCKAGE = 'sereh.demonstration';
const LATENCE_MS = 280;

const attendre = () => new Promise((resoudre) => setTimeout(resoudre, LATENCE_MS));

function lireEtat() {
    try {
        const etat = JSON.parse(window.sessionStorage.getItem(CLE_STOCKAGE) ?? 'null');

        if (etat?.inscriptions && etat?.pointages) {
            return etat;
        }
    } catch {
        // Stockage indisponible : la démonstration repart des données d'exemple.
    }

    return { inscriptions: structuredClone(inscriptionsExemple), pointages: [], liens: {} };
}

const etat = lireEtat();

function enregistrerEtat() {
    try {
        window.sessionStorage.setItem(CLE_STOCKAGE, JSON.stringify(etat));
    } catch {
        // Stockage indisponible : les inscriptions de démonstration valent pour cette page seulement.
    }
}

function jetonAleatoire(longueur) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const octets = crypto.getRandomValues(new Uint8Array(longueur));

    return Array.from(octets, (octet) => alphabet[octet % alphabet.length]).join('');
}

function placesPrises(activiteId) {
    const admises = etat.inscriptions.filter((inscription) => inscription.activiteId === activiteId && inscription.statut === 'admise').length;

    return admises + (placesDejaPrisesExemple[activiteId] ?? 0);
}

function decrireActivite(activite) {
    const restantes = activite.capacite === null ? null : Math.max(0, activite.capacite - placesPrises(activite.id));
    const terminee = new Date(`${activite.date}T23:59:59Z`).getTime() < Date.now();
    let statut = 'inscriptions-ouvertes';

    if (terminee) {
        statut = 'terminee';
    } else if (!activite.inscriptionsOuvertes) {
        statut = 'inscriptions-fermees';
    } else if (restantes === 0) {
        statut = 'complet';
    }

    return { ...activite, placesRestantes: restantes, statut };
}

/** Activités publiées, de la plus proche à la plus lointaine. */
export async function listerActivites() {
    await attendre();

    return activitesExemple.map(decrireActivite).sort((a, b) => a.date.localeCompare(b.date));
}

export async function trouverActivite(id) {
    await attendre();
    const activite = activitesExemple.find((candidate) => candidate.id === id);

    return activite ? decrireActivite(activite) : null;
}

export async function listerSousComites() {
    return sousComitesExemple;
}

/**
 * Inscription d'une personne et de ses accompagnateurs (cahier des charges, section 4) :
 * - le groupe est admis en entier s'il tient dans les places restantes, sinon il passe en attente ;
 * - un numéro déjà utilisé pour cette activité est seulement signalé à l'administrateur ;
 * - chaque personne reçoit son propre QR code, et le groupe un lien personnel secret.
 *
 * @returns {Promise<{ jeton: string, statut: 'admise' | 'en_attente' }>}
 */
export async function inscrire(activiteId, donnees) {
    await attendre();
    const activite = activitesExemple.find((candidate) => candidate.id === activiteId);

    // Une activité complète accepte encore des inscriptions, mais en attente de validation.
    if (!activite || !['inscriptions-ouvertes', 'complet'].includes(decrireActivite(activite).statut)) {
        throw new Error('Les inscriptions sont fermées pour cette activité.');
    }

    const telephone = normaliserTelephone(donnees.telephone);

    if (telephone === null) {
        throw new Error('Numéro ivoirien invalide : 10 chiffres commençant par 01, 05, 07, 21, 25 ou 27.');
    }

    if (donnees.accompagnateurs.length > activite.maxAccompagnateurs) {
        throw new Error(`Vous pouvez inscrire au plus ${activite.maxAccompagnateurs} accompagnateur(s).`);
    }

    const restantes = decrireActivite(activite).placesRestantes;
    const tailleGroupe = 1 + donnees.accompagnateurs.length;
    const statut = restantes === null || restantes >= tailleGroupe ? 'admise' : 'en_attente';
    const groupe = jetonAleatoire(12);
    const doublonPossible = etat.inscriptions.some((inscription) => inscription.activiteId === activiteId && inscription.telephone === telephone);
    const recueLe = new Date().toISOString();

    const principal = {
        id: jetonAleatoire(10),
        activiteId,
        groupe,
        role: 'principal',
        nom: donnees.nom.trim(),
        sexe: donnees.sexe,
        telephone,
        ville: donnees.ville.trim(),
        sousComite: donnees.sousComite || null,
        section: donnees.section || null,
        mineur: donnees.mineur,
        tuteur: donnees.mineur ? { nom: donnees.tuteurNom.trim(), telephone: normaliserTelephone(donnees.tuteurTelephone) } : null,
        publicationAcceptee: donnees.publicationAcceptee,
        doublonPossible,
        statut,
        codeQr: jetonAleatoire(32),
        recueLe,
    };

    const accompagnateurs = donnees.accompagnateurs.map((accompagnateur) => ({
        id: jetonAleatoire(10),
        activiteId,
        groupe,
        role: 'accompagnateur',
        nom: accompagnateur.nom.trim(),
        sexe: accompagnateur.sexe,
        telephone: accompagnateur.telephone ? normaliserTelephone(accompagnateur.telephone) : null,
        statut,
        codeQr: jetonAleatoire(32),
        recueLe,
    }));

    const jeton = jetonAleatoire(48);
    etat.inscriptions.push(principal, ...accompagnateurs);
    etat.liens[jeton] = groupe;
    enregistrerEtat();

    return { jeton, statut };
}

/** Le groupe d'inscription auquel donne accès un lien personnel, ou null. */
export async function lireParJeton(jeton) {
    await attendre();
    const groupe = etat.liens[jeton];

    if (!groupe) {
        return null;
    }

    const personnes = etat.inscriptions.filter((inscription) => inscription.groupe === groupe);
    const principal = personnes.find((personne) => personne.role === 'principal');
    const activite = await trouverActivite(principal.activiteId);

    return { activite, principal, accompagnateurs: personnes.filter((personne) => personne.role === 'accompagnateur') };
}

function premierPointage(inscriptionId) {
    return etat.pointages.find((pointage) => pointage.inscriptionId === inscriptionId && pointage.resultat === 'accepte');
}

/**
 * Vérifie un QR code présenté à l'entrée d'une activité. Le second passage est bloqué et rappelle
 * l'heure du premier ; chaque tentative est notée, acceptée ou refusée.
 *
 * @returns {Promise<{ resultat: 'accepte' | 'deja_pointe' | 'non_admise' | 'autre_activite' | 'inconnu', personne?: object, premierPassage?: string }>}
 */
export async function verifierCode(activiteId, code, moyen) {
    await attendre();
    const personne = etat.inscriptions.find((inscription) => inscription.codeQr === String(code).trim());

    return enregistrerPassage(activiteId, personne, moyen);
}

/** Pointage à la main, après une recherche par nom (saisie de secours). */
export async function pointerParIdentifiant(activiteId, inscriptionId, moyen = 'saisie manuelle') {
    await attendre();

    return enregistrerPassage(activiteId, etat.inscriptions.find((inscription) => inscription.id === inscriptionId), moyen);
}

function enregistrerPassage(activiteId, personne, moyen) {
    const maintenant = new Date().toISOString();
    let reponse;

    if (!personne) {
        reponse = { resultat: 'inconnu' };
    } else if (personne.activiteId !== activiteId) {
        reponse = { resultat: 'autre_activite', personne: resume(personne) };
    } else if (personne.statut !== 'admise') {
        reponse = { resultat: 'non_admise', personne: resume(personne) };
    } else if (premierPointage(personne.id)) {
        reponse = { resultat: 'deja_pointe', personne: resume(personne), premierPassage: premierPointage(personne.id).le };
    } else {
        reponse = { resultat: 'accepte', personne: { ...resume(personne), pointeA: maintenant } };
    }

    etat.pointages.push({ inscriptionId: personne?.id ?? null, activiteId, resultat: reponse.resultat, moyen, le: maintenant });
    enregistrerEtat();

    return reponse;
}

/** Ce qu'un agent de pointage peut voir d'une personne : jamais son numéro de téléphone. */
function resume(personne) {
    return {
        id: personne.id,
        nom: personne.nom,
        role: personne.role,
        sexe: personne.sexe,
        statut: personne.statut,
        pointeA: premierPointage(personne.id)?.le ?? null,
    };
}

/** Recherche à la main, par nom, parmi les inscrits d'une activité. */
export async function rechercherInscrits(activiteId, texte) {
    await attendre();
    const recherche = texte.trim().toLocaleLowerCase('fr');

    if (recherche.length < 2) {
        return [];
    }

    return etat.inscriptions
        .filter((inscription) => inscription.activiteId === activiteId && inscription.nom.toLocaleLowerCase('fr').includes(recherche))
        .slice(0, 20)
        .map(resume);
}

/** Chiffres du pointage d'une activité, calculés sur les données (de démonstration). */
export async function statistiquesPointage(activiteId) {
    const admis = etat.inscriptions.filter((inscription) => inscription.activiteId === activiteId && inscription.statut === 'admise');

    return {
        admis: admis.length,
        presents: admis.filter((inscription) => premierPointage(inscription.id)).length,
    };
}

/** Remet la démonstration à zéro : inscriptions et pointages fictifs de départ. */
export function reinitialiserDemonstration() {
    Object.assign(etat, { inscriptions: structuredClone(inscriptionsExemple), pointages: [], liens: {} });
    enregistrerEtat();
}
