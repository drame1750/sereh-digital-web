<script setup>
import { onBeforeUnmount, onMounted, ref, useId } from 'vue';
import { reglages, remettreParDefaut } from '../affichage.js';
import Icone from './Icone.vue';

/**
 * Menu « Affichage » (cahier des charges, section 8) : thème, taille du texte, contraste renforcé
 * et animations. Les choix sont mémorisés sur l'appareil.
 */
defineProps({
    surFondSombre: { type: Boolean, default: false },
});

const ouvert = ref(false);
const racine = ref(null);
const identifiantPanneau = useId();

const THEMES = [
    { valeur: 'auto', libelle: 'Auto' },
    { valeur: 'clair', libelle: 'Clair' },
    { valeur: 'sombre', libelle: 'Sombre' },
];

function basculer(cle, actif, inactif) {
    reglages[cle] = reglages[cle] === actif ? inactif : actif;
}

function fermerSiExterieur(evenement) {
    if (ouvert.value && racine.value && !racine.value.contains(evenement.target)) {
        ouvert.value = false;
    }
}

function fermerAvecEchap(evenement) {
    if (evenement.key === 'Escape' && ouvert.value) {
        ouvert.value = false;
        racine.value?.querySelector('button')?.focus();
    }
}

onMounted(() => {
    document.addEventListener('pointerdown', fermerSiExterieur);
    document.addEventListener('keydown', fermerAvecEchap);
});

onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', fermerSiExterieur);
    document.removeEventListener('keydown', fermerAvecEchap);
});
</script>

<template>
    <div ref="racine" class="relative">
        <button
            type="button"
            class="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors"
            :class="surFondSombre ? 'text-white hover:bg-white/10' : 'text-encre hover:bg-surface-2'"
            :aria-expanded="ouvert"
            :aria-controls="identifiantPanneau"
            @click="ouvert = !ouvert"
        >
            <Icone nom="texte" class="size-5" />
            <span class="hidden sm:inline">Affichage</span>
        </button>

        <Transition name="panneau">
            <div
                v-if="ouvert"
                :id="identifiantPanneau"
                class="carte fixed inset-x-4 top-[4.5rem] z-50 p-5 text-encre sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-80"
                role="group"
                aria-label="Réglages d'affichage"
            >
                <p class="mb-3 text-sm font-bold">Affichage</p>

                <fieldset class="mb-4">
                    <legend class="mb-2 flex items-center gap-2 text-xs font-semibold text-encre-douce">
                        <Icone nom="soleil" class="size-4" /> Thème
                    </legend>
                    <div class="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
                        <label
                            v-for="theme in THEMES"
                            :key="theme.valeur"
                            class="cursor-pointer rounded-lg px-2 py-2 text-center text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-or-500"
                            :class="reglages.theme === theme.valeur ? 'bg-surface text-encre shadow-sm' : 'text-encre-douce'"
                        >
                            <input v-model="reglages.theme" class="sr-only" type="radio" name="theme" :value="theme.valeur">
                            {{ theme.libelle }}
                        </label>
                    </div>
                </fieldset>

                <div class="flex flex-col gap-1">
                    <button type="button" class="interrupteur" role="switch" :aria-checked="reglages.texte === 'grand'" @click="basculer('texte', 'grand', 'normal')">
                        <span class="flex items-center gap-2"><Icone nom="texte" class="size-4" /> Grand texte</span>
                        <span class="interrupteur__curseur" aria-hidden="true" />
                    </button>
                    <button type="button" class="interrupteur" role="switch" :aria-checked="reglages.contraste === 'renforce'" @click="basculer('contraste', 'renforce', 'normal')">
                        <span class="flex items-center gap-2"><Icone nom="contraste" class="size-4" /> Contraste renforcé</span>
                        <span class="interrupteur__curseur" aria-hidden="true" />
                    </button>
                    <button type="button" class="interrupteur" role="switch" :aria-checked="reglages.animations === 'oui'" @click="basculer('animations', 'oui', 'non')">
                        <span class="flex items-center gap-2"><Icone nom="animations" class="size-4" /> Animations</span>
                        <span class="interrupteur__curseur" aria-hidden="true" />
                    </button>
                </div>

                <button type="button" class="bouton-discret mt-3 w-full" @click="remettreParDefaut">Revenir aux réglages de l'appareil</button>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.interrupteur {
    display: flex;
    min-height: 2.75rem;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border-radius: 0.75rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    text-align: left;
}

.interrupteur:hover {
    background: var(--c-surface-2);
}

.interrupteur__curseur {
    position: relative;
    width: 2.75rem;
    height: 1.5rem;
    flex: none;
    border-radius: 999px;
    background: var(--c-ligne);
    transition: background-color 0.2s ease;
}

.interrupteur__curseur::after {
    content: '';
    position: absolute;
    top: 0.1875rem;
    left: 0.1875rem;
    width: 1.125rem;
    height: 1.125rem;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
    transition: transform 0.2s var(--ease-douce);
}

.interrupteur[aria-checked='true'] .interrupteur__curseur {
    background: var(--c-accent);
}

.interrupteur[aria-checked='true'] .interrupteur__curseur::after {
    transform: translateX(1.25rem);
}

.panneau-enter-active,
.panneau-leave-active {
    transition: opacity 0.16s ease, transform 0.16s var(--ease-douce);
}

.panneau-enter-from,
.panneau-leave-to {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
}
</style>
