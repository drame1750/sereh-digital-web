<script setup>
import { useRouter } from 'vue-router';
import Icone from '../components/Icone.vue';
import { seDeconnecter, session } from '../services/session.js';

/** Page provisoire de l'espace secrétaire régional : il arrive au module 9 (courriers et espace SR). */
const router = useRouter();

function quitter() {
    seDeconnecter();
    router.push({ name: 'accueil' });
}
</script>

<template>
    <div class="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16 sm:px-6">
        <div class="carte flex flex-col gap-4 p-8 text-center" v-apparition>
            <span class="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-or-100 to-or-300 text-vert-900">
                <Icone nom="secretaires" class="size-7" />
            </span>
            <h1 class="text-2xl font-extrabold">Espace secrétaire régional</h1>
            <p>Bienvenue, <strong>{{ session.utilisateur?.nom }}</strong>.</p>
            <p class="text-encre-douce">Les missions, les courriers et les confirmations de présence arrivent au module 9.</p>
            <button type="button" class="bouton-secondaire" @click="quitter"><Icone nom="deconnexion" class="size-4" /> Se déconnecter</button>
        </div>
    </div>
</template>
