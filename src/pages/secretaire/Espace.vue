<script setup>
import { computed, onMounted, ref } from 'vue';
import Alerte from '../../components/Alerte.vue';
import CarteCourrier from '../../components/CarteCourrier.vue';
import CompteurAnime from '../../components/CompteurAnime.vue';
import Icone from '../../components/Icone.vue';
import { dateCourte, dateLongue, instant } from '../../donnees-exemple.js';
import { mesCourriers, mesNouveautes, monHistorique, monProfil } from '../../services/courriers.js';
import { MODE_DEMONSTRATION } from '../../services/donnees.js';

/**
 * Espace du secrétaire régional (cahier des charges, section 6) : d'abord les missions prioritaires,
 * puis tous ses courriers, les échéances, les activités concernées, les nouveautés et l'historique
 * de ses actions. On n'y voit que les courriers qui vous sont adressés.
 */
const profil = ref(null);
const courriers = ref(null);
const nouveautes = ref([]);
const historique = ref([]);
const erreur = ref('');
const filtre = ref('tous');

const FILTRES = [
    { cle: 'tous', libelle: 'Tous' },
    { cle: 'a-traiter', libelle: 'À traiter' },
    { cle: 'traites', libelle: 'Traités' },
];

const prioritaires = computed(() => (courriers.value ?? []).filter((courrier) => courrier.suivi.aTraiter));
const affiches = computed(() => (courriers.value ?? []).filter((courrier) => ({ tous: true, 'a-traiter': courrier.suivi.aTraiter, traites: !courrier.suivi.aTraiter }[filtre.value])));

const indicateurs = computed(() => {
    const liste = courriers.value ?? [];

    return [
        { libelle: 'Réponses à donner', valeur: liste.filter((courrier) => courrier.reponseAttendue && courrier.suivi.aTraiter).length, icone: 'secretaires' },
        { libelle: 'Courriers non consultés', valeur: liste.filter((courrier) => courrier.suivi.consultation === 'non-consulte').length, icone: 'courrier' },
        { libelle: 'Dates limites proches ou dépassées', valeur: liste.filter((courrier) => ['proche', 'depassee'].includes(courrier.suivi.urgence)).length, icone: 'horloge' },
        { libelle: 'Réponses confirmées', valeur: liste.filter((courrier) => courrier.suivi.definitive).length, icone: 'cadenas' },
    ];
});

const echeances = computed(() => prioritaires.value.filter((courrier) => courrier.suivi.echeance).sort((a, b) => a.suivi.echeance.localeCompare(b.suivi.echeance)));

const activites = computed(() => {
    const parIdentifiant = new Map();

    for (const courrier of courriers.value ?? []) {
        if (courrier.activite) {
            parIdentifiant.set(courrier.activite.id, courrier.activite);
        }
    }

    return [...parIdentifiant.values()].sort((a, b) => a.date.localeCompare(b.date));
});

onMounted(async () => {
    try {
        [profil.value, courriers.value, nouveautes.value, historique.value] = await Promise.all([monProfil(), mesCourriers(), mesNouveautes(), monHistorique()]);
    } catch (probleme) {
        erreur.value = probleme.message;
        courriers.value = [];
    }
});
</script>

