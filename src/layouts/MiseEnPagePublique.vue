<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import logo from '../assets/logo-aeemci-provisoire.jpg';
import Icone from '../components/Icone.vue';
import MenuAffichage from '../components/MenuAffichage.vue';
import { maintenance } from '../services/maintenance.js';
import { parametres } from '../services/parametres.js';

/**
 * Mise en page publique : en-tête avec les deux accès (cahier des charges, section 3), dont
 * « Espace administrateur » en haut de la page ; pied de page avec la signature institutionnelle.
 */
const route = useRoute();
const surBandeau = computed(() => route.meta.enTeteSurBandeau === true);

/** Pendant la maintenance, les pages publiques laissent place au message ; la connexion reste ouverte. */
const enMaintenance = computed(() => maintenance.active && route.name !== 'connexion');
const contacts = computed(() => [
    parametres.contacts.telephone && `Téléphone : ${parametres.contacts.telephone}`,
    parametres.contacts.whatsapp && `WhatsApp : ${parametres.contacts.whatsapp}`,
    parametres.contacts.email && `E-mail : ${parametres.contacts.email}`,
    parametres.contacts.horaires,
].filter(Boolean));
const menuOuvert = ref(false);

watch(() => route.fullPath, () => {
    menuOuvert.value = false;
});
</script>

