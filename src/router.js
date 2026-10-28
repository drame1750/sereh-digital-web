import { createRouter, createWebHashHistory } from 'vue-router';

/**
 * Adresses de la forme …/#/composants : GitHub Pages ne sert que des fichiers fixes, le signe « # »
 * permet à l'application de gérer elle-même ses pages (cahier des charges, section 9).
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
            path: '/pointage',
            name: 'pointage',
            component: () => import('./pages/pointage/Pointage.vue'),
            meta: { miseEnPage: 'pointage', titre: 'Pointage' },
        },
        {
            path: '/connexion',
            name: 'connexion',
            component: () => import('./pages/ConnexionAVenir.vue'),
            meta: { miseEnPage: 'publique', titre: 'Connexion' },
        },
        {
            path: '/maquette/tableau-de-bord',
            name: 'tableau-de-bord',
            component: () => import('./pages/admin/TableauDeBord.vue'),
            meta: { miseEnPage: 'admin', titre: 'Tableau de bord' },
        },
        {
            path: '/maquette/:cle',
            name: 'rubrique',
            component: () => import('./pages/admin/RubriqueAVenir.vue'),
            meta: { miseEnPage: 'admin', titre: 'Rubrique' },
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

router.afterEach((vers) => {
    document.title = vers.name === 'accueil' ? 'SEREH Digital' : `${vers.meta.titre ?? 'SEREH Digital'} · SEREH Digital`;
});
