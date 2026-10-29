<script setup>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import logo from '../assets/logo-aeemci-provisoire.jpg';
import Icone from '../components/Icone.vue';
import MenuAffichage from '../components/MenuAffichage.vue';
import { useInactivite } from '../composables/useInactivite.js';
import { RUBRIQUES } from '../rubriques.js';
import { LIBELLES_ROLES, seDeconnecter, session } from '../services/session.js';

/**
 * Mise en page de l'espace administrateur : barre latérale gauche repliable, avec icônes et libellés
 * (cahier des charges, section 8). Sur téléphone, elle devient un panneau qui s'ouvre par le menu.
 * Les rubriques affichées dépendront des droits de la personne connectée ; la session se ferme après
 * 15 minutes d'inactivité.
 */
const CLE_REPLI = 'sereh.barre-repliee';
const route = useRoute();
const router = useRouter();
const repliee = ref(lireRepli());
const panneauOuvert = ref(false);

function lireRepli() {
    try {
        return window.localStorage.getItem(CLE_REPLI) === 'oui';
    } catch {
        return false;
    }
}

watch(repliee, (valeur) => {
    try {
        window.localStorage.setItem(CLE_REPLI, valeur ? 'oui' : 'non');
    } catch {
        // Stockage indisponible : le choix vaut pour cette visite seulement.
    }
});

watch(() => route.fullPath, () => {
    panneauOuvert.value = false;
});

/** Les rubriques déjà construites ouvrent leur écran ; les autres, la page d'attente. */
const ECRANS_CONSTRUITS = {
    'tableau-de-bord': 'tableau-de-bord',
    activites: 'admin-activites',
    inscriptions: 'admin-inscriptions',
    participants: 'admin-inscriptions',
    pointage: 'pointage',
    courriers: 'admin-courriers',
    secretaires: 'admin-secretaires',
};

useInactivite();

function quitter() {
    seDeconnecter('Vous êtes déconnecté.');
    router.push({ name: 'connexion', query: { espace: 'administrateur' } });
}

function lienRubrique(rubrique) {
    return ECRANS_CONSTRUITS[rubrique.cle] ? { name: ECRANS_CONSTRUITS[rubrique.cle] } : { name: 'rubrique', params: { cle: rubrique.cle } };
}
</script>

