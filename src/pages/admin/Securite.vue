<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import Alerte from '../../components/Alerte.vue';
import Icone from '../../components/Icone.vue';
import MessageFlottant from '../../components/MessageFlottant.vue';
import MonCompte from '../../components/MonCompte.vue';
import { useAction } from '../../composables/useAction.js';
import { instant } from '../../donnees-exemple.js';
import { evenementsDeSecurite } from '../../services/comptes.js';
import { lireJournal, MODE_DEMONSTRATION } from '../../services/donnees.js';
import { ajouterMesure, listerIncidents, signalerIncident, TYPES_INCIDENT } from '../../services/systeme.js';

/**
 * Sécurité (cahier des charges, section 9) : journal d'audit filtrable, tentatives de connexion
 * refusées, mon compte et mes appareils, et signalement des incidents avec les mesures prises.
 * Le journal ne se modifie ni ne s'efface depuis l'interface.
 */
const onglet = ref('journal');
const journal = ref(null);
const evenements = ref([]);
const incidents = ref([]);
const filtres = reactive({ auteur: '', categorie: '', resultat: '', du: '', au: '', texte: '' });
const signalement = reactive({ type: '', gravite: 'normale', description: '' });
const mesures = reactive({});

const CATEGORIES = {
    activites: 'Activités',
    publications: 'Publications',
    inscriptions: 'Inscriptions',
    pointage: 'Pointage',
    courriers: 'Courriers',
    comptes: 'Comptes',
    exports: 'Exports',
    rapports: 'Rapports',
    archives: 'Archives et corbeille',
    sauvegardes: 'Sauvegardes',
    parametres: 'Paramètres',
    securite: 'Sécurité',
    general: 'Autre',
};

const auteurs = computed(() => [...new Set((journal.value ?? []).map((entree) => entree.auteur))].sort());
const { enCours, confirmation, agir, erreurDe } = useAction(chargerIncidents);

async function chargerJournal() {
    journal.value = await lireJournal(filtres);
}

async function chargerIncidents() {
    incidents.value = await listerIncidents();
}

async function signaler() {
    if (await agir('signalement', () => signalerIncident(signalement), 'Incident signalé. Il reste ouvert jusqu’à sa clôture.')) {
        Object.assign(signalement, { type: '', gravite: 'normale', description: '' });
    }
}

async function mesure(incident, clore) {
    if (await agir(`mesure-${incident.id}`, () => ajouterMesure(incident.id, mesures[incident.id] ?? '', clore), clore ? 'Incident clos.' : 'Mesure ajoutée.')) {
        mesures[incident.id] = '';
    }
}

watch(filtres, chargerJournal, { deep: true });

onMounted(async () => {
    [evenements.value] = await Promise.all([evenementsDeSecurite(), chargerJournal(), chargerIncidents()]);
});
</script>

