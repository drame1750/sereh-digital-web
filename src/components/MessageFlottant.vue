<script setup>
import { onBeforeUnmount, watch } from 'vue';
import Icone from './Icone.vue';

/**
 * Confirmation flottante en bas de l'écran, visible même au bas d'une longue page. Elle disparaît
 * seule après quelques secondes ; les erreurs, elles, s'affichent à côté du bouton concerné.
 */
const props = defineProps({
    texte: { type: String, default: '' },
});

const emit = defineEmits(['fermer']);
let minuterie = 0;

watch(() => props.texte, (texte) => {
    clearTimeout(minuterie);

    if (texte) {
        minuterie = setTimeout(() => emit('fermer'), 6000);
    }
});

onBeforeUnmount(() => clearTimeout(minuterie));
</script>

<template>
    <div class="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center" role="status" aria-live="polite">
        <Transition name="flottant">
            <div v-if="texte" class="pointer-events-auto flex max-w-lg items-start gap-3 rounded-xl border border-ok/30 bg-ok-fond p-4 text-sm text-ok shadow-[var(--ombre-relief)]">
                <Icone nom="coche" class="mt-0.5 size-5 flex-none" />
                <p class="flex-1 leading-relaxed">{{ texte }}</p>
                <button type="button" class="-m-1 inline-flex size-8 flex-none items-center justify-center rounded-lg hover:bg-white/30" @click="emit('fermer')">
                    <Icone nom="fermer" class="size-4" libelle="Fermer le message" />
                </button>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.flottant-enter-active,
.flottant-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.flottant-enter-from,
.flottant-leave-to {
    opacity: 0;
    transform: translateY(0.5rem);
}
</style>
