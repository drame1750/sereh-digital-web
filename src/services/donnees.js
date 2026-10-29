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

        if (etat?.activites && etat?.inscriptions && etat?.pointages) {
            return etat;
        }
    } catch {
        // Stockage indisponible : la démonstration repart des données d'exemple.
    }

    return etatInitial();
}

function etatInitial() {
    return {
        activites: structuredClone(activitesExemple).map((activite) => ({ ...activite, publiee: true })),
        inscriptions: structuredClone(inscriptionsExemple),
        pointages: [],
        liens: {},
        journal: [],
    };
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

/** Activités publiées, de la plus proche à la plus lointaine. Une activité non publiée n'apparaît jamais. */
export async function listerActivites() {
    await attendre();

    return etat.activites.filter((activite) => activite.publiee).map(decrireActivite).sort((a, b) => a.date.localeCompare(b.date));
}

export async function trouverActivite(id) {
    await attendre();
    const activite = etat.activites.find((candidate) => candidate.id === id && candidate.publiee);

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
    const activite = etat.activites.find((candidate) => candidate.id === activiteId && candidate.publiee);

    // Une activité complète accepte encore des inscriptions, mais en attente de validation.
    if (!activite || !['inscriptions-ouvertes', 'complet'].includes(decrireActivite(activite).statut)) {
        throw new Error('Les inscriptions sont fermées pour cette activité.');
    }

    return creerInscription(activite, donnees, 'formulaire public');
}

function creerInscription(activite, donnees, source) {
    const activiteId = activite.id;
    const telephone = normaliserTelephone(donnees.telephone);

    if (telephone === null) {
        throw new Error('Numéro ivoirien invalide : 10 chiffres commençant par 01, 05, 07, 21, 25 ou 27.');
    }

    donnees.accompagnateurs ??= [];

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
        ville: (donnees.ville ?? '').trim(),
        sousComite: donnees.sousComite || null,
        section: donnees.section || null,
        mineur: Boolean(donnees.mineur),
        tuteur: donnees.mineur ? { nom: donnees.tuteurNom.trim(), telephone: normaliserTelephone(donnees.tuteurTelephone) } : null,
        publicationAcceptee: Boolean(donnees.publicationAcceptee),
        doublonPossible,
        statut,
        source,
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
    noter(source === 'administration' ? 'Inscription ajoutée à la main' : 'Inscription reçue', `${principal.nom} (${tailleGroupe} personne${tailleGroupe > 1 ? 's' : ''})`);
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
        reponse = { resultat: personne.statut === 'annulee' ? 'annulee' : 'non_admise', personne: resume(personne) };
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
    Object.assign(etat, etatInitial());
    enregistrerEtat();
}

/* ------------------------------------------------------------------------------------------------
 * Administration. Dans l'application, chacune de ces actions sera réservée par le serveur aux
 * administrateurs (et, pour les inscriptions, aux Responsables de l'activité), et notée dans le
 * journal d'audit. En démonstration, le journal est une simple liste dans cet onglet.
 * ---------------------------------------------------------------------------------------------- */

function noter(action, cible) {
    etat.journal ??= [];
    etat.journal.unshift({ action, cible, le: new Date().toISOString() });
    etat.journal = etat.journal.slice(0, 200);
}

/** Dernières opérations notées dans le journal de démonstration. */
export async function dernieresOperations(nombre = 6) {
    return (etat.journal ?? []).slice(0, nombre);
}

function compter(activiteId) {
    const inscriptions = etat.inscriptions.filter((inscription) => inscription.activiteId === activiteId);

    return {
        recues: inscriptions.length,
        admises: inscriptions.filter((inscription) => inscription.statut === 'admise').length,
        enAttente: inscriptions.filter((inscription) => inscription.statut === 'en_attente').length,
        annulees: inscriptions.filter((inscription) => inscription.statut === 'annulee').length,
        accompagnateurs: inscriptions.filter((inscription) => inscription.role === 'accompagnateur' && inscription.statut !== 'annulee').length,
        doublons: inscriptions.filter((inscription) => inscription.doublonPossible && !inscription.doublonExamine).length,
        presents: inscriptions.filter((inscription) => premierPointage(inscription.id)).length,
    };
}

/** Toutes les activités, publiées ou non, avec leurs chiffres ; la plus récente d'abord. */
export async function listerActivitesAdmin() {
    await attendre();

    return etat.activites
        .map((activite) => ({ ...decrireActivite(activite), nombres: compter(activite.id) }))
        .sort((a, b) => b.date.localeCompare(a.date));
}

export async function trouverActiviteAdmin(id) {
    await attendre();
    const activite = etat.activites.find((candidate) => candidate.id === id);

    return activite ? { ...decrireActivite(activite), nombres: compter(activite.id) } : null;
}

function identifiantLisible(titre, date) {
    const base = `${titre} ${date.slice(0, 4)}`
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
    let identifiant = base;
    let suffixe = 2;

    while (etat.activites.some((activite) => activite.id === identifiant)) {
        identifiant = `${base}-${suffixe}`;
        suffixe++;
    }

    return identifiant;
}

/**
 * Crée ou modifie une activité. Une activité créée n'est ni publiée ni ouverte aux inscriptions :
 * ces deux décisions restent manuelles (cahier des charges, section 3).
 *
 * @throws {Error & { erreurs?: Record<string, string> }} avec le détail champ par champ
 */
export async function enregistrerActivite(id, donnees) {
    await attendre();
    const erreurs = {};
    const capacite = String(donnees.capacite ?? '').trim();
    const maxAccompagnateurs = Number(donnees.maxAccompagnateurs);

    if (donnees.titre.trim().length < 3) {
        erreurs.titre = 'Le nom de l’activité doit compter au moins 3 caractères.';
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(donnees.date)) {
        erreurs.date = 'Indiquez la date de l’activité.';
    }

    if (!donnees.heure.trim()) {
        erreurs.heure = 'Indiquez l’heure de début.';
    }

    if (donnees.lieu.trim().length < 2) {
        erreurs.lieu = 'Indiquez le lieu.';
    }

    if (capacite !== '' && !(Number.isInteger(Number(capacite)) && Number(capacite) >= 1)) {
        erreurs.capacite = 'La capacité est un nombre entier d’au moins 1, ou rien pour une capacité illimitée.';
    }

    if (!Number.isInteger(maxAccompagnateurs) || maxAccompagnateurs < 0 || maxAccompagnateurs > 10) {
        erreurs.maxAccompagnateurs = 'Entre 0 et 10 accompagnateurs par personne.';
    }

    if (donnees.ouverturePrevue && donnees.fermeturePrevue && donnees.fermeturePrevue < donnees.ouverturePrevue) {
        erreurs.fermeturePrevue = 'La fermeture prévue doit venir après l’ouverture prévue.';
    }

    if (Object.keys(erreurs).length > 0) {
        throw Object.assign(new Error('Quelques informations sont à corriger.'), { erreurs });
    }

    const valeurs = {
        titre: donnees.titre.trim(),
        edition: donnees.edition.trim(),
        description: donnees.description.trim(),
        objectifs: donnees.objectifs.split('\n').map((ligne) => ligne.trim()).filter(Boolean),
        organisateur: donnees.organisateur.trim(),
        conditions: donnees.conditions.trim(),
        date: donnees.date,
        heure: donnees.heure.trim(),
        heureFin: donnees.heureFin.trim(),
        lieu: donnees.lieu.trim(),
        capacite: capacite === '' ? null : Number(capacite),
        maxAccompagnateurs,
        ouverturePrevue: donnees.ouverturePrevue || null,
        fermeturePrevue: donnees.fermeturePrevue || null,
    };

    if (id) {
        const activite = etat.activites.find((candidate) => candidate.id === id);
        Object.assign(activite, valeurs);
        noter('Activité modifiée', activite.titre);
        enregistrerEtat();

        return id;
    }

    const nouvelle = { id: identifiantLisible(valeurs.titre, valeurs.date), publiee: false, inscriptionsOuvertes: false, ...valeurs };
    etat.activites.push(nouvelle);
    noter('Activité créée', nouvelle.titre);
    enregistrerEtat();

    return nouvelle.id;
}

export async function changerPublication(id, publiee) {
    await attendre();
    const activite = etat.activites.find((candidate) => candidate.id === id);
    activite.publiee = publiee;

    // Retirer une activité de la page publique ferme aussi ses inscriptions.
    if (!publiee) {
        activite.inscriptionsOuvertes = false;
    }

    noter(publiee ? 'Activité publiée' : 'Activité retirée de la page publique', activite.titre);
    enregistrerEtat();
}

export async function changerInscriptions(id, ouvertes) {
    await attendre();
    const activite = etat.activites.find((candidate) => candidate.id === id);

    if (ouvertes && !activite.publiee) {
        throw new Error('Publiez d’abord l’activité : les inscriptions ne peuvent pas ouvrir sur une page invisible.');
    }

    activite.inscriptionsOuvertes = ouvertes;
    noter(ouvertes ? 'Inscriptions ouvertes' : 'Inscriptions fermées', activite.titre);
    enregistrerEtat();
}

/** Chiffres d'une activité pour l'administration. */
export async function chiffresActivite(activiteId) {
    return compter(activiteId);
}

/** Les inscriptions d'une activité, par groupe, avec les coordonnées (réservé à l'administration). */
export async function listerGroupes(activiteId) {
    await attendre();
    const groupes = new Map();

    for (const personne of etat.inscriptions.filter((inscription) => inscription.activiteId === activiteId)) {
        if (!groupes.has(personne.groupe)) {
            groupes.set(personne.groupe, []);
        }

        groupes.get(personne.groupe).push({ ...personne, pointeA: premierPointage(personne.id)?.le ?? null });
    }

    return [...groupes.entries()]
        .map(([groupe, membres]) => {
            const principal = membres.find((membre) => membre.role === 'principal') ?? membres[0];

            return {
                groupe,
                principal,
                accompagnateurs: membres.filter((membre) => membre !== principal),
                statut: principal.statut,
                recueLe: principal.recueLe ?? null,
                doublonPossible: Boolean(principal.doublonPossible) && !principal.doublonExamine,
                source: principal.source ?? 'formulaire public',
            };
        })
        .sort((a, b) => (b.recueLe ?? '').localeCompare(a.recueLe ?? ''));
}

function membresDuGroupe(groupe) {
    return etat.inscriptions.filter((inscription) => inscription.groupe === groupe);
}

/** Admet un groupe en attente : la décision revient à l'organisation, même au-delà de la capacité. */
export async function validerGroupe(groupe) {
    await attendre();
    const membres = membresDuGroupe(groupe).filter((membre) => membre.statut === 'en_attente');

    if (membres.length === 0) {
        throw new Error('Ce groupe n’est pas en attente.');
    }

    for (const membre of membres) {
        membre.statut = 'admise';
        membre.admiseLe = new Date().toISOString();
    }

    noter('Inscription validée', `${membres[0].nom} (${membres.length} personne${membres.length > 1 ? 's' : ''})`);
    enregistrerEtat();
}

/** Annule un groupe, avec un motif obligatoire. Rien n'est supprimé : l'inscription reste, annulée. */
export async function annulerGroupe(groupe, motif) {
    await attendre();

    if (motif.trim().length < 5) {
        throw new Error('Indiquez le motif de l’annulation (au moins 5 caractères).');
    }

    const membres = membresDuGroupe(groupe).filter((membre) => membre.statut !== 'annulee');

    if (membres.some((membre) => premierPointage(membre.id))) {
        throw new Error('Une personne de ce groupe est déjà pointée : l’annulation demande une correction du pointage par un Responsable.');
    }

    for (const membre of membres) {
        membre.statut = 'annulee';
        membre.motifAnnulation = motif.trim();
        membre.annuleeLe = new Date().toISOString();
    }

    noter('Inscription annulée', `${membres[0]?.nom ?? 'Groupe'} · motif : ${motif.trim()}`);
    enregistrerEtat();
}

/** Le doublon possible a été examiné par une personne : rien n'est fusionné ni supprimé. */
export async function marquerDoublonExamine(groupe) {
    await attendre();
    const principal = membresDuGroupe(groupe).find((membre) => membre.role === 'principal');
    principal.doublonExamine = true;
    noter('Doublon possible examiné', principal.nom);
    enregistrerEtat();
}

/**
 * Nouveau lien personnel, après vérification de l'identité par l'administrateur (appel au numéro
 * inscrit). Tout lien émis auparavant cesse de fonctionner.
 */
export async function renvoyerLien(groupe) {
    await attendre();

    for (const [jeton, groupeDuLien] of Object.entries(etat.liens)) {
        if (groupeDuLien === groupe) {
            delete etat.liens[jeton];
        }
    }

    const jeton = jetonAleatoire(48);
    etat.liens[jeton] = groupe;
    noter('Nouveau lien personnel envoyé', membresDuGroupe(groupe).find((membre) => membre.role === 'principal')?.nom ?? '');
    enregistrerEtat();

    return jeton;
}

/** Inscription rapide par l'administration, à compléter plus tard ; possible même inscriptions fermées. */
export async function inscrireManuellement(activiteId, donnees) {
    await attendre();
    const activite = etat.activites.find((candidate) => candidate.id === activiteId);

    if (donnees.nom.trim().length < 3) {
        throw new Error('Indiquez le nom complet (au moins 3 caractères).');
    }

    if (!donnees.sexe) {
        throw new Error('Choisissez le sexe.');
    }

    return creerInscription(activite, { ...donnees, accompagnateurs: [] }, 'administration');
}