<template>
    <a href="#contenu" class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-encre">Aller au contenu</a>

    <div class="flex min-h-dvh flex-col">
        <header :class="surBandeau ? 'absolute inset-x-0 top-0 z-40' : 'sticky top-0 z-40 border-b border-ligne bg-surface/90 backdrop-blur-md'">
            <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6" :class="surBandeau ? 'text-white' : 'text-encre'">
                <RouterLink to="/" class="flex min-w-0 items-center gap-3">
                    <img :src="logo" alt="Logo de l'AEEMCI (version provisoire)" width="48" height="38" class="h-10 w-auto rounded-lg bg-white p-0.5 shadow-sm">
                    <span class="flex min-w-0 flex-col leading-tight">
                        <span class="text-base font-bold tracking-tight">SEREH Digital</span>
                        <span class="hidden truncate text-xs sm:block" :class="surBandeau ? 'text-white/75' : 'text-encre-douce'">Secrétariat régional du Hambol</span>
                    </span>
                </RouterLink>

                <nav class="ml-auto hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
                    <RouterLink :to="{ path: '/', hash: '#activites' }" class="rounded-lg px-3 py-2 text-sm font-semibold" :class="surBandeau ? 'hover:bg-white/10' : 'hover:bg-surface-2'">Activités</RouterLink>
                    <RouterLink to="/composants" class="rounded-lg px-3 py-2 text-sm font-semibold" :class="surBandeau ? 'hover:bg-white/10' : 'hover:bg-surface-2'">Composants</RouterLink>
                    <RouterLink :to="{ name: 'connexion', query: { espace: 'secretaire' } }" class="bouton" :class="surBandeau ? 'border border-white/40 text-white hover:bg-white/10' : 'bouton-secondaire'">
                        Espace secrétaire régional
                    </RouterLink>
                    <RouterLink :to="{ name: 'connexion', query: { espace: 'administrateur' } }" :class="surBandeau ? 'bouton-or' : 'bouton-primaire'">
                        <Icone nom="connexion" class="size-4" /> Espace administrateur
                    </RouterLink>
                </nav>

                <div class="ml-auto flex items-center gap-1 lg:ml-1">
                    <MenuAffichage :sur-fond-sombre="surBandeau" />
                    <button
                        type="button"
                        class="inline-flex size-11 items-center justify-center rounded-xl lg:hidden"
                        :class="surBandeau ? 'hover:bg-white/10' : 'hover:bg-surface-2'"
                        :aria-expanded="menuOuvert"
                        aria-controls="menu-mobile"
                        @click="menuOuvert = !menuOuvert"
                    >
                        <Icone :nom="menuOuvert ? 'fermer' : 'menu'" class="size-6" :libelle="menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'" />
                    </button>
                </div>
            </div>

            <Transition name="menu-mobile">
                <nav v-if="menuOuvert" id="menu-mobile" class="carte mx-4 mb-3 flex flex-col gap-2 p-4 text-encre lg:hidden" aria-label="Navigation principale">
                    <RouterLink :to="{ path: '/', hash: '#activites' }" class="rounded-lg px-3 py-3 font-semibold hover:bg-surface-2">Activités</RouterLink>
                    <RouterLink to="/composants" class="rounded-lg px-3 py-3 font-semibold hover:bg-surface-2">Composants</RouterLink>
                    <RouterLink :to="{ name: 'connexion', query: { espace: 'secretaire' } }" class="bouton-secondaire">Espace secrétaire régional</RouterLink>
                    <RouterLink :to="{ name: 'connexion', query: { espace: 'administrateur' } }" class="bouton-primaire">
                        <Icone nom="connexion" class="size-4" /> Espace administrateur
                    </RouterLink>
                </nav>
            </Transition>
        </header>

        <main id="contenu" class="flex-1" tabindex="-1">
            <section v-if="enMaintenance" class="flex flex-col items-center gap-4 bg-gradient-to-b from-vert-900 to-vert-950 px-4 pb-20 text-center text-white sm:px-6" :class="surBandeau ? 'pt-36' : 'pt-16'" aria-labelledby="titre-maintenance">
                <span class="inline-flex size-16 items-center justify-center rounded-2xl bg-white/10 text-or-300"><Icone nom="parametres" class="size-8" /></span>
                <h1 id="titre-maintenance" class="text-3xl font-extrabold tracking-tight">{{ parametres.identite.nom }} est en maintenance</h1>
                <p class="max-w-xl text-vert-100">Le site revient très bientôt. Les inscriptions et les réponses déjà enregistrées sont conservées.</p>
                <p v-if="maintenance.message" class="max-w-xl rounded-xl bg-white/10 px-4 py-3 font-semibold">{{ maintenance.message }}</p>
                <div class="flex flex-col gap-1 text-sm text-vert-100/80">
                    <p>{{ parametres.contacts.adresse || 'Siège régional : Katiola' }}</p>
                    <p v-for="ligne in contacts" :key="ligne">{{ ligne }}</p>
                </div>
            </section>
            <slot v-else />
        </main>

        <footer class="relative overflow-hidden bg-vert-950 text-vert-100">
            <div class="h-1 bg-gradient-to-r from-or-600 via-or-300 to-or-600" aria-hidden="true" />
            <div class="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr]">
                <div class="flex flex-col gap-3">
                    <p class="text-lg font-bold text-white">SEREH Digital</p>
                    <p class="text-sm leading-relaxed">
                        Association des Élèves et Étudiants Musulmans de Côte d'Ivoire<br>
                        Secrétariat régional du Hambol (SEREH)
                    </p>
                    <p class="text-sm font-semibold text-or-300 italic">« {{ parametres.identite.slogan }} »</p>
                </div>
                <div class="flex flex-col gap-2 text-sm">
                    <p class="font-semibold text-white">Contact</p>
                    <p class="text-vert-100/80">{{ parametres.contacts.adresse || 'Siège régional : Katiola' }}</p>
                    <p v-for="ligne in contacts" :key="ligne" class="text-vert-100/80">{{ ligne }}</p>
                    <p v-if="contacts.length === 0" class="text-vert-100/60">Coordonnées officielles à compléter.</p>
                    <div class="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                        <RouterLink :to="{ name: 'confidentialite' }" class="font-semibold text-white underline underline-offset-4 hover:text-or-200">Confidentialité</RouterLink>
                        <RouterLink :to="{ name: 'connexion', query: { espace: 'administrateur' } }" class="font-semibold text-white underline underline-offset-4 hover:text-or-200">Espace administrateur</RouterLink>
                    </div>
                </div>
            </div>
        </footer>
    </div>
</template>

<style scoped>
.menu-mobile-enter-active,
.menu-mobile-leave-active {
    transition: opacity 0.18s ease, transform 0.18s var(--ease-douce);
}

.menu-mobile-enter-from,
.menu-mobile-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}
</style>
