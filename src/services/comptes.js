import { listerFichesMembres } from './courriers.js';
import { noterOperation } from './donnees.js';
import { verifierHorsMaintenance } from './maintenance.js';
import { parametres } from './parametres.js';
import { blocageDuCompte, enregistrerRegistre, LIBELLES_ROLES, masquerTelephone, noterEvenement, registre, session } from './session.js';
import { normaliserTelephone } from '../telephone.js';

/**
 * Comptes et utilisateurs (cahier des charges, section 6) : seuls les administrateurs créent les
 * comptes privés, règlent les droits, désactivent un accès tout de suite ou à une date, et ferment
 * les sessions à distance. Chaque changement est noté au journal d'audit, jamais le mot de passe.
 *
 * VERSION DE DÉMONSTRATION : les comptes restent dans cet onglet. Avec Supabase, ces opérations
 * passeront par une fonction serveur réservée aux administrateurs, avec la clé secrète gardée côté
 * serveur.
 */
const attendre = () => new Promise((resoudre) => setTimeout(resoudre, 300));
const maintenant = () => new Date().toISOString();

/** Ce que chaque rôle peut faire. Le serveur appliquera ces droits ; l'interface ne fait que les montrer. */
export const DROITS_PAR_ROLE = [
    { role: 'admin', droits: 'Tout : activités, inscriptions, courriers, comptes, exports, paramètres, sauvegardes et sécurité. Double authentification obligatoire.' },
    { role: 'sr', droits: 'Ses courriers seulement : consulter, télécharger, répondre, poser une question, demander une modification.' },
    { role: 'remplacant', droits: 'Les courriers du membre remplacé, pendant la période fixée. L’accès se ferme seul à la fin.' },
    { role: 'pointage', droits: 'Le pointage des activités attribuées, pendant sa plage horaire. Jamais les numéros de téléphone.' },
    { role: 'responsable', droits: 'Le pointage de son activité et ses corrections motivées. Les autres fonctions seulement si elles lui sont accordées.' },
    { role: 'communication', droits: 'Préparer les textes et l’affiche d’une activité, sans pouvoir la publier.' },
];

export const ROLES = Object.keys(LIBELLES_ROLES);

function genererMotDePasseProvisoire() {
    const lettres = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
    const chiffres = '23456789';
    const tirage = crypto.getRandomValues(new Uint8Array(12));
    const caracteres = Array.from(tirage, (octet, index) => (index % 4 === 3 ? chiffres[octet % chiffres.length] : lettres[octet % lettres.length]));

    return caracteres.join('');
}

function trouver(id) {
    const compte = registre.comptes.find((candidat) => candidat.id === id);

    if (!compte) {
        throw new Error('Compte introuvable.');
    }

    return compte;
}

function decrire(compte, membres) {
    const { motDePasse, ...visible } = structuredClone(compte);
    const blocage = blocageDuCompte(compte);

    return {
        ...visible,
        membre: membres.find((candidat) => candidat.id === compte.membreId) ?? null,
        etat: blocage ? (blocage.raison === 'hors-plage' || blocage.raison === 'pas-encore' ? 'en-attente' : 'inactif') : 'actif',
        blocage: blocage?.texte ?? null,
        estMoi: compte.id === session.utilisateur?.id,
    };
}

