<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { telecharger } from '../billet.js';
import { imagesDesPages, imprimerPages, pagesDeLettre, pdfDesPages } from '../lettre.js';
import { adresseDuFichier, PARAMETRES_COURRIER } from '../services/courriers.js';
import { MODE_DEMONSTRATION } from '../services/donnees.js';
import Alerte from './Alerte.vue';
import Icone from './Icone.vue';

/**
 * Le document d'un courrier, lisible dans la page, à télécharger ou à imprimer : soit le PDF créé
 * depuis un modèle, soit le PDF importé.
 */
const props = defineProps({
    courrier: { type: Object, required: true },
    /** PDF choisi dans le formulaire, pas encore enregistré. */
    fichierLocal: { type: Object, default: null },
});

const emit = defineEmits(['telecharge']);

const pages = ref([]);
const images = ref([]);
const adresse = ref(null);
const chargement = ref(true);
const erreur = ref('');
let adresseLocale = null;

const nomFichier = computed(() => `${(props.courrier.reference || 'courrier').replace(/[^\w-]+/g, '-')}.pdf`);
const lettre = computed(() => ({ ...PARAMETRES_COURRIER, ...props.courrier.contenu, reference: props.courrier.reference, objet: props.courrier.objet }));

function liberer() {
    if (adresseLocale) {
        URL.revokeObjectURL(adresseLocale);
        adresseLocale = null;
    }
}

async function preparer() {
    chargement.value = true;
    erreur.value = '';
    liberer();

    try {
        if (props.courrier.source === 'modele') {
            pages.value = await pagesDeLettre(lettre.value, { demonstration: MODE_DEMONSTRATION });
            images.value = imagesDesPages(pages.value);
            adresse.value = null;
        } else {
            adresseLocale = props.fichierLocal ? URL.createObjectURL(props.fichierLocal) : await adresseDuFichier(props.courrier.fichier);
            adresse.value = adresseLocale;
        }
    } catch {
        erreur.value = 'Le document n’a pas pu être préparé sur cet appareil.';
    } finally {
        chargement.value = false;
    }
}

async function telechargerPdf() {
    telecharger(await pdfDesPages(pages.value, props.courrier.objet), nomFichier.value);
    emit('telecharge');
}

// Le document n'est redessiné que si son contenu change, pas à chaque rechargement du suivi.
const empreinte = computed(() => JSON.stringify([
    props.courrier.reference,
    props.courrier.objet,
    props.courrier.source,
    props.courrier.contenu,
    props.courrier.fichier?.cle ?? props.courrier.fichier?.nom ?? null,
    props.fichierLocal ? [props.fichierLocal.name, props.fichierLocal.size, props.fichierLocal.lastModified] : null,
]));

watch(empreinte, preparer, { immediate: true });
onBeforeUnmount(liberer);
</script>

<template>
    <div class="flex flex-col gap-4">
        <div v-if="chargement" class="squelette aspect-[210/297] w-full max-w-2xl self-center" aria-hidden="true" />

        <Alerte v-else-if="erreur" ton="danger">{{ erreur }}</Alerte>

        <template v-else-if="courrier.source === 'modele'">
            <div class="flex flex-wrap gap-2">
                <button type="button" class="bouton-primaire" @click="telechargerPdf"><Icone nom="telecharger" class="size-4" /> Télécharger le PDF</button>
                <button type="button" class="bouton-secondaire" @click="imprimerPages(images)"><Icone nom="imprimer" class="size-4" /> Imprimer</button>
            </div>
            <div class="feuilles -mx-2 flex flex-col items-center gap-4 rounded-2xl p-1.5 sm:mx-0 sm:p-5">
                <img
                    v-for="(image, index) in images"
                    :key="index"
                    :src="image"
                    :alt="index === 0 ? `Courrier « ${courrier.objet} », page 1 sur ${images.length}` : `Page ${index + 1} sur ${images.length}`"
                    class="feuille w-full max-w-2xl rounded-sm bg-white"
                >
            </div>
            <details class="text-sm text-encre-douce">
                <summary class="cursor-pointer font-semibold">Lire le courrier en texte simple (plus facile sur téléphone)</summary>
                <div class="mt-2 flex flex-col gap-2 rounded-xl bg-surface-2 p-4 whitespace-pre-line">
                    <p>{{ lettre.lieu }} · Réf. {{ lettre.reference }}</p>
                    <p>À : {{ lettre.destinataire }}</p>
                    <p class="font-semibold">Objet : {{ lettre.objet }}</p>
                    <p>{{ lettre.formule }}</p>
                    <p>{{ lettre.corps }}</p>
                    <p>{{ lettre.pour }}, {{ lettre.titreSignataire }} : {{ lettre.nomSignataire }}</p>
                </div>
            </details>
        </template>

        <template v-else-if="adresse">
            <div class="flex flex-wrap gap-2">
                <a :href="adresse" :download="nomFichier" class="bouton-primaire" @click="emit('telecharge')"><Icone nom="telecharger" class="size-4" /> Télécharger le PDF</a>
                <a :href="adresse" target="_blank" rel="noopener" class="bouton-secondaire"><Icone nom="imprimer" class="size-4" /> Ouvrir pour imprimer</a>
            </div>
            <iframe :src="adresse" :title="`Courrier « ${courrier.objet} »`" class="h-[75vh] w-full rounded-2xl border border-ligne bg-white" />
            <p class="text-xs text-encre-douce">Si le PDF ne s’affiche pas sur votre téléphone, utilisez « Ouvrir pour imprimer » ou « Télécharger le PDF ».</p>
        </template>

        <Alerte v-else ton="attention" titre="PDF indisponible">
            {{ MODE_DEMONSTRATION ? 'En démonstration, un PDF importé n’est gardé que pendant la visite : il a été perdu au rechargement de la page.' : 'Le document n’a pas pu être chargé. Réessayez dans un instant.' }}
        </Alerte>
    </div>
</template>

<style scoped>
.feuilles {
    background: color-mix(in srgb, var(--c-encre) 8%, var(--c-surface-2));
}

.feuille {
    aspect-ratio: 210 / 297;
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.12), 0 12px 32px -12px rgb(0 0 0 / 0.35);
}
</style>
