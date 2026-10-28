<script setup>
import { computed } from 'vue';

/**
 * Pastille de statut, avec un libellé toujours écrit en toutes lettres : la couleur aide, elle ne
 * porte jamais seule l'information.
 */
const props = defineProps({
    statut: { type: String, required: true },
});

const STATUTS = {
    'inscriptions-ouvertes': { libelle: 'Inscriptions ouvertes', ton: 'ok' },
    'inscriptions-fermees': { libelle: 'Inscriptions fermées', ton: 'neutre' },
    complet: { libelle: 'Complet, inscriptions en attente', ton: 'attention' },
    terminee: { libelle: 'Activité terminée', ton: 'neutre' },
    'non-consulte': { libelle: 'Non consulté', ton: 'info' },
    consulte: { libelle: 'Consulté', ton: 'neutre' },
    brouillon: { libelle: 'Brouillon', ton: 'attention' },
    'presence-confirmee': { libelle: 'Présence confirmée', ton: 'ok' },
    'absence-declaree': { libelle: 'Absence déclarée', ton: 'danger' },
    'reponse-tardive': { libelle: 'Réponse tardive', ton: 'attention' },
    admise: { libelle: 'Admise', ton: 'ok' },
    'en-attente': { libelle: 'En attente', ton: 'attention' },
    exemple: { libelle: 'Exemple', ton: 'info' },
};

const TONS = {
    ok: 'bg-ok-fond text-ok',
    attention: 'bg-attention-fond text-attention',
    danger: 'bg-danger-fond text-danger',
    info: 'bg-info-fond text-info',
    neutre: 'bg-surface-2 text-encre-douce',
};

const description = computed(() => STATUTS[props.statut] ?? { libelle: props.statut, ton: 'neutre' });
</script>

<template>
    <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" :class="TONS[description.ton]">
        <span class="size-1.5 rounded-full bg-current" aria-hidden="true" />
        {{ description.libelle }}
    </span>
</template>
