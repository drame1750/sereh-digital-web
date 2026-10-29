<script setup>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BadgeStatut from '../../components/BadgeStatut.vue';
import Icone from '../../components/Icone.vue';
import { libelleRole } from '../../billet.js';
import { dateCourte } from '../../donnees-exemple.js';
import { rechercherPartout } from '../../services/recherche.js';
import { LIBELLES_ROLES } from '../../services/session.js';
import { formaterTelephone } from '../../telephone.js';

/**
 * Recherche globale (cahier des charges, section 8) : un nom, un numéro, une référence ou un mot de
 * l'objet d'un courrier. Chaque résultat mène directement à sa fiche.
 */
const route = useRoute();
const router = useRouter();
const texte = ref(typeof route.query.q === 'string' ? route.query.q : '');
const resultats = ref(null);
const recherche = ref(false);
let minuterie = 0;

const STATUTS = { admise: 'admise', en_attente: 'en-attente', annulee: 'annulee' };

async function chercher() {
    recherche.value = true;
    resultats.value = await rechercherPartout(texte.value);
    recherche.value = false;
    router.replace({ query: texte.value.trim() ? { q: texte.value.trim() } : {} });
}

watch(texte, () => {
    clearTimeout(minuterie);
    minuterie = setTimeout(chercher, 300);
}, { immediate: true });

watch(() => route.query.q, (nouveau) => {
    if (typeof nouveau === 'string' && nouveau !== texte.value.trim()) {
        texte.value = nouveau;
    }
});

const total = (liste) => (liste ? liste.activites.length + liste.participants.length + liste.courriers.length + liste.membres.length + liste.comptes.length : 0);
</script>

<template>
    <div class="mx-auto flex max-w-4xl flex-col gap-6">
        <header class="flex flex-col gap-2">
            <p class="surtitre">Administration</p>
            <h1 class="text-3xl font-extrabold tracking-tight">Rechercher</h1>
        </header>

        <label class="relative">
            <span class="sr-only">Rechercher</span>
            <Icone nom="recherche" class="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-encre-douce" />
            <input v-model="texte" type="search" class="champ-saisie min-h-14 pl-12 text-base" placeholder="Nom, numéro (4 chiffres au moins), référence ou objet d’un courrier…" autofocus>
        </label>

        <p v-if="!resultats && !recherche" class="text-sm text-encre-douce">Tapez au moins deux caractères.</p>
        <p v-else-if="resultats && total(resultats) === 0" class="carte p-5 text-encre-douce">Aucun résultat pour « {{ texte.trim() }} ».</p>

        <template v-if="resultats && total(resultats) > 0">
            <section v-if="resultats.participants.length > 0" class="flex flex-col gap-3" aria-labelledby="titre-r-participants">
                <h2 id="titre-r-participants" class="text-lg font-bold">Participants ({{ resultats.participants.length + resultats.participantsEnPlus }})</h2>
                <ul class="carte divide-y divide-ligne">
                    <li v-for="personne in resultats.participants" :key="personne.id">
                        <RouterLink :to="{ name: 'admin-participant', params: { id: personne.id } }" class="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-surface-2">
                            <span>
                                <span class="block font-semibold">{{ personne.nom }}</span>
                                <span class="block text-sm text-encre-douce">{{ libelleRole(personne) }} · {{ personne.activite?.titre }}{{ personne.activite?.edition ? ` (${personne.activite.edition})` : '' }}{{ personne.telephone ? ` · ${formaterTelephone(personne.telephone)}` : '' }}</span>
                            </span>
                            <BadgeStatut :statut="STATUTS[personne.statut]" />
                        </RouterLink>
                    </li>
                </ul>
                <p v-if="resultats.participantsEnPlus > 0" class="text-sm text-encre-douce">Et {{ resultats.participantsEnPlus }} autres : précisez la recherche, ou ouvrez la rubrique <RouterLink :to="{ name: 'admin-participants', query: { q: texte.trim() } }" class="font-semibold text-lien underline">Participants</RouterLink>.</p>
            </section>

            <section v-if="resultats.activites.length > 0" class="flex flex-col gap-3" aria-labelledby="titre-r-activites">
                <h2 id="titre-r-activites" class="text-lg font-bold">Activités ({{ resultats.activites.length }})</h2>
                <ul class="carte divide-y divide-ligne">
                    <li v-for="activite in resultats.activites" :key="activite.id">
                        <RouterLink :to="activite.archivee ? { name: 'admin-archives' } : { name: 'admin-activite-modifier', params: { id: activite.id } }" class="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-surface-2">
                            <span><span class="block font-semibold">{{ activite.titre }}{{ activite.edition ? ` · ${activite.edition}` : '' }}</span><span class="block text-sm text-encre-douce">{{ dateCourte(activite.date) }} · {{ activite.lieu }}{{ activite.archivee ? ' · archivée' : '' }}</span></span>
                            <BadgeStatut :statut="activite.statut" />
                        </RouterLink>
                    </li>
                </ul>
            </section>

            <section v-if="resultats.courriers.length > 0" class="flex flex-col gap-3" aria-labelledby="titre-r-courriers">
                <h2 id="titre-r-courriers" class="text-lg font-bold">Courriers ({{ resultats.courriers.length }})</h2>
                <ul class="carte divide-y divide-ligne">
                    <li v-for="courrier in resultats.courriers" :key="courrier.id">
                        <RouterLink :to="courrier.statut === 'brouillon' ? { name: 'admin-courrier-modifier', params: { id: courrier.id } } : { name: 'admin-courrier', params: { id: courrier.id } }" class="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-surface-2">
                            <span><span class="block font-semibold">{{ courrier.objet }}</span><span class="block font-mono text-xs text-encre-douce">{{ courrier.reference }}</span></span>
                            <BadgeStatut :statut="courrier.statut === 'brouillon' ? 'brouillon' : 'envoye'" />
                        </RouterLink>
                    </li>
                </ul>
            </section>

            <section v-if="resultats.membres.length > 0 || resultats.comptes.length > 0" class="grid gap-6 md:grid-cols-2">
                <div v-if="resultats.membres.length > 0" class="flex flex-col gap-3">
                    <h2 class="text-lg font-bold">Membres du bureau ({{ resultats.membres.length }})</h2>
                    <ul class="carte divide-y divide-ligne">
                        <li v-for="membre in resultats.membres" :key="membre.id">
                            <RouterLink :to="{ name: 'admin-secretaires' }" class="block p-4 hover:bg-surface-2"><span class="block font-semibold">{{ membre.nom }}</span><span class="block text-sm text-encre-douce">{{ membre.poste }} · {{ membre.groupe }}</span></RouterLink>
                        </li>
                    </ul>
                </div>
                <div v-if="resultats.comptes.length > 0" class="flex flex-col gap-3">
                    <h2 class="text-lg font-bold">Comptes ({{ resultats.comptes.length }})</h2>
                    <ul class="carte divide-y divide-ligne">
                        <li v-for="compte in resultats.comptes" :key="compte.id">
                            <RouterLink :to="{ name: 'admin-comptes' }" class="block p-4 hover:bg-surface-2"><span class="block font-semibold">{{ compte.nom }}</span><span class="block text-sm text-encre-douce">{{ LIBELLES_ROLES[compte.role] }}{{ compte.actif ? '' : ' · inactif' }}</span></RouterLink>
                        </li>
                    </ul>
                </div>
            </section>
        </template>
    </div>
</template>
