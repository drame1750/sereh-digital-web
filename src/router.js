import { createRouter, createWebHashHistory } from 'vue-router';
import { aAcces, session } from './services/session.js';

/**
 * Adresses de la forme …/#/composants : GitHub Pages ne sert que des fichiers fixes, le signe « # »
 * permet à l'application de gérer elle-même ses pages (cahier des charges, section 9).
 *
 * « acces » réserve une page à un espace privé. Dans l'interface, cela décide seulement de ce qui
 * s'affiche : c'est le serveur qui refusera toute lecture ou action non autorisée.
 */
export const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/',
            name: 'accueil',
            component: () => import('./pages/Accueil.vue'),
            meta: { miseEnPage: 'publique', enTeteSurBandeau: true, titre: 'Accueil' },
        },
        {
            path: '/composants',
            name: 'composants',
            component: () => import('./pages/Composants.vue'),
            meta: { miseEnPage: 'publique', titre: 'Composants' },
        },
        {
            path: '/activites/:id',
            name: 'activite',
            component: () => import('./pages/Activite.vue'),
            meta: { miseEnPage: 'publique', titre: 'Activité' },
        },
        {
            path: '/activites/:id/inscription',
            name: 'inscription',
            component: () => import('./pages/inscription/Formulaire.vue'),
            meta: { miseEnPage: 'publique', titre: 'Inscription' },
        },
        {
            path: '/inscription/:jeton',
            name: 'page-personnelle',
            component: () => import('./pages/inscription/PagePersonnelle.vue'),
            meta: { miseEnPage: 'publique', titre: 'Mon inscription' },
        },
        {
            path: '/confidentialite',
            name: 'confidentialite',
            component: () => import('./pages/Confidentialite.vue'),
            meta: { miseEnPage: 'publique', titre: 'Politique de confidentialité' },
        },
        {
            path: '/connexion',
            name: 'connexion',
            component: () => import('./pages/Connexion.vue'),
            meta: { miseEnPage: 'publique', titre: 'Connexion' },
        },
        {
            path: '/espace-secretaire',
            name: 'espace-secretaire',
            component: () => import('./pages/EspaceSecretaireAVenir.vue'),
            meta: { miseEnPage: 'publique', titre: 'Espace secrétaire régional', acces: 'sr' },
        },
        {
            path: '/pointage',
            name: 'pointage',
            component: () => import('./pages/pointage/Pointage.vue'),
            meta: { miseEnPage: 'pointage', titre: 'Pointage', acces: 'pointage' },
        },
        {
            path: '/admin',
            name: 'tableau-de-bord',
            component: () => import('./pages/admin/TableauDeBord.vue'),
            meta: { miseEnPage: 'admin', titre: 'Tableau de bord', acces: 'admin' },
        },
        {
            path: '/admin/activites',
            name: 'admin-activites',
            component: () => import('./pages/admin/Activites.vue'),
            meta: { miseEnPage: 'admin', titre: 'Activités', acces: 'admin' },
        },
        {
            path: '/admin/activites/nouvelle',
            name: 'admin-activite-nouvelle',
            component: () => import('./pages/admin/FormulaireActivite.vue'),
            meta: { miseEnPage: 'admin', titre: 'Nouvelle activité', acces: 'admin' },
        },
        {
            path: '/admin/activites/:id/modifier',
            name: 'admin-activite-modifier',
            component: () => import('./pages/admin/FormulaireActivite.vue'),
            meta: { miseEnPage: 'admin', titre: 'Modifier une activité', acces: 'admin' },
        },
        {
            path: '/admin/inscriptions',
            name: 'admin-inscriptions',
            component: () => import('./pages/admin/Inscriptions.vue'),
            meta: { miseEnPage: 'admin', titre: 'Inscriptions', acces: 'admin' },
        },
        {
            path: '/admin/:cle',
            name: 'rubrique',
            component: () => import('./pages/admin/RubriqueAVenir.vue'),
            meta: { miseEnPage: 'admin', titre: 'Rubrique', acces: 'admin' },
        },
        {
            path: '/:chemin(.*)*',
            name: 'introuvable',
            component: () => import('./pages/Introuvable.vue'),
            meta: { miseEnPage: 'publique', titre: 'Page introuvable' },
        },
    ],
    scrollBehavior(vers, depuis, positionEnregistree) {
        const animations = document.documentElement.dataset.animations === 'oui';
        const position = positionEnregistree
            ?? (vers.hash ? { el: vers.hash, top: 88, behavior: animations ? 'smooth' : 'auto' } : { top: 0 });

        // La page change en fondu : on attend la fin de la transition (0,22 s) pour placer le défilement.
        return vers.path === depuis.path || !animations
            ? position
            : new Promise((resoudre) => setTimeout(() => resoudre(position), 240));
    },
});

const ESPACE_DE_CONNEXION = { admin: 'administrateur', pointage: 'pointage', sr: 'secretaire' };

router.beforeEach((vers) => {
    if (vers.meta.acces && !aAcces(vers.meta.acces)) {
        if (session.utilisateur) {
            session.message = 'Votre compte n’a pas accès à cette page.';
        }

        return { name: 'connexion', query: { espace: ESPACE_DE_CONNEXION[vers.meta.acces], retour: vers.fullPath } };
    }

    return true;
});

router.afterEach((vers) => {
    document.title = vers.name === 'accueil' ? 'SEREH Digital' : `${vers.meta.titre ?? 'SEREH Digital'} · SEREH Digital`;
});
