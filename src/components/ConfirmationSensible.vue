<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { verifierMotDePasse } from '../services/session.js';
import Icone from './Icone.vue';

/**
 * Confirmation d'une opération sensible (cahier des charges, section 6) : suppression définitive,
 * modification des droits, restauration, export de données personnelles, maintenance, changement
 * de numéro. La personne relit ce qui va se passer, puis saisit de nouveau son mot de passe ; pour
 * les opérations les plus lourdes, elle recopie aussi un mot.
 */
const props = defineProps({
    titre: { type: String, required: true },
    libelleBouton: { type: String, default: 'Confirmer' },
    /** Mot à recopier, par exemple « RESTAURER », ou vide. */
    motARecopier: { type: String, default: '' },
    ton: { type: String, default: 'danger' },
});

const emit = defineEmits(['confirmer', 'annuler']);
const motDePasse = ref('');
const recopie = ref('');
const erreur = ref('');
const enCours = ref(false);
const champ = ref(null);
const identifiant = `confirmation-${Math.random().toString(36).slice(2, 8)}`;

const pret = computed(() => motDePasse.value.length > 0 && (!props.motARecopier || recopie.value.trim() === props.motARecopier));

async function confirmer() {
    enCours.value = true;
    erreur.value = '';

    try {
        await verifierMotDePasse(motDePasse.value);
        motDePasse.value = '';
        emit('confirmer');
    } catch (probleme) {
        erreur.value = probleme.message;
    } finally {
        enCours.value = false;
    }
}

onMounted(async () => {
    await nextTick();
    champ.value?.focus();
});
</script>

<template>
    <form class="flex flex-col gap-3 rounded-xl border p-4" :class="ton === 'danger' ? 'border-danger/40 bg-danger-fond/60' : 'border-attention/40 bg-attention-fond/60'" novalidate @submit.prevent="confirmer">
        <p class="flex items-center gap-2 text-sm font-bold" :class="ton === 'danger' ? 'text-danger' : 'text-attention'"><Icone nom="cadenas" class="size-4 flex-none" /> {{ titre }}</p>
        <div class="text-sm text-encre"><slot /></div>
        <div v-if="motARecopier" class="flex flex-col gap-1.5">
            <label :for="`${identifiant}-mot`" class="text-sm font-semibold">Recopiez le mot <strong class="font-mono">{{ motARecopier }}</strong></label>
            <input :id="`${identifiant}-mot`" v-model="recopie" class="champ-saisie" autocomplete="off" autocapitalize="characters" spellcheck="false">
        </div>
        <div class="flex flex-col gap-1.5">
            <label :for="`${identifiant}-mdp`" class="text-sm font-semibold">Votre mot de passe</label>
            <input :id="`${identifiant}-mdp`" ref="champ" v-model="motDePasse" type="password" class="champ-saisie" autocomplete="current-password">
        </div>
        <p v-if="erreur" class="text-sm font-semibold text-danger" role="alert">{{ erreur }}</p>
        <div class="flex flex-wrap gap-2">
            <button type="submit" :class="ton === 'danger' ? 'bouton-danger' : 'bouton-primaire'" :disabled="!pret || enCours">{{ enCours ? 'Vérification…' : libelleBouton }}</button>
            <button type="button" class="bouton-discret" @click="emit('annuler')">Annuler</button>
        </div>
    </form>
</template>
