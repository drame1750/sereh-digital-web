import { dansJours } from '../donnees-exemple.js';
import { persisterEtat as persisterCourriers } from './courriers.js';
import { noterOperation, persisterEtat as persisterDonnees } from './donnees.js';
import { enregistrerMaintenance, maintenance } from './maintenance.js';
import { persisterParametres } from './parametres.js';
import { persisterEtat as persisterRapports } from './rapports.js';
import { enregistrerRegistre, registre, session } from './session.js';

/**
 * Sauvegardes, restauration, maintenance, état du système et journal technique (cahier des charges,
 * section 11).
 *
 * La sauvegarde est un vrai fichier chiffré (AES-GCM 256 bits, clé tirée de la phrase secrète par
 * PBKDF2), fabriqué dans le navigateur : sans la phrase secrète, personne ne peut le lire, pas même
 * l'administrateur. VERSION DE DÉMONSTRATION : elle contient les données fictives de cet onglet, et
 * la restauration remplace la démonstration, qui tient lieu de projet de test. Avec Supabase, la
 * sauvegarde exportera la base du projet, et toute restauration sera d'abord essayée sur le projet
 * de test.
 */
const PREFIXE = 'sereh.demonstration';
const CLE_REGISTRE = 'sereh.demonstration.sauvegardes';
const CLE_TECHNIQUE = 'sereh.demonstration.technique';
const SIGNATURE = 'SEREH1';
const ITERATIONS = 310000;
const SAUVEGARDES_GARDEES = 8;
const ALERTE_JOURS = 7;
const UN_JOUR_MS = 24 * 60 * 60 * 1000;
const TRENTE_JOURS_MS = 30 * UN_JOUR_MS;

const attendre = () => new Promise((resoudre) => setTimeout(resoudre, 300));
const maintenant = () => new Date().toISOString();
const auteur = () => session.utilisateur?.nom ?? 'Administrateur';

function lireRegistre() {
    try {
        const enregistre = JSON.parse(window.sessionStorage.getItem(CLE_REGISTRE) ?? 'null');

        if (Array.isArray(enregistre?.sauvegardes)) {
            return enregistre;
        }
    } catch {
        // Stockage indisponible : registre d'exemple.
    }

    return {
        sauvegardes: [{ id: 'exemple', le: `${dansJours(-9)}T18:30:00.000Z`, par: 'Administrateur de démonstration', fichier: `sereh-sauvegarde-${dansJours(-9)}.sereh`, taille: 48213, empreinte: 'exemple', copieExterne: true, exemple: true }],
        restaurations: [],
    };
}

const registreSauvegardes = lireRegistre();

function enregistrerRegistreSauvegardes() {
    try {
        window.sessionStorage.setItem(CLE_REGISTRE, JSON.stringify(registreSauvegardes));
    } catch {
        // Stockage indisponible : le registre vaut pour cette page seulement.
    }
}

async function cleDepuisPhrase(phrase, sel) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(phrase), 'PBKDF2', false, ['deriveKey']);

    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sel, iterations: ITERATIONS, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function empreinte(octets) {
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', octets)), (octet) => octet.toString(16).padStart(2, '0')).join('');
}

/** Données de la démonstration à sauvegarder : tout ce qui commence par « sereh.demonstration ». */
function contenuASauvegarder() {
    const donnees = {};

    for (let index = 0; index < window.sessionStorage.length; index++) {
        const cle = window.sessionStorage.key(index);

        if (cle.startsWith(PREFIXE) && cle !== CLE_REGISTRE && cle !== CLE_TECHNIQUE) {
            donnees[cle] = window.sessionStorage.getItem(cle);
        }
    }

    return donnees;
}

