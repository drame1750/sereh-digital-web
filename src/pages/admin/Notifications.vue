<script setup>
import { onMounted, ref } from 'vue';
import Alerte from '../../components/Alerte.vue';
import ListeNotifications from '../../components/ListeNotifications.vue';
import { instant } from '../../donnees-exemple.js';
import { suiviDesRappels } from '../../services/notifications.js';
import { parametres } from '../../services/parametres.js';

/**
 * Centre de notifications de l'administration (module 10) et suivi des rappels envoyés aux membres
 * du bureau : destinataire, canal, date et statut.
 */
const onglet = ref('mes-notifications');
const rappels = ref(null);

const rappelsActifs = () => [7, 3, 1].filter((nombre) => parametres.rappels[`j${nombre}`]).map((nombre) => `J-${nombre}`).join(', ') || 'aucun';

onMounted(async () => {
    rappels.value = await suiviDesRappels();
});
</script>

<template>
    <div class="mx-auto flex max-w-4xl flex-col gap-6">
        <header class="flex flex-col gap-2">
            <p class="surtitre">Pilotage</p>
            <h1 class="text-3xl font-extrabold tracking-tight">Notifications</h1>
            <p class="text-encre-douce">Courriers, confirmations, rappels, inscriptions, pointage, rapports, comptes et sauvegardes. Une notification disparaît d’elle-même quand la situation est réglée.</p>
        </header>

        <Alerte ton="info">
            Canal : <strong>dans la plateforme</strong> seulement. Rappels prévus avant chaque date limite : {{ rappelsActifs() }} (réglables dans les Paramètres). L’e-mail, les SMS et WhatsApp ne seront ajoutés qu’après accord sur leur coût et des essais réels.
        </Alerte>

        <div class="flex gap-2 border-b border-ligne" role="tablist">
            <button
                v-for="choix in [{ cle: 'mes-notifications', libelle: 'Mes notifications' }, { cle: 'rappels', libelle: 'Rappels envoyés aux membres' }]"
                :key="choix.cle"
                type="button"
                role="tab"
                class="-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold"
                :class="onglet === choix.cle ? 'border-accent text-encre' : 'border-transparent text-encre-douce hover:text-encre'"
                :aria-selected="onglet === choix.cle"
                @click="onglet = choix.cle"
            >{{ choix.libelle }}</button>
        </div>

        <ListeNotifications v-if="onglet === 'mes-notifications'" />

        <section v-else class="carte overflow-hidden" aria-label="Rappels envoyés aux membres du bureau">
            <div v-if="!rappels" class="squelette m-5 h-24" aria-hidden="true" />
            <p v-else-if="rappels.length === 0" class="p-5 text-sm text-encre-douce">Aucun rappel en cours : tous les membres attendus ont confirmé, ou aucune date limite n’est proche.</p>
            <div v-else class="overflow-x-auto">
                <table class="w-full min-w-[40rem] text-left text-sm">
                    <thead class="bg-surface-2 text-xs tracking-wide text-encre-douce uppercase">
                        <tr>
                            <th scope="col" class="px-4 py-3">Destinataire</th>
                            <th scope="col" class="px-4 py-3">Rappel</th>
                            <th scope="col" class="px-4 py-3">Canal</th>
                            <th scope="col" class="px-4 py-3">Date</th>
                            <th scope="col" class="px-4 py-3">Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="ligne in rappels" :key="ligne.id" class="border-t border-ligne align-top">
                            <td class="px-4 py-3 font-semibold">{{ ligne.destinataire }}</td>
                            <td class="px-4 py-3"><span class="font-semibold" :class="{ 'text-danger': ligne.urgente }">{{ ligne.titre }}</span><span class="block text-xs text-encre-douce">{{ ligne.texte }}</span></td>
                            <td class="px-4 py-3">{{ ligne.canal }}</td>
                            <td class="px-4 py-3 whitespace-nowrap">{{ instant(ligne.le) }}</td>
                            <td class="px-4 py-3"><span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="ligne.statut === 'Lu' ? 'bg-ok-fond text-ok' : 'bg-surface-2 text-encre-douce'">{{ ligne.statut }}</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    </div>
</template>
