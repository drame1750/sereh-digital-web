<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import MiseEnPageAdmin from './layouts/MiseEnPageAdmin.vue';
import MiseEnPagePublique from './layouts/MiseEnPagePublique.vue';

const route = useRoute();
const miseEnPage = computed(() => (route.meta.miseEnPage === 'admin' ? MiseEnPageAdmin : MiseEnPagePublique));
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
