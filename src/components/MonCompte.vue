<script setup>
import { onMounted, reactive, ref } from 'vue';
import { instant } from '../donnees-exemple.js';
import { changerMonMotDePasse, fermerMaSession, LIBELLES_ROLES, mesSessions, session } from '../services/session.js';
import { formaterTelephone } from '../telephone.js';
import Icone from './Icone.vue';

/**
 * Mon compte : changer son mot de passe et voir ses appareils connectés, avec la déconnexion à
 * distance d'un appareil (cahier des charges, section 6).
 */
const sessions = ref([]);
const formulaire = reactive({ actuel: '', nouveau: '', confirmation: '' });
const message = ref(null);
const envoi = ref(false);

async function charger() {
    sessions.value = await mesSessions();
}

async function changer() {
    envoi.value = true;
    message.value = null;

    try {
        message.value = { ton: 'ok', texte: await changerMonMotDePasse(formulaire.actuel, formulaire.nouveau, formulaire.confirmation) };
        Object.assign(formulaire, { actuel: '', nouveau: '', confirmation: '' });
    } catch (erreur) {
        message.value = { ton: 'danger', texte: erreur.message };
    } finally {
        envoi.value = false;
    }
}

async function fermer(identifiant) {
    await fermerMaSession(identifiant);
    await charger();
}

onMounted(charger);
</script>

<template>
    <div class="grid gap-6 lg:grid-cols-2">
        <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-mon-compte">
            <h2 id="titre-mon-compte" class="text-lg font-bold">Mon compte</h2>
            <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt class="text-encre-douce">Nom</dt><dd class="font-semibold">{{ session.utilisateur?.nom }}</dd>
                <dt class="text-encre-douce">Rôle</dt><dd>{{ LIBELLES_ROLES[session.utilisateur?.role] }}</dd>
                <dt class="text-encre-douce">Numéro</dt><dd class="font-mono">{{ session.utilisateur ? formaterTelephone(session.utilisateur.telephone) : '' }}</dd>
            </dl>
            <form class="flex flex-col gap-3 border-t border-ligne pt-4" novalidate @submit.prevent="changer">
                <p class="text-sm font-semibold">Changer mon mot de passe</p>
                <label class="flex flex-col gap-1.5 text-sm">Mot de passe actuel<input v-model="formulaire.actuel" type="password" class="champ-saisie" autocomplete="current-password"></label>
                <label class="flex flex-col gap-1.5 text-sm">Nouveau mot de passe <span class="text-xs text-encre-douce">au moins 12 caractères, avec des lettres et des chiffres</span><input v-model="formulaire.nouveau" type="password" class="champ-saisie" autocomplete="new-password"></label>
                <label class="flex flex-col gap-1.5 text-sm">Confirmez le nouveau mot de passe<input v-model="formulaire.confirmation" type="password" class="champ-saisie" autocomplete="new-password"></label>
                <p v-if="message" class="text-sm font-semibold" :class="message.ton === 'ok' ? 'text-ok' : 'text-danger'" :role="message.ton === 'ok' ? 'status' : 'alert'">{{ message.texte }}</p>
                <button type="submit" class="bouton-primaire self-start" :disabled="envoi">{{ envoi ? 'Enregistrement…' : 'Changer le mot de passe' }}</button>
            </form>
        </section>

        <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-sessions">
            <h2 id="titre-sessions" class="text-lg font-bold">Mes appareils connectés</h2>
            <p class="text-sm text-encre-douce">Vous ne reconnaissez pas un appareil ? Déconnectez-le : il devra se reconnecter avec votre mot de passe.</p>
            <ul class="flex flex-col gap-2">
                <li v-for="ouverte in sessions" :key="ouverte.id" class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 p-3">
                    <span class="text-sm">
                        <span class="block font-semibold">{{ ouverte.appareil }}</span>
                        <span class="block text-xs text-encre-douce">Connecté le {{ instant(ouverte.ouverteLe) }}</span>
                    </span>
                    <span v-if="ouverte.courante" class="rounded-full bg-ok-fond px-2.5 py-1 text-xs font-semibold text-ok">Cet appareil</span>
                    <button v-else type="button" class="bouton-discret" @click="fermer(ouverte.id)"><Icone nom="deconnexion" class="size-4" /> Déconnecter</button>
                </li>
            </ul>
        </section>
    </div>
</template>
