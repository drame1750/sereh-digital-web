<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Alerte from '../../components/Alerte.vue';
import BadgeStatut from '../../components/BadgeStatut.vue';
import BarresHorizontales from '../../components/BarresHorizontales.vue';
import ColonnesCumul from '../../components/ColonnesCumul.vue';
import CompteurAnime from '../../components/CompteurAnime.vue';
import Icone from '../../components/Icone.vue';
import { useAction } from '../../composables/useAction.js';
import { dateCourte, instant } from '../../donnees-exemple.js';
import { listerActivitesAdmin, MODE_DEMONSTRATION } from '../../services/donnees.js';
import { genererBrouillon, listerRapports, statistiquesActivite, statistiquesGenerales } from '../../services/rapports.js';

/**
 * Rapports et statistiques (cahier des charges, section 8, et module 11) : chiffres calculés sur les
 * données, présence réellement pointée, réponses du bureau (brouillons exclus), et rapports
 * d'activité préparés en brouillon puis approuvés avant de sortir en PDF.
 */
const route = useRoute();
const router = useRouter();
const onglet = ref(route.query.onglet === 'rapports' ? 'rapports' : 'statistiques');
const activites = ref([]);
const activiteId = ref('');
const statistiques = ref(null);
const generales = ref([]);
const rapports = ref(null);
const activiteRapport = ref('');

const { enCours, agir, erreurDe } = useAction();

const lignesPresence = computed(() => generales.value.filter((ligne) => ligne.admis > 0).map((ligne) => ({
    libelle: `${ligne.titre}${ligne.edition ? ` · ${ligne.edition}` : ''}`,
    valeur: ligne.taux ?? 0,
    texte: `${ligne.taux} %`,
    detail: `${ligne.presents} présent${ligne.presents > 1 ? 's' : ''} sur ${ligne.admis} admis`,
})));

const lignesSousComites = computed(() => (statistiques.value?.parSousComite ?? []).map((ligne) => ({
    libelle: ligne.libelle,
    valeur: ligne.admis,
    texte: `${ligne.admis}`,
    detail: `${ligne.admis} admis, ${ligne.presents} présent${ligne.presents > 1 ? 's' : ''}`,
})));

const maximumSousComites = computed(() => Math.max(1, ...lignesSousComites.value.map((ligne) => ligne.valeur)));

async function chargerStatistiques() {
    statistiques.value = activiteId.value ? await statistiquesActivite(activiteId.value) : null;
}

async function genererRapport() {
    const id = await agir('generer', () => genererBrouillon(activiteRapport.value), 'Brouillon de rapport généré.');

    if (id) {
        router.push({ name: 'admin-rapport', params: { id } });
    }
}

watch(activiteId, chargerStatistiques);
watch(onglet, (valeur) => router.replace({ query: valeur === 'rapports' ? { onglet: 'rapports' } : {} }));

onMounted(async () => {
    activites.value = await listerActivitesAdmin({ archivees: 'toutes' });
    activiteId.value = activites.value.find((activite) => activite.nombres.presents > 0)?.id ?? activites.value[0]?.id ?? '';
    activiteRapport.value = activiteId.value;
    [generales.value, rapports.value] = await Promise.all([statistiquesGenerales(), listerRapports()]);
});
</script>