<template>
    <a href="#contenu" class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-encre">Aller au contenu</a>

    <div class="flex min-h-dvh">
        <Transition name="voile">
            <div v-if="panneauOuvert" class="fixed inset-0 z-40 bg-black/45 lg:hidden" aria-hidden="true" @click="panneauOuvert = false" />
        </Transition>

        <aside
            class="barre fixed inset-y-0 left-0 z-50 flex flex-col text-vert-50 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0"
            :class="[repliee ? 'lg:w-20' : 'lg:w-72', panneauOuvert ? 'w-72 translate-x-0' : 'w-72 -translate-x-full']"
            aria-label="Rubriques de l'administration"
        >
            <div class="flex items-center gap-3 px-4 py-5" :class="repliee ? 'lg:justify-center lg:px-2' : ''">
                <img :src="logo" alt="Logo de l'AEEMCI (version provisoire)" width="40" height="32" class="h-9 w-auto flex-none rounded-md bg-white p-0.5">
                <div class="min-w-0 leading-tight" :class="repliee ? 'lg:hidden' : ''">
                    <p class="font-bold text-white">SEREH Digital</p>
                    <p class="truncate text-xs text-or-200">Administration</p>
                </div>
                <button type="button" class="ml-auto inline-flex size-10 items-center justify-center rounded-lg hover:bg-white/10 lg:hidden" @click="panneauOuvert = false">
                    <Icone nom="fermer" class="size-5" libelle="Fermer le menu" />
                </button>
            </div>

            <nav class="flex-1 overflow-y-auto px-3 pb-4">
                <div v-for="groupe in RUBRIQUES" :key="groupe.titre" class="mb-4">
                    <p class="mb-1 px-3 text-[0.6875rem] font-bold tracking-[0.16em] text-or-300/80 uppercase" :class="repliee ? 'lg:sr-only' : ''">{{ groupe.titre }}</p>
                    <RouterLink
                        v-for="rubrique in groupe.rubriques"
                        :key="rubrique.cle"
                        :to="lienRubrique(rubrique)"
                        class="lien-barre"
                        :class="repliee ? 'lg:justify-center lg:px-0' : ''"
                        :title="repliee ? rubrique.libelle : undefined"
                    >
                        <Icone :nom="rubrique.icone" class="size-5 flex-none" />
                        <span :class="repliee ? 'lg:sr-only' : ''">{{ rubrique.libelle }}</span>
                    </RouterLink>
                </div>
            </nav>

            <div class="hidden border-t border-white/10 p-3 lg:block">
                <button
                    type="button"
                    class="lien-barre w-full"
                    :class="repliee ? 'lg:justify-center lg:px-0' : ''"
                    :aria-expanded="!repliee"
                    @click="repliee = !repliee"
                >
                    <Icone :nom="repliee ? 'chevron-droite' : 'chevron-gauche'" class="size-5 flex-none" />
                    <span :class="repliee ? 'lg:sr-only' : ''">{{ repliee ? 'Déplier la barre' : 'Replier la barre' }}</span>
                </button>
            </div>
        </aside>

        <div class="flex min-w-0 flex-1 flex-col">
            <header class="sticky top-0 z-30 border-b border-ligne bg-surface/90 backdrop-blur-md">
                <div class="flex items-center gap-2 px-4 py-3 sm:px-6">
                    <button type="button" class="inline-flex size-11 items-center justify-center rounded-xl hover:bg-surface-2 lg:hidden" :aria-expanded="panneauOuvert" @click="panneauOuvert = true">
                        <Icone nom="menu" class="size-6" libelle="Ouvrir les rubriques" />
                    </button>
                    <label class="relative hidden max-w-md flex-1 sm:block">
                        <span class="sr-only">Rechercher</span>
                        <Icone nom="recherche" class="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-encre-douce" />
                        <input type="search" class="champ-saisie min-h-11 pl-11" placeholder="Rechercher un participant, un courrier…" disabled>
                    </label>
                    <div class="ml-auto flex items-center gap-1">
                        <button type="button" class="relative inline-flex size-11 items-center justify-center rounded-xl hover:bg-surface-2" disabled>
                            <Icone nom="notifications" class="size-5" libelle="Notifications (exemple : 3 non lues)" />
                            <span class="absolute top-2 right-2 inline-flex size-4 items-center justify-center rounded-full bg-danger text-[0.625rem] font-bold text-white" aria-hidden="true">3</span>
                        </button>
                        <MenuAffichage />
                        <div class="hidden text-right leading-tight md:block">
                            <p class="text-sm font-semibold">{{ session.utilisateur?.nom }}</p>
                            <p class="text-xs text-encre-douce">{{ LIBELLES_ROLES[session.utilisateur?.role] }}</p>
                        </div>
                        <button type="button" class="bouton-discret" @click="quitter">
                            <Icone nom="deconnexion" class="size-4" /> <span class="hidden sm:inline">Se déconnecter</span>
                        </button>
                    </div>
                </div>
            </header>

            <main id="contenu" class="flex-1 px-4 py-6 sm:px-6 lg:px-10" tabindex="-1">
                <slot />
            </main>
        </div>
    </div>
</template>

<style scoped>
.barre {
    background:
        radial-gradient(120% 60% at 0% 0%, rgb(201 162 74 / 0.18), transparent 60%),
        linear-gradient(180deg, var(--color-vert-900), var(--color-vert-950));
    box-shadow: 8px 0 32px -16px rgb(0 0 0 / 0.5);
    transition: width 0.25s var(--ease-douce), transform 0.25s var(--ease-douce);
}

.lien-barre {
    display: flex;
    min-height: 2.75rem;
    align-items: center;
    gap: 0.75rem;
    border-radius: 0.75rem;
    padding: 0 0.75rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: rgb(238 247 240 / 0.86);
    transition: background-color 0.18s ease, color 0.18s ease;
}

.lien-barre:hover {
    background: rgb(255 255 255 / 0.08);
    color: #fff;
}

.lien-barre.router-link-exact-active {
    background: linear-gradient(90deg, rgb(201 162 74 / 0.28), rgb(201 162 74 / 0.08));
    color: #fff;
    box-shadow: inset 3px 0 0 var(--color-or-400);
}

.voile-enter-active,
.voile-leave-active {
    transition: opacity 0.2s ease;
}

.voile-enter-from,
.voile-leave-to {
    opacity: 0;
}
</style>
