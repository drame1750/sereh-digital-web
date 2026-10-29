<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { instant } from '../donnees-exemple.js';
import { CATEGORIES, marquerLues, mesNotifications } from '../services/notifications.js';
import Icone from './Icone.vue';

/**
 * Centre de notifications de la personne connectée : non lues en gras, urgentes en rouge, filtres
 * par état et par catégorie. Ouvrir une notification la marque comme lue.
 */
const router = useRouter();
const notifications = ref(null);
const filtre = ref('toutes');
const categorie = ref('');

const FILTRES = [
    { cle: 'toutes', libelle: 'Toutes' },
    { cle: 'non-lues', libelle: 'Non lues' },
    { cle: 'urgentes', libelle: 'Urgentes' },
];

const affichees = computed(() => (notifications.value ?? []).filter((notification) => (filtre.value === 'toutes' || (filtre.value === 'non-lues' ? !notification.lue : notification.urgente))
    && (!categorie.value || notification.categorie === categorie.value)));

const categoriesPresentes = computed(() => Object.entries(CATEGORIES).filter(([cle]) => (notifications.value ?? []).some((notification) => notification.categorie === cle)));
const nonLues = computed(() => (notifications.value ?? []).filter((notification) => !notification.lue));

async function charger() {
    notifications.value = await mesNotifications();
}

async function ouvrir(notification) {
    await marquerLues([notification.id]);
    router.push(notification.lien);
}

async function toutMarquerLu() {
    await marquerLues(nonLues.value.map((notification) => notification.id));
    await charger();
}

onMounted(charger);
</script>

<template>
    <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrer les notifications">
                <button
                    v-for="choix in FILTRES"
                    :key="choix.cle"
                    type="button"
                    class="inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold"
                    :class="filtre === choix.cle ? 'bg-accent text-accent-texte' : 'bg-surface-2 hover:bg-ligne'"
                    :aria-pressed="filtre === choix.cle"
                    @click="filtre = choix.cle"
                >{{ choix.libelle }}</button>
                <label class="sr-only" for="notifications-categorie">Catégorie</label>
                <select id="notifications-categorie" v-model="categorie" class="champ-saisie min-h-10 w-auto py-1.5 text-sm">
                    <option value="">Toutes les catégories</option>
                    <option v-for="[cle, libelle] in categoriesPresentes" :key="cle" :value="cle">{{ libelle }}</option>
                </select>
            </div>
            <button type="button" class="bouton-discret" :disabled="nonLues.length === 0" @click="toutMarquerLu"><Icone nom="coche" class="size-4" /> Tout marquer comme lu</button>
        </div>

        <div v-if="!notifications" class="flex flex-col gap-3" aria-hidden="true">
            <div v-for="index in 3" :key="index" class="squelette h-20" />
        </div>
        <p v-else-if="affichees.length === 0" class="carte flex items-center gap-3 p-5 text-encre-douce"><Icone nom="coche" class="size-5 text-ok" /> Aucune notification dans cette catégorie.</p>
        <ul v-else class="flex flex-col gap-2">
            <li v-for="notification in affichees" :key="notification.id">
                <button
                    type="button"
                    class="carte carte-vivante flex w-full items-start gap-3 p-4 text-left"
                    :class="{ 'border-l-4 border-l-danger': notification.urgente && !notification.lue, 'opacity-75': notification.lue }"
                    @click="ouvrir(notification)"
                >
                    <span class="mt-0.5 inline-flex size-9 flex-none items-center justify-center rounded-xl" :class="notification.urgente ? 'bg-danger-fond text-danger' : 'bg-surface-2 text-or-600'">
                        <Icone :nom="notification.urgente ? 'alerte' : 'notifications'" class="size-5" />
                    </span>
                    <span class="min-w-0 flex-1">
                        <span class="flex flex-wrap items-center gap-2">
                            <span class="text-sm" :class="notification.lue ? 'font-semibold' : 'font-extrabold'">{{ notification.titre }}</span>
                            <span v-if="!notification.lue" class="rounded-full bg-info-fond px-2 py-0.5 text-[0.6875rem] font-bold text-info">Non lue</span>
                            <span v-if="notification.urgente" class="rounded-full bg-danger-fond px-2 py-0.5 text-[0.6875rem] font-bold text-danger">Urgente</span>
                        </span>
                        <span class="mt-0.5 block text-sm text-encre-douce">{{ notification.texte }}</span>
                        <span class="mt-1 block text-xs text-encre-douce">{{ CATEGORIES[notification.categorie] }} · {{ instant(notification.le) }} · {{ notification.canal }}</span>
                    </span>
                    <Icone nom="chevron-droite" class="mt-2 size-4 flex-none text-encre-douce" />
                </button>
            </li>
        </ul>
    </div>
</template>
