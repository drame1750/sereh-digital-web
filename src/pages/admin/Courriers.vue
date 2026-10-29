<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import Alerte from '../../components/Alerte.vue';
import BadgeStatut from '../../components/BadgeStatut.vue';
import Icone from '../../components/Icone.vue';
import { dateCourte, instant } from '../../donnees-exemple.js';
import MessageFlottant from '../../components/MessageFlottant.vue';
import { useAction } from '../../composables/useAction.js';
import { listerCourriers, mettreBrouillonALaCorbeille } from '../../services/courriers.js';
import { MODE_DEMONSTRATION } from '../../services/donnees.js';

/**
 * Courriers officiels adressés aux membres du bureau, avec leur suivi (cahier des charges, section 6).
 * « À traiter » rassemble ce qui attend l'administrateur : questions, demandes de modification et
 * réponses tardives.
 */
const route = useRoute();
const courriers = ref(null);
const onglet = ref(route.query.onglet === 'a-traiter' ? 'a-traiter' : 'tous');

const ONGLETS = [
    { cle: 'tous', libelle: 'Tous' },
    { cle: 'a-traiter', libelle: 'À traiter' },
    { cle: 'brouillons', libelle: 'Brouillons' },
];

const affiches = computed(() => (courriers.value ?? []).filter((courrier) => ({
    tous: true,
    'a-traiter': courrier.statut === 'envoye' && courrier.nombres.aExaminer > 0,
    brouillons: courrier.statut === 'brouillon',
}[onglet.value])));

const nombreATraiter = computed(() => (courriers.value ?? []).filter((courrier) => courrier.statut === 'envoye' && courrier.nombres.aExaminer > 0).length);

async function charger() {
    courriers.value = await listerCourriers();
}

const { enCours, confirmation, agir, erreurDe } = useAction(charger);

onMounted(charger);
</script>