<template>
    <div class="flex flex-col gap-8">
        <header class="flex flex-col gap-2" v-apparition>
            <p class="surtitre">Mon espace</p>
            <h1 class="text-3xl font-extrabold tracking-tight">Bonjour{{ profil ? `, ${profil.nom}` : '' }}</h1>
            <p v-if="profil" class="text-encre-douce">{{ profil.poste }} · Bureau régional du Hambol</p>
        </header>

        <Alerte v-if="MODE_DEMONSTRATION" ton="info" titre="Démonstration">Les courriers sont fictifs et vos réponses restent dans cet onglet. Les rappels apparaissent dans vos notifications (la cloche en haut).</Alerte>
        <Alerte v-if="erreur" ton="danger">{{ erreur }}</Alerte>

        <section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="En bref">
            <article v-for="(indicateur, index) in indicateurs" :key="indicateur.libelle" class="carte flex flex-col gap-2 p-4" v-apparition="index * 70">
                <span class="inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-or-100 to-or-300 text-vert-900"><Icone :nom="indicateur.icone" class="size-5" /></span>
                <p class="text-3xl font-extrabold tabular-nums"><CompteurAnime v-if="courriers" :valeur="indicateur.valeur" /><span v-else>…</span></p>
                <p class="text-xs leading-snug font-semibold text-encre-douce">{{ indicateur.libelle }}</p>
            </article>
        </section>

        <section class="flex flex-col gap-4" aria-labelledby="titre-prioritaires">
            <h2 id="titre-prioritaires" class="titre-section text-xl">Missions prioritaires</h2>
            <div v-if="!courriers" class="grid gap-4 md:grid-cols-2" aria-hidden="true">
                <div v-for="index in 2" :key="index" class="squelette h-56" />
            </div>
            <p v-else-if="prioritaires.length === 0" class="carte flex items-center gap-3 p-5 text-encre-douce"><Icone nom="coche" class="size-5 text-ok" /> Rien à faire pour le moment : tous vos courriers sont traités.</p>
            <div v-else class="grid gap-4 md:grid-cols-2">
                <CarteCourrier v-for="(courrier, index) in prioritaires" :key="courrier.id" :courrier="courrier" v-apparition="index * 80" />
            </div>
        </section>

        <div class="grid gap-6 lg:grid-cols-2">
            <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-echeances">
                <h2 id="titre-echeances" class="text-lg font-bold">Échéances</h2>
                <p v-if="echeances.length === 0" class="text-sm text-encre-douce">Aucune réponse attendue.</p>
                <ul class="flex flex-col gap-3">
                    <li v-for="courrier in echeances" :key="courrier.id">
                        <RouterLink :to="{ name: 'courrier-secretaire', params: { id: courrier.id } }" class="flex gap-3 rounded-xl bg-surface-2 p-3 hover:bg-ligne">
                            <Icone nom="horloge" class="mt-0.5 size-5 flex-none" :class="courrier.suivi.urgence === 'depassee' ? 'text-danger' : 'text-or-600'" />
                            <span>
                                <span class="block text-sm font-semibold" :class="{ 'text-danger': courrier.suivi.urgence === 'depassee' }">{{ dateCourte(courrier.suivi.echeance) }}{{ courrier.suivi.urgence === 'depassee' ? ' · dépassée' : '' }}</span>
                                <span class="block text-sm text-encre-douce">{{ courrier.objet }}</span>
                            </span>
                        </RouterLink>
                    </li>
                </ul>
            </section>

            <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-activites">
                <h2 id="titre-activites" class="text-lg font-bold">Activités concernées</h2>
                <p v-if="activites.length === 0" class="text-sm text-encre-douce">Aucun de vos courriers n’est lié à une activité.</p>
                <ul class="flex flex-col gap-3">
                    <li v-for="activite in activites" :key="activite.id" class="flex gap-3 rounded-xl bg-surface-2 p-3">
                        <Icone nom="calendrier" class="mt-0.5 size-5 flex-none text-or-600" />
                        <div class="text-sm">
                            <p class="font-semibold">{{ activite.titre }}<template v-if="activite.edition"> · {{ activite.edition }}</template></p>
                            <p class="text-encre-douce first-letter:uppercase">{{ dateLongue(activite.date) }}, {{ activite.heure }} · {{ activite.lieu }}</p>
                            <RouterLink v-if="activite.publiee" :to="{ name: 'activite', params: { id: activite.id } }" class="font-semibold text-lien underline">Voir la page de l’activité</RouterLink>
                        </div>
                    </li>
                </ul>
            </section>
        </div>

        <section class="flex flex-col gap-4" aria-labelledby="titre-tous">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 id="titre-tous" class="titre-section text-xl">Tous mes courriers</h2>
                <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrer mes courriers">
                    <button
                        v-for="choix in FILTRES"
                        :key="choix.cle"
                        type="button"
                        class="inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold"
                        :class="filtre === choix.cle ? 'bg-accent text-accent-texte' : 'bg-surface-2 hover:bg-ligne'"
                        :aria-pressed="filtre === choix.cle"
                        @click="filtre = choix.cle"
                    >{{ choix.libelle }}</button>
                </div>
            </div>
            <p v-if="courriers && affiches.length === 0" class="carte p-5 text-encre-douce">Aucun courrier dans cette catégorie.</p>
            <div class="grid gap-4 md:grid-cols-2">
                <CarteCourrier v-for="courrier in affiches" :key="courrier.id" :courrier="courrier" />
            </div>
        </section>

        <div class="grid gap-6 lg:grid-cols-2">
            <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-nouveautes">
                <h2 id="titre-nouveautes" class="flex items-center gap-2 text-lg font-bold"><Icone nom="notifications" class="size-5 flex-none text-or-600" /> Nouveautés</h2>
                <p v-if="nouveautes.length === 0" class="text-sm text-encre-douce">Rien de nouveau.</p>
                <ul class="flex flex-col gap-3">
                    <li v-for="(nouveaute, index) in nouveautes" :key="index">
                        <RouterLink :to="{ name: 'courrier-secretaire', params: { id: nouveaute.courrierId } }" class="block rounded-xl p-2 hover:bg-surface-2">
                            <span class="block text-sm font-semibold">{{ nouveaute.action }}</span>
                            <span class="block text-sm text-encre-douce">{{ nouveaute.objet }}</span>
                            <span class="block text-xs text-encre-douce">{{ instant(nouveaute.le) }}</span>
                        </RouterLink>
                    </li>
                </ul>
            </section>

            <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-historique">
                <h2 id="titre-historique" class="text-lg font-bold">Historique de mes actions</h2>
                <p v-if="historique.length === 0" class="text-sm text-encre-douce">Aucune action pour le moment.</p>
                <ol class="relative flex flex-col gap-4 border-l-2 border-ligne pl-5">
                    <li v-for="(entree, index) in historique" :key="index" class="relative">
                        <span class="absolute top-1.5 -left-[1.6rem] size-3 rounded-full border-2 border-surface bg-or-500" aria-hidden="true" />
                        <p class="text-sm font-semibold">{{ entree.action }}</p>
                        <p class="text-sm text-encre-douce">{{ entree.objet }}</p>
                        <p class="text-xs text-encre-douce">{{ instant(entree.le) }}</p>
                    </li>
                </ol>
            </section>
        </div>
    </div>
</template>
