import { normaliserTelephone } from '../telephone.js';
import {
    activitesExemple,
    activitesPasseesExemple,
    aujourdhui,
    historiqueExemple,
    inscriptionsExemple,
    placesDejaPrisesExemple,
} from '../donnees-exemple.js';
import { verifierHorsMaintenance } from './maintenance.js';
import { parametres } from './parametres.js';
import { session } from './session.js';

/**
 * Couche de données de l'application. Tous les écrans passent par ces fonctions, et par elles seules.
 *
 * VERSION DE DÉMONSTRATION : les données sont fictives et gardées dans cet onglet seulement
 * (sessionStorage). Quand Supabase sera branché, chaque fonction appellera la base ; les règles
 * ci-dessous (capacité, groupes, doublons, second passage, maintenance) seront alors appliquées par
 * le serveur, jamais par le navigateur. Les écrans, eux, ne changeront pas.
 */
export const MODE_DEMONSTRATION = true;

const CLE_STOCKAGE = 'sereh.demonstration';
const CLE_APPAREIL = 'sereh.appareil';
const VERSION_ETAT = 2;
const LATENCE_MS = 280;
const UN_JOUR_MS = 24 * 60 * 60 * 1000;

const attendre = () => new Promise((resoudre) => setTimeout(resoudre, LATENCE_MS));
const maintenant = () => new Date().toISOString();
const auteur = () => session.utilisateur?.nom ?? 'Visiteur';

function lireEtat() {
    try {
        const etat = JSON.parse(window.sessionStorage.getItem(CLE_STOCKAGE) ?? 'null');

        if (etat?.version === VERSION_ETAT && etat?.activites && etat?.inscriptions && etat?.pointages) {
            return etat;
        }
    } catch {
        // Stockage indisponible : la démonstration repart des données d'exemple.
    }

    return etatInitial();
}

