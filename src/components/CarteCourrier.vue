<script setup>
import { computed } from 'vue';
import { dateCourte, instant } from '../donnees-exemple.js';
import BadgeStatut from './BadgeStatut.vue';
import Icone from './Icone.vue';

/**
 * Un courrier dans l'espace du secrétaire régional : objet, activité, date de transmission, date
 * limite, statut et action attendue. Les dates limites proches ou dépassées sont mises en évidence.
 */
const props = defineProps({
    courrier: { type: Object, required: true },
});

const suivi = computed(() => props.courrier.suivi);

const delai = computed(() => {
    const jours = suivi.value.joursRestants;

    if (jours === null) {
        return '';
    }

    if (jours < 0) {
        return `dépassée depuis ${-jours} jour${jours < -1 ? 's' : ''}`;
    }

    return { 0: 'aujourd’hui', 1: 'demain' }[jours] ?? `dans ${jours} jours`;
});
</script>

<template>
    <article class="carte-courrier carte relative flex flex-col gap-3 overflow-hidden p-5" :class="suivi.urgence ? `carte-courrier--${suivi.urgence}` : ''">
        <div class="flex flex-wrap gap-1.5">
            <BadgeStatut v-if="suivi.urgence === 'depassee'" statut="echeance-depassee" />
            <BadgeStatut v-else-if="suivi.urgence === 'proche'" statut="echeance-proche" />
            <BadgeStatut :statut="suivi.consultation" />
            <BadgeStatut :statut="suivi.reponse" />
            <BadgeStatut v-if="suivi.definitive" statut="confirmation-definitive" />
            <BadgeStatut v-if="suivi.demandeEnCours" statut="demande-modification" />
            <BadgeStatut v-if="suivi.tardiveAExaminer" statut="reponse-tardive" />
        </div>
        <h3 class="text-lg leading-snug font-bold">{{ courrier.objet }}</h3>
        <dl class="grid gap-1 text-sm sm:grid-cols-2">
            <div><dt class="inline text-encre-douce">Transmis le </dt><dd class="inline font-semibold">{{ instant(courrier.envoyeLe) }}</dd></div>
            <div v-if="suivi.echeance">
                <dt class="inline text-encre-douce">Date limite : </dt>
                <dd class="inline font-semibold" :class="{ 'text-danger': suivi.urgence === 'depassee', 'text-attention': suivi.urgence === 'proche' }">{{ dateCourte(suivi.echeance) }}<template v-if="suivi.aTraiter"> ({{ delai }})</template></dd>
            </div>
            <div v-if="courrier.activite" class="sm:col-span-2"><dt class="inline text-encre-douce">Activité : </dt><dd class="inline font-semibold">{{ courrier.activite.titre }}</dd></div>
        </dl>
        <p class="flex gap-2 rounded-xl bg-surface-2 p-3 text-sm"><Icone nom="info" class="mt-0.5 size-4 flex-none text-or-600" /> {{ suivi.actionAttendue }}</p>
        <RouterLink :to="{ name: 'courrier-secretaire', params: { id: courrier.id } }" class="bouton-primaire self-start">
            <Icone nom="courrier" class="size-4" /> Ouvrir le courrier <span class="sr-only">« {{ courrier.objet }} »</span>
        </RouterLink>
    </article>
</template>

<style scoped>
.carte-courrier::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 4px;
    background: var(--c-ligne);
}

.carte-courrier--normale::before {
    background: var(--color-vert-600);
}

.carte-courrier--proche::before {
    background: var(--color-or-500);
}

.carte-courrier--depassee::before {
    background: var(--c-danger);
}
</style>
