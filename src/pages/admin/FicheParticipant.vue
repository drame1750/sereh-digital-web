<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import BadgeStatut from '../../components/BadgeStatut.vue';
import Icone from '../../components/Icone.vue';
import { billetPng, libelleRole, qrCodeImage, telecharger } from '../../billet.js';
import { dateCourte, instant } from '../../donnees-exemple.js';
import { ficheParticipant, MODE_DEMONSTRATION, trouverActiviteAdmin } from '../../services/donnees.js';
import { formaterTelephone } from '../../telephone.js';

/**
 * Fiche d'un participant : ses informations, son QR code (afficher, télécharger, imprimer), son
 * groupe, ses passages à l'entrée et l'historique de ses autres activités avec le même numéro.
 */
const route = useRoute();
const personne = ref(null);
const introuvable = ref(false);
const qr = ref('');

const STATUTS = { admise: 'admise', en_attente: 'en-attente', annulee: 'annulee' };
const RESULTATS = { accepte: 'Accepté', deja_pointe: 'Déjà pointé', non_admise: 'Non admise', annulee: 'Inscription annulée', autre_activite: 'Autre activité', inconnu: 'Code inconnu' };

async function telechargerBillet() {
    const activite = await trouverActiviteAdmin(personne.value.activiteId);
    telecharger(await billetPng(personne.value, activite, { demonstration: MODE_DEMONSTRATION }), `billet-${personne.value.nom.replace(/[^\w-]+/g, '-')}.png`);
}

onMounted(async () => {
    personne.value = await ficheParticipant(route.params.id);
    introuvable.value = !personne.value;

    if (personne.value) {
        qr.value = await qrCodeImage(personne.value.codeQr, 320);
    }
});
</script>

