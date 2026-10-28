<script setup>
import { computed } from 'vue';

/**
 * Jeu d'icônes au trait, dessiné pour SEREH Digital (grille de 24, trait arrondi). Une icône est
 * décorative par défaut ; avec un « libelle », elle est annoncée aux lecteurs d'écran.
 */
const props = defineProps({
    nom: { type: String, required: true },
    libelle: { type: String, default: '' },
});

const cercle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const rectangle = (x, y, l, h, r = 2) =>
    `M${x + r} ${y}h${l - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(l - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;

const ICONES = {
    accueil: ['M3 11.5 12 4l9 7.5', 'M5.5 10v9.5h13V10', 'M10 19.5v-5h4v5'],
    calendrier: [rectangle(3, 5, 18, 16), 'M3 10h18', 'M8 3v4', 'M16 3v4'],
    courrier: [rectangle(3, 5, 18, 14), 'M3.8 7 12 13l8.2-6'],
    secretaires: [cercle(9, 8, 3.5), 'M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5', cercle(17, 8.5, 2.5), 'M16.8 14.2c2.5.3 4.2 2 4.7 5.3'],
    comptes: [cercle(12, 8, 4), 'M4 21c1-4 4.2-6 8-6s7 2 8 6'],
    inscriptions: [rectangle(5, 4, 14, 17), 'M9 3h6v3H9z', 'M9 11h6', 'M9 15h4'],
    participants: [cercle(10, 8, 3.5), 'M3.5 20c.8-3.6 3.4-5.5 6.5-5.5 1.5 0 2.9.4 4 1.2', 'M15.5 18l2 2 4-4.5'],
    accompagnateurs: [cercle(9, 8, 3.5), 'M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5', 'M19 7v6', 'M16 10h6'],
    qr: [rectangle(3, 3, 7, 7, 1), rectangle(14, 3, 7, 7, 1), rectangle(3, 14, 7, 7, 1), 'M14 14h3v3h-3z', 'M20 14v1', 'M17 20h4v-3', 'M14 20h.01'],
    pointage: ['M4 8V5a1 1 0 0 1 1-1h3', 'M16 4h3a1 1 0 0 1 1 1v3', 'M20 16v3a1 1 0 0 1-1 1h-3', 'M8 20H5a1 1 0 0 1-1-1v-3', 'M8 12.5l2.5 2.5L16 9.5'],
    notifications: ['M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z', 'M10 20.5a2 2 0 0 0 4 0'],
    rapports: ['M4 4v16h16', 'M8 16v-5', 'M12 16V8', 'M16 16v-3'],
    archives: [rectangle(3, 4, 18, 5, 1), 'M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9', 'M10 13h4'],
    parametres: ['M4 7h9', 'M17 7h3', 'M4 17h3', 'M11 17h9', cercle(15, 7, 2), cercle(9, 17, 2)],
    securite: ['M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z', 'M9 12l2 2 4-4'],
    sauvegardes: ['M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3z', 'M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6', 'M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3'],
    etat: ['M3 12h4l3-7 4 14 3-7h4'],
    menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
    fermer: ['M6 6l12 12', 'M18 6 6 18'],
    'chevron-gauche': ['M15 6l-6 6 6 6'],
    'chevron-droite': ['M9 6l6 6-6 6'],
    soleil: [cercle(12, 12, 4), 'M12 2.5v2', 'M12 19.5v2', 'M2.5 12h2', 'M19.5 12h2', 'M5.3 5.3l1.4 1.4', 'M17.3 17.3l1.4 1.4', 'M5.3 18.7l1.4-1.4', 'M17.3 6.7l1.4-1.4'],
    lune: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
    texte: ['M3.5 19 9 5l5.5 14', 'M5.6 14h6.8', cercle(18, 15.5, 2.5), 'M20.5 12.5v6.5'],
    contraste: [cercle(12, 12, 9), { d: 'M12 3a9 9 0 0 1 0 18z', plein: true }],
    animations: ['M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z', 'M18.5 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z'],
    coche: ['M5 12.5l4.5 4.5L19 7.5'],
    lieu: ['M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z', cercle(12, 9.5, 2.5)],
    horloge: [cercle(12, 12, 9), 'M12 7v5l3 2'],
    deconnexion: ['M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3', 'M10 8l-4 4 4 4', 'M6 12h10'],
    recherche: [cercle(11, 11, 6.5), 'M20 20l-4.3-4.3'],
    plus: ['M12 5v14', 'M5 12h14'],
    alerte: ['M12 4 2.8 19.5h18.4z', 'M12 10v4', 'M12 17h.01'],
    info: [cercle(12, 12, 9), 'M12 11v5', 'M12 8h.01'],
    'fleche-droite': ['M5 12h14', 'M13 6l6 6-6 6'],
    connexion: ['M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3', 'M14 8l4 4-4 4', 'M18 12H8'],
};

const traits = computed(() => (ICONES[props.nom] ?? ICONES.info).map((trait) => (typeof trait === 'string' ? { d: trait } : trait)));
</script>

<template>
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        :role="libelle ? 'img' : undefined"
        :aria-label="libelle || undefined"
        :aria-hidden="libelle ? undefined : 'true'"
        focusable="false"
    >
        <path v-for="(trait, index) in traits" :key="index" :d="trait.d" :fill="trait.plein ? 'currentColor' : undefined" />
    </svg>
</template>
