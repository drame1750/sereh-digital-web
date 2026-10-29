<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Alerte from '../../components/Alerte.vue';
import BadgeStatut from '../../components/BadgeStatut.vue';
import Icone from '../../components/Icone.vue';
import MessageFlottant from '../../components/MessageFlottant.vue';
import { useAction } from '../../composables/useAction.js';
import { telecharger } from '../../billet.js';
import { instant } from '../../donnees-exemple.js';
import { imagesDesPages, imprimerPages, pdfDesPages } from '../../lettre.js';
import { pagesDeRapport } from '../../rapport.js';
import { MODE_DEMONSTRATION } from '../../services/donnees.js';
import { actualiserChiffres, approuverRapport, enregistrerRapport, passagesACompleter, trouverRapport } from '../../services/rapports.js';

/**
 * Un rapport d'activité : relecture et compléments du brouillon, aperçu fidèle au PDF, approbation,
 * puis téléchargement et impression. Un rapport approuvé ne se modifie plus.
 */
const route = useRoute();
const rapport = ref(null);
const introuvable = ref(false);
const sections = reactive({ introduction: '', deroulement: '', conclusion: '' });
const approuve = ref(false);
const pages = ref([]);
const images = ref([]);

const aCompleter = computed(() => (rapport.value ? passagesACompleter({ sections }) : []));
const modifie = computed(() => rapport.value && Object.keys(sections).some((cle) => sections[cle] !== rapport.value.sections[cle]));

async function charger() {
    rapport.value = await trouverRapport(route.params.id);
    introuvable.value = !rapport.value;

    if (rapport.value) {
        Object.assign(sections, rapport.value.sections);
        await dessiner();
    }
}

async function dessiner() {
    pages.value = await pagesDeRapport({ ...rapport.value, sections: { ...sections } }, { demonstration: MODE_DEMONSTRATION });
    images.value = imagesDesPages(pages.value);
}

const { enCours, confirmation, agir, erreurDe } = useAction(charger);

async function approuver() {
    if (modifie.value && !await agir('enregistrer', () => enregistrerRapport(rapport.value.id, sections), 'Brouillon enregistré.')) {
        return;
    }

    await agir('approuver', () => approuverRapport(rapport.value.id, approuve.value), 'Rapport approuvé : il est verrouillé et téléchargeable en PDF.');
}

async function telechargerPdf() {
    telecharger(await pdfDesPages(pages.value, rapport.value.titre), `${rapport.value.titre.replace(/[^\wÀ-ÿ-]+/g, '-').slice(0, 80)}.pdf`);
}

let minuterie = 0;
watch(sections, () => {
    clearTimeout(minuterie);
    minuterie = setTimeout(dessiner, 600);
}, { deep: true });

onMounted(charger);
</script>

