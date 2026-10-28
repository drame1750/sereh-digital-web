<script setup>
import { computed } from 'vue';
import Icone from './Icone.vue';

/** Message de confirmation, d'information, d'attention ou d'erreur, écrit en mots simples. */
const props = defineProps({
    ton: { type: String, default: 'info' },
    titre: { type: String, default: '' },
});

const STYLES = {
    ok: { classes: 'border-ok/30 bg-ok-fond text-ok', icone: 'coche' },
    info: { classes: 'border-info/30 bg-info-fond text-info', icone: 'info' },
    attention: { classes: 'border-attention/30 bg-attention-fond text-attention', icone: 'alerte' },
    danger: { classes: 'border-danger/30 bg-danger-fond text-danger', icone: 'alerte' },
};

const style = computed(() => STYLES[props.ton] ?? STYLES.info);
</script>

<template>
    <div class="flex gap-3 rounded-xl border p-4" :class="style.classes" :role="ton === 'danger' ? 'alert' : 'status'">
        <Icone :nom="style.icone" class="mt-0.5 size-5 flex-none" />
        <div class="text-sm leading-relaxed">
            <p v-if="titre" class="font-bold">{{ titre }}</p>
            <slot />
        </div>
    </div>
</template>
