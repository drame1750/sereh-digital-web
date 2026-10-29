import { reactive } from 'vue';
import { aujourdhui, dansJours } from '../donnees-exemple.js';
import { normaliserTelephone } from '../telephone.js';

/**
 * Connexion aux espaces privés et comptes (cahier des charges, sections 6 et 10).
 *
 * VERSION DE DÉMONSTRATION : comptes fictifs gardés dans cet onglet, et un code de double
 * authentification fixe. Quand Supabase sera branché, la connexion, la double authentification, les
 * sessions et le contrôle des droits seront faits par le serveur, qui ne gardera des mots de passe
 * qu'une empreinte (hachage) ; ce fichier gardera la même forme pour les écrans.
 *
 * « membreId » relie un compte de secrétaire régional, ou de remplaçant, à une fiche de membre du bureau.
 */
export const COMPTES_DEMONSTRATION = [
    { id: 'compte-admin', telephone: '+2250700000001', motDePasse: 'Demonstration2026', nom: 'Administrateur de démonstration', role: 'admin', doubleAuthentification: true, motDePasseProvisoire: false },
    { id: 'compte-agent', telephone: '+2250700000002', motDePasse: 'Demonstration2026', nom: 'Agent de démonstration', role: 'pointage', doubleAuthentification: false, motDePasseProvisoire: false },
    { id: 'compte-sr', telephone: '+2250700000003', motDePasse: 'Provisoire2026', nom: 'Secrétaire régional de démonstration', role: 'sr', membreId: 'membre-sr', doubleAuthentification: false, motDePasseProvisoire: true },
    { id: 'compte-vice-sr', telephone: '+2250700000004', motDePasse: 'Demonstration2026', nom: 'Vice-SR de démonstration', role: 'sr', membreId: 'membre-vice-sr', doubleAuthentification: false, motDePasseProvisoire: false },
];

export const CODE_DEMONSTRATION = '123456';

/** Après 5 échecs pour un même numéro, la connexion est bloquée 15 minutes. */
const ECHECS_MAXIMUM = 5;
const BLOCAGE_MS = 15 * 60 * 1000;
const CLE_STOCKAGE = 'sereh.session.demonstration';
const CLE_COMPTES = 'sereh.demonstration.comptes';

const echecs = new Map();
const attendre = () => new Promise((resoudre) => setTimeout(resoudre, 350));
const maintenant = () => new Date().toISOString();

/** Autres comptes fictifs, pour montrer chaque situation dans la rubrique Comptes. */
function comptesSupplementaires() {
    return [
        { id: 'compte-responsable', telephone: '+2250700000005', motDePasse: 'Demonstration2026', nom: 'Responsable de démonstration', role: 'responsable', activiteId: 'nuit-du-coran' },
        { id: 'compte-communication', telephone: '+2250700000006', motDePasse: 'Demonstration2026', nom: 'Communication de démonstration', role: 'communication' },
        { id: 'compte-remplacant', telephone: '+2250700000007', motDePasse: 'Demonstration2026', nom: 'Remplaçant de démonstration', role: 'remplacant', membreId: 'membre-seramo-1', validite: { du: dansJours(-2), au: dansJours(5) } },
        { id: 'compte-agent-nuit', telephone: '+2250700000008', motDePasse: 'Demonstration2026', nom: 'Agent de la Nuit du Coran (exemple)', role: 'pointage', activiteId: 'nuit-du-coran', plage: { debut: '2026-11-21T18:00', fin: '2026-11-22T06:00' } },
        { id: 'compte-ancien', telephone: '+2250700000009', motDePasse: 'Demonstration2026', nom: 'Ancien membre (exemple)', role: 'sr', membreId: 'membre-seraess-2', actif: false, desactiveLe: `${dansJours(-40)}T10:00:00.000Z`, motifDesactivation: 'Fin de fonction' },
    ];
}