function etatInitial() {
    const historique = historiqueExemple();

    return {
        version: VERSION_ETAT,
        activites: [
            ...structuredClone(activitesExemple).map((activite) => ({ ...activite, publiee: true, archivee: false })),
            ...structuredClone(activitesPasseesExemple).map((activite) => ({ ...activite, publiee: true })),
        ].map((activite) => ({ listePublique: { active: false, champs: ['nom', 'sousComite'], activeeLe: null, activeePar: null }, anonymiseeLe: null, ...activite })),
        inscriptions: [...structuredClone(inscriptionsExemple), ...historique.inscriptions],
        pointages: historique.pointages.map((pointage, index) => ({ id: `p-exemple-${index}`, ...pointage })),
        liens: {},
        journal: [],
        corbeille: [],
        imports: [],
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

/** Écrit l'état complet dans l'onglet, pour qu'une sauvegarde le contienne même sans modification. */
export function persisterEtat() {
    enregistrerEtat();
}

function jetonAleatoire(longueur) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const octets = crypto.getRandomValues(new Uint8Array(longueur));

    return Array.from(octets, (octet) => alphabet[octet % alphabet.length]).join('');
}

/** Identifiant technique de l'appareil, tiré au hasard une fois : il ne dit rien de la personne. */
export function identifiantAppareil() {
    try {
        let identifiant = window.localStorage.getItem(CLE_APPAREIL);

        if (!identifiant) {
            identifiant = `APP-${jetonAleatoire(8)}`;
            window.localStorage.setItem(CLE_APPAREIL, identifiant);
        }

        return identifiant;
    } catch {
        return 'APP-inconnu';
    }
}

function placesPrises(activiteId) {
    const admises = etat.inscriptions.filter((inscription) => inscription.activiteId === activiteId && inscription.statut === 'admise').length;

    return admises + (placesDejaPrisesExemple[activiteId] ?? 0);
}

const estTerminee = (activite) => new Date(`${activite.date}T23:59:59Z`).getTime() < Date.now();

function decrireActivite(activite) {
    const restantes = activite.capacite === null ? null : Math.max(0, activite.capacite - placesPrises(activite.id));
    let statut = 'inscriptions-ouvertes';

    if (estTerminee(activite)) {
        statut = 'terminee';
    } else if (!activite.inscriptionsOuvertes) {
        statut = 'inscriptions-fermees';
    } else if (restantes === 0) {
        statut = 'complet';
    }

    return { ...structuredClone(activite), placesRestantes: restantes, statut };
}

/**
 * Activités publiées et non archivées, de la plus proche à la plus lointaine. Une activité non
 * publiée n'apparaît jamais.
 */
export async function listerActivites() {
    await attendre();

    return etat.activites.filter((activite) => activite.publiee && !activite.archivee).map(decrireActivite).sort((a, b) => a.date.localeCompare(b.date));
}

/** Une activité publiée, même archivée : un lien déjà partagé continue de s'ouvrir. */
export async function trouverActivite(id) {
    await attendre();
    const activite = etat.activites.find((candidate) => candidate.id === id && candidate.publiee);

    return activite ? decrireActivite(activite) : null;
}

/** Sous-Comités et leurs Sections, tels que réglés dans les Paramètres. */
export async function listerSousComites() {
    return JSON.parse(JSON.stringify(parametres.sousComites));
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
    verifierHorsMaintenance();
    const activite = etat.activites.find((candidate) => candidate.id === activiteId && candidate.publiee && !candidate.archivee);

    // Une activité complète accepte encore des inscriptions, mais en attente de validation.
    if (!activite || !['inscriptions-ouvertes', 'complet'].includes(decrireActivite(activite).statut)) {
        throw new Error('Les inscriptions sont fermées pour cette activité.');
    }

    return creerInscription(activite, donnees, 'formulaire public');
}

function creerInscription(activite, donnees, source, { noterAuJournal = true } = {}) {
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
    const recueLe = maintenant();

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

    if (noterAuJournal) {
        noter(source === 'administration' ? 'Inscription ajoutée à la main' : 'Inscription reçue', `${principal.nom} (${tailleGroupe} personne${tailleGroupe > 1 ? 's' : ''})`, 'inscriptions');
    }

    enregistrerEtat();

    return { jeton, statut, doublonPossible };
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

/** Le passage accepté qui compte pour une personne : une correction peut l'avoir annulé. */
function premierPointage(inscriptionId) {
    return etat.pointages.find((pointage) => pointage.inscriptionId === inscriptionId && pointage.resultat === 'accepte' && !pointage.annule);
}

/**
 * Vérifie un QR code présenté à l'entrée d'une activité. Le second passage est bloqué et rappelle
 * l'heure du premier ; chaque tentative est notée, acceptée ou refusée, avec l'agent et l'appareil.
 *
 * Un scan fait hors connexion arrive avec son heure réelle (« scanneLe ») : s'il était déjà pointé
 * ailleurs, le premier passage accepté reste, et ce scan est signalé pour examen.
 *
 * @returns {Promise<{ resultat: 'accepte' | 'deja_pointe' | 'non_admise' | 'annulee' | 'autre_activite' | 'inconnu', personne?: object, premierPassage?: string }>}
 */
export async function verifierCode(activiteId, code, moyen, { scanneLe = null } = {}) {
    await attendre();
    const personne = etat.inscriptions.find((inscription) => inscription.codeQr === String(code).trim());

    return enregistrerPassage(activiteId, personne, moyen, scanneLe);
}

/** Pointage à la main, après une recherche par nom (saisie de secours). */
export async function pointerParIdentifiant(activiteId, inscriptionId, moyen = 'saisie manuelle') {
    await attendre();

    return enregistrerPassage(activiteId, etat.inscriptions.find((inscription) => inscription.id === inscriptionId), moyen);
}

function enregistrerPassage(activiteId, personne, moyen, scanneLe = null) {
    verifierHorsMaintenance();
    const instant = maintenant();
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
        reponse = { resultat: 'accepte', personne: { ...resume(personne), pointeA: scanneLe ?? instant } };
    }

    etat.pointages.push({
        id: jetonAleatoire(10),
        inscriptionId: personne?.id ?? null,
        activiteId,
        resultat: reponse.resultat,
        moyen,
        agent: auteur(),
        appareil: identifiantAppareil(),
        le: scanneLe ?? instant,
        synchroniseLe: scanneLe ? instant : null,
        aExaminer: Boolean(scanneLe) && reponse.resultat === 'deja_pointe',
    });
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

/**
 * Ce que l'agent prépare pour pointer sans réseau : l'empreinte de chaque code admis, sans nom ni
 * numéro. Un code lu hors connexion est comparé à ces empreintes, puis envoyé au retour du réseau.
 */
export async function preparerHorsConnexion(activiteId) {
    await attendre();
    const empreinte = async (texte) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte))), (octet) => octet.toString(16).padStart(2, '0')).join('');
    const codes = {};

    for (const personne of etat.inscriptions.filter((inscription) => inscription.activiteId === activiteId && inscription.statut === 'admise')) {
        codes[await empreinte(personne.codeQr)] = { role: personne.role, sexe: personne.sexe, dejaPointe: Boolean(premierPointage(personne.id)) };
    }

    return { activiteId, prepareLe: maintenant(), codes };
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

/** Le journal d'audit garde 12 mois d'opérations. */
const DUREE_JOURNAL_MS = 365 * UN_JOUR_MS;

function noter(action, cible, categorie = 'general', resultat = 'reussi') {
    const limite = new Date(Date.now() - DUREE_JOURNAL_MS).toISOString();
    etat.journal ??= [];
    etat.journal.unshift({ le: maintenant(), auteur: auteur(), action, cible, categorie, resultat });
    etat.journal = etat.journal.filter((entree) => entree.le >= limite).slice(0, 1000);
}

