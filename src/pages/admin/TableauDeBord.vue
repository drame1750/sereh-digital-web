<script setup>
import { computed, onMounted, ref } from 'vue';
import Alerte from '../../components/Alerte.vue';
import CompteurAnime from '../../components/CompteurAnime.vue';
import Icone from '../../components/Icone.vue';
import { aujourdhui, dateLongue, instant } from '../../donnees-exemple.js';
import { listerCourriers } from '../../services/courriers.js';
import { dernieresOperations, listerActivitesAdmin, MODE_DEMONSTRATION } from '../../services/donnees.js';
import { mesNotifications } from '../../services/notifications.js';

/**
 * Tableau de bord de l'administrateur (cahier des charges, section 10) : statistiques, alertes,
 * tâches en attente et activités récentes, calculées sur les données. En démonstration, ce sont
 * les données fictives de cet onglet.
 */
const ACTIONS_RAPIDES = [
    { icone: 'plus', libelle: 'Créer une activité', vers: { name: 'admin-activite-nouvelle' } },
    { icone: 'courrier', libelle: 'Affecter un courrier', vers: { name: 'admin-courrier-nouveau' } },
    { icone: 'comptes', libelle: 'Créer un compte', vers: { name: 'admin-comptes', query: { nouveau: '1' } } },
    { icone: 'inscriptions', libelle: 'Consulter les inscriptions', vers: { name: 'admin-inscriptions' } },
    { icone: 'recherche', libelle: 'Rechercher', vers: { name: 'admin-recherche' } },
    { icone: 'secretaires', libelle: 'Voir les confirmations', vers: { name: 'admin-courriers', query: { onglet: 'a-traiter' } } },
    { icone: 'pointage', libelle: 'Accéder au pointage', vers: { name: 'pointage' } },
    { icone: 'rapports', libelle: 'Générer un rapport', vers: { name: 'admin-rapports', query: { onglet: 'rapports' } } },
];

const activites = ref(null);
const courriers = ref([]);
const notifications = ref([]);
const operations = ref([]);

const aVenir = computed(() => (activites.value ?? []).filter((activite) => activite.statut !== 'terminee'));

const indicateurs = computed(() => {
    const liste = aVenir.value;
    const envoyes = courriers.value.filter((courrier) => courrier.statut === 'envoye');
    const somme = (cle) => liste.reduce((total, activite) => total + activite.nombres[cle], 0);

    return [
        { libelle: 'Inscriptions reçues', valeur: somme('recues'), icone: 'inscriptions', detail: `${somme('enAttente')} en attente, activités à venir` },
        { libelle: 'Participants admis', valeur: somme('admises'), icone: 'participants', detail: `dont ${somme('accompagnateurs')} accompagnateur(s)` },
        { libelle: 'Réponses en attente', valeur: envoyes.reduce((total, courrier) => total + courrier.nombres.enAttente, 0), icone: 'courrier', detail: `sur ${envoyes.length} courrier(s) envoyé(s)` },
        { libelle: 'Confirmations définitives', valeur: envoyes.reduce((total, courrier) => total + courrier.nombres.confirmations, 0), icone: 'secretaires', detail: 'brouillons exclus' },
    ];
});

const alertes = computed(() => notifications.value.filter((notification) => !notification.lue && (notification.urgente || ['inscriptions', 'sauvegardes', 'securite', 'rapports'].includes(notification.categorie))).slice(0, 4));
const taches = computed(() => notifications.value.filter((notification) => !notification.lue && ['courriers', 'confirmations'].includes(notification.categorie) && !/^(Présence confirmée|Absence déclarée)$/.test(notification.titre)).slice(0, 5));

const echeances = computed(() => {
    const lignes = [];
    const jour = aujourdhui();

    for (const courrier of courriers.value.filter((candidat) => candidat.statut === 'envoye' && candidat.echeance && candidat.echeance >= jour && candidat.nombres.enAttente > 0)) {
        lignes.push({ date: courrier.echeance, texte: `Réponses attendues : ${courrier.objet}`, vers: { name: 'admin-courrier', params: { id: courrier.id } } });
    }

    for (const activite of aVenir.value) {
        if (activite.inscriptionsOuvertes && activite.fermeturePrevue && activite.fermeturePrevue >= jour) {
            lignes.push({ date: activite.fermeturePrevue, texte: `Fermeture prévue des inscriptions : ${activite.titre}`, vers: { name: 'admin-activites' } });
        }

        if (activite.publiee) {
            lignes.push({ date: activite.date, texte: `${activite.titre}${activite.edition ? ` (${activite.edition})` : ''}, ${activite.heure} · ${activite.lieu}`, vers: { name: 'admin-pointage', query: { activite: activite.id } } });
        }
    }

    return lignes.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
});

const TONS_ALERTE = { inscriptions: 'attention', sauvegardes: 'danger', securite: 'danger', rapports: 'info' };

onMounted(async () => {
    [activites.value, courriers.value, notifications.value, operations.value] = await Promise.all([listerActivitesAdmin(), listerCourriers(), mesNotifications(), dernieresOperations(6)]);
});
</script>

