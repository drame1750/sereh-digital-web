<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import Alerte from '../../components/Alerte.vue';
import ConfirmationSensible from '../../components/ConfirmationSensible.vue';
import Icone from '../../components/Icone.vue';
import MessageFlottant from '../../components/MessageFlottant.vue';
import { useAction } from '../../composables/useAction.js';
import { dateCourte, instant } from '../../donnees-exemple.js';
import { listerCorbeilleCourriers, restaurerBrouillon, supprimerBrouillonDefinitivement } from '../../services/courriers.js';
import {
    anonymiserActivite,
    archiverActivite,
    calendrierAnonymisation,
    listerActivitesAdmin,
    listerCorbeilleActivites,
    MODE_DEMONSTRATION,
    restaurerActivite,
    supprimerActiviteDefinitivement,
} from '../../services/donnees.js';
import { DUREES_CONSERVATION } from '../../services/parametres.js';

/**
 * Archives, corbeille et conservation des données (cahier des charges, section 8, et module 12) :
 * activités closes et leurs documents, recherche par année, corbeille avec restauration, suppression
 * définitive confirmée par mot de passe, et inscriptions rendues anonymes 12 mois après l'activité.
 */
const onglet = ref('archives');
const activites = ref(null);
const corbeille = ref([]);
const conservation = ref([]);
const filtres = reactive({ annee: '', texte: '', etat: '' });
const aConfirmer = ref('');

const closes = computed(() => (activites.value ?? []).filter((activite) => activite.archivee || activite.statut === 'terminee'));
const annees = computed(() => [...new Set(closes.value.map((activite) => activite.date.slice(0, 4)))].sort().reverse());
const affichees = computed(() => closes.value.filter((activite) => (!filtres.annee || activite.date.startsWith(filtres.annee))
    && (!filtres.etat || (filtres.etat === 'archivee' ? activite.archivee : !activite.archivee))
    && (!filtres.texte.trim() || `${activite.titre} ${activite.edition} ${activite.lieu}`.toLocaleLowerCase('fr').includes(filtres.texte.trim().toLocaleLowerCase('fr')))));

async function charger() {
    const [toutes, activitesJetees, courriersJetes, calendrier] = await Promise.all([listerActivitesAdmin({ archivees: 'toutes' }), listerCorbeilleActivites(), listerCorbeilleCourriers(), calendrierAnonymisation()]);
    activites.value = toutes;
    corbeille.value = [...activitesJetees, ...courriersJetes].sort((a, b) => b.supprimeLe.localeCompare(a.supprimeLe));
    conservation.value = calendrier;
}

const { enCours, confirmation, agir, erreurDe } = useAction(charger);

function restaurer(element) {
    return agir(`restaurer-${element.id}`, () => (element.type === 'activite' ? restaurerActivite(element.id) : restaurerBrouillon(element.id)), `« ${element.titre} » est restauré.`);
}

async function supprimer(element) {
    aConfirmer.value = '';
    await agir(`supprimer-${element.id}`, () => (element.type === 'activite' ? supprimerActiviteDefinitivement(element.id) : supprimerBrouillonDefinitivement(element.id)), `« ${element.titre} » est supprimé définitivement.`);
}

async function anonymiser(ligne) {
    aConfirmer.value = '';
    await agir(`anonymiser-${ligne.id}`, () => anonymiserActivite(ligne.id), (nombre) => `${nombre} inscription${nombre > 1 ? 's' : ''} rendue${nombre > 1 ? 's' : ''} anonyme${nombre > 1 ? 's' : ''}.`);
}

onMounted(charger);
</script>

