<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import Alerte from '../components/Alerte.vue';
import Icone from '../components/Icone.vue';
import { dateLongue } from '../donnees-exemple.js';
import { CHAMPS_PUBLICS, listePublique, MODE_DEMONSTRATION } from '../services/donnees.js';

/**
 * Liste publique des participants d'une activité (cahier des charges, section 4) : seulement si
 * l'administrateur l'a activée, seulement les personnes qui y ont consenti, seulement les champs
 * choisis. Le statut montre la présence réellement pointée. Jamais de coordonnées.
 */
const route = useRoute();
const liste = ref(undefined);
const texte = ref('');
const filtre = ref('tous');

const affichees = computed(() => (liste.value?.personnes ?? []).filter((personne) => (filtre.value === 'tous' || (filtre.value === 'presents' ? personne.present : !personne.present))
    && (!texte.value.trim() || personne.nom.toLocaleLowerCase('fr').includes(texte.value.trim().toLocaleLowerCase('fr')))));

onMounted(async () => {
    liste.value = await listePublique(route.params.id);
});
</script>

<template>
    <div class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
        <RouterLink :to="{ name: 'activite', params: { id: route.params.id } }" class="inline-flex items-center gap-1 self-start text-sm font-semibold text-lien"><Icone nom="chevron-gauche" class="size-4" /> L’activité</RouterLink>

        <div v-if="liste === undefined" class="squelette h-48" aria-hidden="true" />
        <div v-else-if="liste === null" class="carte flex flex-col gap-2 p-6">
            <h1 class="text-2xl font-extrabold">Liste non publiée</h1>
            <p class="text-encre-douce">La liste des participants de cette activité n’est pas publique.</p>
        </div>

        <template v-else>
            <header class="flex flex-col gap-2">
                <p class="surtitre">Participants</p>
                <h1 class="text-3xl font-extrabold tracking-tight">{{ liste.activite.titre }}<span v-if="liste.activite.edition" class="text-encre-douce"> · {{ liste.activite.edition }}</span></h1>
                <p class="text-encre-douce first-letter:uppercase">{{ dateLongue(liste.activite.date) }}</p>
            </header>

            <Alerte v-if="MODE_DEMONSTRATION" ton="info" titre="Démonstration">Personnes fictives.</Alerte>
            <p class="text-sm text-encre-douce">Seules les personnes qui ont accepté la publication de leur nom figurent ici. « Présent » signifie que la personne a été pointée à l’entrée.</p>

            <div class="flex flex-wrap gap-3">
                <label class="relative min-w-56 flex-1">
                    <span class="sr-only">Rechercher un nom</span>
                    <Icone nom="recherche" class="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-encre-douce" />
                    <input v-model="texte" type="search" class="champ-saisie pl-11" placeholder="Rechercher un nom">
                </label>
                <label class="sr-only" for="filtre-presence">Présence</label>
                <select id="filtre-presence" v-model="filtre" class="champ-saisie w-auto">
                    <option value="tous">Tout le monde</option>
                    <option value="presents">Présents</option>
                    <option value="inscrits">Pas encore pointés</option>
                </select>
            </div>

            <ul class="carte divide-y divide-ligne">
                <li v-for="(personne, index) in affichees" :key="index" class="flex flex-wrap items-center justify-between gap-2 p-4">
                    <span>
                        <span class="block font-semibold">{{ personne.nom }}</span>
                        <span class="block text-sm text-encre-douce">{{ liste.champs.filter((champ) => champ !== 'nom').map((champ) => personne[champ]).filter(Boolean).join(' · ') }}</span>
                    </span>
                    <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="personne.present ? 'bg-ok-fond text-ok' : 'bg-surface-2 text-encre-douce'">{{ personne.present ? 'Présent' : 'Inscrit' }}</span>
                </li>
                <li v-if="affichees.length === 0" class="p-5 text-encre-douce">Personne ne correspond.</li>
            </ul>
            <p class="text-xs text-encre-douce">Champs publiés : {{ liste.champs.map((champ) => CHAMPS_PUBLICS[champ]).join(', ') }}.</p>
        </template>
    </div>
</template>
