<script setup>
import Alerte from '../../components/Alerte.vue';
import CompteurAnime from '../../components/CompteurAnime.vue';
import Icone from '../../components/Icone.vue';
import { dateLongue, tableauDeBordExemple } from '../../donnees-exemple.js';

/**
 * Maquette du tableau de bord de l'administrateur (cahier des charges, section 8). Tous les chiffres
 * sont des exemples : la page le dit en tête, et les vrais chiffres arriveront avec les modules 5 à 9.
 */
/** Les raccourcis sans « vers » mènent à des écrans pas encore construits : ils restent inactifs. */
const ACTIONS_RAPIDES = [
    { icone: 'plus', libelle: 'Créer une activité', vers: { name: 'admin-activite-nouvelle' } },
    { icone: 'courrier', libelle: 'Affecter un courrier', vers: { name: 'admin-courrier-nouveau' } },
    { icone: 'comptes', libelle: 'Créer un compte' },
    { icone: 'inscriptions', libelle: 'Consulter les inscriptions', vers: { name: 'admin-inscriptions' } },
    { icone: 'recherche', libelle: 'Rechercher' },
    { icone: 'secretaires', libelle: 'Voir les confirmations', vers: { name: 'admin-courriers', query: { onglet: 'a-traiter' } } },
    { icone: 'pointage', libelle: 'Accéder au pointage', vers: { name: 'pointage' } },
    { icone: 'rapports', libelle: 'Générer un rapport' },
];
</script>

<template>
    <div class="mx-auto flex max-w-6xl flex-col gap-8">
        <header class="flex flex-col gap-3">
            <p class="surtitre">Administration</p>
            <h1 class="text-3xl font-extrabold tracking-tight">Tableau de bord</h1>
            <Alerte ton="info" titre="Maquette">Les chiffres et les opérations ci-dessous sont des exemples, pas des données enregistrées.</Alerte>
        </header>

        <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicateurs (exemple)">
            <article v-for="(indicateur, index) in tableauDeBordExemple.indicateurs" :key="indicateur.libelle" class="tuile carte-vivante relative overflow-hidden p-5" v-apparition="index * 90">
                <div class="flex items-start justify-between gap-3">
                    <p class="text-sm font-semibold text-encre-douce">{{ indicateur.libelle }}</p>
                    <span class="inline-flex size-10 items-center justify-center rounded-xl bg-vert-50 text-vert-800"><Icone :nom="indicateur.icone" class="size-5" /></span>
                </div>
                <p class="mt-2 text-4xl font-extrabold tracking-tight"><CompteurAnime :valeur="indicateur.valeur" /></p>
                <p class="mt-1 text-xs text-encre-douce">{{ indicateur.detail }}</p>
            </article>
        </section>

        <div class="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-surveiller" v-apparition>
                <h2 id="titre-surveiller" class="text-lg font-bold">À surveiller</h2>
                <Alerte v-for="alerte in tableauDeBordExemple.alertes" :key="alerte.titre" :ton="alerte.ton" :titre="alerte.titre">{{ alerte.texte }}</Alerte>
            </section>

            <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-echeances" v-apparition="100">
                <h2 id="titre-echeances" class="text-lg font-bold">Échéances proches</h2>
                <ul class="flex flex-col gap-3">
                    <li v-for="echeance in tableauDeBordExemple.echeances" :key="echeance.texte" class="flex gap-3 rounded-xl bg-surface-2 p-3">
                        <Icone nom="horloge" class="mt-0.5 size-5 flex-none text-or-600" />
                        <div>
                            <p class="text-sm font-semibold first-letter:uppercase">{{ dateLongue(echeance.date) }}</p>
                            <p class="text-sm text-encre-douce">{{ echeance.texte }}</p>
                        </div>
                    </li>
                </ul>
            </section>
        </div>

        <section class="flex flex-col gap-4" aria-labelledby="titre-actions">
            <h2 id="titre-actions" class="text-lg font-bold">Actions rapides</h2>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <component
                    :is="action.vers ? 'RouterLink' : 'button'"
                    v-for="(action, index) in ACTIONS_RAPIDES"
                    :key="action.libelle"
                    v-bind="action.vers ? { to: action.vers } : { type: 'button', disabled: true }"
                    class="action carte-vivante flex flex-col items-start gap-3 p-4 text-left"
                    v-apparition="index * 60"
                >
                    <span class="inline-flex size-10 items-center justify-center rounded-xl text-vert-900"><Icone :nom="action.icone" class="size-5" /></span>
                    <span class="text-sm font-semibold">{{ action.libelle }}</span>
                    <span v-if="!action.vers" class="text-xs text-encre-douce">Bientôt</span>
                </component>
            </div>
        </section>

        <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-operations" v-apparition>
            <h2 id="titre-operations" class="text-lg font-bold">Dernières opérations</h2>
            <ol class="relative flex flex-col gap-4 border-l-2 border-ligne pl-5">
                <li v-for="operation in tableauDeBordExemple.operations" :key="operation.texte" class="relative">
                    <span class="absolute top-1.5 -left-[1.6rem] size-3 rounded-full border-2 border-surface bg-or-500" aria-hidden="true" />
                    <p class="text-sm font-semibold">{{ operation.texte }}</p>
                    <p class="text-xs text-encre-douce">{{ operation.quand }}</p>
                </li>
            </ol>
        </section>
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

.action:disabled {
    cursor: default;
}

:root[data-theme='sombre'] .tuile span.bg-vert-50 {
    background: rgb(78 164 106 / 0.18);
    color: var(--color-vert-200);
}
</style>
