<script setup>
import { computed, onMounted, ref } from 'vue';
import BadgeStatut from '../components/BadgeStatut.vue';
import CarteActivite from '../components/CarteActivite.vue';
import Icone from '../components/Icone.vue';
import MotifGeometrique from '../components/MotifGeometrique.vue';
import { dateLongue } from '../donnees-exemple.js';
import { listerActivites, MODE_DEMONSTRATION } from '../services/donnees.js';

const activites = ref(null);
const enAvant = computed(() => activites.value?.find((activite) => activite.statut === 'inscriptions-ouvertes') ?? activites.value?.[0] ?? null);

onMounted(async () => {
    activites.value = await listerActivites();
});

const FONCTIONS = [
    { icone: 'inscriptions', titre: 'Inscription en ligne', texte: 'Un formulaire court, sur téléphone, avec un QR code personnel pour chaque participant et accompagnateur.' },
    { icone: 'pointage', titre: 'Pointage par QR code', texte: 'Des entrées rapides et contrôlées le jour de l’activité, avec un second passage bloqué.' },
    { icone: 'courrier', titre: 'Courriers officiels', texte: 'Les invitations du bureau, consultées et confirmées en ligne par les secrétaires régionaux.' },
    { icone: 'rapports', titre: 'Bilans et archives', texte: 'Des bilans calculés sur les vraies données, approuvés avant leur diffusion.' },
];
</script>

