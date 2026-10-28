<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import Alerte from '../../components/Alerte.vue';
import BadgeStatut from '../../components/BadgeStatut.vue';
import Icone from '../../components/Icone.vue';
import { billetPng, libelleRole, qrCodeImage, telecharger } from '../../billet.js';
import { dateLongue } from '../../donnees-exemple.js';
import { lireParJeton, MODE_DEMONSTRATION } from '../../services/donnees.js';
import { formaterTelephone } from '../../telephone.js';

/**
 * Page personnelle d'un groupe d'inscription, ouverte par le lien secret : récapitulatif, QR codes
 * et billets. Toute personne qui a ce lien voit ces informations : la page le dit clairement.
 */
const route = useRoute();
const groupe = ref(undefined);
const images = ref({});
const lienCopie = ref(false);
const nouvelle = route.query.nouvelle === '1';

const personnes = computed(() => (groupe.value ? [groupe.value.principal, ...groupe.value.accompagnateurs] : []));
const admise = computed(() => groupe.value?.principal.statut === 'admise');
const lienPersonnel = computed(() => `${location.origin}${location.pathname}#/inscription/${route.params.jeton}`);
const partagePossible = typeof navigator.share === 'function';

onMounted(async () => {
    groupe.value = await lireParJeton(route.params.jeton);

    if (groupe.value) {
        const codes = await Promise.all(personnes.value.map((personne) => qrCodeImage(personne.codeQr)));
        images.value = Object.fromEntries(personnes.value.map((personne, index) => [personne.id, codes[index]]));
    }
});

async function copierLien() {
    try {
        await navigator.clipboard.writeText(lienPersonnel.value);
        lienCopie.value = true;
        setTimeout(() => {
            lienCopie.value = false;
        }, 2500);
    } catch {
        lienCopie.value = false;
    }
}

async function partagerLien() {
    try {
        await navigator.share({ title: 'Mon inscription · SEREH Digital', url: lienPersonnel.value });
    } catch {
        // Partage annulé par la personne : rien à faire.
    }
}

function imprimer() {
    window.print();
}

