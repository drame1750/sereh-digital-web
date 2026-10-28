<script setup>
import { dateLongue, jour, mois } from '../donnees-exemple.js';
import BadgeStatut from './BadgeStatut.vue';
import Icone from './Icone.vue';
import MotifGeometrique from './MotifGeometrique.vue';

/**
 * Carte d'une activité sur la page d'accueil : statut et places restantes, jamais d'information
 * interne au bureau (décision du 28 octobre 2026).
 */
defineProps({
    activite: { type: Object, required: true },
});
</script>

<template>
    <article class="carte-vivante group flex h-full flex-col overflow-hidden">
        <div class="relative h-36 overflow-hidden bg-gradient-to-br from-vert-700 to-vert-950 text-or-300/25">
            <MotifGeometrique />
            <div class="absolute top-4 left-4 flex flex-col items-center rounded-xl bg-surface px-3 py-2 text-encre shadow-md">
                <span class="text-2xl leading-none font-bold">{{ jour(activite.date) }}</span>
                <span class="text-xs font-semibold uppercase tracking-wider text-encre-douce">{{ mois(activite.date) }}</span>
            </div>
            <span class="absolute right-4 bottom-4 rounded-full bg-black/30 px-3 py-1 text-xs font-semibold text-or-200 backdrop-blur-sm">{{ activite.edition }}</span>
        </div>

        <div class="flex flex-1 flex-col gap-3 p-5">
            <BadgeStatut :statut="activite.statut" class="self-start" />
            <h3 class="text-lg font-bold">{{ activite.titre }}</h3>
            <p class="text-sm text-encre-douce">{{ activite.description }}</p>

            <ul class="mt-auto flex flex-col gap-1.5 text-sm text-encre-douce">
                <li class="flex items-center gap-2"><Icone nom="calendrier" class="size-4 text-or-600" /> <span class="first-letter:uppercase">{{ dateLongue(activite.date) }}</span> · {{ activite.heure }}</li>
                <li class="flex items-center gap-2"><Icone nom="lieu" class="size-4 text-or-600" /> {{ activite.lieu }}</li>
                <li v-if="activite.placesRestantes !== null" class="flex items-center gap-2">
                    <Icone nom="participants" class="size-4 text-or-600" />
                    {{ activite.placesRestantes > 0 ? `Plus que ${activite.placesRestantes} places` : 'Plus de place : inscription en attente possible' }}
                </li>
            </ul>
        </div>
    </article>
</template>