function resumer(donnees) {
    const lire = (cle) => {
        try {
            return JSON.parse(donnees[cle] ?? 'null');
        } catch {
            return null;
        }
    };
    const principal = lire(PREFIXE);
    const courriers = lire(`${PREFIXE}.courriers`);
    const comptes = lire(`${PREFIXE}.comptes`);

    return {
        activites: principal?.activites?.length ?? 0,
        inscriptions: principal?.inscriptions?.length ?? 0,
        pointages: principal?.pointages?.length ?? 0,
        courriers: courriers?.courriers?.length ?? 0,
        comptes: comptes?.comptes?.length ?? 0,
        fichiers: Object.keys(donnees).filter((cle) => cle.startsWith(`${PREFIXE}.fichier.`)).length,
    };
}

/**
 * Fabrique une sauvegarde chiffrée. La phrase secrète n'est gardée nulle part : sans elle, le fichier
 * est illisible. Seules les 8 dernières sauvegardes restent au registre.
 *
 * @returns {Promise<{ blob: Blob, nom: string }>}
 */
export async function creerSauvegarde(phrase, confirmation) {
    if (phrase.length < 12) {
        throw new Error('La phrase secrète doit compter au moins 12 caractères.');
    }

    if (phrase !== confirmation) {
        throw new Error('Les deux phrases secrètes ne correspondent pas.');
    }

    // Chaque ensemble de données est écrit d'abord, même celui qui n'a jamais été modifié.
    [persisterDonnees, persisterCourriers, persisterParametres, persisterRapports, enregistrerRegistre, enregistrerMaintenance].forEach((persister) => persister());
    const donnees = contenuASauvegarder();
    const contenu = new TextEncoder().encode(JSON.stringify({ format: 'sereh-sauvegarde', version: 1, application: 'SEREH Digital (démonstration)', creeLe: maintenant(), creePar: auteur(), donnees }));
    const sel = crypto.getRandomValues(new Uint8Array(16));
    const vecteur = crypto.getRandomValues(new Uint8Array(12));
    const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: vecteur }, await cleDepuisPhrase(phrase, sel), contenu));
    const fichier = new Uint8Array(SIGNATURE.length + sel.length + vecteur.length + chiffre.length);
    fichier.set(new TextEncoder().encode(SIGNATURE), 0);
    fichier.set(sel, SIGNATURE.length);
    fichier.set(vecteur, SIGNATURE.length + sel.length);
    fichier.set(chiffre, SIGNATURE.length + sel.length + vecteur.length);

    const nom = `sereh-sauvegarde-${maintenant().slice(0, 16).replace('T', '-').replace(':', 'h')}.sereh`;
    registreSauvegardes.sauvegardes.unshift({ id: crypto.randomUUID(), le: maintenant(), par: auteur(), fichier: nom, taille: fichier.length, empreinte: await empreinte(fichier), copieExterne: false, resume: resumer(donnees) });
    const retirees = registreSauvegardes.sauvegardes.splice(SAUVEGARDES_GARDEES);
    enregistrerRegistreSauvegardes();
    noterOperation('Sauvegarde chiffrée créée', `${nom} · ${Object.keys(donnees).length} ensemble(s) de données`, 'sauvegardes');

    return { blob: new Blob([fichier], { type: 'application/octet-stream' }), nom, retirees: retirees.map((ancienne) => ancienne.fichier) };
}

/** Le registre des sauvegardes, la plus récente d'abord, et l'alerte des 7 jours. */
export async function etatSauvegardes() {
    const derniere = registreSauvegardes.sauvegardes[0] ?? null;
    const jours = derniere ? Math.floor((Date.now() - Date.parse(derniere.le)) / UN_JOUR_MS) : null;

    return {
        sauvegardes: structuredClone(registreSauvegardes.sauvegardes),
        restaurations: structuredClone(registreSauvegardes.restaurations),
        derniere: derniere ? structuredClone(derniere) : null,
        joursDepuis: jours,
        alerte: jours === null || jours >= ALERTE_JOURS,
        gardees: SAUVEGARDES_GARDEES,
    };
}

/** La copie sur un support externe (clé USB, disque) a été faite pour cette sauvegarde. */
export async function noterCopieExterne(id) {
    await attendre();
    const sauvegarde = registreSauvegardes.sauvegardes.find((candidate) => candidate.id === id);
    sauvegarde.copieExterne = true;
    enregistrerRegistreSauvegardes();
    noterOperation('Copie externe d’une sauvegarde notée', sauvegarde.fichier, 'sauvegardes');
}

