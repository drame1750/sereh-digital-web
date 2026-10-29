<script setup>
import { useRouter } from 'vue-router';
import logo from '../assets/logo-aeemci-provisoire.jpg';
import Icone from '../components/Icone.vue';
import MenuAffichage from '../components/MenuAffichage.vue';
import { useInactivite } from '../composables/useInactivite.js';
import { seDeconnecter, session } from '../services/session.js';

/**
 * Mise en page de l'écran de pointage : rien d'autre que le pointage, pour un agent debout à
 * l'entrée, souvent sur son propre téléphone. L'agent n'a pas accès au reste de l'administration.
 */
const router = useRouter();

useInactivite();

function quitter() {
    seDeconnecter('Vous êtes déconnecté.');
    router.push({ name: 'connexion', query: { espace: 'pointage' } });
}
</script>

<template>
    <div class="flex min-h-dvh flex-col">
        <header class="entete-pointage sticky top-0 z-40 text-white">
            <div class="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
                <img :src="logo" alt="Logo de l'AEEMCI (version provisoire)" width="40" height="32" class="h-9 w-auto rounded-md bg-white p-0.5">
                <div class="min-w-0 leading-tight">
                    <p class="font-bold">Pointage</p>
                    <p class="truncate text-xs text-or-200">{{ session.utilisateur?.nom ?? 'SEREH Digital' }}</p>
                </div>
                <div class="ml-auto flex items-center gap-1">
                    <MenuAffichage sur-fond-sombre />
                    <button type="button" class="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold hover:bg-white/10" @click="quitter">
                        <Icone nom="deconnexion" class="size-4" /> <span class="hidden sm:inline">Se déconnecter</span>
                    </button>
                </div>
            </div>
        </header>
        <main id="contenu" class="mx-auto w-full max-w-3xl flex-1 px-4 py-5" tabindex="-1">
            <slot />
        </main>
    </div>
</template>

<style scoped>
.entete-pointage {
    background: linear-gradient(120deg, var(--color-vert-900), var(--color-vert-700));
    border-bottom: 3px solid var(--color-or-500);
}
</style>
