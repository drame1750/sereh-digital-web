<script setup>
import { computed, ref } from 'vue';
import { dateCourte } from '../donnees-exemple.js';

/**
 * Évolution d'un total jour après jour, en colonnes d'une seule couleur : une colonne par jour où
 * le total a bougé, la valeur écrite seulement sur la dernière, le détail au survol ou au clavier.
 */
const props = defineProps({
    /** @type {Array<{ jour: string, nombre: number, cumul: number }>} */
    points: { type: Array, required: true },
    titre: { type: String, required: true },
    unite: { type: String, default: 'confirmations' },
});

const LARGEUR = 600;
const HAUTEUR = 200;
const GAUCHE = 32;
const BAS = 28;
const HAUT = 16;
const survole = ref(-1);

const maximum = computed(() => {
    const plus = Math.max(1, ...props.points.map((point) => point.cumul));
    const pas = plus <= 5 ? 1 : plus <= 10 ? 2 : plus <= 25 ? 5 : 10;

    return Math.ceil(plus / pas) * pas;
});

const graduations = computed(() => {
    const pas = maximum.value <= 5 ? 1 : maximum.value / 5;

    return Array.from({ length: Math.round(maximum.value / pas) + 1 }, (_, index) => index * pas);
});

const y = (valeur) => HAUTEUR - BAS - ((HAUTEUR - BAS - HAUT) * valeur) / maximum.value;
const bande = computed(() => (LARGEUR - GAUCHE) / Math.max(1, props.points.length));
const epaisseur = computed(() => Math.min(24, bande.value * 0.6));

/** Colonne à bout arrondi (4 px) en haut, carrée sur la ligne de base. */
function colonne(index, valeur) {
    const x = GAUCHE + bande.value * index + (bande.value - epaisseur.value) / 2;
    const haut = y(valeur);
    const base = HAUTEUR - BAS;
    const rayon = Math.min(4, (base - haut) / 2, epaisseur.value / 2);

    return `M${x} ${base}V${haut + rayon}Q${x} ${haut} ${x + rayon} ${haut}H${x + epaisseur.value - rayon}Q${x + epaisseur.value} ${haut} ${x + epaisseur.value} ${haut + rayon}V${base}Z`;
}
</script>

<template>
    <div class="relative">
        <svg :viewBox="`0 0 ${LARGEUR} ${HAUTEUR}`" class="w-full" role="img" :aria-label="titre">
            <g v-for="graduation in graduations" :key="graduation">
                <line :x1="GAUCHE" :x2="LARGEUR" :y1="y(graduation)" :y2="y(graduation)" class="grille" />
                <text :x="GAUCHE - 8" :y="y(graduation) + 4" text-anchor="end" class="etiquette">{{ graduation }}</text>
            </g>
            <g v-for="(point, index) in points" :key="point.jour">
                <path :d="colonne(index, point.cumul)" class="colonne" />
                <text :x="GAUCHE + bande * index + bande / 2" :y="HAUTEUR - 8" text-anchor="middle" class="etiquette">{{ dateCourte(point.jour).replace(/ \d{4}$/, '') }}</text>
                <text v-if="index === points.length - 1" :x="GAUCHE + bande * index + bande / 2" :y="y(point.cumul) - 6" text-anchor="middle" class="valeur">{{ point.cumul }}</text>
                <rect
                    :x="GAUCHE + bande * index"
                    :y="HAUT"
                    :width="bande"
                    :height="HAUTEUR - BAS - HAUT"
                    fill="transparent"
                    tabindex="0"
                    class="outline-none"
                    :aria-label="`${dateCourte(point.jour)} : ${point.nombre} de plus, ${point.cumul} au total`"
                    @mouseenter="survole = index"
                    @mouseleave="survole = -1"
                    @focus="survole = index"
                    @blur="survole = -1"
                />
            </g>
        </svg>
        <p
            v-if="survole >= 0"
            class="infobulle pointer-events-none absolute top-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap"
            :style="{ left: `${((GAUCHE + bande * survole + bande / 2) / LARGEUR) * 100}%`, transform: 'translateX(-50%)' }"
            role="tooltip"
        >{{ dateCourte(points[survole].jour) }} : +{{ points[survole].nombre }}, {{ points[survole].cumul }} {{ unite }} au total</p>
    </div>
</template>

<style scoped>
.grille {
    stroke: var(--c-ligne);
    stroke-width: 1;
}

.etiquette {
    fill: var(--c-encre-douce);
    font-size: 11px;
}

.valeur {
    fill: var(--c-encre);
    font-size: 12px;
    font-weight: 700;
}

.colonne {
    fill: var(--color-vert-500);
}

.infobulle {
    background: var(--c-encre);
    color: var(--c-surface);
}

:root[data-theme='sombre'] .colonne {
    fill: var(--color-vert-400);
}
</style>
