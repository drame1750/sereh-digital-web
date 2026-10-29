import { reactive } from 'vue';
import { parametresCourrierExemple, SECRETARIATS, sousComitesExemple } from '../donnees-exemple.js';
import { noterOperation } from './donnees.js';
import { verifierHorsMaintenance } from './maintenance.js';
import { session } from './session.js';

/**
 * Paramètres de la plateforme (cahier des charges, sections 3, 7 et 10) : identité, coordonnées
 * officielles, courriers, organisation du bureau et rappels. Ils ne sont jamais écrits dans le code :
 * chaque écran les lit ici.
 *
 * VERSION DE DÉMONSTRATION : gardés dans cet onglet. Avec Supabase, seuls les administrateurs
 * pourront les modifier, et l'identité globale restera réservée à l'administrateur principal.
 */
const CLE_STOCKAGE = 'sereh.demonstration.parametres';

/** Durées de conservation validées (définition fonctionnelle, option A). */
export const DUREES_CONSERVATION = [
    { donnee: 'Inscriptions et pointages', duree: '12 mois après l’activité, puis rendus anonymes' },
    { donnee: 'Journal d’audit', duree: '12 mois' },
    { donnee: 'Sauvegardes', duree: 'les 8 dernières' },
    { donnee: 'Journaux techniques', duree: '30 jours' },
];

function parametresInitiaux() {
    return {
        identite: { nom: 'SEREH Digital', slogan: 'SEREH, la marche vers la réforme spirituelle' },
        contacts: { telephone: '', whatsapp: '', email: '', adresse: 'Siège régional : Katiola', horaires: '' },
        courrier: structuredClone(parametresCourrierExemple),
        secretariats: SECRETARIATS.map((sigle) => ({ sigle, nom: '', comptesAutorises: 3 })),
        sousComites: structuredClone(sousComitesExemple),
        rappels: { j7: true, j3: true, j1: true },
        modifieLe: null,
        modifiePar: null,
    };
}

function lire() {
    try {
        const enregistres = JSON.parse(window.sessionStorage.getItem(CLE_STOCKAGE) ?? 'null');

        if (enregistres?.identite && enregistres?.courrier) {
            return { ...parametresInitiaux(), ...enregistres };
        }
    } catch {
        // Stockage indisponible : les paramètres d'exemple s'appliquent.
    }

    return parametresInitiaux();
}

/** Paramètres en cours, partagés par tous les écrans : une modification s'y voit tout de suite. */
export const parametres = reactive(lire());

function enregistrer() {
    try {
        window.sessionStorage.setItem(CLE_STOCKAGE, JSON.stringify(parametres));
    } catch {
        // Stockage indisponible : les changements valent pour cette page seulement.
    }
}

/** Écrit les paramètres dans l'onglet, pour qu'une sauvegarde les contienne même sans modification. */
export function persisterParametres() {
    enregistrer();
}

const nettoyer = (valeur) => String(valeur ?? '').trim();

function verifierPartie(partie, valeurs) {
    const erreurs = {};

    if (partie === 'identite') {
        if (nettoyer(valeurs.nom).length < 3) {
            erreurs.nom = 'Le nom de la plateforme doit compter au moins 3 caractères.';
        }
    }

    if (partie === 'contacts') {
        if (valeurs.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nettoyer(valeurs.email))) {
            erreurs.email = 'Adresse e-mail invalide.';
        }
    }

    if (partie === 'courrier') {
        for (const champ of ['lieu', 'organeEmetteur', 'pour', 'titreSignataire', 'nomSignataire', 'prefixeReference']) {
            if (!nettoyer(valeurs[champ])) {
                erreurs[champ] = 'Ce champ est obligatoire.';
            }
        }
    }

    if (partie === 'secretariats') {
        valeurs.forEach((secretariat, index) => {
            const nombre = Number(secretariat.comptesAutorises);

            if (!Number.isInteger(nombre) || nombre < 0 || nombre > 20) {
                erreurs[`comptes-${index}`] = 'Entre 0 et 20 comptes.';
            }
        });
    }

    if (partie === 'sousComites') {
        valeurs.forEach((sousComite, index) => {
            if (nettoyer(sousComite.nom).length < 2) {
                erreurs[`nom-${index}`] = 'Indiquez le nom du Sous-Comité.';
            }
        });
    }

    return erreurs;
}

const LIBELLES_PARTIES = {
    identite: 'Identité de la plateforme',
    contacts: 'Coordonnées officielles',
    courrier: 'Paramètres des courriers',
    secretariats: 'Secrétariats',
    sousComites: 'Sous-Comités et Sections',
    rappels: 'Rappels',
};

/**
 * Enregistre une partie des paramètres. L'identité globale (nom, slogan) est réservée à
 * l'administrateur principal.
 *
 * @throws {Error & { erreurs?: Record<string, string> }}
 */
export async function enregistrerParametres(partie, valeurs) {
    await new Promise((resoudre) => setTimeout(resoudre, 280));
    verifierHorsMaintenance();

    if (partie === 'identite' && session.utilisateur?.role !== 'admin') {
        throw new Error('Seul l’administrateur principal peut modifier l’identité de la plateforme.');
    }

    const erreurs = verifierPartie(partie, valeurs);

    if (Object.keys(erreurs).length > 0) {
        throw Object.assign(new Error('Quelques informations sont à corriger.'), { erreurs });
    }

    if (partie === 'sousComites') {
        parametres.sousComites = valeurs.map((sousComite) => ({
            nom: nettoyer(sousComite.nom),
            sections: (Array.isArray(sousComite.sections) ? sousComite.sections : String(sousComite.sections).split('\n')).map(nettoyer).filter(Boolean),
        }));
    } else if (partie === 'secretariats') {
        parametres.secretariats = valeurs.map((secretariat) => ({ sigle: nettoyer(secretariat.sigle), nom: nettoyer(secretariat.nom), comptesAutorises: Number(secretariat.comptesAutorises) }));
    } else if (partie === 'rappels') {
        Object.assign(parametres.rappels, { j7: Boolean(valeurs.j7), j3: Boolean(valeurs.j3), j1: Boolean(valeurs.j1) });
    } else {
        Object.assign(parametres[partie], Object.fromEntries(Object.entries(valeurs).map(([cle, valeur]) => [cle, nettoyer(valeur)])));
    }

    parametres.modifieLe = new Date().toISOString();
    parametres.modifiePar = session.utilisateur?.nom ?? 'Administrateur';
    noterOperation('Paramètres modifiés', LIBELLES_PARTIES[partie], 'parametres');
    enregistrer();
}