<template>
    <div class="mx-auto flex max-w-5xl flex-col gap-6">
        <header class="flex flex-col gap-2">
            <p class="surtitre">Bureau</p>
            <h1 class="text-3xl font-extrabold tracking-tight">Archives</h1>
        </header>

        <Alerte v-if="MODE_DEMONSTRATION" ton="info" titre="Démonstration">Les activités de 2025 sont des archives d’exemple. Avec Supabase, la mise en anonymat se fera seule chaque nuit, par une tâche planifiée.</Alerte>

        <div class="flex flex-wrap gap-2 border-b border-ligne" role="tablist">
            <button
                v-for="choix in [{ cle: 'archives', libelle: 'Activités closes' }, { cle: 'corbeille', libelle: `Corbeille (${corbeille.length})` }, { cle: 'conservation', libelle: 'Conservation des données' }]"
                :key="choix.cle"
                type="button"
                role="tab"
                class="-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold"
                :class="onglet === choix.cle ? 'border-accent text-encre' : 'border-transparent text-encre-douce hover:text-encre'"
                :aria-selected="onglet === choix.cle"
                @click="onglet = choix.cle"
            >{{ choix.libelle }}</button>
        </div>

        <template v-if="onglet === 'archives'">
            <div class="grid gap-3 sm:grid-cols-3">
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Recherche<input v-model="filtres.texte" type="search" class="champ-saisie font-normal" placeholder="Nom de l’activité, lieu"></label>
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Année
                    <select v-model="filtres.annee" class="champ-saisie font-normal">
                        <option value="">Toutes</option>
                        <option v-for="annee in annees" :key="annee" :value="annee">{{ annee }}</option>
                    </select>
                </label>
                <label class="flex flex-col gap-1.5 text-sm font-semibold">État
                    <select v-model="filtres.etat" class="champ-saisie font-normal">
                        <option value="">Toutes</option>
                        <option value="archivee">Archivées</option>
                        <option value="a-archiver">Terminées, à archiver</option>
                    </select>
                </label>
            </div>

            <div v-if="!activites" class="squelette h-32" aria-hidden="true" />
            <p v-else-if="affichees.length === 0" class="carte p-5 text-encre-douce">Aucune activité close ne correspond.</p>
            <article v-for="activite in affichees" :key="activite.id" class="carte flex flex-col gap-3 p-5">
                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="flex flex-col gap-1">
                        <h2 class="font-bold">{{ activite.titre }}{{ activite.edition ? ` · ${activite.edition}` : '' }}</h2>
                        <p class="text-sm text-encre-douce">{{ dateCourte(activite.date) }} · {{ activite.lieu }} · {{ activite.nombres.admises }} admis, {{ activite.nombres.presents }} présents</p>
                        <p v-if="activite.anonymiseeLe" class="text-sm font-semibold text-info">Inscriptions rendues anonymes le {{ instant(activite.anonymiseeLe) }}</p>
                    </div>
                    <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="activite.archivee ? 'bg-surface-2 text-encre-douce' : 'bg-attention-fond text-attention'">{{ activite.archivee ? 'Archivée' : 'Terminée, à archiver' }}</span>
                </div>
                <div class="flex flex-wrap gap-2">
                    <RouterLink :to="{ name: 'admin-participants', query: { activite: activite.id } }" class="bouton-discret"><Icone nom="participants" class="size-4" /> Participants</RouterLink>
                    <RouterLink :to="{ name: 'admin-rapports', query: { onglet: 'rapports' } }" class="bouton-discret"><Icone nom="rapports" class="size-4" /> Rapports</RouterLink>
                    <RouterLink :to="{ name: 'admin-pointage', query: { activite: activite.id } }" class="bouton-discret"><Icone nom="pointage" class="size-4" /> Passages</RouterLink>
                    <RouterLink :to="{ name: 'admin-activite-modifier', params: { id: activite.id } }" class="bouton-discret"><Icone nom="crayon" class="size-4" /> Modification exceptionnelle</RouterLink>
                    <button v-if="!activite.archivee" type="button" class="bouton-secondaire" :disabled="enCours === `archiver-${activite.id}`" @click="agir(`archiver-${activite.id}`, () => archiverActivite(activite.id), `« ${activite.titre} » est archivée.`)"><Icone nom="archives" class="size-4" /> Archiver</button>
                </div>
                <p v-if="erreurDe(`archiver-${activite.id}`)" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe(`archiver-${activite.id}`) }}</p>
            </article>
        </template>

        <template v-else-if="onglet === 'corbeille'">
            <p class="text-sm text-encre-douce">Seuls une activité jamais publiée et sans inscription, ou un brouillon de courrier, peuvent aller à la corbeille. Un élément y reste jusqu’à sa restauration ou sa suppression définitive.</p>
            <p v-if="corbeille.length === 0" class="carte p-5 text-encre-douce">La corbeille est vide.</p>
            <article v-for="element in corbeille" :key="element.id" class="carte flex flex-col gap-3 p-5">
                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 class="font-bold">{{ element.titre }}</h2>
                        <p class="text-sm text-encre-douce">{{ element.type === 'activite' ? 'Activité' : 'Brouillon de courrier' }} · mis à la corbeille le {{ instant(element.supprimeLe) }} par {{ element.supprimePar }}</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button type="button" class="bouton-secondaire" :disabled="enCours === `restaurer-${element.id}`" @click="restaurer(element)">Restaurer</button>
                        <button v-if="aConfirmer !== element.id" type="button" class="bouton-discret text-danger" @click="aConfirmer = element.id">Supprimer définitivement</button>
                    </div>
                </div>
                <ConfirmationSensible v-if="aConfirmer === element.id" titre="Suppression définitive" mot-a-recopier="SUPPRIMER" libelle-bouton="Supprimer définitivement" @confirmer="supprimer(element)" @annuler="aConfirmer = ''">
                    « {{ element.titre }} » sera effacé sans retour possible. La suppression sera notée au journal d’audit.
                </ConfirmationSensible>
                <p v-if="erreurDe(`restaurer-${element.id}`) || erreurDe(`supprimer-${element.id}`)" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe(`restaurer-${element.id}`) || erreurDe(`supprimer-${element.id}`) }}</p>
            </article>
        </template>

        <template v-else>
            <section class="carte flex flex-col gap-3 p-6" aria-labelledby="titre-durees">
                <h2 id="titre-durees" class="text-lg font-bold">Durées de conservation</h2>
                <ul class="flex flex-col gap-1.5 text-sm">
                    <li v-for="ligne in DUREES_CONSERVATION" :key="ligne.donnee"><span class="font-semibold">{{ ligne.donnee }}</span> : {{ ligne.duree }}</li>
                </ul>
                <p class="text-sm text-encre-douce">Rendre anonyme efface les noms, numéros, villes, Sections, tuteurs et liens personnels. Restent le sexe, le Sous-Comité, le statut et les passages : les statistiques et les rapports restent justes.</p>
            </section>

            <article v-for="ligne in conservation" :key="ligne.id" class="carte flex flex-col gap-3 p-5">
                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 class="font-bold">{{ ligne.titre }}{{ ligne.edition ? ` · ${ligne.edition}` : '' }}</h2>
                        <p class="text-sm text-encre-douce">Activité du {{ dateCourte(ligne.date) }} · {{ ligne.personnes }} inscription{{ ligne.personnes > 1 ? 's' : '' }} · à rendre anonymes à partir du {{ dateCourte(ligne.echeance) }}</p>
                    </div>
                    <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="ligne.anonymiseeLe ? 'bg-ok-fond text-ok' : ligne.aFaire ? 'bg-danger-fond text-danger' : 'bg-surface-2 text-encre-douce'">{{ ligne.anonymiseeLe ? 'Fait' : ligne.aFaire ? 'Échéance dépassée' : 'À venir' }}</span>
                </div>
                <template v-if="ligne.aFaire">
                    <ConfirmationSensible v-if="aConfirmer === ligne.id" titre="Rendre les inscriptions anonymes" mot-a-recopier="ANONYMISER" libelle-bouton="Rendre anonyme" @confirmer="anonymiser(ligne)" @annuler="aConfirmer = ''">
                        Les {{ ligne.personnes }} inscriptions de cette activité perdront définitivement les noms et les numéros. Faites d’abord une sauvegarde si un rapport reste à écrire.
                    </ConfirmationSensible>
                    <button v-else type="button" class="bouton-danger self-start" @click="aConfirmer = ligne.id">Rendre anonyme maintenant</button>
                    <p v-if="erreurDe(`anonymiser-${ligne.id}`)" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe(`anonymiser-${ligne.id}`) }}</p>
                </template>
            </article>
            <p v-if="conservation.length === 0" class="carte p-5 text-encre-douce">Aucune activité terminée.</p>
        </template>

        <MessageFlottant :texte="confirmation" @fermer="confirmation = ''" />
    </div>
</template>
