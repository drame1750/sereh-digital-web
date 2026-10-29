<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Alerte from '../../components/Alerte.vue';
import BadgeStatut from '../../components/BadgeStatut.vue';
import Icone from '../../components/Icone.vue';
import MessageFlottant from '../../components/MessageFlottant.vue';
import { useAction } from '../../composables/useAction.js';
import { libelleRole } from '../../billet.js';
import { dateCourte } from '../../donnees-exemple.js';
import { CHAMPS_PUBLICS, changerListePublique, listerActivitesAdmin, listerParticipants, MODE_DEMONSTRATION } from '../../services/donnees.js';
import { formaterTelephone } from '../../telephone.js';

/**
 * Participants et accompagnateurs de toutes les activités, archives comprises (cahier des charges,
 * section 4), avec la liste publique des participants de chaque activité : désactivée par défaut,
 * limitée aux personnes qui y ont consenti.
 */
const route = useRoute();
const router = useRouter();
const activites = ref([]);
const participants = ref(null);
const limite = ref(100);
const filtres = reactive({
    activiteId: typeof route.query.activite === 'string' ? route.query.activite : '',
    texte: typeof route.query.q === 'string' ? route.query.q : '',
    role: typeof route.query.role === 'string' ? route.query.role : '',
    statut: '',
    pointage: '',
});
const publique = reactive({ champs: [], conditions: false });

const STATUTS = { admise: 'admise', en_attente: 'en-attente', annulee: 'annulee' };
const activite = computed(() => activites.value.find((candidate) => candidate.id === filtres.activiteId) ?? null);
const consentements = computed(() => (participants.value ?? []).filter((personne) => personne.role === 'principal' && personne.statut === 'admise' && personne.publicationAcceptee).length);

let minuterie = 0;

async function charger() {
    participants.value = await listerParticipants(filtres);
    limite.value = 100;
}

async function chargerActivites() {
    activites.value = await listerActivitesAdmin({ archivees: 'toutes' });
    Object.assign(publique, { champs: [...(activite.value?.listePublique?.champs ?? ['nom', 'sousComite'])], conditions: false });
}

const { enCours, confirmation, agir, erreurDe } = useAction(chargerActivites);

function enregistrerListe(active) {
    return agir('liste', () => changerListePublique(filtres.activiteId, active, publique.champs, publique.conditions), active ? 'Liste publique activée.' : 'Liste publique désactivée.');
}

watch(filtres, () => {
    clearTimeout(minuterie);
    minuterie = setTimeout(charger, 250);
    router.replace({ query: Object.fromEntries(Object.entries({ activite: filtres.activiteId, q: filtres.texte.trim(), role: filtres.role }).filter(([, valeur]) => valeur)) });
}, { deep: true });

watch(() => filtres.activiteId, () => Object.assign(publique, { champs: [...(activite.value?.listePublique?.champs ?? ['nom', 'sousComite'])], conditions: false }));

watch(() => route.query.role, (role) => {
    filtres.role = typeof role === 'string' ? role : '';
});

onMounted(async () => {
    await Promise.all([chargerActivites(), charger()]);
});
</script>

