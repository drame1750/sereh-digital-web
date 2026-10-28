<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Icone from '../../components/Icone.vue';
import { toutesLesRubriques } from '../../rubriques.js';

/** Page d'attente d'une rubrique de l'administration : dit quel module du plan la construira. */
const route = useRoute();
const rubrique = computed(() => toutesLesRubriques.find((candidate) => candidate.cle === route.params.cle));
</script>

<template>
    <div class="mx-auto flex max-w-3xl flex-col gap-6">
        <template v-if="rubrique">
            <p class="surtitre">Administration</p>
            <h1 class="flex items-center gap-3 text-3xl font-extrabold tracking-tight">
                <Icone :nom="rubrique.icone" class="size-8 text-or-600" /> {{ rubrique.libelle }}
            </h1>
            <div class="carte flex flex-col gap-3 p-6">
                <p class="font-semibold">Cette rubrique sera construite au module {{ rubrique.module }} du plan de réalisation.</p>
                <p class="text-sm text-encre-douce">Dans cette maquette, elle montre seulement la navigation : la barre latérale, son repli et l'élément actif.</p>
                <RouterLink :to="{ name: 'tableau-de-bord' }" class="bouton-secondaire self-start">Revenir au tableau de bord</RouterLink>
            </div>
        </template>
        <div v-else class="carte p-6">
            <p class="font-semibold">Rubrique inconnue.</p>
            <RouterLink :to="{ name: 'tableau-de-bord' }" class="bouton-secondaire mt-3">Revenir au tableau de bord</RouterLink>
        </div>
    </div>
</template>
