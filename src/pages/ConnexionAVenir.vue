<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Icone from '../components/Icone.vue';

/** Page provisoire des deux espaces privés : la connexion arrive au module 4. */
const route = useRoute();
const administrateur = computed(() => route.query.espace !== 'secretaire');
</script>

<template>
    <div class="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16 sm:px-6">
        <div class="carte flex flex-col gap-4 p-8 text-center" v-apparition>
            <span class="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-or-100 to-or-300 text-vert-900">
                <Icone :nom="administrateur ? 'securite' : 'secretaires'" class="size-7" />
            </span>
            <h1 class="text-2xl font-extrabold">{{ administrateur ? 'Espace administrateur' : 'Espace secrétaire régional' }}</h1>
            <p class="text-encre-douce">La connexion par numéro de téléphone et mot de passe arrive au module 4.</p>
            <RouterLink v-if="administrateur" :to="{ name: 'tableau-de-bord' }" class="bouton-primaire">
                Voir la maquette du tableau de bord
            </RouterLink>
            <RouterLink to="/" class="bouton-discret">Revenir à l'accueil</RouterLink>
        </div>
    </div>
</template>