function comptesInitiaux() {
    const sessionsExemple = [{ id: 'session-exemple', appareil: 'Téléphone Android · Chrome (exemple)', ouverteLe: `${dansJours(-1)}T19:42:00.000Z` }];

    return [...COMPTES_DEMONSTRATION.map((compte) => ({ ...compte, fixe: true })), ...comptesSupplementaires()].map((compte) => ({
        membreId: null,
        activiteId: null,
        plage: null,
        validite: null,
        doubleAuthentification: false,
        motDePasseProvisoire: false,
        actif: true,
        desactiveLe: null,
        motifDesactivation: '',
        desactivationPrevueLe: null,
        creeLe: `${dansJours(-30)}T09:00:00.000Z`,
        ...compte,
        sessions: compte.id === 'compte-admin' || compte.id === 'compte-vice-sr' ? structuredClone(sessionsExemple) : [],
    }));
}

function lireComptes() {
    try {
        const enregistres = JSON.parse(window.sessionStorage.getItem(CLE_COMPTES) ?? 'null');

        if (Array.isArray(enregistres?.comptes)) {
            return enregistres;
        }
    } catch {
        // Stockage indisponible : la démonstration repart des comptes d'exemple.
    }

    return { comptes: comptesInitiaux(), evenements: [] };
}

/** Comptes et événements de sécurité de la démonstration. Seuls ce fichier et services/comptes.js y touchent. */
export const registre = lireComptes();

export function enregistrerRegistre() {
    try {
        window.sessionStorage.setItem(CLE_COMPTES, JSON.stringify(registre));
    } catch {
        // Stockage indisponible : les changements valent pour cette page seulement.
    }
}

/** Événement de sécurité (tentative refusée, blocage, session fermée…). Jamais de mot de passe. */
export function noterEvenement(type, detail) {
    registre.evenements.unshift({ le: maintenant(), type, detail });
    registre.evenements = registre.evenements.slice(0, 300);
    enregistrerRegistre();
}

function lireSession() {
    try {
        return JSON.parse(window.sessionStorage.getItem(CLE_STOCKAGE) ?? 'null');
    } catch {
        return null;
    }
}

/**
 * État de la session : la personne connectée, son niveau (« aal2 » après la double authentification)
 * et l'étape en cours. Gardé dans l'onglet seulement : fermer l'onglet déconnecte.
 */
export const session = reactive({
    utilisateur: null,
    niveau: 'aal1',
    etape: null,
    message: '',
    ...lireSession(),
});

function enregistrer() {
    try {
        window.sessionStorage.setItem(CLE_STOCKAGE, JSON.stringify({ utilisateur: session.utilisateur, niveau: session.niveau, etape: session.etape, compteEnCours: compteEnCours?.id ?? null }));
    } catch {
        // Stockage indisponible : la session vaut pour cette page seulement.
    }
}

let compteEnCours = registre.comptes.find((compte) => compte.id === lireSession()?.compteEnCours) ?? null;

/** Numéro masqué pour les journaux : seuls les deux derniers chiffres restent lisibles. */
export function masquerTelephone(telephone) {
    const chiffres = String(telephone ?? '').replace(/\D/g, '').slice(-10);

    return chiffres.length === 10 ? `${chiffres.slice(0, 2)} •• •• •• ${chiffres.slice(8)}` : '•• •• •• •• ••';
}

/** Description courte de l'appareil, pour la liste des sessions actives. */
export function decrireAppareil() {
    const agent = navigator.userAgent;
    const systeme = /Android/.test(agent) ? 'Téléphone Android' : /iPhone|iPad/.test(agent) ? 'iPhone ou iPad' : /Windows/.test(agent) ? 'Ordinateur Windows' : /Mac/.test(agent) ? 'Mac' : 'Appareil';
    const navigateur = /Edg\//.test(agent) ? 'Edge' : /Firefox\//.test(agent) ? 'Firefox' : /Chrome\//.test(agent) ? 'Chrome' : /Safari\//.test(agent) ? 'Safari' : 'navigateur';

    return `${systeme} · ${navigateur}`;
}