<template>
    <div class="mx-auto flex max-w-5xl flex-col gap-6">
        <RouterLink :to="{ name: 'admin-rapports', query: { onglet: 'rapports' } }" class="inline-flex items-center gap-1 self-start text-sm font-semibold text-lien"><Icone nom="chevron-gauche" class="size-4" /> Rapports</RouterLink>

        <p v-if="introuvable" class="carte p-6 font-semibold">Rapport introuvable.</p>
        <div v-else-if="!rapport" class="squelette h-64" aria-hidden="true" />

        <template v-else>
            <header class="flex flex-col gap-2">
                <BadgeStatut :statut="rapport.statut === 'approuve' ? 'approuve' : 'brouillon'" class="self-start" />
                <h1 class="text-3xl font-extrabold tracking-tight">{{ rapport.titre }}</h1>
                <p class="text-sm text-encre-douce">
                    Préparé le {{ instant(rapport.creeLe) }} par {{ rapport.creePar }}{{ rapport.approuveLe ? ` · approuvé le ${instant(rapport.approuveLe)} par ${rapport.approuvePar}` : '' }}.
                    Chiffres calculés le {{ instant(rapport.chiffres.calculeLe) }}.
                </p>
            </header>

            <template v-if="rapport.statut === 'brouillon'">
                <Alerte ton="attention" titre="Brouillon">Relisez et complétez le texte. Le PDF ne sera disponible qu’après votre approbation.</Alerte>

                <form class="carte flex flex-col gap-4 p-6" novalidate @submit.prevent="agir('enregistrer', () => enregistrerRapport(rapport.id, sections), 'Brouillon enregistré.')">
                    <label class="flex flex-col gap-1.5 text-sm font-semibold">1. Présentation<textarea v-model="sections.introduction" class="champ-saisie min-h-24 font-normal" /></label>
                    <p class="rounded-xl bg-surface-2 p-3 text-sm text-encre-douce">Parties 2 à 4 (chiffres clés, répartition et réponses du bureau) : écrites automatiquement à partir des données. Visibles dans l’aperçu.</p>
                    <label class="flex flex-col gap-1.5 text-sm font-semibold">5. Déroulement<textarea v-model="sections.deroulement" class="champ-saisie min-h-32 font-normal" /></label>
                    <label class="flex flex-col gap-1.5 text-sm font-semibold">6. Conclusion et recommandations<textarea v-model="sections.conclusion" class="champ-saisie min-h-24 font-normal" /></label>
                    <p v-if="erreurDe('enregistrer')" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe('enregistrer') }}</p>
                    <div class="flex flex-wrap gap-2">
                        <button type="submit" class="bouton-secondaire" :disabled="enCours === 'enregistrer' || !modifie">Enregistrer le brouillon</button>
                        <button type="button" class="bouton-discret" :disabled="enCours === 'actualiser'" @click="agir('actualiser', () => actualiserChiffres(rapport.id), 'Chiffres mis à jour avec les données actuelles.')"><Icone nom="rapports" class="size-4" /> Actualiser les chiffres</button>
                    </div>
                </form>

                <section class="carte flex flex-col gap-3 p-6" aria-labelledby="titre-approbation">
                    <h2 id="titre-approbation" class="text-lg font-bold">Approbation</h2>
                    <Alerte v-if="aCompleter.length > 0" ton="attention">Encore {{ aCompleter.length }} passage{{ aCompleter.length > 1 ? 's' : '' }} à compléter : {{ aCompleter.join(' ; ') }}</Alerte>
                    <label class="flex items-start gap-2 text-sm"><input v-model="approuve" type="checkbox" class="mt-1 size-4 accent-[var(--c-accent)]"> J’ai relu l’aperçu complet : j’approuve ce rapport. Il ne pourra plus être modifié.</label>
                    <p v-if="erreurDe('approuver')" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe('approuver') }}</p>
                    <button type="button" class="bouton-primaire self-start" :disabled="!approuve || aCompleter.length > 0 || enCours === 'approuver'" @click="approuver"><Icone nom="coche" class="size-4" /> Approuver le rapport</button>
                </section>
            </template>

            <div v-else class="flex flex-wrap gap-2">
                <button type="button" class="bouton-primaire" :disabled="pages.length === 0" @click="telechargerPdf"><Icone nom="telecharger" class="size-4" /> Télécharger le PDF</button>
                <button type="button" class="bouton-secondaire" :disabled="images.length === 0" @click="imprimerPages(images)"><Icone nom="imprimer" class="size-4" /> Imprimer</button>
            </div>

            <section class="flex flex-col gap-3" aria-labelledby="titre-apercu">
                <h2 id="titre-apercu" class="text-lg font-bold">Aperçu{{ rapport.statut === 'brouillon' ? ' (mis à jour pendant que vous écrivez)' : '' }}</h2>
                <div v-if="images.length === 0" class="squelette aspect-[210/297] w-full max-w-2xl self-center" aria-hidden="true" />
                <div class="flex flex-col items-center gap-4 rounded-2xl bg-surface-2 p-2 sm:p-5">
                    <img v-for="(image, index) in images" :key="index" :src="image" :alt="`Rapport, page ${index + 1} sur ${images.length}`" class="feuille w-full max-w-2xl rounded-sm bg-white">
                </div>
            </section>
        </template>

        <MessageFlottant :texte="confirmation" @fermer="confirmation = ''" />
    </div>
</template>

<style scoped>
.feuille {
    aspect-ratio: 210 / 297;
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.12), 0 12px 32px -12px rgb(0 0 0 / 0.35);
}
</style>