/** Tous les comptes, sans aucun mot de passe. */
export async function listerComptes() {
    await attendre();
    const membres = await listerFichesMembres();

    return registre.comptes.map((compte) => decrire(compte, membres)).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

/** Nombre de comptes actifs par secrétariat, comparé au nombre autorisé dans les Paramètres. */
export async function quotasDesSecretariats() {
    const membres = await listerFichesMembres();

    return parametres.secretariats.map((secretariat) => ({
        ...secretariat,
        utilises: registre.comptes.filter((compte) => compte.actif && ['sr', 'remplacant'].includes(compte.role) && membres.find((membre) => membre.id === compte.membreId)?.groupe === secretariat.sigle).length,
    }));
}

async function verifierRattachement(donnees, membres, compteId = null) {
    const erreurs = {};

    if (['sr', 'remplacant'].includes(donnees.role)) {
        const membre = membres.find((candidat) => candidat.id === donnees.membreId);

        if (!membre) {
            erreurs.membreId = donnees.role === 'sr' ? 'Choisissez la fiche du membre du bureau.' : 'Choisissez le membre remplacé.';
        } else {
            const quota = parametres.secretariats.find((secretariat) => secretariat.sigle === membre.groupe);
            const utilises = registre.comptes.filter((compte) => compte.id !== compteId && compte.actif && ['sr', 'remplacant'].includes(compte.role) && membres.find((candidat) => candidat.id === compte.membreId)?.groupe === membre.groupe).length;

            if (quota && utilises >= quota.comptesAutorises) {
                erreurs.membreId = `Le ${membre.groupe} a déjà ${utilises} compte(s) sur ${quota.comptesAutorises} autorisé(s). Modifiez ce nombre dans les Paramètres si besoin.`;
            }
        }
    }

    if (donnees.role === 'remplacant') {
        if (!donnees.validiteDu || !donnees.validiteAu || donnees.validiteAu < donnees.validiteDu) {
            erreurs.validite = 'Indiquez la période du remplacement : la fin vient après le début.';
        }
    }

    if (donnees.role === 'pointage' && (donnees.plageDebut || donnees.plageFin)) {
        if (!donnees.plageDebut || !donnees.plageFin || donnees.plageFin <= donnees.plageDebut) {
            erreurs.plage = 'Indiquez le début et la fin de la plage horaire : la fin vient après le début.';
        }
    }

    return erreurs;
}

function rattachement(donnees) {
    return {
        role: donnees.role,
        membreId: ['sr', 'remplacant'].includes(donnees.role) ? donnees.membreId : null,
        activiteId: ['pointage', 'responsable'].includes(donnees.role) ? (donnees.activiteId || null) : null,
        plage: donnees.role === 'pointage' && donnees.plageDebut ? { debut: donnees.plageDebut, fin: donnees.plageFin } : null,
        validite: donnees.role === 'remplacant' ? { du: donnees.validiteDu, au: donnees.validiteAu } : null,
        doubleAuthentification: donnees.role === 'admin',
    };
}

/**
 * Crée un compte privé, avec un mot de passe provisoire à transmettre à la personne en main propre
 * ou par téléphone. Il ne s'affiche qu'une fois et devra être remplacé à la première connexion.
 *
 * @returns {Promise<{ id: string, motDePasseProvisoire: string }>}
 */
export async function creerCompte(donnees) {
    await attendre();
    verifierHorsMaintenance();
    const membres = await listerFichesMembres();
    const telephone = normaliserTelephone(donnees.telephone);
    const erreurs = await verifierRattachement(donnees, membres);

    if (donnees.nom.trim().length < 3) {
        erreurs.nom = 'Indiquez le nom complet (au moins 3 caractères).';
    }

    if (!telephone) {
        erreurs.telephone = 'Numéro ivoirien invalide : 10 chiffres commençant par 01, 05, 07, 21, 25 ou 27.';
    } else if (registre.comptes.some((compte) => compte.telephone === telephone)) {
        erreurs.telephone = 'Ce numéro a déjà un compte.';
    }

    if (!ROLES.includes(donnees.role)) {
        erreurs.role = 'Choisissez le rôle.';
    }

    if (Object.keys(erreurs).length > 0) {
        throw Object.assign(new Error('Quelques informations sont à corriger.'), { erreurs });
    }

    const motDePasseProvisoire = genererMotDePasseProvisoire();
    const compte = {
        id: `compte-${crypto.randomUUID().slice(0, 8)}`,
        telephone,
        motDePasse: motDePasseProvisoire,
        nom: donnees.nom.trim(),
        motDePasseProvisoire: true,
        actif: true,
        desactiveLe: null,
        motifDesactivation: '',
        desactivationPrevueLe: null,
        creeLe: maintenant(),
        sessions: [],
        ...rattachement(donnees),
    };

    registre.comptes.push(compte);
    enregistrerRegistre();
    noterOperation('Compte créé', `${compte.nom} · ${LIBELLES_ROLES[compte.role]}`, 'comptes');

    return { id: compte.id, motDePasseProvisoire };
}

/**
 * Change le rôle ou le rattachement d'un compte. Opération sensible : l'écran demande d'abord le mot
 * de passe de l'administrateur.
 */
export async function modifierDroits(id, donnees) {
    await attendre();
    verifierHorsMaintenance();
    const compte = trouver(id);
    const membres = await listerFichesMembres();
    const erreurs = await verifierRattachement(donnees, membres, id);

    if (compte.id === session.utilisateur?.id && donnees.role !== 'admin') {
        erreurs.role = 'Vous ne pouvez pas retirer vos propres droits d’administrateur.';
    }

    if (Object.keys(erreurs).length > 0) {
        throw Object.assign(new Error('Quelques informations sont à corriger.'), { erreurs });
    }

    const avant = LIBELLES_ROLES[compte.role];
    Object.assign(compte, rattachement(donnees));
    enregistrerRegistre();
    noterOperation('Droits modifiés', `${compte.nom} · ${avant} → ${LIBELLES_ROLES[compte.role]}`, 'comptes');
}

/** Désactive un accès tout de suite : toutes ses sessions sont fermées. */
export async function desactiverCompte(id, motif) {
    await attendre();
    const compte = trouver(id);

    if (compte.id === session.utilisateur?.id) {
        throw new Error('Vous ne pouvez pas désactiver votre propre compte.');
    }

    if (motif.trim().length < 5) {
        throw new Error('Indiquez le motif de la désactivation (au moins 5 caractères).');
    }

    Object.assign(compte, { actif: false, desactiveLe: maintenant(), motifDesactivation: motif.trim(), sessions: [] });
    enregistrerRegistre();
    noterEvenement('Compte désactivé', compte.nom);
    noterOperation('Compte désactivé', `${compte.nom} · motif : ${motif.trim()}`, 'comptes');
}

export async function reactiverCompte(id) {
    await attendre();
    verifierHorsMaintenance();
    const compte = trouver(id);
    Object.assign(compte, { actif: true, desactiveLe: null, motifDesactivation: '', desactivationPrevueLe: null });
    enregistrerRegistre();
    noterOperation('Compte réactivé', compte.nom, 'comptes');
}

/** Programme la fin d'un accès, par exemple à la fin d'un mandat. Une date vide annule la programmation. */
export async function programmerDesactivation(id, date) {
    await attendre();
    const compte = trouver(id);

    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('Choisissez une date.');
    }

    compte.desactivationPrevueLe = date || null;
    enregistrerRegistre();
    noterOperation(date ? 'Désactivation programmée' : 'Désactivation programmée annulée', `${compte.nom}${date ? ` · le ${date}` : ''}`, 'comptes');
}

