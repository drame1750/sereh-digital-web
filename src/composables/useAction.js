import { ref } from 'vue';

/**
 * Déroulé commun d'une action d'un écran d'administration : l'erreur s'affiche à côté du bouton
 * concerné (« cle »), la réussite dans le message flottant du bas de l'écran.
 *
 * @param {() => Promise<unknown>} [recharger] à appeler après chaque réussite
 */
export function useAction(recharger = async () => {}) {
    const enCours = ref('');
    const confirmation = ref('');
    const erreur = ref({ cle: '', texte: '', erreurs: {} });

    /** @returns {Promise<unknown | false>} le résultat de l'action, ou false en cas d'échec */
    async function agir(cle, action, texte) {
        enCours.value = cle;
        confirmation.value = '';
        erreur.value = { cle: '', texte: '', erreurs: {} };

        try {
            const resultat = await action();
            confirmation.value = typeof texte === 'function' ? texte(resultat) : texte;
            await recharger();

            return resultat ?? true;
        } catch (probleme) {
            erreur.value = { cle, texte: probleme.message, erreurs: probleme.erreurs ?? {} };

            return false;
        } finally {
            enCours.value = '';
        }
    }

    const erreurDe = (cle) => (erreur.value.cle === cle ? erreur.value.texte : '');

    return { enCours, confirmation, erreur, agir, erreurDe };
}