<template>
    <div>
        <section class="bandeau relative isolate overflow-hidden pt-28 pb-40 text-white sm:pt-32 sm:pb-48" aria-labelledby="titre-accueil">
            <div class="absolute inset-0 -z-10 text-or-300/[0.13]">
                <MotifGeometrique />
            </div>
            <div class="absolute -top-24 -right-32 -z-10 w-[34rem] max-w-none opacity-35 sm:-right-16 lg:top-6 lg:right-[4%] lg:w-[30rem] lg:opacity-90">
                <MotifGeometrique variante="rosace" />
            </div>

            <div class="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6">
                <p class="surtitre text-or-300" v-apparition>AEEMCI · Secrétariat régional du Hambol</p>
                <h1 id="titre-accueil" class="max-w-2xl text-4xl font-extrabold tracking-tight sm:text-6xl" v-apparition="80">
                    SEREH <span class="texte-or">Digital</span>
                </h1>
                <p class="max-w-xl text-lg font-semibold text-or-200 italic sm:text-xl" v-apparition="160">« SEREH, la marche vers la réforme spirituelle »</p>
                <p class="max-w-xl text-base text-vert-50/85" v-apparition="240">
                    La plateforme du Secrétariat régional du Hambol pour les activités, les inscriptions, les courriers du bureau et le pointage des présences.
                </p>
                <div class="flex flex-wrap gap-3 pt-2" v-apparition="320">
                    <RouterLink :to="{ path: '/', hash: '#activites' }" class="bouton-or">
                        Voir les activités <Icone nom="fleche-droite" class="size-4" />
                    </RouterLink>
                    <RouterLink :to="{ name: 'connexion', query: { espace: 'secretaire' } }" class="bouton border border-white/40 text-white hover:bg-white/10">
                        Espace secrétaire régional
                    </RouterLink>
                </div>
            </div>
        </section>

        <div class="relative z-10 mx-auto -mt-28 max-w-6xl px-4 sm:-mt-32 sm:px-6">
            <article v-if="enAvant" class="carte relative overflow-hidden p-6 sm:p-8" v-apparition>
                <div class="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-or-300 to-or-600" aria-hidden="true" />
                <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div class="flex flex-col gap-3">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="surtitre">Prochaine activité</span>
                            <BadgeStatut v-if="MODE_DEMONSTRATION" statut="exemple" />
                        </div>
                        <h2 class="text-2xl font-bold sm:text-3xl">{{ enAvant.titre }} <span class="text-or-600">· {{ enAvant.edition }}</span></h2>
                        <ul class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-encre-douce">
                            <li class="flex items-center gap-2"><Icone nom="calendrier" class="size-4 text-or-600" /> <span class="first-letter:uppercase">{{ dateLongue(enAvant.date) }}</span></li>
                            <li class="flex items-center gap-2"><Icone nom="horloge" class="size-4 text-or-600" /> {{ enAvant.heure }}</li>
                            <li class="flex items-center gap-2"><Icone nom="lieu" class="size-4 text-or-600" /> {{ enAvant.lieu }}</li>
                        </ul>
                    </div>
                    <div class="flex flex-col items-start gap-2 lg:items-end">
                        <BadgeStatut :statut="enAvant.statut" />
                        <p v-if="enAvant.placesRestantes !== null" class="text-sm text-encre-douce">Plus que {{ enAvant.placesRestantes }} places</p>
                        <div class="flex flex-wrap gap-2">
                            <RouterLink :to="{ name: 'activite', params: { id: enAvant.id } }" class="bouton-secondaire">Détails</RouterLink>
                            <RouterLink v-if="enAvant.statut === 'inscriptions-ouvertes' || enAvant.statut === 'complet'" :to="{ name: 'inscription', params: { id: enAvant.id } }" class="bouton-primaire">S'inscrire</RouterLink>
                        </div>
                    </div>
                </div>
            </article>
            <div v-else class="carte flex flex-col gap-3 p-8" aria-hidden="true">
                <div class="squelette h-4 w-40" />
                <div class="squelette h-8 w-2/3" />
                <div class="squelette h-4 w-1/2" />
            </div>
        </div>

        <section id="activites" class="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6" aria-labelledby="titre-activites">
            <div class="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p class="surtitre mb-2">Agenda</p>
                    <h2 id="titre-activites" class="titre-section">Prochaines activités</h2>
                </div>
                <p v-if="MODE_DEMONSTRATION" class="max-w-md text-sm text-encre-douce">Démonstration : ces activités et leurs chiffres sont des exemples. Aucune n'est une donnée enregistrée.</p>
            </div>
            <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <template v-if="activites">
                    <RouterLink
                        v-for="(activite, index) in activites"
                        :key="activite.id"
                        :to="{ name: 'activite', params: { id: activite.id } }"
                        class="block rounded-2xl"
                        v-apparition="index * 110"
                    >
                        <CarteActivite :activite="activite" />
                    </RouterLink>
                </template>
                <template v-else>
                    <div v-for="index in 3" :key="index" class="carte flex flex-col gap-3 p-5" aria-hidden="true">
                        <div class="squelette h-32" />
                        <div class="squelette h-5 w-1/3" />
                        <div class="squelette h-6 w-3/4" />
                    </div>
                    <p class="sr-only" role="status">Chargement des activités…</p>
                </template>
            </div>
        </section>

        <section class="relative overflow-hidden border-y border-ligne bg-surface-2 py-20" aria-labelledby="titre-fonctions">
            <div class="absolute inset-0 text-or-500/[0.07]"><MotifGeometrique /></div>
            <div class="relative mx-auto max-w-6xl px-4 sm:px-6">
                <p class="surtitre mb-2">La plateforme</p>
                <h2 id="titre-fonctions" class="titre-section mb-10">Ce que permet SEREH Digital</h2>
                <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <article v-for="(fonction, index) in FONCTIONS" :key="fonction.titre" class="carte-vivante flex flex-col gap-3 p-6" v-apparition="index * 100">
                        <span class="pastille-icone"><Icone :nom="fonction.icone" class="size-6" /></span>
                        <h3 class="text-base font-bold">{{ fonction.titre }}</h3>
                        <p class="text-sm text-encre-douce">{{ fonction.texte }}</p>
                    </article>
                </div>
            </div>
        </section>

        <section class="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="titre-espaces">
            <h2 id="titre-espaces" class="titre-section mb-10">Deux espaces privés</h2>
            <div class="grid gap-6 md:grid-cols-2">
                <article class="carte-vivante flex flex-col gap-4 p-7" v-apparition>
                    <span class="pastille-icone"><Icone nom="secretaires" class="size-6" /></span>
                    <h3 class="text-xl font-bold">Espace secrétaire régional</h3>
                    <p class="text-sm text-encre-douce">Missions prioritaires, courriers à traiter, échéances et confirmations de présence.</p>
                    <RouterLink :to="{ name: 'connexion', query: { espace: 'secretaire' } }" class="bouton-secondaire mt-auto self-start">Accéder</RouterLink>
                </article>
                <article class="carte-vivante flex flex-col gap-4 p-7" v-apparition="120">
                    <span class="pastille-icone"><Icone nom="securite" class="size-6" /></span>
                    <h3 class="text-xl font-bold">Espace administrateur</h3>
                    <p class="text-sm text-encre-douce">Activités, comptes, courriers, inscriptions, pointage, rapports et sécurité de la plateforme.</p>
                    <RouterLink :to="{ name: 'connexion', query: { espace: 'administrateur' } }" class="bouton-primaire mt-auto self-start">Accéder</RouterLink>
                </article>
            </div>
        </section>
    </div>
</template>

<style scoped>
.bandeau {
    background:
        radial-gradient(90% 70% at 85% 10%, rgb(201 162 74 / 0.22), transparent 60%),
        radial-gradient(70% 60% at 0% 100%, rgb(19 122 57 / 0.55), transparent 70%),
        linear-gradient(160deg, var(--color-vert-800), var(--color-vert-950) 70%);
}

.texte-or {
    background: linear-gradient(100deg, var(--color-or-200), var(--color-or-500) 55%, var(--color-or-300));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}

.pastille-icone {
    display: inline-flex;
    width: 3rem;
    height: 3rem;
    align-items: center;
    justify-content: center;
    border-radius: 1rem;
    color: var(--color-vert-900);
    background: linear-gradient(135deg, var(--color-or-100), var(--color-or-300));
    box-shadow: 0 6px 16px -8px rgb(125 97 32 / 0.6);
}
</style>
