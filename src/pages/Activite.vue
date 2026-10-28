<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import Alerte from '../components/Alerte.vue';
import BadgeStatut from '../components/BadgeStatut.vue';
import Icone from '../components/Icone.vue';
import MotifGeometrique from '../components/MotifGeometrique.vue';
import { dateLongue } from '../donnees-exemple.js';
import { MODE_DEMONSTRATION, trouverActivite } from '../services/donnees.js';

/** Page publique d'une activité : informations, conditions et bouton d'inscription quand c'est ouvert. */
const route = useRoute();
const activite = ref(undefined);

onMounted(async () => {
    activite.value = await trouverActivite(route.params.id);
});
</script>

<template>
    <div>
        <section class="bandeau relative isolate overflow-hidden py-16 text-white sm:py-20">
            <div class="absolute inset-0 -z-10 text-or-300/[0.12]"><MotifGeometrique /></div>
            <div class="mx-auto flex max-w-4xl flex-col gap-4 px-4 sm:px-6">
                <RouterLink to="/" class="inline-flex items-center gap-1 self-start text-sm font-semibold text-or-200 hover:text-white">
                    <Icone nom="chevron-gauche" class="size-4" /> Toutes les activités
                </RouterLink>
                <template v-if="activite">
                    <div class="flex flex-wrap items-center gap-2">
                        <BadgeStatut :statut="activite.statut" />
                        <BadgeStatut v-if="MODE_DEMONSTRATION" statut="exemple" />
                    </div>
                    <h1 class="text-3xl font-extrabold tracking-tight sm:text-5xl" v-apparition>{{ activite.titre }}</h1>
                    <p class="text-lg font-semibold text-or-200" v-apparition="80">{{ activite.edition }}</p>
                </template>
                <div v-else-if="activite === undefined" class="flex flex-col gap-3" aria-hidden="true">
                    <div class="h-10 w-2/3 rounded-lg bg-white/10" />
                    <div class="h-5 w-40 rounded-lg bg-white/10" />
                </div>
            </div>
        </section>

        <div class="mx-auto max-w-4xl px-4 py-10 sm:px-6">
            <div v-if="activite === null" class="carte flex flex-col gap-3 p-8">
                <h1 class="text-2xl font-bold">Activité introuvable</h1>
                <p class="text-encre-douce">Cette activité n'existe pas ou n'est plus publiée.</p>
                <RouterLink to="/" class="bouton-primaire self-start">Revenir à l'accueil</RouterLink>
            </div>

            <div v-else-if="activite" class="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                <div class="flex flex-col gap-6">
                    <section class="carte p-6" v-apparition>
                        <h2 class="mb-3 text-lg font-bold">Présentation</h2>
                        <p class="text-encre-douce">{{ activite.description }}</p>
                        <h3 class="mt-5 mb-2 text-sm font-bold">Objectifs</h3>
                        <ul class="flex list-disc flex-col gap-1 pl-5 text-sm text-encre-douce">
                            <li v-for="objectif in activite.objectifs" :key="objectif">{{ objectif }}</li>
                        </ul>
                    </section>
                    <section class="carte p-6" v-apparition="80">
                        <h2 class="mb-3 text-lg font-bold">Conditions de participation</h2>
                        <p class="text-sm text-encre-douce">{{ activite.conditions }}</p>
                        <p v-if="activite.maxAccompagnateurs > 0" class="mt-2 text-sm text-encre-douce">
                            Chaque personne inscrite peut venir avec {{ activite.maxAccompagnateurs }} accompagnateur(s) au plus ; chacun reçoit son propre QR code.
                        </p>
                    </section>
                </div>

                <aside class="carte flex h-max flex-col gap-4 p-6 lg:sticky lg:top-24" v-apparition="120">
                    <ul class="flex flex-col gap-3 text-sm">
                        <li class="flex gap-3"><Icone nom="calendrier" class="size-5 flex-none text-or-600" /> <span class="first-letter:uppercase">{{ dateLongue(activite.date) }}</span></li>
                        <li class="flex gap-3"><Icone nom="horloge" class="size-5 flex-none text-or-600" /> {{ activite.heure }}</li>
                        <li class="flex gap-3"><Icone nom="lieu" class="size-5 flex-none text-or-600" /> {{ activite.lieu }}</li>
                        <li class="flex gap-3"><Icone nom="secretaires" class="size-5 flex-none text-or-600" /> {{ activite.organisateur }}</li>
                        <li v-if="activite.placesRestantes !== null" class="flex gap-3">
                            <Icone nom="participants" class="size-5 flex-none text-or-600" />
                            {{ activite.placesRestantes > 0 ? `Plus que ${activite.placesRestantes} places` : 'Toutes les places sont prises' }}
                        </li>
                    </ul>

                    <template v-if="activite.statut === 'inscriptions-ouvertes'">
                        <RouterLink :to="{ name: 'inscription', params: { id: activite.id } }" class="bouton-primaire w-full">S'inscrire</RouterLink>
                    </template>
                    <template v-else-if="activite.statut === 'complet'">
                        <Alerte ton="attention" titre="Activité complète">Vous pouvez encore vous inscrire : votre inscription sera mise en attente de validation par l'organisation.</Alerte>
                        <RouterLink :to="{ name: 'inscription', params: { id: activite.id } }" class="bouton-secondaire w-full">S'inscrire en attente</RouterLink>
                    </template>
                    <Alerte v-else ton="info" titre="Inscriptions fermées">Les inscriptions ne sont pas ouvertes pour cette activité.</Alerte>
                </aside>
            </div>
        </div>
    </div>
</template>

<style scoped>
.bandeau {
    background:
        radial-gradient(80% 80% at 90% 0%, rgb(201 162 74 / 0.2), transparent 60%),
        linear-gradient(160deg, var(--color-vert-800), var(--color-vert-950) 75%);
}
</style>
