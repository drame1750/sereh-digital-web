<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Alerte from '../../components/Alerte.vue';
import Icone from '../../components/Icone.vue';
import { libelleRole, planchesDeQrCodes, telecharger } from '../../billet.js';
import { imagesDesPages, imprimerPages, pdfDesPages } from '../../lettre.js';
import { listerActivitesAdmin, listerParticipants, MODE_DEMONSTRATION, noterOperation } from '../../services/donnees.js';

/**
 * QR codes en lot (cahier des charges, section 5) : planches A4 de huit cartes à imprimer et
 * découper, pour les personnes admises d'une activité. Format provisoire, en attendant celui des
 * badges.
 */
const route = useRoute();
const activites = ref([]);
const activiteId = ref(typeof route.query.activite === 'string' ? route.query.activite : '');
const personnes = ref([]);
const choisies = ref([]);
const filtre = ref('toutes');
const apercu = ref([]);
const preparation = ref(false);
const erreur = ref('');

const activite = computed(() => activites.value.find((candidate) => candidate.id === activiteId.value) ?? null);
const affichees = computed(() => personnes.value.filter((personne) => filtre.value === 'toutes' || (filtre.value === 'non-pointes' ? !personne.pointeA : personne.role === filtre.value)));
const selection = computed(() => personnes.value.filter((personne) => choisies.value.includes(personne.id)));

async function chargerPersonnes() {
    apercu.value = [];
    personnes.value = activiteId.value ? (await listerParticipants({ activiteId: activiteId.value, statut: 'admise' })).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')) : [];
    choisies.value = personnes.value.map((personne) => personne.id);
}

function toutChoisir(valeur) {
    choisies.value = valeur ? affichees.value.map((personne) => personne.id) : [];
}

async function preparer() {
    preparation.value = true;
    erreur.value = '';

    try {
        const pages = await planchesDeQrCodes(selection.value, activite.value, { demonstration: MODE_DEMONSTRATION });
        apercu.value = { pages, images: imagesDesPages(pages) };
        noterOperation('Planches de QR codes préparées', `${activite.value.titre} · ${selection.value.length} personne${selection.value.length > 1 ? 's' : ''}`, 'inscriptions');
    } catch {
        erreur.value = 'Les planches n’ont pas pu être préparées sur cet appareil.';
    } finally {
        preparation.value = false;
    }
}

async function telechargerPdf() {
    telecharger(await pdfDesPages(apercu.value.pages, `QR codes · ${activite.value.titre}`), `qr-codes-${activite.value.id}.pdf`);
}

watch(activiteId, chargerPersonnes);

onMounted(async () => {
    activites.value = await listerActivitesAdmin();
    activiteId.value ||= activites.value.find((candidate) => candidate.statut !== 'terminee')?.id ?? '';
    await chargerPersonnes();
});
</script>

<template>
    <div class="mx-auto flex max-w-5xl flex-col gap-6">
        <header class="flex flex-col gap-2">
            <p class="surtitre">Activités</p>
            <h1 class="text-3xl font-extrabold tracking-tight">QR codes en lot</h1>
            <p class="text-encre-douce">Huit cartes par feuille A4, à découper le long des pointillés. Le QR code de chaque personne reste aussi disponible sur sa fiche et sur sa page personnelle.</p>
        </header>

        <Alerte ton="attention" titre="Format provisoire">Le format définitif des badges reste à choisir. Ces cartes reprennent les informations du billet : activité, nom, rôle, date, lieu et QR code.</Alerte>

        <div class="grid gap-3 sm:grid-cols-2">
            <label class="flex flex-col gap-1.5 text-sm font-semibold">Activité
                <select v-model="activiteId" class="champ-saisie font-normal">
                    <option value="" disabled>Choisir…</option>
                    <option v-for="choix in activites" :key="choix.id" :value="choix.id">{{ choix.titre }}{{ choix.edition ? ` · ${choix.edition}` : '' }}</option>
                </select>
            </label>
            <label class="flex flex-col gap-1.5 text-sm font-semibold">Afficher
                <select v-model="filtre" class="champ-saisie font-normal">
                    <option value="toutes">Toutes les personnes admises</option>
                    <option value="principal">Les inscrits</option>
                    <option value="accompagnateur">Les accompagnateurs</option>
                    <option value="non-pointes">Les personnes pas encore pointées</option>
                </select>
            </label>
        </div>

        <section v-if="activite" class="carte flex flex-col gap-4 p-5" aria-labelledby="titre-selection">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 id="titre-selection" class="font-bold">{{ selection.length }} personne{{ selection.length > 1 ? 's' : '' }} choisie{{ selection.length > 1 ? 's' : '' }} · {{ Math.ceil(selection.length / 8) }} feuille{{ Math.ceil(selection.length / 8) > 1 ? 's' : '' }}</h2>
                <div class="flex flex-wrap gap-2">
                    <button type="button" class="bouton-discret" @click="toutChoisir(true)">Tout choisir</button>
                    <button type="button" class="bouton-discret" @click="toutChoisir(false)">Ne rien choisir</button>
                </div>
            </div>
            <p v-if="personnes.length === 0" class="text-sm text-encre-douce">Aucune personne admise pour cette activité.</p>
            <ul class="grid max-h-80 gap-1 overflow-y-auto sm:grid-cols-2">
                <li v-for="personne in affichees" :key="personne.id">
                    <label class="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-surface-2">
                        <input v-model="choisies" type="checkbox" :value="personne.id" class="size-4 accent-[var(--c-accent)]">
                        <span><span class="font-semibold">{{ personne.nom }}</span> <span class="text-encre-douce">· {{ libelleRole(personne) }}{{ personne.pointeA ? ' · pointé' : '' }}</span></span>
                    </label>
                </li>
            </ul>
            <button type="button" class="bouton-primaire self-start" :disabled="selection.length === 0 || preparation" @click="preparer"><Icone nom="qr" class="size-4" /> {{ preparation ? 'Préparation…' : 'Préparer les planches' }}</button>
            <p v-if="erreur" class="text-sm font-semibold text-danger" role="alert">{{ erreur }}</p>
        </section>

        <section v-if="apercu.images?.length" class="flex flex-col gap-4" aria-labelledby="titre-apercu">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 id="titre-apercu" class="text-lg font-bold">Aperçu</h2>
                <div class="flex flex-wrap gap-2">
                    <button type="button" class="bouton-primaire" @click="imprimerPages(apercu.images)"><Icone nom="imprimer" class="size-4" /> Imprimer</button>
                    <button type="button" class="bouton-secondaire" @click="telechargerPdf"><Icone nom="telecharger" class="size-4" /> Télécharger le PDF</button>
                </div>
            </div>
            <div class="flex flex-col items-center gap-4 rounded-2xl bg-surface-2 p-2 sm:p-5">
                <img v-for="(image, index) in apercu.images" :key="index" :src="image" :alt="`Planche ${index + 1} sur ${apercu.images.length}`" class="feuille w-full max-w-2xl rounded-sm bg-white">
            </div>
        </section>
    </div>
</template>

<style scoped>
.feuille {
    aspect-ratio: 210 / 297;
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.12), 0 12px 32px -12px rgb(0 0 0 / 0.35);
}
</style>
