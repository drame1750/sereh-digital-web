<script setup>
/**
 * Retour très visible du pointage : coche verte qui se dessine pour une entrée acceptée, croix rouge
 * pour un refus, avec la raison en toutes lettres. Lisible de loin, à l'entrée d'une salle.
 */
defineProps({
    accepte: { type: Boolean, required: true },
    titre: { type: String, required: true },
    detail: { type: String, default: '' },
});
</script>

<template>
    <div
        class="retour flex flex-col items-center gap-2 rounded-3xl px-6 py-8 text-center text-white"
        :class="accepte ? 'retour--accepte' : 'retour--refuse'"
        role="status"
        aria-live="assertive"
    >
        <svg class="size-20" viewBox="0 0 52 52" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle class="retour__trait" cx="26" cy="26" r="23" pathLength="1" stroke-opacity="0.5" />
            <path v-if="accepte" class="retour__trait retour__trait--tard" d="M15 27l7.5 7.5L37 19" pathLength="1" />
            <template v-else>
                <path class="retour__trait retour__trait--tard" d="M18 18l16 16" pathLength="1" />
                <path class="retour__trait retour__trait--tard" d="M34 18 18 34" pathLength="1" />
            </template>
        </svg>
        <p class="text-2xl font-bold">{{ titre }}</p>
        <p v-if="detail" class="text-sm text-white/85">{{ detail }}</p>
    </div>
</template>

<style scoped>
.retour--accepte {
    background: radial-gradient(circle at 30% 20%, #23864a, #0a4f22);
}

.retour--refuse {
    background: radial-gradient(circle at 30% 20%, #c8473c, #8a1d15);
}

.retour__trait {
    stroke-dasharray: 1;
    stroke-dashoffset: 0;
}

:root[data-animations='oui'] .retour {
    animation: pulsation 0.45s var(--ease-douce);
}

:root[data-animations='oui'] .retour__trait {
    stroke-dashoffset: 1;
    animation: trace 0.5s ease-out forwards;
}

:root[data-animations='oui'] .retour__trait--tard {
    animation-delay: 0.25s;
}
</style>