/** Note dans le journal une opération faite par un autre service (courriers, comptes, sauvegardes…). */
export function noterOperation(action, cible, categorie = 'general', resultat = 'reussi') {
    noter(action, cible, categorie, resultat);
    enregistrerEtat();
}

/** Dernières opérations notées dans le journal de démonstration. */
export async function dernieresOperations(nombre = 6) {
    return (etat.journal ?? []).slice(0, nombre);
}

/** Journal d'audit complet, filtré (réservé à l'administrateur principal). */
export async function lireJournal({ auteur: qui = '', categorie = '', resultat = '', du = '', au = '', texte = '' } = {}) {
    await attendre();
    const recherche = texte.trim().toLocaleLowerCase('fr');

    return (etat.journal ?? []).filter((entree) => (!qui || entree.auteur === qui)
        && (!categorie || entree.categorie === categorie)
        && (!resultat || entree.resultat === resultat)
        && (!du || entree.le.slice(0, 10) >= du)
        && (!au || entree.le.slice(0, 10) <= au)
        && (!recherche || `${entree.action} ${entree.cible}`.toLocaleLowerCase('fr').includes(recherche)));
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
        aExaminer: etat.pointages.filter((pointage) => pointage.activiteId === activiteId && pointage.aExaminer && !pointage.examineLe).length,
    };
}

/**
 * Activités, publiées ou non, avec leurs chiffres ; la plus récente d'abord.
 *
 * @param {{ archivees?: 'exclure' | 'seulement' | 'toutes' }} options les activités archivées sont exclues par défaut
 */
export async function listerActivitesAdmin({ archivees = 'exclure' } = {}) {
    await attendre();

    return etat.activites
        .filter((activite) => archivees === 'toutes' || (archivees === 'seulement' ? activite.archivee : !activite.archivee))
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

    while (etat.activites.some((activite) => activite.id === identifiant) || etat.corbeille.some((element) => element.id === identifiant)) {
        identifiant = `${base}-${suffixe}`;
        suffixe++;
    }

    return identifiant;
}

/**
 * Crée ou modifie une activité. Une activité créée n'est ni publiée ni ouverte aux inscriptions :
 * ces deux décisions restent manuelles (cahier des charges, section 3). Modifier une activité close
 * est exceptionnel : réservé à l'administrateur, avec un motif noté au journal.
 *
 * @throws {Error & { erreurs?: Record<string, string> }} avec le détail champ par champ
 */
export async function enregistrerActivite(id, donnees, motifExceptionnel = '') {
    await attendre();
    verifierHorsMaintenance();
    const erreurs = {};
    const capacite = String(donnees.capacite ?? '').trim();
    const maxAccompagnateurs = Number(donnees.maxAccompagnateurs);
    const existante = id ? etat.activites.find((candidate) => candidate.id === id) : null;
    const close = existante && (existante.archivee || estTerminee(existante));

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

    if (close && motifExceptionnel.trim().length < 5) {
        erreurs.motifExceptionnel = 'Cette activité est close : indiquez le motif de la modification (au moins 5 caractères).';
    }

    if (close && session.utilisateur?.role !== 'admin') {
        throw new Error('Seul l’administrateur peut modifier une activité close.');
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

    if (existante) {
        Object.assign(existante, valeurs);
        noter(close ? 'Modification exceptionnelle d’une activité close' : 'Activité modifiée', close ? `${existante.titre} · motif : ${motifExceptionnel.trim()}` : existante.titre, 'activites');
        enregistrerEtat();

        return id;
    }

    const nouvelle = {
        id: identifiantLisible(valeurs.titre, valeurs.date),
        publiee: false,
        inscriptionsOuvertes: false,
        archivee: false,
        anonymiseeLe: null,
        listePublique: { active: false, champs: ['nom', 'sousComite'], activeeLe: null, activeePar: null },
        ...valeurs,
    };
    etat.activites.push(nouvelle);
    noter('Activité créée', nouvelle.titre, 'activites');
    enregistrerEtat();

    return nouvelle.id;
}

export async function changerPublication(id, publiee) {
    await attendre();
    verifierHorsMaintenance();
    const activite = etat.activites.find((candidate) => candidate.id === id);
    activite.publiee = publiee;

    // Retirer une activité de la page publique ferme aussi ses inscriptions.
    if (!publiee) {
        activite.inscriptionsOuvertes = false;
    }

    noter(publiee ? 'Activité publiée' : 'Activité retirée de la page publique', activite.titre, 'publications');
    enregistrerEtat();
}

export async function changerInscriptions(id, ouvertes) {
    await attendre();
    verifierHorsMaintenance();
    const activite = etat.activites.find((candidate) => candidate.id === id);

    if (ouvertes && !activite.publiee) {
        throw new Error('Publiez d’abord l’activité : les inscriptions ne peuvent pas ouvrir sur une page invisible.');
    }

    activite.inscriptionsOuvertes = ouvertes;
    noter(ouvertes ? 'Inscriptions ouvertes' : 'Inscriptions fermées', activite.titre, 'activites');
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
    verifierHorsMaintenance();
    const membres = membresDuGroupe(groupe).filter((membre) => membre.statut === 'en_attente');

    if (membres.length === 0) {
        throw new Error('Ce groupe n’est pas en attente.');
    }

    for (const membre of membres) {
        membre.statut = 'admise';
        membre.admiseLe = maintenant();
    }

    noter('Inscription validée', `${membres[0].nom} (${membres.length} personne${membres.length > 1 ? 's' : ''})`, 'inscriptions');
    enregistrerEtat();
}

/** Annule un groupe, avec un motif obligatoire. Rien n'est supprimé : l'inscription reste, annulée. */
export async function annulerGroupe(groupe, motif) {
    await attendre();
    verifierHorsMaintenance();

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
        membre.annuleeLe = maintenant();
    }

    noter('Inscription annulée', `${membres[0]?.nom ?? 'Groupe'} · motif : ${motif.trim()}`, 'inscriptions');
    enregistrerEtat();
}