/**
 * Ouvre une sauvegarde avec sa phrase secrète et en décrit le contenu, sans rien changer.
 *
 * @returns {Promise<{ creeLe: string, creePar: string, resume: object, donnees: Record<string, string> }>}
 */
export async function lireSauvegarde(fichier, phrase) {
    const octets = new Uint8Array(await fichier.arrayBuffer());

    if (new TextDecoder().decode(octets.slice(0, SIGNATURE.length)) !== SIGNATURE) {
        throw new Error('Ce fichier n’est pas une sauvegarde de SEREH Digital.');
    }

    const debut = SIGNATURE.length;
    const sel = octets.slice(debut, debut + 16);
    const vecteur = octets.slice(debut + 16, debut + 28);
    let contenu;

    try {
        const clair = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: vecteur }, await cleDepuisPhrase(phrase, sel), octets.slice(debut + 28));
        contenu = JSON.parse(new TextDecoder().decode(clair));
    } catch {
        throw new Error('Phrase secrète incorrecte, ou fichier abîmé : la sauvegarde ne s’ouvre pas.');
    }

    if (contenu.format !== 'sereh-sauvegarde') {
        throw new Error('Format de sauvegarde inconnu.');
    }

    return { creeLe: contenu.creeLe, creePar: contenu.creePar, resume: resumer(contenu.donnees), donnees: contenu.donnees, empreinte: await empreinte(octets) };
}

/**
 * Restaure une sauvegarde ouverte sur le projet de test (en démonstration : cet onglet). Toutes les
 * données de la démonstration sont remplacées, puis la page se recharge. L'opération est notée au
 * journal de la sauvegarde restaurée et au registre des restaurations.
 */
export async function restaurerSauvegarde(sauvegarde, nomFichier) {
    await attendre();
    const entree = { le: maintenant(), auteur: auteur(), action: 'Sauvegarde restaurée (projet de test)', cible: `${nomFichier} · faite le ${sauvegarde.creeLe.slice(0, 10)}`, categorie: 'sauvegardes', resultat: 'reussi' };
    const donnees = { ...sauvegarde.donnees };

    try {
        const principal = JSON.parse(donnees[PREFIXE] ?? 'null');

        if (principal?.journal) {
            principal.journal.unshift(entree);
            donnees[PREFIXE] = JSON.stringify(principal);
        }
    } catch {
        // Journal illisible : la restauration reste notée au registre.
    }

    for (const cle of Object.keys(contenuASauvegarder())) {
        window.sessionStorage.removeItem(cle);
    }

    for (const [cle, valeur] of Object.entries(donnees)) {
        window.sessionStorage.setItem(cle, valeur);
    }

    registreSauvegardes.restaurations.unshift({ le: entree.le, par: entree.auteur, fichier: nomFichier, environnement: 'Projet de test (démonstration)', resultat: 'Réussie' });
    enregistrerRegistreSauvegardes();
}

/* ------------------------------------------------------------------------------------------------
 * Maintenance : seul l'administrateur principal l'active, après une nouvelle saisie de son mot de
 * passe (vérifiée par l'écran).
 * ---------------------------------------------------------------------------------------------- */

export async function changerMaintenance(active, message = '') {
    await attendre();

    if (session.utilisateur?.role !== 'admin') {
        throw new Error('Seul l’administrateur principal peut changer le mode maintenance.');
    }

    // Noté avant l'activation : pendant la maintenance, le journal reste lisible mais rien ne s'écrit ailleurs.
    noterOperation(active ? 'Mode maintenance activé' : 'Mode maintenance désactivé', message.trim() || 'sans message', 'securite');
    Object.assign(maintenance, { active, depuis: active ? maintenant() : null, par: active ? auteur() : null, message: active ? message.trim() : '' });
    enregistrerMaintenance();
}