/**
 * Nouveau mot de passe provisoire, après vérification de l'identité de la personne (appel au numéro
 * du compte). Ses sessions sont fermées.
 */
export async function reinitialiserMotDePasse(id, identiteVerifiee) {
    await attendre();

    if (!identiteVerifiee) {
        throw new Error('Cochez la case qui confirme que vous avez vérifié l’identité de la personne.');
    }

    const compte = trouver(id);
    const motDePasseProvisoire = genererMotDePasseProvisoire();
    Object.assign(compte, { motDePasse: motDePasseProvisoire, motDePasseProvisoire: true, sessions: [] });
    enregistrerRegistre();
    noterOperation('Mot de passe réinitialisé', compte.nom, 'comptes');

    return motDePasseProvisoire;
}

/**
 * Changement de numéro, après vérification de l'identité et du nouveau numéro. Opération sensible :
 * l'écran demande d'abord le mot de passe de l'administrateur.
 */
export async function changerNumero(id, nouveau, { identiteVerifiee, numeroVerifie }) {
    await attendre();
    verifierHorsMaintenance();
    const compte = trouver(id);
    const telephone = normaliserTelephone(nouveau);

    if (!identiteVerifiee || !numeroVerifie) {
        throw new Error('Cochez les deux vérifications : l’identité de la personne et le nouveau numéro.');
    }

    if (!telephone) {
        throw new Error('Numéro ivoirien invalide : 10 chiffres commençant par 01, 05, 07, 21, 25 ou 27.');
    }

    if (registre.comptes.some((autre) => autre.telephone === telephone && autre.id !== id)) {
        throw new Error('Ce numéro a déjà un compte.');
    }

    const ancien = compte.telephone;
    Object.assign(compte, { telephone, sessions: [] });
    enregistrerRegistre();
    noterOperation('Numéro de téléphone changé', `${compte.nom} · ${masquerTelephone(ancien)} → ${masquerTelephone(telephone)}`, 'comptes');
}

/** Ferme à distance une session d'un compte : l'appareil devra se reconnecter. */
export async function fermerSession(compteId, sessionId) {
    await attendre();
    const compte = trouver(compteId);
    compte.sessions = compte.sessions.filter((candidate) => candidate.id !== sessionId);
    enregistrerRegistre();
    noterEvenement('Session fermée à distance', compte.nom);
    noterOperation('Session fermée à distance', compte.nom, 'securite');
}

/** Comptes dont la personne cherchée correspond, pour la recherche globale. */
export async function rechercherComptes(texte) {
    const recherche = texte.trim().toLocaleLowerCase('fr');
    const chiffres = texte.replace(/\D/g, '');

    if (recherche.length < 2) {
        return [];
    }

    return registre.comptes
        .filter((compte) => compte.nom.toLocaleLowerCase('fr').includes(recherche) || (chiffres.length >= 4 && compte.telephone.includes(chiffres)))
        .map(({ id, nom, role, actif }) => ({ id, nom, role, actif }));
}

/** Événements de sécurité récents : tentatives refusées, blocages, sessions fermées. */
export async function evenementsDeSecurite() {
    await attendre();

    return structuredClone(registre.evenements);
}
