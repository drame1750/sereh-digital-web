<script setup>
import { useRouter } from 'vue-router';
import logo from '../assets/logo-aeemci-provisoire.jpg';
import Icone from '../components/Icone.vue';
import MenuAffichage from '../components/MenuAffichage.vue';
import { useInactivite } from '../composables/useInactivite.js';
import { seDeconnecter, session } from '../services/session.js';

/**
 * Mise en page de l'espace secrétaire régional : simple et lisible sur téléphone, sans accès au
 * reste de l'administration. La session se ferme après 15 minutes d'inactivité.
 */
const router = useRouter();

useInactivite();

function quitter() {
    seDeconnecter('Vous êtes déconnecté.');
    router.push({ name: 'connexion', query: { espace: 'secretaire' } });
}
</script>

<template>
    <a href="#contenu" class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-encre">Aller au contenu</a>

    <div class="flex min-h-dvh flex-col">
        <header class="entete-secretaire sticky top-0 z-40 text-white">
            <div class="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
                <RouterLink :to="{ name: 'espace-secretaire' }" class="flex min-w-0 items-center gap-3">
                    <img :src="logo" alt="Logo de l'AEEMCI (version provisoire)" width="40" height="32" class="h-9 w-auto flex-none rounded-md bg-white p-0.5">
                    <span class="min-w-0 leading-tight">
                        <span class="block font-bold">Espace secrétaire régional</span>
                        <span class="block truncate text-xs text-or-200">{{ session.utilisateur?.nom ?? 'SEREH Digital' }}</span>
                    </span>
                </RouterLink>
                <div class="ml-auto flex items-center gap-1">
                    <MenuAffichage sur-fond-sombre />
                    <button type="button" class="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold hover:bg-white/10" @click="quitter">
                        <Icone nom="deconnexion" class="size-4" /> <span class="hidden sm:inline">Se déconnecter</span>
                    </button>
                </div>
            </div>
        </header>
        <main id="contenu" class="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6" tabindex="-1">
            <slot />
        </main>
        <footer class="border-t border-ligne px-4 py-5 text-center text-xs text-encre-douce">
            AEEMCI — Secrétariat régional du Hambol · SEREH Digital
        </footer>
    </div>
</template>

<style scoped>
.entete-secretaire {
    background: linear-gradient(120deg, var(--color-vert-900), var(--color-vert-700));
    border-bottom: 3px solid var(--color-or-500);
}
</style>