/* ------------------------------------------------------------------------------------------------
 * Incidents de sécurité (section 9) : signalement, mesures prises et clôture, sous la coordination
 * de l'administrateur principal.
 * ---------------------------------------------------------------------------------------------- */

const CLE_INCIDENTS = 'sereh.demonstration.incidents';

function lireIncidents() {
    try {
        return JSON.parse(window.sessionStorage.getItem(CLE_INCIDENTS) ?? '[]');
    } catch {
        return [];
    }
}

function enregistrerIncidents(incidents) {
    try {
        window.sessionStorage.setItem(CLE_INCIDENTS, JSON.stringify(incidents));
    } catch {
        // Stockage indisponible : le signalement vaut pour cette page seulement.
    }
}

export const TYPES_INCIDENT = {
    appareil: 'Téléphone perdu ou volé',
    compte: 'Compte utilisé par quelqu’un d’autre',
    donnees: 'Données personnelles exposées',
    site: 'Site inaccessible ou anormal',
    autre: 'Autre',
};

export async function listerIncidents() {
    return lireIncidents();
}

export async function signalerIncident({ type, gravite, description }) {
    await attendre();

    if (!TYPES_INCIDENT[type]) {
        throw new Error('Choisissez le type d’incident.');
    }

    if (description.trim().length < 10) {
        throw new Error('Décrivez ce qui s’est passé (au moins 10 caractères).');
    }

    const incident = { id: crypto.randomUUID(), le: maintenant(), par: auteur(), type, gravite: gravite === 'grave' ? 'grave' : 'normale', description: description.trim(), mesures: [], closLe: null };
    enregistrerIncidents([incident, ...lireIncidents()]);
    noterOperation('Incident signalé', `${TYPES_INCIDENT[type]} · ${incident.gravite}`, 'securite');

    return incident.id;
}

export async function ajouterMesure(id, texte, clore = false) {
    await attendre();

    if (texte.trim().length < 5) {
        throw new Error('Décrivez la mesure prise (au moins 5 caractères).');
    }

    const incidents = lireIncidents();
    const incident = incidents.find((candidat) => candidat.id === id);
    incident.mesures.push({ le: maintenant(), par: auteur(), texte: texte.trim() });

    if (clore) {
        incident.closLe = maintenant();
    }

    enregistrerIncidents(incidents);
    noterOperation(clore ? 'Incident clos' : 'Mesure ajoutée à un incident', `${TYPES_INCIDENT[incident.type]} · ${texte.trim()}`, 'securite');
}

/* ------------------------------------------------------------------------------------------------
 * Journal technique : les erreurs de l'interface, gardées 30 jours, sans donnée personnelle.
 * ---------------------------------------------------------------------------------------------- */

function lireTechnique() {
    try {
        return JSON.parse(window.sessionStorage.getItem(CLE_TECHNIQUE) ?? '[]');
    } catch {
        return [];
    }
}

export function noterErreurTechnique(erreur, source = 'interface') {
    try {
        const limite = new Date(Date.now() - TRENTE_JOURS_MS).toISOString();
        const message = String(erreur?.message ?? erreur ?? 'Erreur inconnue').slice(0, 300);
        const journal = [{ le: maintenant(), source, message, page: location.hash.split('?')[0] }, ...lireTechnique()].filter((entree) => entree.le >= limite).slice(0, 200);
        window.sessionStorage.setItem(CLE_TECHNIQUE, JSON.stringify(journal));
    } catch {
        // Le journal technique ne doit jamais faire échouer l'application.
    }
}

/** Branche le journal technique sur les erreurs de l'application et du navigateur. */
export function installerSurveillance(application) {
    application.config.errorHandler = (erreur) => {
        noterErreurTechnique(erreur, 'écran');
        console.error(erreur);
    };
    window.addEventListener('error', (evenement) => noterErreurTechnique(evenement.error ?? evenement.message, 'navigateur'));
    window.addEventListener('unhandledrejection', (evenement) => noterErreurTechnique(evenement.reason, 'opération'));
}

export async function lireJournalTechnique() {
    return lireTechnique();
}