async function telechargerBillet(personne) {
    const blob = await billetPng(personne, groupe.value.activite, { demonstration: MODE_DEMONSTRATION });
    const nom = personne.nom.normalize('NFD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
    telecharger(blob, `billet-${groupe.value.activite.id}-${nom}.png`);
}
</script>

<template>
    <div class="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
        <div v-if="groupe === undefined" class="flex flex-col gap-4" aria-hidden="true">
            <div class="squelette h-24" />
            <div class="squelette h-72" />
        </div>

        <div v-else-if="groupe === null" class="carte flex flex-col gap-3 p-8">
            <h1 class="text-2xl font-bold">Lien invalide</h1>
            <p class="text-encre-douce">Ce lien personnel n'existe pas ou n'est plus valable. Si vous avez perdu votre lien, contactez l'organisation : après vérification de votre identité, elle vous enverra un nouveau lien.</p>
            <RouterLink to="/" class="bouton-primaire self-start">Revenir à l'accueil</RouterLink>
        </div>

        <template v-else>
            <header class="flex flex-col gap-2 print:hidden">
                <p class="surtitre">Mon inscription</p>
                <h1 class="text-3xl font-extrabold tracking-tight">{{ groupe.activite.titre }} · {{ groupe.activite.edition }}</h1>
                <p class="text-encre-douce"><span class="first-letter:uppercase">{{ dateLongue(groupe.activite.date) }}</span>, {{ groupe.activite.heure }}, {{ groupe.activite.lieu }}</p>
            </header>

            <Alerte v-if="MODE_DEMONSTRATION" ton="info" titre="Démonstration" class="print:hidden">Cette inscription est fictive : elle reste dans cet onglet, et ses billets ne sont valables nulle part.</Alerte>

            <section class="etat carte relative overflow-hidden p-6 print:hidden" :class="admise ? 'etat--admise' : 'etat--attente'" v-apparition>
                <div class="flex items-start gap-4">
                    <span class="inline-flex size-12 flex-none items-center justify-center rounded-2xl text-white" :class="admise ? 'bg-vert-700' : 'bg-or-600'">
                        <Icone :nom="admise ? 'coche' : 'horloge'" class="size-6" />
                    </span>
                    <div>
                        <p class="text-lg font-bold">
                            {{ nouvelle ? (admise ? 'Inscription enregistrée et admise' : 'Inscription enregistrée, en attente') : (admise ? 'Inscription admise' : 'Inscription en attente') }}
                        </p>
                        <p class="text-sm text-encre-douce">
                            {{ admise
                                ? `Un QR code pour chaque personne du groupe (${personnes.length}). Présentez-le à l’entrée.`
                                : 'Toutes les places étaient prises : l’organisation doit valider votre inscription. En attendant, ces QR codes ne donnent pas accès à l’entrée.' }}
                        </p>
                    </div>
                </div>
            </section>

            <section class="carte flex flex-col gap-3 border-or-400/60 p-6 print:hidden" aria-labelledby="titre-lien">
                <h2 id="titre-lien" class="flex items-center gap-2 text-lg font-bold"><Icone nom="alerte" class="size-5 text-or-600" /> Gardez ce lien</h2>
                <p class="text-sm text-encre-douce">Il permet de revenir sur cette page et de retrouver vos QR codes. Toute personne qui a ce lien voit vos informations : ne le partagez qu'avec les personnes de votre groupe.</p>
                <div class="flex flex-col gap-2 sm:flex-row">
                    <label for="lien-personnel" class="sr-only">Votre lien personnel</label>
                    <input id="lien-personnel" class="champ-saisie font-mono text-xs" :value="lienPersonnel" readonly @focus="$event.target.select()">
                    <button type="button" class="bouton-primaire flex-none" @click="copierLien">
                        <Icone :nom="lienCopie ? 'coche' : 'inscriptions'" class="size-4" /> {{ lienCopie ? 'Lien copié' : 'Copier le lien' }}
                    </button>
                    <button v-if="partagePossible" type="button" class="bouton-secondaire flex-none" @click="partagerLien">Partager</button>
                </div>
            </section>

            <section aria-labelledby="titre-billets">
                <h2 id="titre-billets" class="titre-section mb-6 print:hidden">QR codes</h2>
                <div class="grid gap-6 sm:grid-cols-2">
                    <article v-for="(personne, index) in personnes" :key="personne.id" class="billet carte overflow-hidden" v-apparition="index * 100">
                        <div class="billet__entete px-5 py-4 text-white">
                            <p class="text-xs font-bold tracking-[0.16em] text-or-200 uppercase">{{ libelleRole(personne) }}</p>
                            <p class="text-lg font-bold">{{ personne.nom }}</p>
                        </div>
                        <div class="flex flex-col items-center gap-3 p-5">
                            <img v-if="images[personne.id]" :src="images[personne.id]" :alt="`QR code de ${personne.nom}`" width="240" height="240" class="rounded-xl bg-white p-2">
                            <div v-else class="squelette size-60" aria-hidden="true" />
                            <BadgeStatut :statut="personne.statut === 'admise' ? 'admise' : 'en-attente'" />
                            <button type="button" class="bouton-secondaire w-full print:hidden" @click="telechargerBillet(personne)">
                                Télécharger le billet
                            </button>
                        </div>
                    </article>
                </div>
                <button type="button" class="bouton-discret mt-4 print:hidden" @click="imprimer">Imprimer les QR codes</button>
            </section>

            <section class="carte p-6 print:hidden" aria-labelledby="titre-recapitulatif">
                <h2 id="titre-recapitulatif" class="mb-4 text-lg font-bold">Récapitulatif</h2>
                <dl class="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[auto_1fr]">
                    <dt class="font-semibold text-encre-douce">Nom complet</dt><dd>{{ groupe.principal.nom }}</dd>
                    <dt class="font-semibold text-encre-douce">Téléphone</dt><dd>{{ formaterTelephone(groupe.principal.telephone) }}</dd>
                    <dt class="font-semibold text-encre-douce">Sexe</dt><dd>{{ groupe.principal.sexe === 'femme' ? 'Femme' : 'Homme' }}</dd>
                    <dt class="font-semibold text-encre-douce">Ville ou commune</dt><dd>{{ groupe.principal.ville }}</dd>
                    <dt class="font-semibold text-encre-douce">Sous-Comité et Section</dt><dd>{{ [groupe.principal.sousComite, groupe.principal.section].filter(Boolean).join(' · ') || 'Non précisé' }}</dd>
                    <template v-if="groupe.principal.mineur">
                        <dt class="font-semibold text-encre-douce">Parent ou tuteur</dt><dd>{{ groupe.principal.tuteur.nom }} · {{ formaterTelephone(groupe.principal.tuteur.telephone) }}</dd>
                    </template>
                    <dt class="font-semibold text-encre-douce">Accompagnateurs</dt><dd>{{ groupe.accompagnateurs.length ? groupe.accompagnateurs.map((personne) => personne.nom).join(', ') : 'Aucun' }}</dd>
                    <dt class="font-semibold text-encre-douce">Liste publique</dt><dd>{{ groupe.principal.publicationAcceptee ? 'Accord donné pour y figurer' : 'Pas d’accord : votre nom n’y figurera pas' }}</dd>
                </dl>
            </section>
        </template>
    </div>
</template>

<style scoped>
.etat::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 6px;
}

.etat--admise::before {
    background: linear-gradient(180deg, var(--color-vert-500), var(--color-vert-800));
}

.etat--attente::before {
    background: linear-gradient(180deg, var(--color-or-300), var(--color-or-600));
}

.billet__entete {
    background: linear-gradient(135deg, var(--color-vert-700), var(--color-vert-950));
    border-bottom: 4px solid var(--color-or-500);
}

@media print {
    .billet {
        break-inside: avoid;
        box-shadow: none;
    }
}
</style>