/**
 * Ce qui empêche un compte de se connecter maintenant, ou null. Un remplacement expiré, une
 * désactivation programmée échue ou une plage horaire passée ferment l'accès d'eux-mêmes.
 */
export function blocageDuCompte(compte, instant = new Date()) {
    const jour = aujourdhui();

    if (!compte.actif) {
        return { raison: 'desactive', texte: 'Ce compte est désactivé.' };
    }

    if (compte.desactivationPrevueLe && compte.desactivationPrevueLe <= jour) {
        return { raison: 'programme', texte: 'Ce compte a été désactivé à la date prévue.' };
    }

    if (compte.role === 'remplacant' && compte.validite) {
        if (jour < compte.validite.du) {
            return { raison: 'pas-encore', texte: 'Ce remplacement n’a pas encore commencé.' };
        }

        if (jour > compte.validite.au) {
            return { raison: 'expire', texte: 'Ce remplacement est terminé : l’accès temporaire est fermé.' };
        }
    }

    if (compte.role === 'pointage' && compte.plage) {
        const debut = new Date(compte.plage.debut);
        const fin = new Date(compte.plage.fin);

        if (instant < debut || instant > fin) {
            const format = { dateStyle: 'medium', timeStyle: 'short' };

            return { raison: 'hors-plage', texte: `Votre accès au pointage est ouvert du ${debut.toLocaleString('fr-FR', format)} au ${fin.toLocaleString('fr-FR', format)}.` };
        }
    }

    return null;
}

/**
 * Première étape : numéro et mot de passe. Le message d'erreur ne dit jamais si le numéro existe.
 *
 * @returns {Promise<'code' | 'nouveau-mot-de-passe' | 'connecte'>} l'étape suivante
 */
export async function seConnecter(telephone, motDePasse) {
    await attendre();
    const numero = normaliserTelephone(telephone);
    const blocage = echecs.get(numero);

    if (blocage?.jusqua > Date.now()) {
        noterEvenement('Connexion refusée', `${masquerTelephone(numero)} · blocage de 15 minutes en cours`);

        throw new Error('Trop d’essais : la connexion est bloquée pendant 15 minutes pour ce numéro.');
    }

    const compte = registre.comptes.find((candidat) => candidat.telephone === numero && candidat.motDePasse === motDePasse);

    if (!compte) {
        const nombre = (blocage?.nombre ?? 0) + 1;
        echecs.set(numero, { nombre, jusqua: nombre >= ECHECS_MAXIMUM ? Date.now() + BLOCAGE_MS : 0 });
        noterEvenement(nombre >= ECHECS_MAXIMUM ? 'Numéro bloqué 15 minutes' : 'Mot de passe incorrect', `${masquerTelephone(numero)} · essai ${nombre} sur ${ECHECS_MAXIMUM}`);

        throw new Error(nombre >= ECHECS_MAXIMUM
            ? 'Trop d’essais : la connexion est bloquée pendant 15 minutes pour ce numéro.'
            : 'Numéro ou mot de passe incorrect.');
    }

    const empechement = blocageDuCompte(compte);

    if (empechement) {
        noterEvenement('Connexion refusée', `${masquerTelephone(numero)} · ${empechement.texte}`);

        throw new Error(empechement.raison === 'hors-plage' ? empechement.texte : `${empechement.texte} Adressez-vous à l’administrateur.`);
    }

    echecs.delete(numero);
    compteEnCours = compte;
    session.message = '';

    if (compte.motDePasseProvisoire) {
        session.etape = 'nouveau-mot-de-passe';
    } else if (compte.doubleAuthentification) {
        session.etape = 'code';
    } else {
        ouvrirSession(compte, 'aal1');
    }

    enregistrer();

    return session.etape ?? 'connecte';
}

