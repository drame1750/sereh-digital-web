<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import Alerte from '../../components/Alerte.vue';
import BadgeStatut from '../../components/BadgeStatut.vue';
import Icone from '../../components/Icone.vue';
import { dateLongue } from '../../donnees-exemple.js';
import { changerInscriptions, changerPublication, listerActivitesAdmin, MODE_DEMONSTRATION } from '../../services/donnees.js';

/**
 * Liste des activités pour l'administrateur : publiées ou non, avec leurs chiffres, et les décisions
 * manuelles (publier, ouvrir ou fermer les inscriptions). Rien ne se ferme automatiquement.
 */
const route = useRoute();
const activites = ref(null);
const message = ref(route.query.enregistree ? { ton: 'ok', texte: 'Activité enregistrée. Publiez-la et ouvrez ses inscriptions quand vous le déciderez.' } : null);
const enCours = ref('');

async function charger() {
    activites.value = await listerActivitesAdmin();
}

async function agir(cle, action, texte) {
    enCours.value = cle;
    message.value = null;

    try {
        await action();
        message.value = { ton: 'ok', texte };
        await charger();
    } catch (erreur) {
        message.value = { ton: 'danger', texte: erreur.message };
    } finally {
        enCours.value = '';
    }
}

onMounted(charger);
</script>

<template>
    <div class="mx-auto flex max-w-6xl flex-col gap-6">
        <header class="flex flex-wrap items-end justify-between gap-4">
            <div class="flex flex-col gap-2">
                <p class="surtitre">Administration</p>
                <h1 class="text-3xl font-extrabold tracking-tight">Activités</h1>
            </div>
            <RouterLink :to="{ name: 'admin-activite-nouvelle' }" class="bouton-primaire"><Icone nom="plus" class="size-4" /> Créer une activité</RouterLink>
        </header>

        <Alerte v-if="MODE_DEMONSTRATION" ton="info" titre="Démonstration">Les activités et leurs chiffres sont fictifs ; les changements restent dans cet onglet.</Alerte>
        <Alerte v-if="message" :ton="message.ton">{{ message.texte }}</Alerte>

        <div v-if="!activites" class="flex flex-col gap-4" aria-hidden="true">
            <div v-for="index in 3" :key="index" class="squelette h-36" />
        </div>

        <article v-for="(activite, index) in activites" :key="activite.id" class="carte flex flex-col gap-5 p-5 sm:p-6" v-apparition="index * 80">
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="flex min-w-0 flex-col gap-1.5">
                    <div class="flex flex-wrap gap-2">
                        <BadgeStatut v-if="!activite.publiee" statut="brouillon" />
                        <BadgeStatut :statut="activite.statut" />
                    </div>
                    <h2 class="text-xl font-bold">{{ activite.titre }} <span class="text-or-600">· {{ activite.edition }}</span></h2>
                    <p class="text-sm text-encre-douce"><span class="first-letter:uppercase">{{ dateLongue(activite.date) }}</span>, {{ activite.heure }} · {{ activite.lieu }}</p>
                </div>
                <RouterLink :to="{ name: 'admin-activite-modifier', params: { id: activite.id } }" class="bouton-secondaire"><Icone nom="crayon" class="size-4" /> Modifier</RouterLink>
            </div>

            <dl class="grid grid-cols-2 gap-3 text-center sm:grid-cols-5">
                <div class="rounded-xl bg-surface-2 p-3"><dt class="text-xs text-encre-douce">Reçues</dt><dd class="text-xl font-bold tabular-nums">{{ activite.nombres.recues }}</dd></div>
                <div class="rounded-xl bg-surface-2 p-3"><dt class="text-xs text-encre-douce">Admises</dt><dd class="text-xl font-bold tabular-nums">{{ activite.nombres.admises }}</dd></div>
                <div class="rounded-xl bg-surface-2 p-3"><dt class="text-xs text-encre-douce">En attente</dt><dd class="text-xl font-bold tabular-nums">{{ activite.nombres.enAttente }}</dd></div>
                <div class="rounded-xl bg-surface-2 p-3"><dt class="text-xs text-encre-douce">Présents</dt><dd class="text-xl font-bold tabular-nums">{{ activite.nombres.presents }}</dd></div>
                <div class="col-span-2 rounded-xl bg-surface-2 p-3 sm:col-span-1"><dt class="text-xs text-encre-douce">Places restantes</dt><dd class="text-xl font-bold tabular-nums">{{ activite.placesRestantes ?? '∞' }}</dd></div>
            </dl>

            <div class="flex flex-wrap gap-2">
                <button
                    v-if="!activite.publiee"
                    type="button"
                    class="bouton-primaire"
                    :disabled="enCours === activite.id"
                    @click="agir(activite.id, () => changerPublication(activite.id, true), `« ${activite.titre} » est publiée : elle est visible sur la page d'accueil.`)"
                >Publier</button>
                <button
                    v-else
                    type="button"
                    class="bouton-secondaire"
                    :disabled="enCours === activite.id"
                    @click="agir(activite.id, () => changerPublication(activite.id, false), `« ${activite.titre} » est retirée de la page publique ; ses inscriptions sont fermées.`)"
                >Retirer de la page publique</button>
                <button
                    v-if="!activite.inscriptionsOuvertes"
                    type="button"
                    class="bouton-secondaire"
                    :disabled="enCours === activite.id"
                    @click="agir(activite.id, () => changerInscriptions(activite.id, true), `Inscriptions ouvertes pour « ${activite.titre} ».`)"
                >Ouvrir les inscriptions</button>
                <button
                    v-else
                    type="button"
                    class="bouton-secondaire"
                    :disabled="enCours === activite.id"
                    @click="agir(activite.id, () => changerInscriptions(activite.id, false), `Inscriptions fermées pour « ${activite.titre} ».`)"
                >Fermer les inscriptions</button>
                <RouterLink :to="{ name: 'admin-inscriptions', query: { activite: activite.id } }" class="bouton-discret"><Icone nom="inscriptions" class="size-4" /> Voir les inscriptions</RouterLink>
            </div>
        </article>
    </div>
</template>
