import { reactive } from 'vue';
import { normaliserTelephone } from '../telephone.js';

/**
 * Connexion aux espaces privés (cahier des charges, sections 6 et 10).
 *
 * VERSION DE DÉMONSTRATION : quatre comptes fictifs, et un code de double authentification fixe.
 * Quand Supabase sera branché, la connexion, la double authentification et le contrôle des droits
 * seront faits par le serveur ; ce fichier gardera la même forme pour les écrans.
 *
 * « membreId » relie un compte de secrétaire régional à sa fiche de membre du bureau.
 */
export const COMPTES_DEMONSTRATION = [
    { telephone: '+2250700000001', motDePasse: 'Demonstration2026', nom: 'Administrateur de démonstration', role: 'admin', doubleAuthentification: true, motDePasseProvisoire: false },
    { telephone: '+2250700000002', motDePasse: 'Demonstration2026', nom: 'Agent de démonstration', role: 'pointage', doubleAuthentification: false, motDePasseProvisoire: false },
    { telephone: '+2250700000003', motDePasse: 'Provisoire2026', nom: 'Secrétaire régional de démonstration', role: 'sr', membreId: 'membre-sr', doubleAuthentification: false, motDePasseProvisoire: true },
    { telephone: '+2250700000004', motDePasse: 'Demonstration2026', nom: 'Vice-SR de démonstration', role: 'sr', membreId: 'membre-vice-sr', doubleAuthentification: false, motDePasseProvisoire: false },
];

export const CODE_DEMONSTRATION = '123456';

/** Après 5 échecs pour un même numéro, la connexion est bloquée 15 minutes. */
const ECHECS_MAXIMUM = 5;
const BLOCAGE_MS = 15 * 60 * 1000;
const CLE_STOCKAGE = 'sereh.session.demonstration';

const echecs = new Map();
const attendre = () => new Promise((resoudre) => setTimeout(resoudre, 350));

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
        window.sessionStorage.setItem(CLE_STOCKAGE, JSON.stringify({ utilisateur: session.utilisateur, niveau: session.niveau, etape: session.etape }));
    } catch {
        // Stockage indisponible : la session vaut pour cette page seulement.
    }
}

let compteEnCours = null;

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
        throw new Error('Trop d’essais : la connexion est bloquée pendant 15 minutes pour ce numéro.');
    }

    const compte = COMPTES_DEMONSTRATION.find((candidat) => candidat.telephone === numero && candidat.motDePasse === motDePasse);

    if (!compte) {
        const nombre = (blocage?.nombre ?? 0) + 1;
        echecs.set(numero, { nombre, jusqua: nombre >= ECHECS_MAXIMUM ? Date.now() + BLOCAGE_MS : 0 });

        throw new Error(nombre >= ECHECS_MAXIMUM
            ? 'Trop d’essais : la connexion est bloquée pendant 15 minutes pour ce numéro.'
            : 'Numéro ou mot de passe incorrect.');
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
        throw new Error('Code incorrect ou expiré. Saisissez le code affiché maintenant par votre application.');
    }

    ouvrirSession(compteEnCours, 'aal2');
}

/** Un mot de passe provisoire doit être remplacé avant tout autre usage du compte. */
export async function remplacerMotDePasseProvisoire(nouveau, confirmation) {
    await attendre();

    if (!compteEnCours || session.etape !== 'nouveau-mot-de-passe') {
        throw new Error('Reprenez la connexion depuis le début.');
    }

    if (nouveau.length < 12 || !/[a-zA-Z]/.test(nouveau) || !/\d/.test(nouveau)) {
        throw new Error('Le mot de passe doit compter au moins 12 caractères, avec des lettres et des chiffres.');
    }

    if (nouveau === compteEnCours.motDePasse) {
        throw new Error('Choisissez un mot de passe différent du mot de passe provisoire.');
    }

    if (nouveau !== confirmation) {
        throw new Error('Les deux mots de passe ne correspondent pas.');
    }

    // Démonstration : le compte fictif garde son mot de passe d'origine pour les essais suivants.
    if (compteEnCours.doubleAuthentification) {
        session.etape = 'code';
        enregistrer();

        return 'code';
    }

    ouvrirSession(compteEnCours, 'aal1');

    return 'connecte';
}

function ouvrirSession(compte, niveau) {
    session.utilisateur = { nom: compte.nom, role: compte.role, telephone: compte.telephone, membreId: compte.membreId ?? null };
    session.niveau = niveau;
    session.etape = null;
    compteEnCours = null;
    enregistrer();
}

export function seDeconnecter(message = '') {
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
        pointage: administrateur || utilisateur.role === 'pointage',
        sr: utilisateur.role === 'sr' || utilisateur.role === 'remplacant',
    }[acces] ?? false;
}

/** Page d'arrivée de la personne connectée, selon son rôle. */
export function accueilDuRole() {
    return { admin: { name: 'tableau-de-bord' }, pointage: { name: 'pointage' }, sr: { name: 'espace-secretaire' } }[session.utilisateur?.role] ?? { name: 'accueil' };
}

export const LIBELLES_ROLES = {
    admin: 'Administrateur',
    sr: 'Secrétaire régional',
    remplacant: 'Remplaçant',
    pointage: 'Agent de pointage',
    responsable: 'Responsable',
    communication: 'Communication',
};