/** Deuxième étape pour un administrateur : le code à 6 chiffres de son application. */
export async function validerCode(code) {
    await attendre();

    if (!compteEnCours || session.etape !== 'code') {
        throw new Error('Reprenez la connexion depuis le début.');
    }

    if (code !== CODE_DEMONSTRATION) {
        noterEvenement('Code de double authentification refusé', masquerTelephone(compteEnCours.telephone));

        throw new Error('Code incorrect ou expiré. Saisissez le code affiché maintenant par votre application.');
    }

    ouvrirSession(compteEnCours, 'aal2');
}

function erreurMotDePasse(nouveau, ancien, confirmation) {
    if (nouveau.length < 12 || !/[a-zA-Z]/.test(nouveau) || !/\d/.test(nouveau)) {
        return 'Le mot de passe doit compter au moins 12 caractères, avec des lettres et des chiffres.';
    }

    if (nouveau === ancien) {
        return 'Choisissez un mot de passe différent de l’ancien.';
    }

    if (nouveau !== confirmation) {
        return 'Les deux mots de passe ne correspondent pas.';
    }

    return null;
}

/** Un mot de passe provisoire doit être remplacé avant tout autre usage du compte. */
export async function remplacerMotDePasseProvisoire(nouveau, confirmation) {
    await attendre();

    if (!compteEnCours || session.etape !== 'nouveau-mot-de-passe') {
        throw new Error('Reprenez la connexion depuis le début.');
    }

    const probleme = erreurMotDePasse(nouveau, compteEnCours.motDePasse, confirmation);

    if (probleme) {
        throw new Error(probleme === 'Choisissez un mot de passe différent de l’ancien.' ? 'Choisissez un mot de passe différent du mot de passe provisoire.' : probleme);
    }

    // Démonstration : les quatre comptes affichés sur la page de connexion gardent leur mot de passe
    // d'origine, pour les essais suivants. Les autres comptes prennent le nouveau.
    if (!compteEnCours.fixe) {
        compteEnCours.motDePasse = nouveau;
        compteEnCours.motDePasseProvisoire = false;
        enregistrerRegistre();
    }

    if (compteEnCours.doubleAuthentification) {
        session.etape = 'code';
        enregistrer();

        return 'code';
    }

    ouvrirSession(compteEnCours, 'aal1');

    return 'connecte';
}

function ouvrirSession(compte, niveau) {
    const identifiant = crypto.randomUUID();
    compte.sessions.unshift({ id: identifiant, appareil: `${decrireAppareil()} (cet appareil)`, ouverteLe: maintenant() });
    enregistrerRegistre();
    session.utilisateur = {
        id: compte.id,
        nom: compte.nom,
        role: compte.role,
        telephone: compte.telephone,
        membreId: compte.membreId ?? null,
        activiteId: compte.activiteId ?? null,
        sessionId: identifiant,
    };
    session.niveau = niveau;
    session.etape = null;
    compteEnCours = null;
    enregistrer();
}

export function seDeconnecter(message = '') {
    const compte = monCompte();

    if (compte) {
        compte.sessions = compte.sessions.filter((candidate) => candidate.id !== session.utilisateur.sessionId);
        enregistrerRegistre();
    }

    session.utilisateur = null;
    session.niveau = 'aal1';
    session.etape = null;
    session.message = message;
    compteEnCours = null;
    enregistrer();
}

export function reprendreConnexion() {
    session.etape = null;
    compteEnCours = null;
    enregistrer();
}

/** Le compte de la personne connectée, ou null. */
export function monCompte() {
    return registre.comptes.find((compte) => compte.id === session.utilisateur?.id) ?? null;
}

/**
 * La session ouverte vaut-elle encore ? Une session fermée à distance, un compte désactivé ou un
 * remplacement échu imposent une nouvelle connexion. Le serveur fera la même vérification à chaque
 * demande.
 */