<template>
    <div class="mx-auto flex max-w-6xl flex-col gap-6">
        <header class="flex flex-wrap items-end justify-between gap-4">
            <div class="flex flex-col gap-2">
                <p class="surtitre">Bureau</p>
                <h1 class="text-3xl font-extrabold tracking-tight">Courriers</h1>
            </div>
            <div class="flex flex-wrap gap-2">
                <RouterLink :to="{ name: 'admin-modeles-courrier' }" class="bouton-secondaire"><Icone nom="document" class="size-4" /> Modèles</RouterLink>
                <RouterLink :to="{ name: 'admin-courrier-nouveau' }" class="bouton-primaire"><Icone nom="plus" class="size-4" /> Nouveau courrier</RouterLink>
            </div>
        </header>

        <Alerte v-if="MODE_DEMONSTRATION" ton="info" titre="Démonstration">Les courriers et les membres du bureau sont fictifs ; les changements restent dans cet onglet.</Alerte>

        <div class="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer les courriers">
            <button
                v-for="choix in ONGLETS"
                :key="choix.cle"
                type="button"
                role="tab"
                class="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors"
                :class="onglet === choix.cle ? 'bg-accent text-accent-texte' : 'bg-surface-2 hover:bg-ligne'"
                :aria-selected="onglet === choix.cle"
                @click="onglet = choix.cle"
            >
                {{ choix.libelle }}
                <span v-if="choix.cle === 'a-traiter' && nombreATraiter" class="inline-flex min-w-5 justify-center rounded-full bg-danger px-1.5 text-xs text-white">{{ nombreATraiter }}</span>
            </button>
        </div>

        <div v-if="!courriers" class="flex flex-col gap-4" aria-hidden="true">
            <div v-for="index in 3" :key="index" class="squelette h-40" />
        </div>

        <p v-else-if="affiches.length === 0" class="carte p-6 text-encre-douce">
            {{ onglet === 'a-traiter' ? 'Rien à traiter pour le moment.' : 'Aucun courrier ici.' }}
        </p>

        <article v-for="(courrier, index) in affiches" :key="courrier.id" class="carte flex flex-col gap-5 p-5 sm:p-6" v-apparition="index * 70">
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="flex min-w-0 flex-col gap-1.5">
                    <div class="flex flex-wrap gap-2">
                        <BadgeStatut :statut="courrier.statut === 'envoye' ? 'envoye' : 'brouillon'" />
                        <BadgeStatut v-if="!courrier.reponseAttendue" statut="information" />
                        <span v-if="courrier.nombres.aExaminer" class="inline-flex items-center gap-1.5 rounded-full bg-danger-fond px-2.5 py-1 text-xs font-semibold text-danger">
                            <Icone nom="alerte" class="size-3.5" /> {{ courrier.nombres.aExaminer }} à examiner
                        </span>
                    </div>
                    <h2 class="text-xl font-bold">{{ courrier.objet }}</h2>
                    <p class="text-sm text-encre-douce">
                        Réf. {{ courrier.reference }}
                        <template v-if="courrier.activite"> · {{ courrier.activite.titre }}</template>
                        · {{ courrier.statut === 'envoye' ? `envoyé le ${instant(courrier.envoyeLe)}` : `créé le ${instant(courrier.creeLe)}` }}
                        <template v-if="courrier.echeance"> · date limite : {{ dateCourte(courrier.echeance) }}</template>
                    </p>
                </div>
                <RouterLink
                    :to="courrier.statut === 'envoye' ? { name: 'admin-courrier', params: { id: courrier.id } } : { name: 'admin-courrier-modifier', params: { id: courrier.id } }"
                    class="bouton-secondaire"
                >
                    <Icone :nom="courrier.statut === 'envoye' ? 'oeil' : 'crayon'" class="size-4" /> {{ courrier.statut === 'envoye' ? 'Suivi' : 'Reprendre' }}
                </RouterLink>
            </div>

            <dl v-if="courrier.statut === 'envoye'" class="grid grid-cols-2 gap-3 text-center sm:grid-cols-5">
                <div class="rounded-xl bg-surface-2 p-3"><dt class="text-xs text-encre-douce">Destinataires</dt><dd class="text-xl font-bold tabular-nums">{{ courrier.nombres.destinataires }}</dd></div>
                <div class="rounded-xl bg-surface-2 p-3"><dt class="text-xs text-encre-douce">Consultés</dt><dd class="text-xl font-bold tabular-nums">{{ courrier.nombres.consultes }}</dd></div>
                <template v-if="courrier.reponseAttendue">
                    <div class="rounded-xl bg-surface-2 p-3"><dt class="text-xs text-encre-douce">Confirmations</dt><dd class="text-xl font-bold tabular-nums">{{ courrier.nombres.confirmations }}</dd></div>
                    <div class="rounded-xl bg-surface-2 p-3"><dt class="text-xs text-encre-douce">Absences</dt><dd class="text-xl font-bold tabular-nums">{{ courrier.nombres.absences }}</dd></div>
                    <div class="col-span-2 rounded-xl bg-surface-2 p-3 sm:col-span-1"><dt class="text-xs text-encre-douce">Sans réponse définitive</dt><dd class="text-xl font-bold tabular-nums">{{ courrier.nombres.enAttente }}</dd></div>
                </template>
            </dl>
            <div v-else class="flex flex-wrap items-center justify-between gap-3">
                <p class="text-sm text-encre-douce">Brouillon : {{ courrier.nombres.destinataires }} destinataire{{ courrier.nombres.destinataires > 1 ? 's' : '' }} prévu{{ courrier.nombres.destinataires > 1 ? 's' : '' }}. Rien n’est envoyé avant votre approbation.</p>
                <button type="button" class="bouton-discret" :disabled="enCours === courrier.id" @click="agir(courrier.id, () => mettreBrouillonALaCorbeille(courrier.id), 'Brouillon mis à la corbeille : vous pouvez le restaurer depuis les Archives.')"><Icone nom="fermer" class="size-4" /> Mettre à la corbeille</button>
            </div>
            <p v-if="erreurDe(courrier.id)" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe(courrier.id) }}</p>
        </article>

        <MessageFlottant :texte="confirmation" @fermer="confirmation = ''" />
    </div>
</template>