/** Le doublon possible a été examiné par une personne : rien n'est fusionné ni supprimé. */
export async function marquerDoublonExamine(groupe) {
    await attendre();
    verifierHorsMaintenance();
    const principal = membresDuGroupe(groupe).find((membre) => membre.role === 'principal');
    principal.doublonExamine = true;
    noter('Doublon possible examiné', principal.nom, 'inscriptions');
    enregistrerEtat();
}

/**
 * Nouveau lien personnel, après vérification de l'identité par l'administrateur (appel au numéro
 * inscrit). Tout lien émis auparavant cesse de fonctionner.
 */
export async function renvoyerLien(groupe) {
    await attendre();
    verifierHorsMaintenance();

    for (const [jeton, groupeDuLien] of Object.entries(etat.liens)) {
        if (groupeDuLien === groupe) {
            delete etat.liens[jeton];
        }
    }

    const jeton = jetonAleatoire(48);
    etat.liens[jeton] = groupe;
    noter('Nouveau lien personnel envoyé', membresDuGroupe(groupe).find((membre) => membre.role === 'principal')?.nom ?? '', 'inscriptions');
    enregistrerEtat();

    return jeton;
}

/** Inscription rapide par l'administration, à compléter plus tard ; possible même inscriptions fermées. */
export async function inscrireManuellement(activiteId, donnees) {
    await attendre();
    verifierHorsMaintenance();
    const activite = etat.activites.find((candidate) => candidate.id === activiteId);

    if (donnees.nom.trim().length < 3) {
        throw new Error('Indiquez le nom complet (au moins 3 caractères).');
    }

    if (!donnees.sexe) {
        throw new Error('Choisissez le sexe.');
    }

    return creerInscription(activite, { ...donnees, accompagnateurs: [] }, 'administration');
}

/* ------------------------------------------------------------------------------------------------
 * Participants : chaque personne inscrite, accompagnateurs compris, avec l'historique général d'un
 * même numéro sur plusieurs activités (cahier des charges, section 4).
 * ---------------------------------------------------------------------------------------------- */

function decrirePersonne(personne) {
    const activite = etat.activites.find((candidate) => candidate.id === personne.activiteId);
    const principal = personne.role === 'principal' ? personne : etat.inscriptions.find((candidat) => candidat.groupe === personne.groupe && candidat.role === 'principal');

    return {
        ...structuredClone(personne),
        activite: activite ? { id: activite.id, titre: activite.titre, edition: activite.edition, date: activite.date, archivee: Boolean(activite.archivee) } : null,
        inscritPar: personne.role === 'accompagnateur' ? principal?.nom ?? null : null,
        pointeA: premierPointage(personne.id)?.le ?? null,
    };
}

/**
 * Tous les participants, filtrés.
 *
 * @param {{ activiteId?: string, texte?: string, role?: string, statut?: string, pointage?: string }} filtres
 */
export async function listerParticipants({ activiteId = '', texte = '', role = '', statut = '', pointage = '' } = {}) {
    await attendre();
    const recherche = texte.trim().toLocaleLowerCase('fr');
    const chiffres = texte.replace(/\D/g, '');

    return etat.inscriptions
        .filter((personne) => (!activiteId || personne.activiteId === activiteId)
            && (!role || personne.role === role)
            && (!statut || personne.statut === statut)
            && (!recherche || personne.nom.toLocaleLowerCase('fr').includes(recherche) || (chiffres.length >= 4 && (personne.telephone ?? '').includes(chiffres))))
        .map(decrirePersonne)
        .filter((personne) => !pointage || (pointage === 'presents' ? personne.pointeA : !personne.pointeA))
        .sort((a, b) => (b.activite?.date ?? '').localeCompare(a.activite?.date ?? '') || a.nom.localeCompare(b.nom, 'fr'));
}