<template>
    <div class="mx-auto flex max-w-6xl flex-col gap-6">
        <header class="flex flex-col gap-2">
            <p class="surtitre">Activités</p>
            <h1 class="text-3xl font-extrabold tracking-tight">{{ filtres.role === 'accompagnateur' ? 'Accompagnateurs' : 'Participants' }}</h1>
            <p class="text-encre-douce">Chaque personne, accompagnateurs compris, avec sa fiche, son QR code et ses autres activités.</p>
        </header>

        <Alerte v-if="MODE_DEMONSTRATION" ton="info" titre="Démonstration">Personnes fictives. Les activités de 2025 sont des archives d’exemple.</Alerte>

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label class="flex flex-col gap-1.5 text-sm font-semibold lg:col-span-2">Recherche
                <input v-model="filtres.texte" type="search" class="champ-saisie font-normal" placeholder="Nom ou numéro (4 chiffres au moins)">
            </label>
            <label class="flex flex-col gap-1.5 text-sm font-semibold">Activité
                <select v-model="filtres.activiteId" class="champ-saisie font-normal">
                    <option value="">Toutes</option>
                    <option v-for="choix in activites" :key="choix.id" :value="choix.id">{{ choix.titre }}{{ choix.edition ? ` · ${choix.edition}` : '' }}</option>
                </select>
            </label>
            <label class="flex flex-col gap-1.5 text-sm font-semibold">Rôle
                <select v-model="filtres.role" class="champ-saisie font-normal">
                    <option value="">Tous</option>
                    <option value="principal">Inscrits</option>
                    <option value="accompagnateur">Accompagnateurs</option>
                </select>
            </label>
            <div class="grid grid-cols-2 gap-3">
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Statut
                    <select v-model="filtres.statut" class="champ-saisie font-normal">
                        <option value="">Tous</option>
                        <option value="admise">Admis</option>
                        <option value="en_attente">En attente</option>
                        <option value="annulee">Annulés</option>
                    </select>
                </label>
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Présence
                    <select v-model="filtres.pointage" class="champ-saisie font-normal">
                        <option value="">Tous</option>
                        <option value="presents">Présents</option>
                        <option value="absents">Non pointés</option>
                    </select>
                </label>
            </div>
        </div>

        <section v-if="activite" class="carte flex flex-col gap-4 p-5" aria-labelledby="titre-liste-publique">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 id="titre-liste-publique" class="flex items-center gap-2 font-bold"><Icone nom="participants" class="size-5 text-or-600" /> Liste publique des participants</h2>
                <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="activite.listePublique?.active ? 'bg-ok-fond text-ok' : 'bg-surface-2 text-encre-douce'">{{ activite.listePublique?.active ? 'Activée' : 'Désactivée' }}</span>
            </div>
            <p class="text-sm text-encre-douce">Seules les personnes admises qui ont accepté la publication y figurent ({{ consentements }} pour cette activité), avec les champs choisis ; le statut montre la présence réellement pointée. Jamais de numéro de téléphone.</p>
            <fieldset class="flex flex-wrap gap-4">
                <legend class="mb-2 text-sm font-semibold">Champs publiés</legend>
                <label v-for="(libelle, cle) in CHAMPS_PUBLICS" :key="cle" class="flex items-center gap-2 text-sm"><input v-model="publique.champs" type="checkbox" :value="cle" :disabled="cle === 'nom'" class="size-4 accent-[var(--c-accent)]"> {{ libelle }}</label>
            </fieldset>
            <template v-if="!activite.listePublique?.active">
                <label class="flex items-start gap-2 text-sm"><input v-model="publique.conditions" type="checkbox" class="mt-1 size-4 accent-[var(--c-accent)]"> J’ai vérifié les conditions de publication : consentements recueillis et autorisation de l’ARTCI obtenue.</label>
                <button type="button" class="bouton-primaire self-start" :disabled="enCours === 'liste'" @click="enregistrerListe(true)">Activer la liste publique</button>
            </template>
            <div v-else class="flex flex-wrap gap-2">
                <RouterLink :to="{ name: 'participants-publics', params: { id: activite.id } }" class="bouton-secondaire"><Icone nom="oeil" class="size-4" /> Voir la page publique</RouterLink>
                <button type="button" class="bouton-discret" :disabled="enCours === 'liste'" @click="enregistrerListe(false)">Désactiver</button>
            </div>
            <p v-if="erreurDe('liste')" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe('liste') }}</p>
        </section>

        <p class="text-sm font-semibold text-encre-douce" aria-live="polite">{{ participants ? `${participants.length} personne${participants.length > 1 ? 's' : ''}` : 'Chargement…' }}</p>

        <div v-if="!participants" class="flex flex-col gap-3" aria-hidden="true">
            <div v-for="index in 5" :key="index" class="squelette h-16" />
        </div>
        <ul v-else class="carte divide-y divide-ligne">
            <li v-for="personne in participants.slice(0, limite)" :key="personne.id">
                <RouterLink :to="{ name: 'admin-participant', params: { id: personne.id } }" class="grid gap-2 p-4 hover:bg-surface-2 sm:grid-cols-[1.4fr_1.2fr_auto] sm:items-center">
                    <span class="min-w-0">
                        <span class="block font-semibold">{{ personne.nom }}</span>
                        <span class="block text-sm text-encre-douce">{{ libelleRole(personne) }}{{ personne.inscritPar ? `, avec ${personne.inscritPar}` : '' }}{{ personne.telephone ? ` · ${formaterTelephone(personne.telephone)}` : '' }}</span>
                    </span>
                    <span class="text-sm text-encre-douce">{{ personne.activite?.titre }}{{ personne.activite?.edition ? ` · ${personne.activite.edition}` : '' }}<span class="block text-xs">{{ personne.activite ? dateCourte(personne.activite.date) : '' }}</span></span>
                    <span class="flex flex-wrap items-center gap-2">
                        <BadgeStatut :statut="STATUTS[personne.statut]" />
                        <span v-if="personne.pointeA" class="rounded-full bg-ok-fond px-2.5 py-1 text-xs font-semibold text-ok">Présent</span>
                    </span>
                </RouterLink>
            </li>
            <li v-if="participants.length === 0" class="p-5 text-encre-douce">Personne ne correspond à ces filtres.</li>
        </ul>
        <button v-if="participants && participants.length > limite" type="button" class="bouton-secondaire self-center" @click="limite += 100">Afficher 100 de plus</button>

        <MessageFlottant :texte="confirmation" @fermer="confirmation = ''" />
    </div>
</template>