<template>
    <div class="mx-auto flex max-w-5xl flex-col gap-6">
        <RouterLink :to="{ name: 'admin-participants' }" class="inline-flex items-center gap-1 self-start text-sm font-semibold text-lien"><Icone nom="chevron-gauche" class="size-4" /> Participants</RouterLink>

        <p v-if="introuvable" class="carte p-6 font-semibold">Participant introuvable.</p>
        <div v-else-if="!personne" class="squelette h-64" aria-hidden="true" />

        <template v-else>
            <header class="flex flex-col gap-2">
                <div class="flex flex-wrap items-center gap-2">
                    <BadgeStatut :statut="STATUTS[personne.statut]" />
                    <span v-if="personne.pointeA" class="rounded-full bg-ok-fond px-2.5 py-1 text-xs font-semibold text-ok">Présent depuis {{ instant(personne.pointeA) }}</span>
                    <span v-if="personne.doublonPossible && !personne.doublonExamine" class="rounded-full bg-attention-fond px-2.5 py-1 text-xs font-semibold text-attention">Doublon possible à examiner</span>
                </div>
                <h1 class="text-3xl font-extrabold tracking-tight">{{ personne.nom }}</h1>
                <p class="text-encre-douce">{{ libelleRole(personne) }}{{ personne.inscritPar ? `, avec ${personne.inscritPar}` : '' }} · {{ personne.activite?.titre }}{{ personne.activite?.edition ? ` (${personne.activite.edition})` : '' }}</p>
            </header>

            <div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
                <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-informations">
                    <h2 id="titre-informations" class="text-lg font-bold">Informations</h2>
                    <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                        <dt class="text-encre-douce">Téléphone</dt><dd class="font-mono">{{ personne.telephone ? formaterTelephone(personne.telephone) : '—' }}</dd>
                        <dt class="text-encre-douce">Sexe</dt><dd>{{ personne.sexe === 'femme' ? 'Femme' : 'Homme' }}</dd>
                        <dt class="text-encre-douce">Ville / commune</dt><dd>{{ personne.ville || '—' }}</dd>
                        <dt class="text-encre-douce">Sous-Comité</dt><dd>{{ personne.sousComite || '—' }}</dd>
                        <dt class="text-encre-douce">Section</dt><dd>{{ personne.section || '—' }}</dd>
                        <template v-if="personne.role === 'principal'">
                            <dt class="text-encre-douce">Mineur</dt><dd>{{ personne.mineur ? `Oui · parent ou tuteur : ${personne.tuteur?.nom}` : 'Non' }}</dd>
                            <dt class="text-encre-douce">Publication du nom</dt><dd>{{ personne.publicationAcceptee ? 'Acceptée' : 'Refusée' }}</dd>
                        </template>
                        <dt class="text-encre-douce">Source</dt><dd>{{ personne.source ?? 'formulaire public' }}</dd>
                        <dt class="text-encre-douce">Reçue le</dt><dd>{{ personne.recueLe ? instant(personne.recueLe) : '—' }}</dd>
                        <template v-if="personne.motifAnnulation">
                            <dt class="text-encre-douce">Motif d’annulation</dt><dd>{{ personne.motifAnnulation }}</dd>
                        </template>
                    </dl>
                    <RouterLink v-if="!personne.activite?.archivee" :to="{ name: 'admin-inscriptions', query: { activite: personne.activiteId } }" class="font-semibold text-lien underline">Gérer cette inscription (valider, annuler, renvoyer le lien)</RouterLink>
                </section>

                <section class="carte flex flex-col items-center gap-3 p-6 text-center" aria-labelledby="titre-qr">
                    <h2 id="titre-qr" class="text-lg font-bold">QR code</h2>
                    <img v-if="qr" :src="qr" :alt="`QR code de ${personne.nom}`" width="200" height="200" class="size-48 rounded-lg bg-white p-2">
                    <p class="text-xs text-encre-douce">Il ne contient que le code aléatoire de l’inscription, jamais de donnée personnelle.</p>
                    <button type="button" class="bouton-primaire" @click="telechargerBillet"><Icone nom="telecharger" class="size-4" /> Télécharger le billet</button>
                    <RouterLink :to="{ name: 'admin-qr-codes', query: { activite: personne.activiteId } }" class="bouton-discret"><Icone nom="imprimer" class="size-4" /> Imprimer avec d’autres</RouterLink>
                </section>
            </div>

            <section v-if="personne.groupeDe.length > 0" class="carte flex flex-col gap-3 p-6" aria-labelledby="titre-groupe">
                <h2 id="titre-groupe" class="text-lg font-bold">Même inscription</h2>
                <ul class="flex flex-col gap-2">
                    <li v-for="membre in personne.groupeDe" :key="membre.id"><RouterLink :to="{ name: 'admin-participant', params: { id: membre.id } }" class="font-semibold text-lien underline">{{ membre.nom }}</RouterLink> <span class="text-sm text-encre-douce">· {{ libelleRole(membre) }}</span></li>
                </ul>
            </section>

            <section class="carte flex flex-col gap-3 p-6" aria-labelledby="titre-passages">
                <h2 id="titre-passages" class="text-lg font-bold">Passages à l’entrée</h2>
                <p v-if="personne.passages.length === 0" class="text-sm text-encre-douce">Aucun passage.</p>
                <ul class="flex flex-col gap-2">
                    <li v-for="passage in personne.passages" :key="passage.id" class="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-surface-2 p-3 text-sm">
                        <span>
                            <span class="font-semibold" :class="passage.annule ? 'line-through' : ''">{{ RESULTATS[passage.resultat] }}</span>
                            <span class="text-encre-douce"> · {{ passage.moyen }} · {{ passage.agent }}</span>
                            <span v-if="passage.annule" class="block text-xs font-semibold text-danger">Annulé par {{ passage.annulePar }} : {{ passage.motifAnnulation }}</span>
                            <span v-if="passage.motifCorrection" class="block text-xs text-encre-douce">Correction : {{ passage.motifCorrection }}</span>
                        </span>
                        <span class="text-xs text-encre-douce">{{ instant(passage.le) }}</span>
                    </li>
                </ul>
            </section>

            <section class="carte flex flex-col gap-3 p-6" aria-labelledby="titre-historique">
                <h2 id="titre-historique" class="text-lg font-bold">Autres activités avec ce numéro</h2>
                <p v-if="personne.historique.length === 0" class="text-sm text-encre-douce">Aucune autre inscription avec ce numéro.</p>
                <ul class="flex flex-col gap-2">
                    <li v-for="autre in personne.historique" :key="autre.id" class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 p-3 text-sm">
                        <RouterLink :to="{ name: 'admin-participant', params: { id: autre.id } }" class="font-semibold text-lien underline">{{ autre.activite?.titre }}{{ autre.activite?.edition ? ` · ${autre.activite.edition}` : '' }}</RouterLink>
                        <span class="text-encre-douce">{{ autre.activite ? dateCourte(autre.activite.date) : '' }} · {{ autre.nom }} · {{ autre.pointeA ? 'présent' : 'non pointé' }}</span>
                    </li>
                </ul>
            </section>
        </template>
    </div>
</template>
