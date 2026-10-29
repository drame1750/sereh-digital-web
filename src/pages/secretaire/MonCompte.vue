<script setup>
import Icone from '../../components/Icone.vue';
import MonCompte from '../../components/MonCompte.vue';

/** Compte du secrétaire régional : mot de passe et appareils connectés. */
</script>

<template>
    <div class="flex flex-col gap-6">
        <header class="flex flex-col gap-2">
            <RouterLink :to="{ name: 'espace-secretaire' }" class="inline-flex items-center gap-1 self-start text-sm font-semibold text-lien"><Icone nom="chevron-gauche" class="size-4" /> Mon espace</RouterLink>
            <h1 class="text-3xl font-extrabold tracking-tight">Mon compte</h1>
            <p class="text-encre-douce">Mot de passe oublié ou numéro changé ? Adressez-vous à l’administrateur : il vérifiera votre identité par téléphone.</p>
        </header>
        <MonCompte />
    </div>
</template>
