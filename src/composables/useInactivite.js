import { onBeforeUnmount, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { seDeconnecter, session } from '../services/session.js';

/** Déconnexion après 15 minutes sans geste de la personne (cahier des charges, section 10). */
const INACTIVITE_MAXIMALE_MS = 15 * 60 * 1000;
const EVENEMENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'];

/**
 * À utiliser dans les mises en page des espaces privés. L'interface déconnecte la personne ; avec
 * l'offre gratuite de Supabase, c'est la seule protection contre l'inactivité (cahier des charges,
 * section 13, limite 3).
 */
export function useInactivite() {
    const router = useRouter();
    let minuterie = 0;

    const relancer = () => {
        clearTimeout(minuterie);
        minuterie = setTimeout(() => {
            if (session.utilisateur) {
                seDeconnecter('Vous avez été déconnecté après 15 minutes d’inactivité.');
                router.push({ name: 'connexion' });
            }
        }, INACTIVITE_MAXIMALE_MS);
    };

    onMounted(() => {
        for (const evenement of EVENEMENTS) {
            window.addEventListener(evenement, relancer, { passive: true });
        }

        relancer();
    });

    onBeforeUnmount(() => {
        clearTimeout(minuterie);

        for (const evenement of EVENEMENTS) {
            window.removeEventListener(evenement, relancer);
        }
    });
}
