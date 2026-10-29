import { rechercherComptes } from './comptes.js';
import { rechercherDansLesCourriers } from './courriers.js';
import { listerActivitesAdmin, listerParticipants } from './donnees.js';

/**
 * Recherche globale de l'administration (cahier des charges, section 8) : activités, participants,
 * courriers, membres du bureau et comptes. Les résultats ne montrent que ce que la personne a le
 * droit de voir, avec un lien direct vers chaque fiche ; le serveur appliquera la même règle.
 */
export async function rechercherPartout(texte) {
    const recherche = texte.trim().toLocaleLowerCase('fr');

    if (recherche.length < 2) {
        return null;
    }

    const [activites, participants, { courriers, membres }, comptes] = await Promise.all([
        listerActivitesAdmin({ archivees: 'toutes' }),
        listerParticipants({ texte }),
        rechercherDansLesCourriers(texte),
        rechercherComptes(texte),
    ]);

    return {
        activites: activites.filter((activite) => `${activite.titre} ${activite.edition} ${activite.lieu}`.toLocaleLowerCase('fr').includes(recherche)),
        participants: participants.slice(0, 30),
        participantsEnPlus: Math.max(0, participants.length - 30),
        courriers,
        membres,
        comptes,
    };
}