/** Fiche d'un participant : son inscription, son groupe, ses passages et ses autres activités. */
export async function ficheParticipant(id) {
    await attendre();
    const personne = etat.inscriptions.find((candidate) => candidate.id === id);

    if (!personne) {
        return null;
    }

    const autres = personne.telephone
        ? etat.inscriptions.filter((candidate) => candidate.telephone === personne.telephone && candidate.id !== personne.id)
        : [];

    return {
        ...decrirePersonne(personne),
        groupeDe: membresDuGroupe(personne.groupe).filter((membre) => membre.id !== personne.id).map(decrirePersonne),
        passages: etat.pointages.filter((pointage) => pointage.inscriptionId === personne.id).map((pointage) => structuredClone(pointage)).sort((a, b) => b.le.localeCompare(a.le)),
        historique: autres.map(decrirePersonne).sort((a, b) => (b.activite?.date ?? '').localeCompare(a.activite?.date ?? '')),
    };
}

/* ------------------------------------------------------------------------------------------------
 * Pointage, côté Responsable : passages, corrections motivées, scans hors connexion à examiner et
 * liste imprimable de secours (cahier des charges, section 5).
 * ---------------------------------------------------------------------------------------------- */

/** Tous les passages d'une activité, acceptés ou refusés, le plus récent d'abord. */
export async function passagesActivite(activiteId) {
    await attendre();

    return etat.pointages
        .filter((pointage) => pointage.activiteId === activiteId)
        .map((pointage) => {
            const personne = etat.inscriptions.find((inscription) => inscription.id === pointage.inscriptionId);

            return { ...structuredClone(pointage), personne: personne ? { id: personne.id, nom: personne.nom, role: personne.role, sexe: personne.sexe } : null };
        })
        .sort((a, b) => b.le.localeCompare(a.le));
}

/**
 * Correction exceptionnelle du pointage par un Responsable ou l'administrateur, avec un motif :
 * annuler un passage accepté par erreur, ou pointer une personne à la main.
 */
export async function corrigerPointage(inscriptionId, action, motif) {
    await attendre();
    verifierHorsMaintenance();

    if (!['admin', 'responsable'].includes(session.utilisateur?.role)) {
        throw new Error('Les corrections de pointage sont réservées aux Responsables et à l’administrateur.');
    }

    if (motif.trim().length < 5) {
        throw new Error('Indiquez le motif de la correction (au moins 5 caractères).');
    }

    const personne = etat.inscriptions.find((inscription) => inscription.id === inscriptionId);
    const passage = premierPointage(inscriptionId);

    if (action === 'annuler') {
        if (!passage) {
            throw new Error('Cette personne n’a pas de passage accepté à annuler.');
        }

        Object.assign(passage, { annule: true, annuleLe: maintenant(), annulePar: auteur(), motifAnnulation: motif.trim() });
        noter('Passage annulé (correction du pointage)', `${personne.nom} · motif : ${motif.trim()}`, 'pointage');
    } else {
        if (passage) {
            throw new Error('Cette personne est déjà pointée.');
        }

        if (personne.statut !== 'admise') {
            throw new Error('Seule une personne admise peut être pointée.');
        }

        etat.pointages.push({ id: jetonAleatoire(10), inscriptionId, activiteId: personne.activiteId, resultat: 'accepte', moyen: 'correction', agent: auteur(), appareil: identifiantAppareil(), le: maintenant(), synchroniseLe: null, aExaminer: false, motifCorrection: motif.trim() });
        noter('Passage ajouté (correction du pointage)', `${personne.nom} · motif : ${motif.trim()}`, 'pointage');
    }

    enregistrerEtat();
}

/** Un scan hors connexion signalé a été examiné : le premier passage accepté reste celui qui compte. */
export async function examinerPassage(pointageId) {
    await attendre();
    const pointage = etat.pointages.find((candidat) => candidat.id === pointageId);
    pointage.examineLe = maintenant();
    pointage.examinePar = auteur();
    noter('Scan hors connexion examiné', etat.inscriptions.find((inscription) => inscription.id === pointage.inscriptionId)?.nom ?? '', 'pointage');
    enregistrerEtat();
}

