import {
    aujourdhui,
    courriersExemple,
    dateLongue,
    dateSimple,
    membresBureauExemple,
    modelesCourrierExemple,
    nouveauDestinataire,
} from '../donnees-exemple.js';
import { listerActivitesAdmin, noterOperation } from './donnees.js';
import { verifierHorsMaintenance } from './maintenance.js';
import { parametres } from './parametres.js';
import { registre, session } from './session.js';

/**
 * Courriers officiels et réponses des secrétaires régionaux (cahier des charges, section 6).
 *
 * VERSION DE DÉMONSTRATION : membres et courriers fictifs, gardés dans cet onglet (sessionStorage).
 * Avec Supabase, le serveur vérifiera chaque droit, verrouillera lui-même les réponses confirmées,
 * et gardera les PDF dans un espace privé, servis par des liens temporaires. Les écrans, eux, ne
 * changeront pas.
 */
const CLE_STOCKAGE = 'sereh.demonstration.courriers';
const CLE_FICHIER = 'sereh.demonstration.fichier.';
const LATENCE_MS = 280;
const UN_JOUR_MS = 24 * 60 * 60 * 1000;

/** Un PDF importé de plus de 1,5 Mo n'est gardé que jusqu'au rechargement de la page. */
const TAILLE_GARDEE = 1.5 * 1024 * 1024;
const TAILLE_MAXIMALE = 10 * 1024 * 1024;

const attendre = () => new Promise((resoudre) => setTimeout(resoudre, LATENCE_MS));

function lireEtat() {
    try {
        const etat = JSON.parse(window.sessionStorage.getItem(CLE_STOCKAGE) ?? 'null');

        if (etat?.courriers && etat?.modeles) {
            etat.membres ??= structuredClone(membresBureauExemple);
            etat.corbeille ??= [];

            return etat;
        }
    } catch {
        // Stockage indisponible : la démonstration repart des courriers d'exemple.
    }

    return { courriers: courriersExemple(), modeles: structuredClone(modelesCourrierExemple), membres: structuredClone(membresBureauExemple), corbeille: [], compteur: 5 };
}

const etat = lireEtat();

function enregistrerEtat() {
    try {
        window.sessionStorage.setItem(CLE_STOCKAGE, JSON.stringify(etat));
    } catch {
        // Stockage indisponible : les changements valent pour cette page seulement.
    }
}

/** Écrit l'état complet dans l'onglet, pour qu'une sauvegarde le contienne même sans modification. */
export function persisterEtat() {
    enregistrerEtat();
}

