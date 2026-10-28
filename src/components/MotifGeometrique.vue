<script setup>
/**
 * Motifs géométriques d'inspiration islamique, dessinés en SVG : aucune image externe, rendu net à
 * toutes les tailles.
 * - « fond » : un treillis discret d'étoiles à huit branches, à poser derrière un bandeau ;
 * - « rosace » : une grande rosace dorée qui se dessine trait après trait à l'ouverture de la page.
 */
defineProps({
    variante: { type: String, default: 'fond' },
});

const carre = (cx, cy, demi, angle = 0) => {
    const rad = (angle * Math.PI) / 180;
    const points = [[-demi, -demi], [demi, -demi], [demi, demi], [-demi, demi]].map(([x, y]) => [
        cx + x * Math.cos(rad) - y * Math.sin(rad),
        cy + x * Math.sin(rad) + y * Math.cos(rad),
    ]);

    return `M${points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}Z`;
};
const cercle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const etoile = (cx, cy, demi, angle = 0) => [carre(cx, cy, demi, angle), carre(cx, cy, demi, angle + 45)];

// La rosace : de l'extérieur vers le centre, chaque trait avec son délai de tracé.
const traitsRosace = [
    { d: cercle(200, 200, 186), delai: 0 },
    { d: cercle(200, 200, 172), delai: 120 },
    ...[0, 22.5, 45, 67.5].map((angle, index) => ({ d: carre(200, 200, 124, angle), delai: 260 + index * 90 })),
    ...etoile(200, 200, 78).map((d, index) => ({ d, delai: 680 + index * 90 })),
    { d: cercle(200, 200, 58), delai: 900 },
    ...etoile(200, 200, 34, 22.5).map((d, index) => ({ d, delai: 1040 + index * 90 })),
    { d: cercle(200, 200, 14), delai: 1260 },
];

// Le treillis du fond : une étoile au centre de chaque tuile, reliée à ses voisines.
const tuile = 72;
const traitsTuile = [
    ...etoile(36, 36, 11),
    'M36 0v20.4', 'M36 51.6V72', 'M0 36h20.4', 'M51.6 36H72',
    'M0 0l13.4 13.4', 'M72 0 58.6 13.4', 'M0 72l13.4-13.4', 'M72 72 58.6 58.6',
];
</script>

<template>
    <svg v-if="variante === 'rosace'" class="rosace" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
        <defs>
            <linearGradient id="rosace-or" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#f0d98f" />
                <stop offset="0.55" stop-color="#c9a24a" />
                <stop offset="1" stop-color="#e8cf8e" />
            </linearGradient>
        </defs>
        <g class="rosace__couronne" fill="none" stroke="url(#rosace-or)" stroke-width="1.6" stroke-linejoin="round">
            <path v-for="(trait, index) in traitsRosace" :key="index" class="rosace__trait" :d="trait.d" pathLength="1" :style="{ '--d': `${trait.delai}ms` }" />
        </g>
    </svg>

    <svg v-else class="motif-fond" aria-hidden="true" focusable="false">
        <defs>
            <pattern id="motif-sereh" :width="tuile" :height="tuile" patternUnits="userSpaceOnUse">
                <g fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round">
                    <path v-for="(d, index) in traitsTuile" :key="index" :d="d" />
                </g>
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#motif-sereh)" />
    </svg>
</template>

<style scoped>
.motif-fond {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.rosace {
    display: block;
    width: 100%;
    height: auto;
}

.rosace__trait {
    stroke-dasharray: 1;
    stroke-dashoffset: 0;
}

:root[data-animations='oui'] .rosace__trait {
    stroke-dashoffset: 1;
    animation: trace 2.2s var(--ease-douce) forwards;
    animation-delay: var(--d);
}

:root[data-animations='oui'] .rosace__couronne {
    transform-origin: 200px 200px;
    animation: rotation-lente 160s linear infinite;
}
</style>