/* ------------------------------------------------------------------------------------------------
 * État du système : ce que l'interface peut vérifier elle-même, et ce qui attend Supabase.
 * ---------------------------------------------------------------------------------------------- */

/* global __VERSION_APPLICATION__, __DATE_CONSTRUCTION__ */
export const VERSION = typeof __VERSION_APPLICATION__ === 'string' ? __VERSION_APPLICATION__ : 'développement';
export const CONSTRUIT_LE = typeof __DATE_CONSTRUCTION__ === 'string' ? __DATE_CONSTRUCTION__ : null;

export async function etatDuSysteme() {
    await attendre();
    const sauvegardes = await etatSauvegardes();
    const erreurs = lireTechnique();
    const travailleur = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration().catch(() => null) : null;
    const echecsRecents = registre.evenements.filter((evenement) => Date.now() - Date.parse(evenement.le) < UN_JOUR_MS && /refus|incorrect|bloqué/i.test(evenement.type)).length;
    const administrateurs = registre.comptes.filter((compte) => compte.role === 'admin' && compte.actif);

    return [
        { cle: 'interface', titre: 'Interface (GitHub Pages)', etat: 'ok', texte: `Version ${VERSION}${CONSTRUIT_LE ? `, construite le ${new Date(CONSTRUIT_LE).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}.` },
        { cle: 'base', titre: 'Base de données (Supabase)', etat: 'attention', texte: 'Pas encore reliée : l’application fonctionne en démonstration, avec des données fictives gardées dans cet onglet.' },
        { cle: 'sauvegardes', titre: 'Sauvegardes', etat: sauvegardes.alerte ? 'danger' : 'ok', texte: sauvegardes.derniere ? `Dernière sauvegarde il y a ${sauvegardes.joursDepuis} jour${sauvegardes.joursDepuis > 1 ? 's' : ''}${sauvegardes.alerte ? ' : plus de 7 jours, à refaire.' : '.'}` : 'Aucune sauvegarde.' },
        { cle: 'integrations', titre: 'Intégrations', etat: 'info', texte: 'Notifications internes actives. E-mail, SMS et WhatsApp : non configurés, aucun service payant activé.' },
        { cle: 'securite', titre: 'Sécurité', etat: echecsRecents >= 5 ? 'attention' : 'ok', texte: `${administrateurs.length} administrateur${administrateurs.length > 1 ? 's' : ''} actif${administrateurs.length > 1 ? 's' : ''}, double authentification obligatoire. ${echecsRecents} tentative${echecsRecents > 1 ? 's' : ''} refusée${echecsRecents > 1 ? 's' : ''} en 24 heures.` },
        { cle: 'maintenance', titre: 'Maintenance', etat: maintenance.active ? 'attention' : 'ok', texte: maintenance.active ? `Active depuis le ${new Date(maintenance.depuis).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })} : les modifications sont bloquées.` : 'Désactivée : le site fonctionne normalement.' },
        { cle: 'appareil', titre: 'Cet appareil', etat: navigator.onLine ? 'ok' : 'attention', texte: `${navigator.onLine ? 'En ligne' : 'Hors connexion'}. ${travailleur ? 'Application installable prête (fichiers du site gardés sur l’appareil).' : 'Fichiers du site pas encore gardés sur l’appareil.'}` },
        { cle: 'technique', titre: 'Journal technique', etat: erreurs.length > 0 ? 'attention' : 'ok', texte: erreurs.length > 0 ? `${erreurs.length} erreur${erreurs.length > 1 ? 's' : ''} notée${erreurs.length > 1 ? 's' : ''} sur 30 jours.` : 'Aucune erreur notée sur 30 jours.' },
    ];
}

/** Efface toutes les données de démonstration de cet onglet, puis recharge la page. */
export function reinitialiserToutLaDemonstration() {
    for (const cle of Object.keys(window.sessionStorage)) {
        if (cle.startsWith(PREFIXE) || cle === 'sereh.session.demonstration') {
            window.sessionStorage.removeItem(cle);
        }
    }

    location.reload();
}