const maintenant = () => new Date().toISOString();
const auteur = () => session.utilisateur?.nom ?? 'Administrateur';
const membre = (id) => etat.membres.find((candidat) => candidat.id === id) ?? null;
const finDeJournee = (iso) => new Date(`${iso}T23:59:59Z`).getTime();
const joursAvant = (iso) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${aujourdhui()}T00:00:00Z`)) / UN_JOUR_MS);

function noterDansLeCourrier(courrier, action, { membreId = null, parLeMembre = false, detail = '' } = {}) {
    courrier.historique.push({ le: maintenant(), auteur: auteur(), membreId, parLeMembre, action, detail });
}

const plusRecentEnTete = (entrees) => structuredClone(entrees).sort((a, b) => b.le.localeCompare(a.le));

async function carteDesActivites() {
    return new Map((await listerActivitesAdmin({ archivees: 'toutes' })).map((activite) => [activite.id, activite]));
}

function resumerActivite(activite) {
    return activite ? { id: activite.id, titre: activite.titre, edition: activite.edition, date: activite.date, heure: activite.heure, lieu: activite.lieu, publiee: activite.publiee } : null;
}

/* ------------------------------------------------------------------------------------------------
 * Fichiers PDF importés. En démonstration, ils restent dans la mémoire de l'onglet ; avec Supabase,
 * ils iront dans un espace de stockage privé.
 * ---------------------------------------------------------------------------------------------- */

const fichiers = new Map();

function lireCommeAdresse(fichier) {
    return new Promise((resoudre, rejeter) => {
        const lecteur = new FileReader();
        lecteur.onload = () => resoudre(lecteur.result);
        lecteur.onerror = () => rejeter(lecteur.error);
        lecteur.readAsDataURL(fichier);
    });
}

async function rangerFichier(fichier) {
    if (fichier.type !== 'application/pdf') {
        throw new Error('Choisissez un fichier PDF.');
    }

    if (fichier.size > TAILLE_MAXIMALE) {
        throw new Error('Le PDF dépasse 10 Mo : réduisez-le avant de l’importer.');
    }

    const cle = crypto.randomUUID();
    fichiers.set(cle, fichier);

    if (fichier.size <= TAILLE_GARDEE) {
        try {
            window.sessionStorage.setItem(CLE_FICHIER + cle, await lireCommeAdresse(fichier));
        } catch {
            // Trop grand pour le stockage de l'onglet : le fichier reste en mémoire seulement.
        }
    }

    return { cle, nom: fichier.name, taille: fichier.size };
}

/**
 * Adresse temporaire pour afficher un PDF importé, ou null s'il n'est plus disponible. À libérer
 * avec URL.revokeObjectURL quand l'écran se ferme.
 */
export async function adresseDuFichier(fichier) {
    if (!fichier) {
        return null;
    }

    if (!fichiers.has(fichier.cle)) {
        try {
            const adresse = window.sessionStorage.getItem(CLE_FICHIER + fichier.cle);

            if (adresse) {
                fichiers.set(fichier.cle, await (await fetch(adresse)).blob());
            }
        } catch {
            // Fichier introuvable : l'écran l'indique.
        }
    }

    const blob = fichiers.get(fichier.cle);

    return blob ? URL.createObjectURL(blob) : null;
}

/* ------------------------------------------------------------------------------------------------
 * Suivi d'un destinataire. Consultation, brouillon et confirmation restent trois choses distinctes :
 * un brouillon ne compte jamais comme une confirmation.
 * ---------------------------------------------------------------------------------------------- */

function suivre(courrier, destinataire) {
    const echeance = destinataire.delaiJusquau ?? courrier.echeance;
    const demandeEnCours = destinataire.demandes.find((demande) => !demande.decision) ?? null;
    const joursRestants = echeance ? joursAvant(echeance) : null;
    const echeanceDepassee = courrier.reponseAttendue && !destinataire.definitive && echeance !== null && finDeJournee(echeance) < Date.now();
    let reponse = 'information';

    if (courrier.reponseAttendue) {
        if (destinataire.definitive) {
            reponse = destinataire.reponse.choix === 'presence' ? 'presence-confirmee' : 'absence-declaree';
        } else if (destinataire.reouverte) {
            reponse = 'reouverte';
        } else if (destinataire.reponse) {
            reponse = 'brouillon';
        } else {
            reponse = 'en-attente-reponse';
        }
    }

    const aTraiter = courrier.reponseAttendue ? !destinataire.definitive : !destinataire.consulteLe;
    let urgence = null;

    if (aTraiter && courrier.reponseAttendue && echeance) {
        urgence = echeanceDepassee ? 'depassee' : (joursRestants <= 3 ? 'proche' : 'normale');
    }

    return {
        consultation: destinataire.consulteLe ? 'consulte' : 'non-consulte',
        reponse,
        echeance,
        joursRestants,
        echeanceDepassee,
        definitive: destinataire.definitive,
        confirmationComptee: destinataire.definitive && (!destinataire.tardive || destinataire.tardiveAcceptee),
        tardive: destinataire.tardive,
        tardiveAExaminer: destinataire.definitive && destinataire.tardive && !destinataire.tardiveAcceptee,
        demandeEnCours: Boolean(demandeEnCours),
        questionsEnAttente: destinataire.questions.filter((question) => !question.reponse).length,
        aTraiter,
        urgence,
        actionAttendue: actionAttendue(courrier, destinataire, reponse, echeanceDepassee, Boolean(demandeEnCours)),
    };
}

function actionAttendue(courrier, destinataire, reponse, echeanceDepassee, demandeEnCours) {
    if (!courrier.reponseAttendue) {
        return destinataire.consulteLe ? 'Aucune action : courrier pour information.' : 'Consulter le courrier.';
    }

    if (destinataire.definitive) {
        return demandeEnCours ? 'Attendre la décision de l’administrateur sur votre demande de modification.' : 'Aucune action : votre réponse est confirmée.';
    }

    if (reponse === 'reouverte') {
        return 'Votre réponse est rouverte : modifiez-la, puis confirmez-la.';
    }

    if (echeanceDepassee) {
        return 'Date limite dépassée : vous pouvez encore répondre, mais la réponse sera marquée tardive.';
    }

    return reponse === 'brouillon'
        ? 'Terminer votre réponse : un brouillon n’est pas une confirmation.'
        : 'Confirmer votre présence ou signaler votre absence.';
}

function compter(courrier) {
    const suivis = courrier.destinataires.map((destinataire) => ({ destinataire, suivi: suivre(courrier, destinataire) }));

    return {
        destinataires: courrier.statut === 'envoye' ? suivis.length : (courrier.destinatairesPrevus ?? []).length,
        consultes: suivis.filter(({ destinataire }) => destinataire.consulteLe).length,
        confirmations: suivis.filter(({ suivi }) => suivi.confirmationComptee).length,
        presences: suivis.filter(({ destinataire, suivi }) => suivi.confirmationComptee && destinataire.reponse.choix === 'presence').length,
        absences: suivis.filter(({ destinataire, suivi }) => suivi.confirmationComptee && destinataire.reponse.choix === 'absence').length,
        enAttente: courrier.reponseAttendue ? suivis.filter(({ destinataire }) => !destinataire.definitive).length : 0,
        brouillons: suivis.filter(({ suivi }) => suivi.reponse === 'brouillon').length,
        depassees: suivis.filter(({ suivi }) => suivi.echeanceDepassee).length,
        aExaminer: suivis.reduce((total, { suivi }) => total + suivi.questionsEnAttente + Number(suivi.demandeEnCours) + Number(suivi.tardiveAExaminer), 0),
    };
}

function resumer(courrier, activites) {
    const { destinataires, historique, ...reste } = structuredClone(courrier);

    return { ...reste, activite: resumerActivite(activites.get(courrier.activiteId)), nombres: compter(courrier) };
}

/* ------------------------------------------------------------------------------------------------
 * Administration. Chaque action sera réservée par le serveur aux administrateurs et notée dans le
 * journal d'audit.
 * ---------------------------------------------------------------------------------------------- */

/** En-tête, signature et pied de page des courriers, réglés dans les Paramètres. */
export const PARAMETRES_COURRIER = parametres.courrier;

/** Membres du bureau, par groupe : la Direction, puis chaque secrétariat. */
export async function listerDestinatairesPossibles() {
    const groupes = new Map();

    for (const candidat of etat.membres.filter((personne) => personne.actif !== false)) {
        if (!groupes.has(candidat.groupe)) {
            groupes.set(candidat.groupe, []);
        }

        groupes.get(candidat.groupe).push(candidat);
    }

    return [...groupes.entries()].map(([groupe, membres]) => ({ groupe, membres }));
}

/** Tous les courriers, avec leurs chiffres ; le plus récent d'abord. */
export async function listerCourriers() {
    const activites = await carteDesActivites();

    return etat.courriers
        .map((courrier) => resumer(courrier, activites))
        .sort((a, b) => (b.envoyeLe ?? b.creeLe).localeCompare(a.envoyeLe ?? a.creeLe));
}

/** Un courrier, avec le suivi de chaque destinataire et l'historique complet. */
export async function trouverCourrier(id) {
    const activites = await carteDesActivites();
    const courrier = etat.courriers.find((candidat) => candidat.id === id);

    if (!courrier) {
        return null;
    }

    return {
        ...resumer(courrier, activites),
        destinataires: courrier.destinataires.map((destinataire) => ({ ...structuredClone(destinataire), membre: membre(destinataire.membreId), suivi: suivre(courrier, destinataire) })),
        historique: plusRecentEnTete(courrier.historique),
    };
}

/** Référence proposée pour un nouveau courrier ; elle reste modifiable. */
export function prochaineReference() {
    const annee = aujourdhui().slice(2, 4);

    return `${PARAMETRES_COURRIER.prefixeReference}/${annee}-${String(etat.compteur + 1).padStart(3, '0')}/${PARAMETRES_COURRIER.suffixeReference}`;
}

/** Passages entre crochets restés à compléter, à signaler avant l'envoi. */
export function textesACompleter(courrier) {
    const textes = courrier.source === 'modele'
        ? [courrier.objet, ...Object.values(courrier.contenu ?? {})]
        : [courrier.objet];

    return [...new Set(textes.join('\n').match(/\[[^\]\n]{1,60}\]/g) ?? [])];
}

/**
 * Crée ou modifie un brouillon de courrier. Un courrier envoyé ne se modifie plus : seul son
 * document peut être remplacé, et le remplacement est noté dans l'historique.
 *
 * @param {File | null} fichierChoisi le PDF à importer, s'il y en a un nouveau
 * @throws {Error & { erreurs?: Record<string, string> }}
 */
export async function enregistrerCourrier(id, donnees, fichierChoisi = null) {
    await attendre();
    verifierHorsMaintenance();

    if (donnees.objet.trim().length < 3) {
        throw Object.assign(new Error('Quelques informations sont à corriger.'), { erreurs: { objet: 'Indiquez l’objet du courrier (au moins 3 caractères).' } });
    }

    let courrier = id ? etat.courriers.find((candidat) => candidat.id === id) : null;

    if (courrier && courrier.statut !== 'brouillon') {
        throw new Error('Ce courrier est déjà envoyé : il ne se modifie plus. Vous pouvez remplacer son document depuis sa fiche.');
    }

    const fichier = fichierChoisi ? await rangerFichier(fichierChoisi) : (courrier?.fichier ?? null);
    const valeurs = {
        reference: donnees.reference.trim(),
        objet: donnees.objet.trim(),
        source: donnees.source,
        modeleId: donnees.source === 'modele' ? donnees.modeleId : null,
        contenu: Object.fromEntries(Object.entries(donnees.contenu).map(([cle, valeur]) => [cle, typeof valeur === 'string' ? valeur.trim() : valeur])),
        fichier: donnees.source === 'import' ? fichier : null,
        activiteId: donnees.activiteId || null,
        echeance: donnees.reponseAttendue ? (donnees.echeance || null) : null,
        instructions: donnees.instructions.trim(),
        reponseAttendue: Boolean(donnees.reponseAttendue),
        destinatairesPrevus: [...donnees.destinataires],
    };

    if (courrier) {
        Object.assign(courrier, valeurs);
        noterDansLeCourrier(courrier, 'Brouillon modifié');
    } else {
        etat.compteur++;
        courrier = { id: `courrier-${crypto.randomUUID().slice(0, 8)}`, statut: 'brouillon', creeLe: maintenant(), envoyeLe: null, destinataires: [], historique: [], ...valeurs };
        etat.courriers.push(courrier);
        noterDansLeCourrier(courrier, 'Brouillon créé');
        noterOperation('Brouillon de courrier créé', courrier.objet, 'courriers');
    }

    if (fichierChoisi) {
        noterDansLeCourrier(courrier, 'PDF importé', { detail: fichier.nom });
    }

    enregistrerEtat();

    return courrier.id;
}

/**
 * Ce qui empêche encore un courrier de partir, champ par champ. Le formulaire s'en sert avant
 * l'aperçu ; l'envoi refait la même vérification.
 */
export function erreursAvantEnvoi(courrier) {
    const erreurs = {};

    if (courrier.objet.length < 3) {
        erreurs.objet = 'Indiquez l’objet du courrier.';
    }

    if (courrier.source === 'modele') {
        if (!courrier.reference) {
            erreurs.reference = 'Indiquez la référence du courrier.';
        }

        if (!courrier.contenu.destinataire) {
            erreurs.destinataire = 'Indiquez à qui le courrier est adressé.';
        }

        if ((courrier.contenu.corps ?? '').length < 20) {
            erreurs.corps = 'Rédigez le texte du courrier (au moins 20 caractères).';
        }

        if (!courrier.contenu.nomSignataire) {
            erreurs.nomSignataire = 'Indiquez le nom du signataire.';
        }
    } else if (!courrier.fichier) {
        erreurs.fichier = 'Importez le PDF du courrier.';
    }

    if ((courrier.destinatairesPrevus ?? []).length === 0) {
        erreurs.destinataires = 'Choisissez au moins un destinataire.';
    }

    if (courrier.reponseAttendue && !courrier.echeance) {
        erreurs.echeance = 'Indiquez la date limite de réponse.';
    } else if (courrier.reponseAttendue && courrier.echeance < aujourdhui()) {
        erreurs.echeance = 'La date limite de réponse est déjà passée.';
    }

    return erreurs;
}

/**
 * Envoie un brouillon, après relecture de l'aperçu et approbation explicite de l'administrateur.
 * Chaque destinataire reçoit alors son propre suivi.
 */
export async function envoyerCourrier(id, approuve) {
    await attendre();
    verifierHorsMaintenance();
    const courrier = etat.courriers.find((candidat) => candidat.id === id);

    if (!courrier || courrier.statut !== 'brouillon') {
        throw new Error('Ce courrier n’est pas un brouillon : il a peut-être déjà été envoyé.');
    }

    if (!approuve) {
        throw new Error('Cochez la case d’approbation : un courrier n’est envoyé qu’après relecture de l’aperçu.');
    }

    const erreurs = erreursAvantEnvoi(courrier);

    if (Object.keys(erreurs).length > 0) {
        throw Object.assign(new Error('Le courrier ne peut pas encore partir.'), { erreurs });
    }

    const envoyeLe = maintenant();
    courrier.statut = 'envoye';
    courrier.envoyeLe = envoyeLe;
    courrier.destinataires = courrier.destinatairesPrevus.map((membreId) => nouveauDestinataire(membreId, envoyeLe));
    delete courrier.destinatairesPrevus;

    const nombre = courrier.destinataires.length;
    noterDansLeCourrier(courrier, 'Courrier approuvé et envoyé', { detail: `${nombre} destinataire${nombre > 1 ? 's' : ''}` });
    noterOperation('Courrier envoyé', `${courrier.objet} · ${nombre} destinataire${nombre > 1 ? 's' : ''}`, 'courriers');
    enregistrerEtat();
}

/** Brouillon tel qu'il était enregistré, pour le reprendre dans le formulaire. */
export async function lireBrouillon(id) {
    await attendre();
    const courrier = etat.courriers.find((candidat) => candidat.id === id);

    return courrier ? structuredClone(courrier) : null;
}

function trouverDestinataire(courrierId, membreId) {
    const courrier = etat.courriers.find((candidat) => candidat.id === courrierId);
    const destinataire = courrier?.destinataires.find((candidat) => candidat.membreId === membreId);

    if (!destinataire) {
        throw new Error('Destinataire introuvable pour ce courrier.');
    }

    return { courrier, destinataire };
}

/** Réponse de l'administrateur à une demande de précision. */
export async function repondreQuestion(courrierId, membreId, questionId, texte) {
    await attendre();
    verifierHorsMaintenance();
    const { courrier, destinataire } = trouverDestinataire(courrierId, membreId);
    const question = destinataire.questions.find((candidate) => candidate.id === questionId);

    if (texte.trim().length < 3) {
        throw new Error('Écrivez votre réponse (au moins 3 caractères).');
    }

    question.reponse = texte.trim();
    question.reponduLe = maintenant();
    noterDansLeCourrier(courrier, 'Réponse à une question', { membreId, detail: texte.trim() });
    noterOperation('Réponse à une question sur un courrier', `${membre(membreId)?.nom} · ${courrier.objet}`, 'courriers');
    enregistrerEtat();
}

/**
 * Décision sur une demande de modification d'une réponse verrouillée. Acceptée, la réponse est
 * rouverte : le secrétaire régional la modifie, puis la confirme de nouveau. Refusée, elle reste
 * verrouillée. Dans les deux cas, l'historique garde la réponse d'origine et la décision.
 */
export async function deciderDemande(courrierId, membreId, demandeId, acceptee, commentaire) {
    await attendre();
    verifierHorsMaintenance();
    const { courrier, destinataire } = trouverDestinataire(courrierId, membreId);
    const demande = destinataire.demandes.find((candidate) => candidate.id === demandeId && !candidate.decision);

    if (!demande) {
        throw new Error('Cette demande a déjà reçu une décision.');
    }

    if (!acceptee && commentaire.trim().length < 5) {
        throw new Error('Indiquez le motif du refus (au moins 5 caractères).');
    }

    demande.decision = acceptee ? 'acceptee' : 'refusee';
    demande.decideeLe = maintenant();
    demande.commentaire = commentaire.trim();

    if (acceptee) {
        const ancienne = destinataire.reponse.choix === 'presence' ? 'présence' : `absence (${destinataire.reponse.motif})`;
        destinataire.definitive = false;
        destinataire.reouverte = true;
        noterDansLeCourrier(courrier, 'Demande de modification acceptée : réponse rouverte', { membreId, detail: `Réponse d’origine : ${ancienne}${demande.commentaire ? ` · ${demande.commentaire}` : ''}` });
    } else {
        noterDansLeCourrier(courrier, 'Demande de modification refusée', { membreId, detail: demande.commentaire });
    }

    noterOperation(acceptee ? 'Demande de modification acceptée' : 'Demande de modification refusée', `${membre(membreId)?.nom} · ${courrier.objet}`, 'courriers');
    enregistrerEtat();
}

/** Une réponse arrivée après la date limite ne compte qu'une fois acceptée par l'administrateur. */
export async function accepterReponseTardive(courrierId, membreId) {
    await attendre();
    verifierHorsMaintenance();
    const { courrier, destinataire } = trouverDestinataire(courrierId, membreId);
    destinataire.tardiveAcceptee = true;
    noterDansLeCourrier(courrier, 'Réponse tardive acceptée', { membreId });
    noterOperation('Réponse tardive acceptée', `${membre(membreId)?.nom} · ${courrier.objet}`, 'courriers');
    enregistrerEtat();
}

/** Rouvre temporairement la réponse d'un destinataire en retard, jusqu'à une nouvelle date limite. */
export async function accorderDelai(courrierId, membreId, date) {
    await attendre();
    verifierHorsMaintenance();
    const { courrier, destinataire } = trouverDestinataire(courrierId, membreId);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < aujourdhui()) {
        throw new Error('Choisissez une nouvelle date limite, aujourd’hui ou plus tard.');
    }

    destinataire.delaiJusquau = date;
    noterDansLeCourrier(courrier, 'Délai accordé', { membreId, detail: `Jusqu’au ${dateSimple(date)}` });
    noterOperation('Délai de réponse accordé', `${membre(membreId)?.nom} · ${courrier.objet}`, 'courriers');
    enregistrerEtat();
}

/**
 * Remplace le document d'un courrier envoyé, par exemple par la version imprimée, signée et
 * scannée. L'historique garde l'auteur, la date et le document remplacé.
 */
export async function remplacerDocument(courrierId, fichier) {
    await attendre();
    verifierHorsMaintenance();
    const courrier = etat.courriers.find((candidat) => candidat.id === courrierId);

    if (!fichier) {
        throw new Error('Choisissez le nouveau PDF.');
    }

    const ancien = courrier.source === 'import' ? `PDF « ${courrier.fichier?.nom ?? 'importé'} »` : 'PDF créé depuis le modèle';
    const nouveau = await rangerFichier(fichier);
    courrier.source = 'import';
    courrier.fichier = nouveau;
    courrier.documentRemplaceLe = maintenant();
    noterDansLeCourrier(courrier, 'Document remplacé', { detail: `${ancien} → PDF « ${nouveau.nom} »` });
    noterOperation('Document de courrier remplacé', courrier.objet, 'courriers');
    enregistrerEtat();
}

/* ------------------------------------------------------------------------------------------------
 * Modèles de courrier. Un modèle modifié doit être relu et approuvé avant de pouvoir servir.
 * ---------------------------------------------------------------------------------------------- */

export async function listerModeles() {
    await attendre();

    return structuredClone(etat.modeles);
}

export async function enregistrerModele(id, donnees) {
    await attendre();
    verifierHorsMaintenance();
    const erreurs = {};

    if (donnees.nom.trim().length < 3) {
        erreurs.nom = 'Donnez un nom au modèle (au moins 3 caractères).';
    }

    if (donnees.objet.trim().length < 3) {
        erreurs.objet = 'Indiquez l’objet proposé.';
    }

    if (donnees.corps.trim().length < 20) {
        erreurs.corps = 'Rédigez le texte du modèle (au moins 20 caractères).';
    }

    if (Object.keys(erreurs).length > 0) {
        throw Object.assign(new Error('Quelques informations sont à corriger.'), { erreurs });
    }

    const valeurs = { nom: donnees.nom.trim(), objet: donnees.objet.trim(), formule: donnees.formule.trim(), corps: donnees.corps.trim(), approuve: false, modifieLe: maintenant() };
    let modele = etat.modeles.find((candidat) => candidat.id === id);

    if (modele) {
        Object.assign(modele, valeurs);
    } else {
        modele = { id: `modele-${crypto.randomUUID().slice(0, 8)}`, ...valeurs };
        etat.modeles.push(modele);
    }

    noterOperation('Modèle de courrier enregistré, à approuver', modele.nom, 'courriers');
    enregistrerEtat();

    return modele.id;
}

export async function approuverModele(id) {
    await attendre();
    verifierHorsMaintenance();
    const modele = etat.modeles.find((candidat) => candidat.id === id);
    modele.approuve = true;
    modele.approuveLe = maintenant();
    noterOperation('Modèle de courrier approuvé', modele.nom, 'courriers');
    enregistrerEtat();
}

/**
 * Texte d'un modèle, avec les informations de l'activité choisie. Sans activité, les mots entre
 * accolades deviennent des passages entre crochets, à compléter.
 */
export function appliquerModele(modele, activite) {
    const valeurs = activite
        ? {
            activite: activite.edition ? `${activite.titre} (${activite.edition})` : activite.titre,
            date: dateLongue(activite.date),
            heure: activite.heure,
            lieu: activite.lieu,
        }
        : { activite: '[nom de l’activité]', date: '[date]', heure: '[heure]', lieu: '[lieu]' };
    const remplir = (texte) => texte.replace(/\{(activite|date|heure|lieu)\}/g, (tout, cle) => valeurs[cle]);

    return { objet: remplir(modele.objet), formule: modele.formule, corps: remplir(modele.corps) };
}

/* ------------------------------------------------------------------------------------------------
 * Espace du secrétaire régional. Une personne ne voit que les courriers qui lui sont adressés ; le
 * serveur appliquera la même règle.
 * ---------------------------------------------------------------------------------------------- */

function moi() {
    const id = session.utilisateur?.membreId;

    if (!id) {
        throw new Error('Ce compte n’est relié à aucun membre du bureau.');
    }

    return id;
}

function monSuivi(courrierId) {
    const courrier = etat.courriers.find((candidat) => candidat.id === courrierId && candidat.statut === 'envoye');
    const destinataire = courrier?.destinataires.find((candidat) => candidat.membreId === moi());

    if (!destinataire) {
        throw new Error('Ce courrier ne vous est pas adressé.');
    }

    return { courrier, destinataire };
}

export async function monProfil() {
    return membre(moi());
}

const RANG_URGENCE = { depassee: 0, proche: 1, normale: 2 };

/** Mes courriers : d'abord ceux qui attendent une action, la date limite la plus proche en tête. */
export async function mesCourriers() {
    const activites = await carteDesActivites();
    const identifiant = moi();

    return etat.courriers
        .filter((courrier) => courrier.statut === 'envoye' && courrier.destinataires.some((destinataire) => destinataire.membreId === identifiant))
        .map((courrier) => {
            const destinataire = courrier.destinataires.find((candidat) => candidat.membreId === identifiant);

            return {
                id: courrier.id,
                reference: courrier.reference,
                objet: courrier.objet,
                activite: resumerActivite(activites.get(courrier.activiteId)),
                envoyeLe: courrier.envoyeLe,
                reponseAttendue: courrier.reponseAttendue,
                suivi: suivre(courrier, destinataire),
            };
        })
        .sort((a, b) => (RANG_URGENCE[a.suivi.urgence] ?? (a.suivi.aTraiter ? 2 : 3)) - (RANG_URGENCE[b.suivi.urgence] ?? (b.suivi.aTraiter ? 2 : 3))
            || (a.suivi.joursRestants ?? 999) - (b.suivi.joursRestants ?? 999)
            || b.envoyeLe.localeCompare(a.envoyeLe));
}

/** Ouvre un de mes courriers. La première ouverture le marque « consulté », sans valoir réponse. */
export async function ouvrirMonCourrier(id) {
    await attendre();
    let trouve;

    try {
        trouve = monSuivi(id);
    } catch {
        return null;
    }

    const { courrier, destinataire } = trouve;

    if (!destinataire.consulteLe) {
        destinataire.consulteLe = maintenant();
        noterDansLeCourrier(courrier, 'Courrier consulté', { membreId: destinataire.membreId, parLeMembre: true });
        enregistrerEtat();
    }

    const activites = await carteDesActivites();

    return {
        id: courrier.id,
        reference: courrier.reference,
        objet: courrier.objet,
        source: courrier.source,
        contenu: structuredClone(courrier.contenu),
        fichier: structuredClone(courrier.fichier),
        activite: resumerActivite(activites.get(courrier.activiteId)),
        envoyeLe: courrier.envoyeLe,
        documentRemplaceLe: courrier.documentRemplaceLe ?? null,
        instructions: courrier.instructions,
        reponseAttendue: courrier.reponseAttendue,
        moi: structuredClone(destinataire),
        suivi: suivre(courrier, destinataire),
        historique: plusRecentEnTete(courrier.historique.filter((entree) => entree.membreId === destinataire.membreId)),
    };
}

export async function noterTelechargement(id) {
    const { courrier, destinataire } = monSuivi(id);
    destinataire.telechargeLe = maintenant();
    noterDansLeCourrier(courrier, 'PDF téléchargé', { membreId: destinataire.membreId, parLeMembre: true });
    enregistrerEtat();
}

function lireReponse(reponse) {
    if (!['presence', 'absence'].includes(reponse.choix)) {
        throw Object.assign(new Error('Choisissez votre réponse : présence ou absence.'), { erreurs: { choix: 'Choisissez votre réponse.' } });
    }

    const absence = reponse.choix === 'absence';

    return {
        choix: reponse.choix,
        motif: absence ? reponse.motif.trim() : '',
        justificatif: absence && reponse.justificatifNom ? { nom: reponse.justificatifNom } : null,
        enregistreeLe: maintenant(),
    };
}

function refuserSiVerrouillee(destinataire) {
    if (destinataire.definitive) {
        throw new Error('Votre réponse est déjà confirmée et verrouillée : faites une demande de modification.');
    }
}

/** Brouillon de réponse : il se reprend plus tard et ne vaut jamais confirmation. */
export async function enregistrerBrouillonReponse(id, reponse) {
    await attendre();
    verifierHorsMaintenance();
    const { courrier, destinataire } = monSuivi(id);
    refuserSiVerrouillee(destinataire);
    destinataire.reponse = lireReponse(reponse);
    noterDansLeCourrier(courrier, 'Brouillon de réponse enregistré', { membreId: destinataire.membreId, parLeMembre: true });
    enregistrerEtat();
}

/**
 * Confirmation définitive, après le récapitulatif. La réponse est ensuite verrouillée. Après la date
 * limite, elle est acceptée mais marquée tardive, jusqu'à la décision de l'administrateur.
 */
export async function confirmerReponse(id, reponse) {
    await attendre();
    verifierHorsMaintenance();
    const { courrier, destinataire } = monSuivi(id);
    refuserSiVerrouillee(destinataire);
    const lue = lireReponse(reponse);

    if (lue.choix === 'absence' && lue.motif.length < 5) {
        throw Object.assign(new Error('Indiquez le motif de votre absence.'), { erreurs: { motif: 'Le motif est obligatoire (au moins 5 caractères).' } });
    }

    const echeance = destinataire.delaiJusquau ?? courrier.echeance;
    const enRetard = Boolean(echeance) && finDeJournee(echeance) < Date.now();

    // Une réponse rouverte par l'administrateur garde le caractère tardif de la première réponse.
    if (!destinataire.reouverte) {
        destinataire.tardive = enRetard;
        destinataire.tardiveAcceptee = false;
    }

    destinataire.reponse = lue;
    destinataire.definitive = true;
    destinataire.confirmeeLe = maintenant();
    destinataire.reouverte = false;

    const action = lue.choix === 'presence' ? 'Présence confirmée définitivement' : 'Absence déclarée définitivement';
    const details = [lue.motif, lue.justificatif ? `justificatif : ${lue.justificatif.nom}` : '', destinataire.tardive ? 'Réponse tardive' : ''].filter(Boolean);
    noterDansLeCourrier(courrier, action, { membreId: destinataire.membreId, parLeMembre: true, detail: details.join(' · ') });
    noterOperation(lue.choix === 'presence' ? 'Présence confirmée' : 'Absence déclarée', `${membre(destinataire.membreId)?.nom} · ${courrier.objet}`, 'courriers');
    enregistrerEtat();
}

/** Demande motivée de modification d'une réponse verrouillée, examinée par l'administrateur. */
export async function demanderModification(id, motif) {
    await attendre();
    verifierHorsMaintenance();
    const { courrier, destinataire } = monSuivi(id);

    if (!destinataire.definitive) {
        throw new Error('Votre réponse n’est pas encore confirmée : vous pouvez la modifier directement.');
    }

    if (destinataire.demandes.some((demande) => !demande.decision)) {
        throw new Error('Une demande est déjà en attente de décision.');
    }

    if (motif.trim().length < 10) {
        throw new Error('Expliquez la raison de votre demande (au moins 10 caractères).');
    }

    destinataire.demandes.push({ id: crypto.randomUUID(), motif: motif.trim(), demandeeLe: maintenant(), decision: null, decideeLe: null, commentaire: '' });
    noterDansLeCourrier(courrier, 'Demande de modification envoyée', { membreId: destinataire.membreId, parLeMembre: true, detail: motif.trim() });
    noterOperation('Demande de modification reçue', `${membre(destinataire.membreId)?.nom} · ${courrier.objet}`, 'courriers');
    enregistrerEtat();
}

/** Demande de précision à l'administrateur. Elle ne remplace pas la réponse. */
export async function poserQuestion(id, texte) {
    await attendre();
    verifierHorsMaintenance();
    const { courrier, destinataire } = monSuivi(id);

    if (texte.trim().length < 5) {
        throw new Error('Écrivez votre question (au moins 5 caractères).');
    }

    destinataire.questions.push({ id: crypto.randomUUID(), texte: texte.trim(), poseeLe: maintenant(), reponse: '', reponduLe: null });
    noterDansLeCourrier(courrier, 'Question posée', { membreId: destinataire.membreId, parLeMembre: true, detail: texte.trim() });
    noterOperation('Question reçue sur un courrier', `${membre(destinataire.membreId)?.nom} · ${courrier.objet}`, 'courriers');
    enregistrerEtat();
}

function mesEntrees(filtre) {
    const identifiant = moi();

    return etat.courriers
        .filter((courrier) => courrier.statut === 'envoye')
        .flatMap((courrier) => courrier.historique
            .filter((entree) => entree.membreId === identifiant && filtre(entree))
            .map((entree) => ({ ...entree, courrierId: courrier.id, objet: courrier.objet })));
}

/**
 * Nouveautés qui me concernent : nouveaux courriers et décisions de l'administrateur. Les envois par
 * WhatsApp et e-mail arriveront avec le centre de notifications (module 10).
 */
export async function mesNouveautes(nombre = 6) {
    const identifiant = moi();
    const nouveauxCourriers = etat.courriers
        .filter((courrier) => courrier.statut === 'envoye')
        .flatMap((courrier) => courrier.destinataires
            .filter((destinataire) => destinataire.membreId === identifiant)
            .map((destinataire) => ({ le: destinataire.affecteLe, action: 'Nouveau courrier', detail: '', courrierId: courrier.id, objet: courrier.objet })));
    const remplacements = etat.courriers
        .filter((courrier) => courrier.documentRemplaceLe && courrier.destinataires.some((destinataire) => destinataire.membreId === identifiant))
        .map((courrier) => ({ le: courrier.documentRemplaceLe, action: 'Document du courrier remplacé', detail: '', courrierId: courrier.id, objet: courrier.objet }));

    return [...nouveauxCourriers, ...remplacements, ...mesEntrees((entree) => !entree.parLeMembre)]
        .sort((a, b) => b.le.localeCompare(a.le))
        .slice(0, nombre);
}

/** Historique de mes propres actions sur les courriers. */
export async function monHistorique(nombre = 10) {
    return mesEntrees((entree) => entree.parLeMembre).sort((a, b) => b.le.localeCompare(a.le)).slice(0, nombre);
}

/* ------------------------------------------------------------------------------------------------
 * Secrétaires régionaux : chiffres de chaque membre du bureau, pour l'administration.
 * ---------------------------------------------------------------------------------------------- */

export async function listerMembres() {
    await attendre();
    const comptes = new Set(registre.comptes.filter((compte) => compte.actif).map((compte) => compte.membreId).filter(Boolean));

    return etat.membres.map((candidat) => {
        const suivis = etat.courriers
            .filter((courrier) => courrier.statut === 'envoye')
            .flatMap((courrier) => courrier.destinataires
                .filter((destinataire) => destinataire.membreId === candidat.id)
                .map((destinataire) => suivre(courrier, destinataire)));

        return {
            ...candidat,
            aUnCompte: comptes.has(candidat.id),
            nombres: {
                recus: suivis.length,
                nonConsultes: suivis.filter((suivi) => suivi.consultation === 'non-consulte').length,
                enAttente: suivis.filter((suivi) => suivi.aTraiter && suivi.reponse !== 'information').length,
                confirmes: suivis.filter((suivi) => suivi.confirmationComptee).length,
                depassees: suivis.filter((suivi) => suivi.echeanceDepassee).length,
            },
        };
    });
}

/** Ajoute un membre du bureau, ou modifie sa fiche. Un membre qui quitte le bureau est retiré, jamais effacé. */
export async function enregistrerMembre(id, donnees) {
    await attendre();
    verifierHorsMaintenance();
    const erreurs = {};

    if (donnees.nom.trim().length < 3) {
        erreurs.nom = 'Indiquez le nom complet (au moins 3 caractères).';
    }

    if (donnees.poste.trim().length < 3) {
        erreurs.poste = 'Indiquez le poste.';
    }

    if (!donnees.groupe) {
        erreurs.groupe = 'Choisissez le secrétariat.';
    }

    if (Object.keys(erreurs).length > 0) {
        throw Object.assign(new Error('Quelques informations sont à corriger.'), { erreurs });
    }

    const valeurs = { nom: donnees.nom.trim(), poste: donnees.poste.trim(), groupe: donnees.groupe, actif: donnees.actif !== false };
    let fiche = etat.membres.find((candidat) => candidat.id === id);

    if (fiche) {
        Object.assign(fiche, valeurs);
        noterOperation(valeurs.actif ? 'Fiche d’un membre du bureau modifiée' : 'Membre retiré du bureau', fiche.nom, 'comptes');
    } else {
        fiche = { id: `membre-${crypto.randomUUID().slice(0, 8)}`, ...valeurs };
        etat.membres.push(fiche);
        noterOperation('Membre du bureau ajouté', `${fiche.nom} · ${fiche.groupe}`, 'comptes');
    }

    enregistrerEtat();

    return fiche.id;
}

/** Membres du bureau, pour relier un compte à une fiche. */
export async function listerFichesMembres() {
    return structuredClone(etat.membres);
}

/* ------------------------------------------------------------------------------------------------
 * Corbeille des brouillons : un courrier envoyé ne s'efface jamais, un brouillon peut être jeté puis
 * restauré, ou supprimé définitivement après confirmation.
 * ---------------------------------------------------------------------------------------------- */

export async function mettreBrouillonALaCorbeille(id) {
    await attendre();
    verifierHorsMaintenance();
    const courrier = etat.courriers.find((candidat) => candidat.id === id);

    if (courrier?.statut !== 'brouillon') {
        throw new Error('Seul un brouillon peut aller à la corbeille : un courrier envoyé reste dans l’historique.');
    }

    etat.courriers = etat.courriers.filter((candidat) => candidat.id !== id);
    etat.corbeille.unshift({ type: 'courrier', id, titre: courrier.objet, supprimeLe: maintenant(), supprimePar: auteur(), objet: courrier });
    noterOperation('Brouillon de courrier mis à la corbeille', courrier.objet, 'archives');
    enregistrerEtat();
}

export async function listerCorbeilleCourriers() {
    await attendre();

    return etat.corbeille.map(({ objet, ...element }) => structuredClone(element));
}

export async function restaurerBrouillon(id) {
    await attendre();
    verifierHorsMaintenance();
    const element = etat.corbeille.find((candidat) => candidat.id === id);
    etat.corbeille = etat.corbeille.filter((candidat) => candidat.id !== id);
    etat.courriers.push(element.objet);
    noterOperation('Brouillon de courrier restauré', element.titre, 'archives');
    enregistrerEtat();
}

export async function supprimerBrouillonDefinitivement(id) {
    await attendre();
    verifierHorsMaintenance();
    const element = etat.corbeille.find((candidat) => candidat.id === id);
    etat.corbeille = etat.corbeille.filter((candidat) => candidat.id !== id);
    noterOperation('Brouillon de courrier supprimé définitivement', element.titre, 'archives');
    enregistrerEtat();
}

/* ------------------------------------------------------------------------------------------------
 * Statistiques et exports des réponses (section 8). Les brouillons ne comptent jamais comme des
 * confirmations ; une réponse tardive ne compte qu'une fois acceptée.
 * ---------------------------------------------------------------------------------------------- */

const LIBELLES_REPONSE = {
    information: 'Pour information',
    'en-attente-reponse': 'En attente de réponse',
    brouillon: 'Brouillon (non compté)',
    reouverte: 'Réponse rouverte',
    'presence-confirmee': 'Présence confirmée',
    'absence-declaree': 'Absence déclarée',
};

function suivisEnvoyes(activiteId) {
    return etat.courriers
        .filter((courrier) => courrier.statut === 'envoye' && (!activiteId || courrier.activiteId === activiteId))
        .flatMap((courrier) => courrier.destinataires.map((destinataire) => ({ courrier, destinataire, membre: membre(destinataire.membreId), suivi: suivre(courrier, destinataire) })));
}

/**
 * Synthèse des réponses des membres du bureau, pour une activité ou pour tous les courriers :
 * consultations, réponses en attente, confirmations, absences et motifs, résultats par secrétariat
 * et évolution des confirmations jour après jour.
 */
export async function syntheseReponses(activiteId = '') {
    await attendre();
    const suivis = suivisEnvoyes(activiteId);
    const attendus = suivis.filter(({ courrier }) => courrier.reponseAttendue);
    const comptees = attendus.filter(({ suivi }) => suivi.confirmationComptee);
    const groupes = new Map();

    for (const element of attendus) {
        const groupe = element.membre?.groupe ?? 'Autre';

        if (!groupes.has(groupe)) {
            groupes.set(groupe, { groupe, destinataires: 0, consultes: 0, confirmations: 0, presences: 0, absences: 0, enAttente: 0 });
        }

        const ligne = groupes.get(groupe);
        ligne.destinataires++;
        ligne.consultes += Number(Boolean(element.destinataire.consulteLe));
        ligne.confirmations += Number(element.suivi.confirmationComptee);
        ligne.presences += Number(element.suivi.confirmationComptee && element.destinataire.reponse.choix === 'presence');
        ligne.absences += Number(element.suivi.confirmationComptee && element.destinataire.reponse.choix === 'absence');
        ligne.enAttente += Number(!element.destinataire.definitive);
    }

    const parJour = new Map();

    for (const { destinataire } of comptees) {
        const jourConfirmation = (destinataire.confirmeeLe ?? '').slice(0, 10);

        if (jourConfirmation) {
            parJour.set(jourConfirmation, (parJour.get(jourConfirmation) ?? 0) + 1);
        }
    }

    let cumul = 0;
    const evolution = [...parJour.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([jourConfirmation, nombre]) => {
        cumul += nombre;

        return { jour: jourConfirmation, nombre, cumul };
    });

    return {
        courriers: new Set(suivis.map(({ courrier }) => courrier.id)).size,
        destinataires: suivis.length,
        consultes: suivis.filter(({ destinataire }) => destinataire.consulteLe).length,
        enAttente: attendus.filter(({ destinataire }) => !destinataire.definitive).length,
        brouillons: attendus.filter(({ suivi }) => suivi.reponse === 'brouillon').length,
        confirmations: comptees.length,
        presences: comptees.filter(({ destinataire }) => destinataire.reponse.choix === 'presence').length,
        absences: comptees.filter(({ destinataire }) => destinataire.reponse.choix === 'absence').length,
        tardivesAExaminer: attendus.filter(({ suivi }) => suivi.tardiveAExaminer).length,
        motifs: comptees
            .filter(({ destinataire }) => destinataire.reponse.choix === 'absence')
            .map(({ membre: personne, destinataire, courrier }) => ({ membre: personne?.nom ?? '', groupe: personne?.groupe ?? '', motif: destinataire.reponse.motif, courrier: courrier.objet })),
        parSecretariat: [...groupes.values()],
        evolution,
    };
}

/** Lignes de l'export des réponses : une ligne par destinataire, sans numéro de téléphone. */
export async function lignesReponses(activiteId = '') {
    await attendre();

    return suivisEnvoyes(activiteId).map(({ courrier, destinataire, membre: personne, suivi }) => ({
        Référence: courrier.reference,
        Courrier: courrier.objet,
        Secrétariat: personne?.groupe ?? '',
        Membre: personne?.nom ?? '',
        Poste: personne?.poste ?? '',
        Consultation: destinataire.consulteLe ? 'Consulté' : 'Non consulté',
        Réponse: LIBELLES_REPONSE[suivi.reponse],
        'Motif d’absence': destinataire.definitive && destinataire.reponse?.choix === 'absence' ? destinataire.reponse.motif : '',
        'Confirmée le': destinataire.confirmeeLe ? destinataire.confirmeeLe.slice(0, 10) : '',
        Tardive: destinataire.tardive ? (destinataire.tardiveAcceptee ? 'Oui, acceptée' : 'Oui, à examiner') : 'Non',
    }));
}

/* ------------------------------------------------------------------------------------------------
 * Notifications liées aux courriers (module 10). Elles sont déduites des données, pour que le centre
 * de notifications reste exact même après une correction.
 * ---------------------------------------------------------------------------------------------- */

/** Le rappel en cours : le plus proche des rappels prévus (7, 3 ou 1 jour) déjà atteint. */
function rappelEnCours(jours, rappels) {
    const atteints = rappels.filter((nombre) => jours >= 0 && jours <= nombre);

    return atteints.length > 0 ? Math.min(...atteints) : null;
}

const instantDuRappel = (echeance, rappel) => new Date(Date.parse(`${echeance}T08:00:00Z`) - rappel * UN_JOUR_MS).toISOString();

/**
 * Événements à signaler à l'administration : questions, demandes de modification, réponses
 * tardives, confirmations reçues, dates limites dépassées et rappels avant la date limite.
 *
 * @param {number[]} rappels jours avant la date limite (7, 3, 1) pour lesquels un rappel est prévu
 */
export function evenementsCourriersAdmin(rappels) {
    const evenements = [];
    const lien = (courrier) => ({ name: 'admin-courrier', params: { id: courrier.id } });

    for (const courrier of etat.courriers.filter((candidat) => candidat.statut === 'envoye')) {
        for (const destinataire of courrier.destinataires) {
            const personne = membre(destinataire.membreId)?.nom ?? 'Un membre';
            const suivi = suivre(courrier, destinataire);

            for (const question of destinataire.questions.filter((candidate) => !candidate.reponse)) {
                evenements.push({ id: `question-${question.id}`, le: question.poseeLe, categorie: 'courriers', urgente: false, titre: 'Question à traiter', texte: `${personne} · ${courrier.objet}`, lien: lien(courrier) });
            }

            for (const demande of destinataire.demandes.filter((candidate) => !candidate.decision)) {
                evenements.push({ id: `demande-${demande.id}`, le: demande.demandeeLe, categorie: 'confirmations', urgente: false, titre: 'Demande de modification à décider', texte: `${personne} · ${courrier.objet}`, lien: lien(courrier) });
            }

            if (suivi.tardiveAExaminer) {
                evenements.push({ id: `tardive-${courrier.id}-${destinataire.membreId}`, le: destinataire.confirmeeLe, categorie: 'confirmations', urgente: false, titre: 'Réponse tardive à examiner', texte: `${personne} · ${courrier.objet}`, lien: lien(courrier) });
            }

            if (destinataire.definitive && destinataire.confirmeeLe) {
                evenements.push({ id: `confirmation-${courrier.id}-${destinataire.membreId}-${destinataire.confirmeeLe}`, le: destinataire.confirmeeLe, categorie: 'confirmations', urgente: false, titre: destinataire.reponse.choix === 'presence' ? 'Présence confirmée' : 'Absence déclarée', texte: `${personne} · ${courrier.objet}`, lien: lien(courrier) });
            }
        }

        if (!courrier.reponseAttendue || !courrier.echeance) {
            continue;
        }

        const sansReponse = courrier.destinataires.filter((destinataire) => !destinataire.definitive).length;
        const jours = joursAvant(courrier.echeance);
        const rappel = rappelEnCours(jours, rappels);
        const pluriel = sansReponse > 1;

        if (sansReponse > 0 && jours < 0) {
            evenements.push({ id: `depassee-${courrier.id}`, le: `${courrier.echeance}T23:59:00.000Z`, categorie: 'rappels', urgente: true, titre: 'Date limite dépassée', texte: `${sansReponse} membre${pluriel ? 's' : ''} sans réponse · ${courrier.objet}`, lien: lien(courrier) });
        } else if (sansReponse > 0 && rappel !== null) {
            evenements.push({ id: `rappel-admin-${courrier.id}-J${rappel}`, le: instantDuRappel(courrier.echeance, rappel), categorie: 'rappels', urgente: rappel === 1, titre: `Rappel J-${rappel} : réponses attendues`, texte: `${sansReponse} membre${pluriel ? 's n’ont' : ' n’a'} pas encore confirmé · ${courrier.objet}`, lien: lien(courrier) });
        }
    }

    return evenements;
}

/**
 * Événements pour un membre du bureau : nouveaux courriers, décisions de l'administrateur, documents
 * remplacés et rappels avant la date limite tant qu'il n'a pas confirmé.
 */
export function evenementsCourriersMembre(membreId, rappels) {
    const evenements = [];
    const lien = (courrier) => ({ name: 'courrier-secretaire', params: { id: courrier.id } });

    for (const courrier of etat.courriers.filter((candidat) => candidat.statut === 'envoye')) {
        const destinataire = courrier.destinataires.find((candidat) => candidat.membreId === membreId);

        if (!destinataire) {
            continue;
        }

        const suivi = suivre(courrier, destinataire);
        evenements.push({ id: `nouveau-${courrier.id}`, le: destinataire.affecteLe, categorie: 'courriers', urgente: false, titre: 'Nouveau courrier', texte: courrier.objet, lien: lien(courrier) });

        if (courrier.documentRemplaceLe) {
            evenements.push({ id: `remplace-${courrier.id}-${courrier.documentRemplaceLe}`, le: courrier.documentRemplaceLe, categorie: 'courriers', urgente: false, titre: 'Document du courrier remplacé', texte: courrier.objet, lien: lien(courrier) });
        }

        for (const entree of courrier.historique.filter((candidate) => candidate.membreId === membreId && !candidate.parLeMembre)) {
            evenements.push({ id: `decision-${courrier.id}-${entree.le}`, le: entree.le, categorie: 'confirmations', urgente: false, titre: entree.action, texte: courrier.objet, lien: lien(courrier) });
        }

        if (!courrier.reponseAttendue || destinataire.definitive || !suivi.echeance) {
            continue;
        }

        const jours = joursAvant(suivi.echeance);
        const rappel = rappelEnCours(jours, rappels);

        if (jours < 0) {
            evenements.push({ id: `depassee-moi-${courrier.id}`, le: `${suivi.echeance}T23:59:00.000Z`, categorie: 'rappels', urgente: true, titre: 'Date limite dépassée', texte: `Vous pouvez encore répondre, mais la réponse sera marquée tardive · ${courrier.objet}`, lien: lien(courrier) });
        } else if (rappel !== null) {
            const reste = jours === 0 ? 'Dernier jour' : `Plus que ${jours} jour${jours > 1 ? 's' : ''}`;
            evenements.push({ id: `rappel-${courrier.id}-J${rappel}`, le: instantDuRappel(suivi.echeance, rappel), categorie: 'rappels', urgente: rappel === 1, titre: `Rappel J-${rappel} : réponse attendue`, texte: `${reste} pour répondre · ${courrier.objet}`, lien: lien(courrier) });
        }
    }

    return evenements;
}

/** Courriers et membres dont le texte correspond, pour la recherche globale. */
export async function rechercherDansLesCourriers(texte) {
    const recherche = texte.trim().toLocaleLowerCase('fr');

    if (recherche.length < 2) {
        return { courriers: [], membres: [] };
    }

    return {
        courriers: etat.courriers
            .filter((courrier) => `${courrier.reference} ${courrier.objet}`.toLocaleLowerCase('fr').includes(recherche))
            .map((courrier) => ({ id: courrier.id, reference: courrier.reference, objet: courrier.objet, statut: courrier.statut })),
        membres: etat.membres
            .filter((personne) => `${personne.nom} ${personne.poste} ${personne.groupe}`.toLocaleLowerCase('fr').includes(recherche))
            .map((personne) => structuredClone(personne)),
    };
}
