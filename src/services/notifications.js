import { reactive } from 'vue';
import { aujourdhui } from '../donnees-exemple.js';
import { evenementsCourriersAdmin, evenementsCourriersMembre } from './courriers.js';
import { evenementsActivitesAdmin } from './donnees.js';
import { parametres } from './parametres.js';
import { evenementsRapports } from './rapports.js';
import { registre, session } from './session.js';
import { etatSauvegardes, listerIncidents, TYPES_INCIDENT } from './systeme.js';

/**
 * Centre de notifications interne (cahier des charges, section 7, et module 10) : courriers,
 * confirmations, rappels J-7, J-3 et J-1, pointage, rapports, inscriptions, comptes et sauvegardes.
 * Les notifications sont déduites des données à chaque lecture : elles disparaissent d'elles-mêmes
 * quand la situation est réglée. Seul l'état « lu » est enregistré, pour chaque compte.
 *
 * Canal : dans la plateforme seulement (décision validée). L'e-mail, les SMS et WhatsApp ne seront
 * ajoutés qu'après accord sur leur coût et des essais réels.
 */
const CLE_STOCKAGE = 'sereh.demonstration.notifications';
const UN_JOUR_MS = 24 * 60 * 60 * 1000;

export const CATEGORIES = {
    courriers: 'Courriers',
    confirmations: 'Confirmations',
    rappels: 'Rappels',
    inscriptions: 'Inscriptions',
    pointage: 'Pointage',
    rapports: 'Rapports',
    comptes: 'Comptes',
    sauvegardes: 'Sauvegardes',
    securite: 'Sécurité',
};

function lireLues() {
    try {
        return JSON.parse(window.sessionStorage.getItem(CLE_STOCKAGE) ?? '{}');
    } catch {
        return {};
    }
}

const lues = lireLues();

function enregistrerLues() {
    try {
        window.sessionStorage.setItem(CLE_STOCKAGE, JSON.stringify(lues));
    } catch {
        // Stockage indisponible : l'état « lu » vaut pour cette page seulement.
    }
}

/** Nombre de notifications non lues de la personne connectée, pour la cloche des en-têtes. */
export const compteur = reactive({ nonLues: 0, urgentes: 0 });