<template>
    <div class="mx-auto flex max-w-6xl flex-col gap-8">
        <header class="flex flex-col gap-3">
            <p class="surtitre">Administration</p>
            <h1 class="text-3xl font-extrabold tracking-tight">Tableau de bord</h1>
            <Alerte v-if="MODE_DEMONSTRATION" ton="info" titre="Démonstration">Chiffres calculés sur les données fictives de cet onglet : ils changent quand vous inscrivez, validez, pointez ou répondez.</Alerte>
        </header>

        <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicateurs">
            <article v-for="(indicateur, index) in indicateurs" :key="indicateur.libelle" class="tuile carte-vivante relative overflow-hidden p-5" v-apparition="index * 90">
                <div class="flex items-start justify-between gap-3">
                    <p class="text-sm font-semibold text-encre-douce">{{ indicateur.libelle }}</p>
                    <span class="inline-flex size-10 items-center justify-center rounded-xl bg-vert-50 text-vert-800"><Icone :nom="indicateur.icone" class="size-5" /></span>
                </div>
                <p class="mt-2 text-4xl font-extrabold tracking-tight"><CompteurAnime v-if="activites" :valeur="indicateur.valeur" /><span v-else>…</span></p>
                <p class="mt-1 text-xs text-encre-douce">{{ indicateur.detail }}</p>
            </article>
        </section>

        <div class="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-surveiller" v-apparition>
                <div class="flex items-center justify-between gap-3">
                    <h2 id="titre-surveiller" class="text-lg font-bold">À surveiller</h2>
                    <RouterLink :to="{ name: 'admin-notifications' }" class="text-sm font-semibold text-lien underline">Toutes les notifications</RouterLink>
                </div>
                <p v-if="alertes.length === 0" class="flex items-center gap-2 text-sm text-encre-douce"><Icone nom="coche" class="size-5 text-ok" /> Rien d’urgent pour le moment.</p>
                <RouterLink v-for="alerte in alertes" :key="alerte.id" :to="alerte.lien" class="block">
                    <Alerte :ton="alerte.urgente ? 'danger' : (TONS_ALERTE[alerte.categorie] ?? 'info')" :titre="alerte.titre">{{ alerte.texte }}</Alerte>
                </RouterLink>
            </section>

            <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-echeances" v-apparition="100">
                <h2 id="titre-echeances" class="text-lg font-bold">Échéances proches</h2>
                <p v-if="echeances.length === 0" class="text-sm text-encre-douce">Aucune échéance à venir.</p>
                <ul class="flex flex-col gap-3">
                    <li v-for="echeance in echeances" :key="echeance.texte">
                        <RouterLink :to="echeance.vers" class="flex gap-3 rounded-xl bg-surface-2 p-3 hover:bg-ligne">
                            <Icone nom="horloge" class="mt-0.5 size-5 flex-none text-or-600" />
                            <span>
                                <span class="block text-sm font-semibold first-letter:uppercase">{{ dateLongue(echeance.date) }}</span>
                                <span class="block text-sm text-encre-douce">{{ echeance.texte }}</span>
                            </span>
                        </RouterLink>
                    </li>
                </ul>
            </section>
        </div>

        <section class="flex flex-col gap-4" aria-labelledby="titre-actions">
            <h2 id="titre-actions" class="text-lg font-bold">Actions rapides</h2>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <RouterLink v-for="(action, index) in ACTIONS_RAPIDES" :key="action.libelle" :to="action.vers" class="action carte-vivante flex flex-col items-start gap-3 p-4 text-left" v-apparition="index * 60">
                    <span class="inline-flex size-10 items-center justify-center rounded-xl text-vert-900"><Icone :nom="action.icone" class="size-5" /></span>
                    <span class="text-sm font-semibold">{{ action.libelle }}</span>
                </RouterLink>
            </div>
        </section>

        <div class="grid gap-6 lg:grid-cols-2">
            <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-taches" v-apparition>
                <h2 id="titre-taches" class="text-lg font-bold">Tâches en attente</h2>
                <p v-if="taches.length === 0" class="text-sm text-encre-douce">Aucune question ni demande à traiter.</p>
                <ul class="flex flex-col gap-2">
                    <li v-for="tache in taches" :key="tache.id">
                        <RouterLink :to="tache.lien" class="flex gap-3 rounded-xl p-2 hover:bg-surface-2">
                            <Icone nom="bulle" class="mt-0.5 size-5 flex-none text-or-600" />
                            <span><span class="block text-sm font-semibold">{{ tache.titre }}</span><span class="block text-sm text-encre-douce">{{ tache.texte }}</span></span>
                        </RouterLink>
                    </li>
                </ul>
            </section>

            <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-operations" v-apparition>
                <div class="flex items-center justify-between gap-3">
                    <h2 id="titre-operations" class="text-lg font-bold">Dernières opérations</h2>
                    <RouterLink :to="{ name: 'admin-securite' }" class="text-sm font-semibold text-lien underline">Journal complet</RouterLink>
                </div>
                <p v-if="operations.length === 0" class="text-sm text-encre-douce">Aucune opération dans cet onglet pour le moment.</p>
                <ol class="relative flex flex-col gap-4 border-l-2 border-ligne pl-5">
                    <li v-for="(operation, index) in operations" :key="index" class="relative">
                        <span class="absolute top-1.5 -left-[1.6rem] size-3 rounded-full border-2 border-surface bg-or-500" aria-hidden="true" />
                        <p class="text-sm font-semibold">{{ operation.action }}</p>
                        <p class="text-sm text-encre-douce">{{ operation.cible }}</p>
                        <p class="text-xs text-encre-douce">{{ instant(operation.le) }} · {{ operation.auteur }}</p>
                    </li>
                </ol>
            </section>
        </div>
    </div>
</template>

<style scoped>
.tuile::before {
    content: '';
    position: absolute;
    inset: 0 0 auto;
    height: 3px;
    background: linear-gradient(90deg, var(--color-vert-600), var(--color-or-400));
}

.action span:first-child {
    background: linear-gradient(135deg, var(--color-or-100), var(--color-or-300));
}

:root[data-theme='sombre'] .tuile span.bg-vert-50 {
    background: rgb(78 164 106 / 0.18);
    color: var(--color-vert-200);
}
</style>