/** Liste de secours à imprimer : les personnes admises, par ordre alphabétique, avec une case à cocher. */
export async function listeDeSecours(activiteId) {
    await attendre();

    return etat.inscriptions
        .filter((inscription) => inscription.activiteId === activiteId && inscription.statut === 'admise')
        .map(decrirePersonne)
        .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

/* ------------------------------------------------------------------------------------------------
 * Liste publique des participants : désactivée par défaut, activée par l'administrateur après
 * vérification des conditions, et limitée aux personnes qui y ont consenti (section 4).
 * ---------------------------------------------------------------------------------------------- */

export const CHAMPS_PUBLICS = { nom: 'Nom', sousComite: 'Sous-Comité', section: 'Section' };

export async function changerListePublique(activiteId, active, champs, conditionsVerifiees) {
    await attendre();
    verifierHorsMaintenance();
    const activite = etat.activites.find((candidate) => candidate.id === activiteId);

    if (active && !conditionsVerifiees) {
        throw new Error('Cochez la case qui confirme la vérification des conditions de publication.');
    }

    if (active && !champs.includes('nom')) {
        throw new Error('Le nom fait toujours partie des champs publiés.');
    }

    activite.listePublique = { active, champs: champs.filter((champ) => CHAMPS_PUBLICS[champ]), activeeLe: active ? maintenant() : null, activeePar: active ? auteur() : null };
    noter(active ? 'Liste publique des participants activée' : 'Liste publique des participants désactivée', `${activite.titre} · champs : ${activite.listePublique.champs.map((champ) => CHAMPS_PUBLICS[champ]).join(', ')}`, 'publications');
    enregistrerEtat();
}

/**
 * Liste publique d'une activité, ou null si elle n'est pas activée. Seules les personnes admises qui
 * ont consenti y figurent, avec les seuls champs choisis ; le statut reflète la présence réellement
 * pointée. Jamais de coordonnées.
 */
export async function listePublique(activiteId) {
    await attendre();
    const activite = etat.activites.find((candidate) => candidate.id === activiteId && candidate.publiee);

    if (!activite?.listePublique?.active) {
        return null;
    }

    const champs = activite.listePublique.champs;
    const consentements = new Map(etat.inscriptions.filter((inscription) => inscription.role === 'principal').map((inscription) => [inscription.groupe, inscription.publicationAcceptee]));

    return {
        activite: { id: activite.id, titre: activite.titre, edition: activite.edition, date: activite.date },
        champs,
        personnes: etat.inscriptions
            .filter((inscription) => inscription.activiteId === activiteId && inscription.statut === 'admise' && inscription.role === 'principal' && consentements.get(inscription.groupe))
            .map((inscription) => ({ ...Object.fromEntries(champs.map((champ) => [champ, inscription[champ] ?? ''])), present: Boolean(premierPointage(inscription.id)) }))
            .sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    };
}

/* ------------------------------------------------------------------------------------------------
 * Archives, corbeille et conservation des données (section 8).
 * ---------------------------------------------------------------------------------------------- */

/** Range une activité terminée dans les archives : elle quitte la page d'accueil, rien n'est supprimé. */
export async function archiverActivite(id) {
    await attendre();
    verifierHorsMaintenance();
    const activite = etat.activites.find((candidate) => candidate.id === id);

    if (!estTerminee(activite)) {
        throw new Error('Seule une activité terminée peut être archivée.');
    }

    activite.archivee = true;
    activite.inscriptionsOuvertes = false;
    noter('Activité archivée', activite.titre, 'archives');
    enregistrerEtat();
}

/**
 * Met une activité à la corbeille. Seule une activité jamais publiée et sans inscription peut y
 * aller : une activité qui a reçu des inscriptions s'archive, elle ne s'efface pas.
 */
export async function mettreActiviteALaCorbeille(id) {
    await attendre();
    verifierHorsMaintenance();
    const activite = etat.activites.find((candidate) => candidate.id === id);

    if (activite.publiee || compter(id).recues > 0) {
        throw new Error('Seule une activité non publiée et sans inscription peut aller à la corbeille.');
    }

    etat.activites = etat.activites.filter((candidate) => candidate.id !== id);
    etat.corbeille.unshift({ type: 'activite', id, titre: activite.titre, supprimeLe: maintenant(), supprimePar: auteur(), objet: activite });
    noter('Activité mise à la corbeille', activite.titre, 'archives');
    enregistrerEtat();
}

export async function listerCorbeilleActivites() {
    await attendre();

    return etat.corbeille.map(({ objet, ...element }) => structuredClone(element));
}

export async function restaurerActivite(id) {
    await attendre();
    verifierHorsMaintenance();
    const element = etat.corbeille.find((candidat) => candidat.id === id);
    etat.corbeille = etat.corbeille.filter((candidat) => candidat.id !== id);
    etat.activites.push(element.objet);
    noter('Activité restaurée depuis la corbeille', element.titre, 'archives');
    enregistrerEtat();
}

/** Suppression définitive, après confirmation par mot de passe (vérifiée par l'écran). */
export async function supprimerActiviteDefinitivement(id) {
    await attendre();
    verifierHorsMaintenance();
    const element = etat.corbeille.find((candidat) => candidat.id === id);
    etat.corbeille = etat.corbeille.filter((candidat) => candidat.id !== id);
    noter('Activité supprimée définitivement', element.titre, 'archives');
    enregistrerEtat();
}

const DOUZE_MOIS_MS = 365 * UN_JOUR_MS;

/**
 * Activités terminées et la date à laquelle leurs inscriptions deviennent anonymes (12 mois après
 * l'activité). Avec Supabase, une tâche planifiée le fera chaque nuit, sans intervention.
 */
export async function calendrierAnonymisation() {
    await attendre();

    return etat.activites
        .filter(estTerminee)
        .map((activite) => {
            const echeance = new Date(Date.parse(`${activite.date}T00:00:00Z`) + DOUZE_MOIS_MS).toISOString().slice(0, 10);

            return {
                id: activite.id,
                titre: activite.titre,
                edition: activite.edition,
                date: activite.date,
                echeance,
                aFaire: !activite.anonymiseeLe && echeance <= aujourdhui(),
                anonymiseeLe: activite.anonymiseeLe ?? null,
                personnes: etat.inscriptions.filter((inscription) => inscription.activiteId === activite.id).length,
            };
        })
        .sort((a, b) => a.echeance.localeCompare(b.echeance));
}

/**
 * Rend anonymes les inscriptions d'une activité : noms, numéros, villes, tuteurs et liens personnels
 * disparaissent ; restent le sexe, le Sous-Comité, le statut et les passages, pour les statistiques.
 */
export async function anonymiserActivite(id) {
    await attendre();
    verifierHorsMaintenance();
    const activite = etat.activites.find((candidate) => candidate.id === id);
    const personnes = etat.inscriptions.filter((inscription) => inscription.activiteId === id);

    personnes.forEach((personne, index) => {
        Object.assign(personne, { nom: `Personne anonymisée ${index + 1}`, telephone: null, ville: '', tuteur: null, section: null, publicationAcceptee: false, motifAnnulation: personne.motifAnnulation ? 'Motif retiré (anonymisation)' : personne.motifAnnulation });
    });

    const groupes = new Set(personnes.map((personne) => personne.groupe));

    for (const [jeton, groupe] of Object.entries(etat.liens)) {
        if (groupes.has(groupe)) {
            delete etat.liens[jeton];
        }
    }

    activite.anonymiseeLe = maintenant();
    activite.listePublique = { ...activite.listePublique, active: false };
    noter('Inscriptions rendues anonymes', `${activite.titre} · ${personnes.length} personne${personnes.length > 1 ? 's' : ''}`, 'securite');
    enregistrerEtat();

    return personnes.length;
}

/* ------------------------------------------------------------------------------------------------
 * Import de listes (section 4) : aperçu des erreurs avant l'import, lignes valides traitées, erreurs
 * isolées, doublons signalés pour examen et jamais fusionnés.
 * ---------------------------------------------------------------------------------------------- */

const SEXES = { homme: 'homme', h: 'homme', m: 'homme', masculin: 'homme', femme: 'femme', f: 'femme', féminin: 'femme', feminin: 'femme' };

/**
 * Vérifie chaque ligne d'un fichier avant l'import.
 *
 * @param {Array<Record<string, string>>} lignes lignes du fichier, avec les colonnes du modèle
 */
export async function preparerImport(activiteId, lignes) {
    await attendre();
    const vus = new Set();

    return lignes.map((ligne, index) => {
        const erreurs = [];
        const nom = String(ligne.nom ?? '').trim();
        // Excel range parfois un numéro comme un nombre : le zéro du début disparaît.
        const brut = String(ligne.telephone ?? '').replace(/\.0+$/, '');
        const telephone = normaliserTelephone(/^\d{9}$/.test(brut) ? `0${brut}` : brut);
        const sexe = SEXES[String(ligne.sexe ?? '').trim().toLocaleLowerCase('fr')] ?? null;

        if (nom.length < 3) {
            erreurs.push('nom complet manquant');
        }

        if (!telephone) {
            erreurs.push('numéro ivoirien invalide');
        }

        if (!sexe) {
            erreurs.push('sexe à indiquer (homme ou femme)');
        }

        let doublon = null;

        if (telephone && vus.has(telephone)) {
            doublon = 'dans-le-fichier';
        } else if (telephone && etat.inscriptions.some((inscription) => inscription.activiteId === activiteId && inscription.telephone === telephone)) {
            doublon = 'deja-inscrit';
        }

        if (telephone) {
            vus.add(telephone);
        }

        return {
            numero: index + 2,
            valeurs: { nom, telephone: telephone ?? String(ligne.telephone ?? ''), sexe, ville: String(ligne.ville ?? '').trim(), sousComite: String(ligne.sous_comite ?? '').trim() || null, section: String(ligne.section ?? '').trim() || null },
            erreurs,
            doublon,
        };
    });
}

/**
 * Importe les lignes valides d'un aperçu, après confirmation. Les personnes nouvelles sont ajoutées ;
 * un numéro déjà connu est ajouté aussi, mais signalé comme doublon possible, sans rien modifier.
 */
export async function importerInscriptions(activiteId, apercu, nomFichier) {
    await attendre();
    verifierHorsMaintenance();
    const activite = etat.activites.find((candidate) => candidate.id === activiteId);
    const valides = apercu.filter((ligne) => ligne.erreurs.length === 0);
    let ajoutees = 0;
    let doublons = 0;

    for (const ligne of valides) {
        const { doublonPossible } = creerInscription(activite, { ...ligne.valeurs }, 'import', { noterAuJournal: false });
        ajoutees++;
        doublons += Number(doublonPossible);
    }

    const resultat = { traitees: apercu.length, ajoutees, doublons, rejetees: apercu.length - valides.length };
    etat.imports.unshift({ le: maintenant(), auteur: auteur(), fichier: nomFichier, activite: activite.titre, ...resultat });
    noter('Import de liste', `${nomFichier} → ${activite.titre} · ${ajoutees} ajoutée(s), ${doublons} doublon(s) à vérifier, ${resultat.rejetees} rejetée(s)`, 'inscriptions');
    enregistrerEtat();

    return resultat;
}

export async function listerImports() {
    return structuredClone(etat.imports);
}

/* ------------------------------------------------------------------------------------------------
 * Notifications liées aux activités (module 10), déduites des données : inscriptions en attente,
 * capacité atteinte, doublons, scans à examiner et rappels avant la fermeture des inscriptions.
 * ---------------------------------------------------------------------------------------------- */

export function evenementsActivitesAdmin(rappels) {
    const evenements = [];

    for (const activite of etat.activites.filter((candidate) => !candidate.archivee)) {
        const nombres = compter(activite.id);
        const statut = decrireActivite(activite).statut;
        const lien = { name: 'admin-inscriptions', query: { activite: activite.id } };
        const derniere = (filtre) => etat.inscriptions.filter((inscription) => inscription.activiteId === activite.id && filtre(inscription)).map((inscription) => inscription.recueLe ?? '').sort().at(-1) || maintenant();

        if (nombres.enAttente > 0) {
            evenements.push({
                id: `attente-${activite.id}-${nombres.enAttente}`,
                le: derniere((inscription) => inscription.statut === 'en_attente'),
                categorie: 'inscriptions',
                urgente: statut === 'complet',
                titre: `${nombres.enAttente} inscription${nombres.enAttente > 1 ? 's' : ''} en attente`,
                texte: statut === 'complet' ? `Capacité atteinte : décidez de fermer ou de continuer · ${activite.titre}` : activite.titre,
                lien,
            });
        }

        if (nombres.doublons > 0) {
            evenements.push({ id: `doublons-${activite.id}-${nombres.doublons}`, le: derniere((inscription) => inscription.doublonPossible), categorie: 'inscriptions', urgente: false, titre: `${nombres.doublons} doublon${nombres.doublons > 1 ? 's' : ''} possible${nombres.doublons > 1 ? 's' : ''} à examiner`, texte: activite.titre, lien });
        }

        if (nombres.aExaminer > 0) {
            evenements.push({ id: `scans-${activite.id}-${nombres.aExaminer}`, le: maintenant(), categorie: 'pointage', urgente: false, titre: `${nombres.aExaminer} scan${nombres.aExaminer > 1 ? 's' : ''} hors connexion à examiner`, texte: activite.titre, lien: { name: 'admin-pointage', query: { activite: activite.id } } });
        }

        if (activite.inscriptionsOuvertes && activite.fermeturePrevue) {
            const jours = Math.round((Date.parse(`${activite.fermeturePrevue}T00:00:00Z`) - Date.parse(`${aujourdhui()}T00:00:00Z`)) / UN_JOUR_MS);
            const atteints = rappels.filter((nombre) => jours >= 0 && jours <= nombre);

            if (atteints.length > 0) {
                const rappel = Math.min(...atteints);
                evenements.push({ id: `fermeture-${activite.id}-J${rappel}`, le: new Date(Date.parse(`${activite.fermeturePrevue}T08:00:00Z`) - rappel * UN_JOUR_MS).toISOString(), categorie: 'rappels', urgente: rappel === 1, titre: `Rappel J-${rappel} : fermeture des inscriptions`, texte: `Fermeture prévue le ${activite.fermeturePrevue} · ${activite.titre}`, lien: { name: 'admin-activites' } });
            }
        }
    }

    return evenements;
}
