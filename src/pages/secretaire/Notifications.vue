<script setup>
import ListeNotifications from '../../components/ListeNotifications.vue';
import Icone from '../../components/Icone.vue';

/** Notifications du secrétaire régional : nouveaux courriers, décisions et rappels avant la date limite. */
</script>

<template>
    <div class="mx-auto flex max-w-3xl flex-col gap-6">
        <header class="flex flex-col gap-2">
            <RouterLink :to="{ name: 'espace-secretaire' }" class="inline-flex items-center gap-1 self-start text-sm font-semibold text-lien"><Icone nom="chevron-gauche" class="size-4" /> Mon espace</RouterLink>
            <h1 class="text-3xl font-extrabold tracking-tight">Mes notifications</h1>
            <p class="text-encre-douce">Nouveaux courriers, réponses de l’administrateur et rappels avant chaque date limite, tant que votre réponse n’est pas confirmée.</p>
        </header>
        <ListeNotifications />
    </div>
</template>