<template>
    <div class="mx-auto flex max-w-5xl flex-col gap-6">
        <header class="flex flex-col gap-2">
            <p class="surtitre">Système</p>
            <h1 class="text-3xl font-extrabold tracking-tight">Sécurité</h1>
            <p class="text-encre-douce">Lecture du journal réservée à l’administrateur principal. Aucun mot de passe ni secret n’y est jamais noté.</p>
        </header>

        <Alerte v-if="MODE_DEMONSTRATION" ton="info" titre="Démonstration">Le journal ne contient que les opérations faites dans cet onglet. Avec Supabase, il sera tenu par le serveur, protégé contre toute modification, et gardé 12 mois.</Alerte>

        <div class="flex flex-wrap gap-2 border-b border-ligne" role="tablist">
            <button
                v-for="choix in [{ cle: 'journal', libelle: 'Journal d’audit' }, { cle: 'connexions', libelle: 'Connexions refusées' }, { cle: 'incidents', libelle: 'Incidents' }, { cle: 'compte', libelle: 'Mon compte' }]"
                :key="choix.cle"
                type="button"
                role="tab"
                class="-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold"
                :class="onglet === choix.cle ? 'border-accent text-encre' : 'border-transparent text-encre-douce hover:text-encre'"
                :aria-selected="onglet === choix.cle"
                @click="onglet = choix.cle"
            >{{ choix.libelle }}</button>
        </div>

        <template v-if="onglet === 'journal'">
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Recherche<input v-model="filtres.texte" type="search" class="champ-saisie font-normal" placeholder="Action ou cible"></label>
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Utilisateur
                    <select v-model="filtres.auteur" class="champ-saisie font-normal">
                        <option value="">Tous</option>
                        <option v-for="nom in auteurs" :key="nom" :value="nom">{{ nom }}</option>
                    </select>
                </label>
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Type d’action
                    <select v-model="filtres.categorie" class="champ-saisie font-normal">
                        <option value="">Tous</option>
                        <option v-for="(libelle, cle) in CATEGORIES" :key="cle" :value="cle">{{ libelle }}</option>
                    </select>
                </label>
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Résultat
                    <select v-model="filtres.resultat" class="champ-saisie font-normal">
                        <option value="">Tous</option>
                        <option value="reussi">Réussi</option>
                        <option value="refuse">Refusé</option>
                    </select>
                </label>
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Du<input v-model="filtres.du" type="date" class="champ-saisie font-normal"></label>
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Au<input v-model="filtres.au" type="date" class="champ-saisie font-normal"></label>
            </div>

            <section class="carte overflow-hidden" aria-label="Journal d’audit">
                <div v-if="!journal" class="squelette m-5 h-24" aria-hidden="true" />
                <p v-else-if="journal.length === 0" class="p-5 text-sm text-encre-douce">Aucune opération ne correspond. Faites une action (publier une activité, valider une inscription…) : elle apparaîtra ici.</p>
                <div v-else class="overflow-x-auto">
                    <table class="w-full min-w-[44rem] text-left text-sm">
                        <thead class="bg-surface-2 text-xs tracking-wide text-encre-douce uppercase">
                            <tr>
                                <th scope="col" class="px-4 py-3">Date</th>
                                <th scope="col" class="px-4 py-3">Utilisateur</th>
                                <th scope="col" class="px-4 py-3">Action</th>
                                <th scope="col" class="px-4 py-3">Cible</th>
                                <th scope="col" class="px-4 py-3">Résultat</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(entree, index) in journal" :key="index" class="border-t border-ligne align-top">
                                <td class="px-4 py-3 whitespace-nowrap">{{ instant(entree.le) }}</td>
                                <td class="px-4 py-3">{{ entree.auteur }}</td>
                                <td class="px-4 py-3 font-semibold">{{ entree.action }}<span class="block text-xs font-normal text-encre-douce">{{ CATEGORIES[entree.categorie] ?? 'Autre' }}</span></td>
                                <td class="px-4 py-3 text-encre-douce">{{ entree.cible }}</td>
                                <td class="px-4 py-3"><span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="entree.resultat === 'refuse' ? 'bg-danger-fond text-danger' : 'bg-ok-fond text-ok'">{{ entree.resultat === 'refuse' ? 'Refusé' : 'Réussi' }}</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </template>

        <section v-else-if="onglet === 'connexions'" class="carte flex flex-col gap-3 p-6" aria-label="Connexions refusées">
            <p class="text-sm text-encre-douce">Après 5 échecs pour un même numéro, la connexion est bloquée 15 minutes. Les numéros sont masqués ; aucun mot de passe n’est noté.</p>
            <p v-if="evenements.length === 0" class="text-sm text-encre-douce">Aucun événement pour le moment.</p>
            <ul class="flex flex-col gap-2">
                <li v-for="(evenement, index) in evenements" :key="index" class="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-surface-2 p-3 text-sm">
                    <span><span class="font-semibold">{{ evenement.type }}</span> · <span class="text-encre-douce">{{ evenement.detail }}</span></span>
                    <span class="text-xs text-encre-douce">{{ instant(evenement.le) }}</span>
                </li>
            </ul>
        </section>

        <template v-else-if="onglet === 'incidents'">
            <form class="carte flex flex-col gap-4 p-6" novalidate @submit.prevent="signaler">
                <h2 class="text-lg font-bold">Signaler un incident</h2>
                <div class="grid gap-4 sm:grid-cols-2">
                    <label class="flex flex-col gap-1.5 text-sm font-semibold">Type
                        <select v-model="signalement.type" class="champ-saisie font-normal">
                            <option value="">Choisir…</option>
                            <option v-for="(libelle, cle) in TYPES_INCIDENT" :key="cle" :value="cle">{{ libelle }}</option>
                        </select>
                    </label>
                    <label class="flex flex-col gap-1.5 text-sm font-semibold">Gravité
                        <select v-model="signalement.gravite" class="champ-saisie font-normal">
                            <option value="normale">Normale</option>
                            <option value="grave">Grave : des personnes peuvent être touchées</option>
                        </select>
                    </label>
                </div>
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Ce qui s’est passé<textarea v-model="signalement.description" class="champ-saisie min-h-24 font-normal" /></label>
                <p v-if="erreurDe('signalement')" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe('signalement') }}</p>
                <button type="submit" class="bouton-primaire self-start" :disabled="enCours === 'signalement'">Signaler</button>
            </form>

            <Alerte ton="attention" titre="Mesures possibles">
                Désactiver un compte ou fermer ses sessions (rubrique Comptes), activer la maintenance pour bloquer les modifications (État du système), puis restaurer une sauvegarde après essai sur le projet de test. Si des données personnelles sont touchées, l’obligation de prévenir les personnes ou l’ARTCI est à évaluer avec un juriste.
            </Alerte>

            <p v-if="incidents.length === 0" class="carte p-5 text-sm text-encre-douce">Aucun incident signalé.</p>
            <article v-for="incident in incidents" :key="incident.id" class="carte flex flex-col gap-3 p-5">
                <div class="flex flex-wrap items-center gap-2">
                    <h2 class="font-bold">{{ TYPES_INCIDENT[incident.type] }}</h2>
                    <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="incident.gravite === 'grave' ? 'bg-danger-fond text-danger' : 'bg-attention-fond text-attention'">{{ incident.gravite === 'grave' ? 'Grave' : 'Normale' }}</span>
                    <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="incident.closLe ? 'bg-ok-fond text-ok' : 'bg-info-fond text-info'">{{ incident.closLe ? 'Clos' : 'Ouvert' }}</span>
                </div>
                <p class="text-sm">{{ incident.description }}</p>
                <p class="text-xs text-encre-douce">Signalé le {{ instant(incident.le) }} par {{ incident.par }}</p>
                <ol v-if="incident.mesures.length > 0" class="flex flex-col gap-1 border-l-2 border-ligne pl-4 text-sm">
                    <li v-for="(entree, index) in incident.mesures" :key="index"><span class="font-semibold">{{ entree.texte }}</span> <span class="text-xs text-encre-douce">· {{ instant(entree.le) }}, {{ entree.par }}</span></li>
                </ol>
                <form v-if="!incident.closLe" class="flex flex-col gap-2" novalidate @submit.prevent="mesure(incident, false)">
                    <label :for="`mesure-${incident.id}`" class="text-sm font-semibold">Mesure prise</label>
                    <input :id="`mesure-${incident.id}`" v-model="mesures[incident.id]" class="champ-saisie" placeholder="Compte désactivé, sessions fermées…">
                    <p v-if="erreurDe(`mesure-${incident.id}`)" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe(`mesure-${incident.id}`) }}</p>
                    <div class="flex flex-wrap gap-2">
                        <button type="submit" class="bouton-secondaire" :disabled="enCours === `mesure-${incident.id}`">Ajouter la mesure</button>
                        <button type="button" class="bouton-discret" :disabled="enCours === `mesure-${incident.id}`" @click="mesure(incident, true)"><Icone nom="coche" class="size-4" /> Ajouter et clore l’incident</button>
                    </div>
                </form>
            </article>
        </template>

        <MonCompte v-else />

        <MessageFlottant :texte="confirmation" @fermer="confirmation = ''" />
    </div>
</template>
