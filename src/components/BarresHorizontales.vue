<script setup>
import { ref } from 'vue';

/**
 * Barres horizontales d'une seule série (une seule couleur : la grandeur se lit à la longueur) :
 * libellé à gauche, valeur au bout de la barre, détail exact au survol ou au clavier. Le tableau des
 * mêmes chiffres est donné à côté par l'écran qui l'utilise.
 */
defineProps({
    /** @type {Array<{ libelle: string, valeur: number, texte: string, detail: string }>} */
    lignes: { type: Array, required: true },
    maximum: { type: Number, default: 100 },
    titre: { type: String, required: true },
});

const survolee = ref(-1);
</script>

<template>
    <ul class="flex flex-col gap-2.5" :aria-label="titre">
        <li
            v-for="(ligne, index) in lignes"
            :key="ligne.libelle"
            class="ligne relative grid grid-cols-[minmax(6rem,11rem)_1fr] items-center gap-3 rounded-lg px-1 py-1 outline-none"
            tabindex="0"
            :aria-label="`${ligne.libelle} : ${ligne.detail}`"
            @mouseenter="survolee = index"
            @mouseleave="survolee = -1"
            @focus="survolee = index"
            @blur="survolee = -1"
        >
            <span class="truncate text-sm text-encre-douce">{{ ligne.libelle }}</span>
            <span class="flex items-center gap-2">
                <span class="barre block h-4 min-w-1 rounded-r-[4px]" :style="{ width: `${maximum > 0 ? Math.max(0.5, (ligne.valeur / maximum) * 85) : 0}%` }" />
                <span class="text-sm font-semibold whitespace-nowrap tabular-nums">{{ ligne.texte }}</span>
            </span>
            <span v-if="survolee === index" class="infobulle pointer-events-none absolute -top-9 left-1/3 z-10 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap" role="tooltip">{{ ligne.detail }}</span>
        </li>
    </ul>
</template>

<style scoped>
.barre {
    background: var(--color-vert-500);
}

.ligne:hover,
.ligne:focus-visible {
    background: var(--c-surface-2);
}

.infobulle {
    background: var(--c-encre);
    color: var(--c-surface);
    box-shadow: 0 6px 18px -8px rgb(0 0 0 / 0.4);
}

:root[data-theme='sombre'] .barre {
    background: var(--color-vert-400);
}
</style>