<template>
    <div class="mx-auto flex max-w-6xl flex-col gap-6">
        <header class="flex flex-wrap items-end justify-between gap-4">
            <div class="flex flex-col gap-2">
                <p class="surtitre">Pilotage</p>
                <h1 class="text-3xl font-extrabold tracking-tight">Rapports et statistiques</h1>
            </div>
            <RouterLink :to="{ name: 'admin-exports' }" class="bouton-secondaire"><Icone nom="telecharger" class="size-4" /> Exports et imports</RouterLink>
        </header>

        <Alerte v-if="MODE_DEMONSTRATION" ton="info" titre="Démonstration">Chiffres calculés sur les données fictives de cet onglet. Les présences sont celles réellement pointées ; les brouillons de réponse ne comptent jamais.</Alerte>

        <div class="flex gap-2 border-b border-ligne" role="tablist">
            <button
                v-for="choix in [{ cle: 'statistiques', libelle: 'Statistiques' }, { cle: 'rapports', libelle: 'Rapports d’activité' }]"
                :key="choix.cle"
                type="button"
                role="tab"
                class="-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold"
                :class="onglet === choix.cle ? 'border-accent text-encre' : 'border-transparent text-encre-douce hover:text-encre'"
                :aria-selected="onglet === choix.cle"
                @click="onglet = choix.cle"
            >{{ choix.libelle }}</button>
        </div>

        <template v-if="onglet === 'statistiques'">
            <label class="flex max-w-md flex-col gap-1.5 text-sm font-semibold">Activité
                <select v-model="activiteId" class="champ-saisie font-normal">
                    <option v-for="activite in activites" :key="activite.id" :value="activite.id">{{ activite.titre }}{{ activite.edition ? ` · ${activite.edition}` : '' }} ({{ dateCourte(activite.date) }})</option>
                </select>
            </label>

            <div v-if="!statistiques" class="squelette h-40" aria-hidden="true" />
            <template v-else>
                <section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Chiffres clés">
                    <article v-for="indicateur in [
                        { libelle: 'Inscriptions reçues', valeur: statistiques.inscriptions.recues, detail: `${statistiques.inscriptions.enAttente} en attente, ${statistiques.inscriptions.annulees} annulée(s)` },
                        { libelle: 'Personnes admises', valeur: statistiques.inscriptions.admises, detail: `dont ${statistiques.inscriptions.accompagnateurs} accompagnateur(s)` },
                        { libelle: 'Présents (pointés)', valeur: statistiques.presence.presents, detail: `${statistiques.presence.absents} admis non présent(s)` },
                        { libelle: 'Taux de présence', valeur: statistiques.presence.taux ?? 0, suffixe: ' %', detail: statistiques.presence.taux === null ? 'aucune personne admise' : 'présents sur admis' },
                    ]" :key="indicateur.libelle" class="carte flex flex-col gap-1 p-4">
                        <p class="text-sm font-semibold text-encre-douce">{{ indicateur.libelle }}</p>
                        <p class="text-3xl font-extrabold tabular-nums"><CompteurAnime :valeur="indicateur.valeur" />{{ indicateur.suffixe ?? '' }}</p>
                        <p class="text-xs text-encre-douce">{{ indicateur.detail }}</p>
                    </article>
                </section>

                <div class="grid gap-6 lg:grid-cols-2">
                    <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-sous-comites">
                        <h2 id="titre-sous-comites" class="text-lg font-bold">Personnes admises par Sous-Comité</h2>
                        <p v-if="lignesSousComites.length === 0" class="text-sm text-encre-douce">Aucune personne admise.</p>
                        <BarresHorizontales v-else :lignes="lignesSousComites" :maximum="maximumSousComites" titre="Personnes admises par Sous-Comité" />
                    </section>

                    <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-sexe">
                        <h2 id="titre-sexe" class="text-lg font-bold">Admis et présents par sexe</h2>
                        <table class="w-full text-left text-sm">
                            <thead class="text-xs tracking-wide text-encre-douce uppercase"><tr><th scope="col" class="py-2">Sexe</th><th scope="col" class="py-2 text-right">Admis</th><th scope="col" class="py-2 text-right">Présents</th><th scope="col" class="py-2 text-right">Taux</th></tr></thead>
                            <tbody>
                                <tr v-for="ligne in statistiques.parSexe" :key="ligne.libelle" class="border-t border-ligne">
                                    <td class="py-2 font-semibold">{{ ligne.libelle }}</td>
                                    <td class="py-2 text-right tabular-nums">{{ ligne.admis }}</td>
                                    <td class="py-2 text-right tabular-nums">{{ ligne.presents }}</td>
                                    <td class="py-2 text-right tabular-nums">{{ ligne.admis ? `${Math.round((ligne.presents / ligne.admis) * 100)} %` : '—' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>
                </div>

                <section class="carte flex flex-col gap-5 p-6" aria-labelledby="titre-bureau">
                    <h2 id="titre-bureau" class="text-lg font-bold">Réponses des membres du bureau</h2>
                    <p v-if="statistiques.reponses.destinataires === 0" class="text-sm text-encre-douce">Aucun courrier n’est lié à cette activité.</p>
                    <template v-else>
                        <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <div v-for="tuile in [
                                { libelle: 'Courriers consultés', valeur: `${statistiques.reponses.consultes}/${statistiques.reponses.destinataires}` },
                                { libelle: 'Réponses en attente', valeur: statistiques.reponses.enAttente },
                                { libelle: 'Confirmations définitives', valeur: statistiques.reponses.confirmations },
                                { libelle: 'Brouillons (non comptés)', valeur: statistiques.reponses.brouillons },
                            ]" :key="tuile.libelle" class="rounded-xl bg-surface-2 p-3">
                                <p class="text-2xl font-extrabold tabular-nums">{{ tuile.valeur }}</p>
                                <p class="text-xs font-semibold text-encre-douce">{{ tuile.libelle }}</p>
                            </div>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full min-w-[34rem] text-left text-sm">
                                <caption class="mb-2 text-left text-sm font-bold">Résultats par secrétariat</caption>
                                <thead class="text-xs tracking-wide text-encre-douce uppercase"><tr><th scope="col" class="py-2">Secrétariat</th><th scope="col" class="py-2 text-right">Destinataires</th><th scope="col" class="py-2 text-right">Consultés</th><th scope="col" class="py-2 text-right">Présences</th><th scope="col" class="py-2 text-right">Absences</th><th scope="col" class="py-2 text-right">En attente</th></tr></thead>
                                <tbody>
                                    <tr v-for="ligne in statistiques.reponses.parSecretariat" :key="ligne.groupe" class="border-t border-ligne">
                                        <td class="py-2 font-semibold">{{ ligne.groupe }}</td>
                                        <td class="py-2 text-right tabular-nums">{{ ligne.destinataires }}</td>
                                        <td class="py-2 text-right tabular-nums">{{ ligne.consultes }}</td>
                                        <td class="py-2 text-right tabular-nums">{{ ligne.presences }}</td>
                                        <td class="py-2 text-right tabular-nums">{{ ligne.absences }}</td>
                                        <td class="py-2 text-right tabular-nums">{{ ligne.enAttente }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div v-if="statistiques.reponses.motifs.length > 0" class="flex flex-col gap-2">
                            <h3 class="text-sm font-bold">Absences déclarées et motifs</h3>
                            <ul class="flex flex-col gap-1.5 text-sm">
                                <li v-for="(ligne, index) in statistiques.reponses.motifs" :key="index" class="rounded-lg bg-surface-2 p-2.5"><span class="font-semibold">{{ ligne.membre }}</span> <span class="text-encre-douce">({{ ligne.groupe }})</span> : {{ ligne.motif }}</li>
                            </ul>
                        </div>
                        <div class="flex flex-col gap-2">
                            <h3 class="text-sm font-bold">Confirmations définitives, jour après jour</h3>
                            <p v-if="statistiques.reponses.evolution.length === 0" class="text-sm text-encre-douce">Aucune confirmation pour le moment.</p>
                            <ColonnesCumul v-else :points="statistiques.reponses.evolution" titre="Total des confirmations définitives, jour après jour" />
                        </div>
                    </template>
                </section>
            </template>

            <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-comparaison">
                <h2 id="titre-comparaison" class="text-lg font-bold">Taux de présence, activité par activité</h2>
                <p class="text-sm text-encre-douce">Présents réellement pointés sur personnes admises. Les activités sans personne admise ne figurent pas.</p>
                <p v-if="lignesPresence.length === 0" class="text-sm text-encre-douce">Aucune activité avec des personnes admises.</p>
                <BarresHorizontales v-else :lignes="lignesPresence" titre="Taux de présence par activité" />
                <details class="text-sm">
                    <summary class="cursor-pointer font-semibold">Voir les chiffres en tableau</summary>
                    <table class="mt-3 w-full text-left">
                        <thead class="text-xs tracking-wide text-encre-douce uppercase"><tr><th scope="col" class="py-2">Activité</th><th scope="col" class="py-2 text-right">Admis</th><th scope="col" class="py-2 text-right">Présents</th><th scope="col" class="py-2 text-right">Accompagnateurs</th><th scope="col" class="py-2 text-right">Taux</th></tr></thead>
                        <tbody>
                            <tr v-for="ligne in generales" :key="ligne.id" class="border-t border-ligne">
                                <td class="py-2">{{ ligne.titre }}{{ ligne.edition ? ` · ${ligne.edition}` : '' }}</td>
                                <td class="py-2 text-right tabular-nums">{{ ligne.admis }}</td>
                                <td class="py-2 text-right tabular-nums">{{ ligne.presents }}</td>
                                <td class="py-2 text-right tabular-nums">{{ ligne.accompagnateurs }}</td>
                                <td class="py-2 text-right tabular-nums">{{ ligne.taux === null ? '—' : `${ligne.taux} %` }}</td>
                            </tr>
                        </tbody>
                    </table>
                </details>
            </section>
        </template>

        <template v-else>
            <section class="carte flex flex-col gap-3 p-6" aria-labelledby="titre-generer">
                <h2 id="titre-generer" class="text-lg font-bold">Préparer un rapport</h2>
                <p class="text-sm text-encre-douce">La plateforme écrit un brouillon avec les chiffres du moment. Vous complétez le déroulement et la conclusion, puis vous l’approuvez : il sort alors en PDF et ne se modifie plus.</p>
                <div class="flex flex-wrap items-end gap-3">
                    <label class="flex min-w-64 flex-col gap-1.5 text-sm font-semibold">Activité
                        <select v-model="activiteRapport" class="champ-saisie font-normal">
                            <option v-for="activite in activites" :key="activite.id" :value="activite.id">{{ activite.titre }}{{ activite.edition ? ` · ${activite.edition}` : '' }}</option>
                        </select>
                    </label>
                    <button type="button" class="bouton-primaire" :disabled="!activiteRapport || enCours === 'generer'" @click="genererRapport"><Icone nom="rapports" class="size-4" /> Générer le brouillon</button>
                </div>
                <p v-if="erreurDe('generer')" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe('generer') }}</p>
            </section>

            <div v-if="!rapports" class="squelette h-28" aria-hidden="true" />
            <p v-else-if="rapports.length === 0" class="carte p-5 text-encre-douce">Aucun rapport pour le moment.</p>
            <RouterLink v-for="rapport in rapports" :key="rapport.id" :to="{ name: 'admin-rapport', params: { id: rapport.id } }" class="carte carte-vivante flex flex-wrap items-center justify-between gap-3 p-5">
                <span class="flex min-w-0 flex-col gap-1">
                    <span class="font-bold">{{ rapport.titre }}</span>
                    <span class="text-sm text-encre-douce">{{ rapport.statut === 'approuve' ? `Approuvé le ${instant(rapport.approuveLe)} par ${rapport.approuvePar}` : `Brouillon modifié le ${instant(rapport.modifieLe)}` }}{{ rapport.exemple ? ' · exemple' : '' }}</span>
                </span>
                <BadgeStatut :statut="rapport.statut === 'approuve' ? 'approuve' : 'brouillon'" />
            </RouterLink>
        </template>
    </div>
</template>
