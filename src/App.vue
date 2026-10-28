<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import MiseEnPageAdmin from './layouts/MiseEnPageAdmin.vue';
import MiseEnPagePointage from './layouts/MiseEnPagePointage.vue';
import MiseEnPagePublique from './layouts/MiseEnPagePublique.vue';

const route = useRoute();
const MISES_EN_PAGE = { admin: MiseEnPageAdmin, pointage: MiseEnPagePointage, publique: MiseEnPagePublique };
const miseEnPage = computed(() => MISES_EN_PAGE[route.meta.miseEnPage] ?? MiseEnPagePublique);
</script>

<template>
    <component :is="miseEnPage">
        <RouterView v-slot="{ Component, route: page }">
            <Transition name="page" mode="out-in">
                <component :is="Component" :key="page.path" />
            </Transition>
        </RouterView>
    </component>
</template>