const joursAvant = (iso) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${aujourdhui()}T00:00:00Z`)) / UN_JOUR_MS);

function rappelsActifs() {
    return [7, 3, 1].filter((nombre) => parametres.rappels[`j${nombre}`]);
}

function evenementsComptes() {
    const evenements = [];

    for (const compte of registre.comptes.filter((candidat) => candidat.actif)) {
        if (compte.role === 'remplacant' && compte.validite) {
            const jours = joursAvant(compte.validite.au);

            if (jours >= 0 && jours <= 3) {
                evenements.push({ id: `remplacement-${compte.id}-${compte.validite.au}`, le: `${aujourdhui()}T07:00:00.000Z`, categorie: 'comptes', urgente: false, titre: 'Fin de remplacement proche', texte: `${compte.nom} : l’accès se ferme seul après le ${compte.validite.au}`, lien: { name: 'admin-comptes' } });
            }
        }

        if (compte.desactivationPrevueLe) {
            const jours = joursAvant(compte.desactivationPrevueLe);

            if (jours >= 0 && jours <= 7) {
                evenements.push({ id: `desactivation-${compte.id}-${compte.desactivationPrevueLe}`, le: `${aujourdhui()}T07:00:00.000Z`, categorie: 'comptes', urgente: false, titre: 'Désactivation programmée', texte: `${compte.nom} : le ${compte.desactivationPrevueLe}`, lien: { name: 'admin-comptes' } });
            }
        }
    }

    return evenements;
}

async function evenementsSauvegardes() {
    const etat = await etatSauvegardes();

    if (!etat.alerte) {
        return [];
    }

    return [{ id: `sauvegarde-${etat.derniere?.id ?? 'aucune'}`, le: new Date(Date.parse(etat.derniere?.le ?? new Date().toISOString()) + 7 * UN_JOUR_MS).toISOString(), categorie: 'sauvegardes', urgente: true, titre: 'Sauvegarde à faire', texte: etat.derniere ? `La dernière sauvegarde date de ${etat.joursDepuis} jours.` : 'Aucune sauvegarde n’a encore été faite.', lien: { name: 'admin-sauvegardes' } }];
}

async function evenementsIncidents() {
    return (await listerIncidents())
        .filter((incident) => !incident.closLe)
        .map((incident) => ({ id: `incident-${incident.id}-${incident.mesures.length}`, le: incident.le, categorie: 'securite', urgente: incident.gravite === 'grave', titre: 'Incident de sécurité ouvert', texte: `${TYPES_INCIDENT[incident.type]} · ${incident.description}`, lien: { name: 'admin-securite' } }));
}

/** Toutes les notifications qui concernent un compte, avant l'état « lu ». */
async function evenementsDuCompte(compte) {
    if (!compte) {
        return [];
    }

    if (compte.role === 'admin') {
        return [
            ...evenementsCourriersAdmin(rappelsActifs()),
            ...evenementsActivitesAdmin(rappelsActifs()),
            ...evenementsComptes(),
            ...evenementsRapports(),
            ...await evenementsSauvegardes(),
            ...await evenementsIncidents(),
        ];
    }

    if (['sr', 'remplacant'].includes(compte.role) && compte.membreId) {
        const evenements = evenementsCourriersMembre(compte.membreId, rappelsActifs());

        if (compte.role === 'remplacant' && compte.validite) {
            evenements.push({ id: `mon-remplacement-${compte.validite.au}`, le: `${compte.validite.du}T07:00:00.000Z`, categorie: 'comptes', urgente: false, titre: 'Remplacement temporaire', texte: `Votre accès est ouvert jusqu’au ${compte.validite.au} inclus.`, lien: { name: 'espace-secretaire' } });
        }

        return evenements;
    }

    return [];
}

/** Mes notifications, la plus récente d'abord, chacune marquée lue ou non lue. */
export async function mesNotifications() {
    const compte = registre.comptes.find((candidat) => candidat.id === session.utilisateur?.id);
    const dejaLues = new Set(lues[compte?.id] ?? []);
    const liste = (await evenementsDuCompte(compte))
        .map((evenement) => ({ ...evenement, lue: dejaLues.has(evenement.id), canal: 'Dans la plateforme' }))
        .sort((a, b) => Number(b.urgente && !b.lue) - Number(a.urgente && !a.lue) || b.le.localeCompare(a.le));

    compteur.nonLues = liste.filter((notification) => !notification.lue).length;
    compteur.urgentes = liste.filter((notification) => !notification.lue && notification.urgente).length;

    return liste;
}

/** Met à jour la cloche, sans rien afficher d'autre. */
export async function actualiserCompteur() {
    if (session.utilisateur) {
        await mesNotifications();
    } else {
        Object.assign(compteur, { nonLues: 0, urgentes: 0 });
    }
}

export async function marquerLues(identifiants) {
    const compteId = session.utilisateur?.id;

    if (!compteId) {
        return;
    }

    lues[compteId] = [...new Set([...(lues[compteId] ?? []), ...identifiants])].slice(-500);
    enregistrerLues();
    await actualiserCompteur();
}

/**
 * Suivi des rappels envoyés aux membres du bureau : destinataire, canal, date et statut (affiché ou
 * lu). Le statut « lu » vient de l'espace du membre lui-même.
 */
export async function suiviDesRappels() {
    const lignes = [];

    for (const compte of registre.comptes.filter((candidat) => ['sr', 'remplacant'].includes(candidat.role) && candidat.membreId)) {
        const dejaLues = new Set(lues[compte.id] ?? []);

        for (const evenement of evenementsCourriersMembre(compte.membreId, rappelsActifs()).filter((candidat) => candidat.categorie === 'rappels')) {
            lignes.push({ id: `${compte.id}-${evenement.id}`, destinataire: compte.nom, canal: 'Dans la plateforme', le: evenement.le, titre: evenement.titre, texte: evenement.texte, statut: dejaLues.has(evenement.id) ? 'Lu' : 'Affiché, non lu', urgente: evenement.urgente });
        }
    }

    return lignes.sort((a, b) => b.le.localeCompare(a.le));
}
