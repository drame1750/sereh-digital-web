<script setup>
import { onMounted, ref } from 'vue';
import Alerte from '../../components/Alerte.vue';
import ConfirmationSensible from '../../components/ConfirmationSensible.vue';
import Icone from '../../components/Icone.vue';
import MessageFlottant from '../../components/MessageFlottant.vue';
import { useAction } from '../../composables/useAction.js';
import { instant } from '../../donnees-exemple.js';
import { MODE_DEMONSTRATION } from '../../services/donnees.js';
import { maintenance } from '../../services/maintenance.js';
import { changerMaintenance, etatDuSysteme, lireJournalTechnique, reinitialiserToutLaDemonstration } from '../../services/systeme.js';

/**
 * État du système et maintenance (cahier des charges, section 11) : interface, base de données,
 * sauvegardes, intégrations, sécurité et appareil ; journal technique des erreurs ; mode
 * maintenance, réservé à l'administrateur principal.
 */
const controles = ref(null);
const technique = ref([]);
const message = ref('');
const demande = ref(false);
const remiseAZero = ref(false);

const TONS = {
    ok: { classes: 'bg-ok-fond text-ok', icone: 'coche', libelle: 'Normal' },
    attention: { classes: 'bg-attention-fond text-attention', icone: 'alerte', libelle: 'À surveiller' },
    danger: { classes: 'bg-danger-fond text-danger', icone: 'alerte', libelle: 'Action requise' },
    info: { classes: 'bg-info-fond text-info', icone: 'info', libelle: 'Information' },
};

async function charger() {
    [controles.value, technique.value] = await Promise.all([etatDuSysteme(), lireJournalTechnique()]);
}

const { enCours, confirmation, agir, erreurDe } = useAction(charger);

async function basculer() {
    const activer = !maintenance.active;
    demande.value = false;
    await agir('maintenance', () => changerMaintenance(activer, message.value), activer ? 'Maintenance activée : les modifications sont bloquées.' : 'Maintenance désactivée : le site fonctionne normalement.');
    message.value = '';
}

onMounted(charger);
</script>

<template>
    <div class="mx-auto flex max-w-5xl flex-col gap-6">
        <header class="flex flex-wrap items-end justify-between gap-4">
            <div class="flex flex-col gap-2">
                <p class="surtitre">Système</p>
                <h1 class="text-3xl font-extrabold tracking-tight">État du système</h1>
            </div>
            <button type="button" class="bouton-secondaire" @click="charger"><Icone nom="etat" class="size-4" /> Vérifier de nouveau</button>
        </header>

        <section class="grid gap-3 md:grid-cols-2" aria-label="Contrôles">
            <template v-if="controles">
                <article v-for="controle in controles" :key="controle.cle" class="carte flex gap-3 p-4">
                    <span class="inline-flex size-10 flex-none items-center justify-center rounded-xl" :class="TONS[controle.etat].classes"><Icone :nom="TONS[controle.etat].icone" class="size-5" /></span>
                    <div class="min-w-0">
                        <p class="flex flex-wrap items-center gap-2 font-bold">{{ controle.titre }} <span class="rounded-full px-2 py-0.5 text-[0.6875rem] font-bold" :class="TONS[controle.etat].classes">{{ TONS[controle.etat].libelle }}</span></p>
                        <p class="text-sm text-encre-douce">{{ controle.texte }}</p>
                    </div>
                </article>
            </template>
            <div v-for="index in controles ? 0 : 6" :key="index" class="squelette h-20" aria-hidden="true" />
        </section>

        <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-maintenance">
            <h2 id="titre-maintenance" class="flex items-center gap-2 text-lg font-bold"><Icone nom="parametres" class="size-5 text-or-600" /> Mode maintenance</h2>
            <p class="text-sm text-encre-douce">Pendant la maintenance, toutes les modifications sont bloquées (inscriptions, pointage, courriers, réponses…). L’administrateur peut encore tout consulter, et la page publique affiche un message avec les coordonnées du SEREH.</p>
            <Alerte v-if="maintenance.active" ton="attention" titre="Maintenance en cours">Activée le {{ instant(maintenance.depuis) }} par {{ maintenance.par }}.{{ maintenance.message ? ` Message affiché : « ${maintenance.message} »` : '' }}</Alerte>
            <label v-if="!maintenance.active" class="flex flex-col gap-1.5 text-sm font-semibold">Message pour les visiteurs <span class="font-normal text-encre-douce">(facultatif)</span>
                <input v-model="message" class="champ-saisie font-normal" maxlength="200" placeholder="Retour prévu ce soir à 20 h.">
            </label>
            <ConfirmationSensible v-if="demande" :titre="maintenance.active ? 'Désactiver la maintenance' : 'Activer la maintenance'" :libelle-bouton="maintenance.active ? 'Désactiver' : 'Activer la maintenance'" ton="attention" @confirmer="basculer" @annuler="demande = false">
                {{ maintenance.active ? 'Le site reprendra son fonctionnement normal.' : 'Plus personne ne pourra s’inscrire, pointer ni répondre à un courrier tant que la maintenance est active. N’activez jamais la maintenance pendant une activité.' }}
            </ConfirmationSensible>
            <button v-else type="button" :class="maintenance.active ? 'bouton-primaire' : 'bouton-danger'" class="self-start" :disabled="enCours === 'maintenance'" @click="demande = true">{{ maintenance.active ? 'Désactiver la maintenance' : 'Activer la maintenance' }}</button>
            <p v-if="erreurDe('maintenance')" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe('maintenance') }}</p>
        </section>

        <section class="carte flex flex-col gap-3 p-6" aria-labelledby="titre-technique">
            <h2 id="titre-technique" class="text-lg font-bold">Journal technique</h2>
            <p class="text-sm text-encre-douce">Les erreurs de l’interface, gardées 30 jours, sans donnée personnelle. Les personnes, elles, voient un message clair.</p>
            <p v-if="technique.length === 0" class="text-sm text-encre-douce">Aucune erreur notée.</p>
            <ul class="flex flex-col gap-2">
                <li v-for="(entree, index) in technique" :key="index" class="rounded-xl bg-surface-2 p-3 text-sm">
                    <p class="font-mono text-xs break-all">{{ entree.message }}</p>
                    <p class="text-xs text-encre-douce">{{ instant(entree.le) }} · {{ entree.source }} · {{ entree.page || 'accueil' }}</p>
                </li>
            </ul>
        </section>

        <section v-if="MODE_DEMONSTRATION" class="carte flex flex-col gap-3 p-6" aria-labelledby="titre-remise">
            <h2 id="titre-remise" class="text-lg font-bold">Démonstration</h2>
            <p class="text-sm text-encre-douce">Remet toute la démonstration à zéro dans cet onglet : activités, inscriptions, courriers, comptes, paramètres et sauvegardes d’exemple. Vous serez déconnecté.</p>
            <button v-if="!remiseAZero" type="button" class="bouton-discret self-start" @click="remiseAZero = true">Remettre la démonstration à zéro</button>
            <div v-else class="flex flex-wrap gap-2">
                <button type="button" class="bouton-danger" @click="reinitialiserToutLaDemonstration">Oui, tout remettre à zéro</button>
                <button type="button" class="bouton-discret" @click="remiseAZero = false">Annuler</button>
            </div>
        </section>

        <MessageFlottant :texte="confirmation" @fermer="confirmation = ''" />
    </div>
</template>