export function verifierSession() {
    if (!session.utilisateur) {
        return true;
    }

    const compte = monCompte();
    const raison = !compte
        ? 'Ce compte n’existe plus.'
        : !compte.sessions.some((candidate) => candidate.id === session.utilisateur.sessionId)
            ? 'Votre session a été fermée depuis un autre appareil. Reconnectez-vous.'
            : blocageDuCompte(compte)?.texte;

    if (raison) {
        session.utilisateur = null;
        session.niveau = 'aal1';
        session.message = raison;
        enregistrer();

        return false;
    }

    return true;
}

/**
 * Nouvelle saisie du mot de passe avant une opération sensible (suppression définitive, droits,
 * restauration, export massif, maintenance, changement de numéro).
 */
export async function verifierMotDePasse(motDePasse) {
    await attendre();
    const compte = monCompte();

    if (!compte || compte.motDePasse !== motDePasse) {
        noterEvenement('Confirmation par mot de passe refusée', compte ? masquerTelephone(compte.telephone) : 'session inconnue');

        throw new Error('Mot de passe incorrect : l’opération n’a pas été faite.');
    }

    return true;
}

/** Changement de son propre mot de passe, depuis son espace. */
export async function changerMonMotDePasse(actuel, nouveau, confirmation) {
    await attendre();
    const compte = monCompte();

    if (!compte || compte.motDePasse !== actuel) {
        throw new Error('Le mot de passe actuel est incorrect.');
    }

    const probleme = erreurMotDePasse(nouveau, actuel, confirmation);

    if (probleme) {
        throw new Error(probleme);
    }

    if (!compte.fixe) {
        compte.motDePasse = nouveau;
    }

    noterEvenement('Mot de passe changé', `${compte.nom} · ${masquerTelephone(compte.telephone)}`);
    enregistrerRegistre();

    return compte.fixe ? 'Mot de passe accepté. Démonstration : ce compte d’essai garde son mot de passe affiché sur la page de connexion.' : 'Votre mot de passe est changé.';
}

/** Mes sessions ouvertes, la mienne en tête. */
export async function mesSessions() {
    const compte = monCompte();

    return (compte?.sessions ?? []).map((ouverte) => ({ ...ouverte, courante: ouverte.id === session.utilisateur?.sessionId }));
}

/** Déconnexion à distance d'un de mes appareils : il devra se reconnecter. */
export async function fermerMaSession(identifiant) {
    await attendre();
    const compte = monCompte();
    compte.sessions = compte.sessions.filter((candidate) => candidate.id !== identifiant);
    noterEvenement('Session fermée à distance', `${compte.nom}`);
    enregistrerRegistre();
}

/**
 * Qui peut ouvrir quel espace. Dans l'interface, cela décide seulement de ce qui s'affiche : c'est
 * le serveur qui refusera toute action non autorisée.
 */
export function aAcces(acces) {
    const utilisateur = session.utilisateur;

    if (!utilisateur) {
        return false;
    }

    const administrateur = utilisateur.role === 'admin' && session.niveau === 'aal2';

    return {
        admin: administrateur,
        pointage: administrateur || ['pointage', 'responsable'].includes(utilisateur.role),
        sr: utilisateur.role === 'sr' || utilisateur.role === 'remplacant',
    }[acces] ?? false;
}

/** Page d'arrivée de la personne connectée, selon son rôle. */
export function accueilDuRole() {
    return {
        admin: { name: 'tableau-de-bord' },
        pointage: { name: 'pointage' },
        responsable: { name: 'pointage' },
        sr: { name: 'espace-secretaire' },
        remplacant: { name: 'espace-secretaire' },
    }[session.utilisateur?.role] ?? { name: 'accueil' };
}

export const LIBELLES_ROLES = {
    admin: 'Administrateur',
    sr: 'Secrétaire régional',
    remplacant: 'Remplaçant',
    pointage: 'Agent de pointage',
    responsable: 'Responsable',
    communication: 'Communication',
};
