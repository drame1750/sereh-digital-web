<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { animationsActives } from '../affichage.js';

/**
 * Nombre qui monte jusqu'à sa valeur quand il entre à l'écran. Sans animations, la valeur s'affiche
 * directement. Le lecteur d'écran lit toujours la valeur finale.
 */
const props = defineProps({
    valeur: { type: Number, required: true },
    duree: { type: Number, default: 1100 },
});

const format = new Intl.NumberFormat('fr-FR');
const affiche = ref(animationsActives() ? 0 : props.valeur);
const element = ref(null);
let observateur = null;
let image = 0;

function animer() {
    const debut = performance.now();

    const etape = (maintenant) => {
        const avancement = Math.min(1, (maintenant - debut) / props.duree);
        const adouci = 1 - (1 - avancement) ** 3;
        affiche.value = Math.round(props.valeur * adouci);

        if (avancement < 1) {
            image = requestAnimationFrame(etape);
        }
    };

    image = requestAnimationFrame(etape);
}

onMounted(() => {
    if (!animationsActives() || !('IntersectionObserver' in window)) {
        affiche.value = props.valeur;

        return;
    }

    observateur = new IntersectionObserver(([entree]) => {
        if (entree.isIntersecting) {
            observateur.disconnect();
            animer();
        }
    }, { threshold: 0.4 });
    observateur.observe(element.value);
});

onBeforeUnmount(() => {
    observateur?.disconnect();
    cancelAnimationFrame(image);
});
</script>

<template>
    <span ref="element" class="tabular-nums" :aria-label="format.format(valeur)">
        <span aria-hidden="true">{{ format.format(affiche) }}</span>
    </span>
</template>
