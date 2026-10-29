<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Alerte from '../../components/Alerte.vue';
import Icone from '../../components/Icone.vue';
import { enregistrerActivite, MODE_DEMONSTRATION, trouverActiviteAdmin } from '../../services/donnees.js';

/**
 * Création et modification d'une activité (cahier des charges, section 3). Une activité créée n'est
 * ni publiée ni ouverte : ces décisions se prennent ensuite, à la main, depuis la liste.
 */
const route = useRoute();
const router = useRouter();
const identifiant = computed(() => route.params.id ?? null);
const chargee = ref(!route.params.id);
const introuvable = ref(false);
const envoi = ref(false);
const erreurs = ref({});
const message = ref('');
const resume = ref(null);
const affiche = ref(null);
const close = ref(false);
const motifExceptionnel = ref('');

const formulaire = reactive({
    titre: '',
    edition: '',
    description: '',
    objectifs: '',
    organisateur: 'AEEMCI — Secrétariat régional du Hambol',
    conditions: '',
    date: '',
    heure: '',
    heureFin: '',
    lieu: '',
    capacite: '',
    maxAccompagnateurs: 0,
    ouverturePrevue: '',
    fermeturePrevue: '',
});

onMounted(async () => {
    if (!identifiant.value) {
        return;
    }

    const activite = await trouverActiviteAdmin(identifiant.value);

    if (!activite) {
        introuvable.value = true;

        return;
    }

    Object.assign(formulaire, {
        ...activite,
        objectifs: (activite.objectifs ?? []).join('\n'),
        capacite: activite.capacite ?? '',
        heureFin: activite.heureFin ?? '',
        ouverturePrevue: activite.ouverturePrevue ?? '',
        fermeturePrevue: activite.fermeturePrevue ?? '',
    });
    close.value = activite.archivee || activite.statut === 'terminee';
    chargee.value = true;
});

function choisirAffiche(evenement) {
    const fichier = evenement.target.files?.[0];

    if (affiche.value) {
        URL.revokeObjectURL(affiche.value);
    }

    affiche.value = fichier && fichier.type.startsWith('image/') ? URL.createObjectURL(fichier) : null;
}

async function envoyer() {
    erreurs.value = {};
    message.value = '';
    envoi.value = true;

    try {
        const id = await enregistrerActivite(identifiant.value, formulaire, motifExceptionnel.value);
        await router.push(close.value ? { name: 'admin-archives' } : { name: 'admin-activites', query: { enregistree: id } });
    } catch (erreur) {
        erreurs.value = erreur.erreurs ?? {};
        message.value = erreur.message;
        await nextTick();
        resume.value?.focus();
    } finally {
        envoi.value = false;
    }
}

const champ = (cle) => ({ 'aria-invalid': erreurs.value[cle] ? 'true' : undefined, 'aria-describedby': erreurs.value[cle] ? `erreur-${cle}` : undefined });
</script>

<template>
    <div class="mx-auto flex max-w-4xl flex-col gap-6">
        <header class="flex flex-col gap-2">
            <RouterLink :to="{ name: 'admin-activites' }" class="inline-flex items-center gap-1 self-start text-sm font-semibold text-lien"><Icone nom="chevron-gauche" class="size-4" /> Activités</RouterLink>
            <h1 class="text-3xl font-extrabold tracking-tight">{{ identifiant ? 'Modifier l’activité' : 'Créer une activité' }}</h1>
        </header>

        <div v-if="introuvable" class="carte p-6">
            <p class="font-semibold">Activité introuvable.</p>
        </div>

        <div v-else-if="!chargee" class="squelette h-96" aria-hidden="true" />

        <form v-else class="flex flex-col gap-6" novalidate @submit.prevent="envoyer">
            <Alerte v-if="!identifiant" ton="info">Une activité créée reste invisible tant qu'elle n'est pas publiée, et ses inscriptions restent fermées tant que vous ne les ouvrez pas.</Alerte>

            <div v-if="message" ref="resume" tabindex="-1" class="rounded-xl border border-danger/40 bg-danger-fond p-4 text-danger" role="alert">
                <p class="font-bold">{{ message }}</p>
                <ul v-if="Object.keys(erreurs).length" class="mt-1 list-disc pl-5 text-sm">
                    <li v-for="(texte, cle) in erreurs" :key="cle">{{ texte }}</li>
                </ul>
            </div>

            <section class="carte grid gap-5 p-6 sm:grid-cols-2">
                <h2 class="text-lg font-bold sm:col-span-2">Présentation</h2>
                <div class="flex flex-col gap-1.5">
                    <label for="titre" class="text-sm font-semibold">Nom de l'activité</label>
                    <input id="titre" v-model="formulaire.titre" class="champ-saisie" maxlength="150" v-bind="champ('titre')">
                    <p v-if="erreurs.titre" id="erreur-titre" class="text-xs font-semibold text-danger">{{ erreurs.titre }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="edition" class="text-sm font-semibold">Édition ou thème <span class="font-normal text-encre-douce">(facultatif)</span></label>
                    <input id="edition" v-model="formulaire.edition" class="champ-saisie" maxlength="100" placeholder="2e édition">
                </div>
                <div class="flex flex-col gap-1.5 sm:col-span-2">
                    <label for="description" class="text-sm font-semibold">Description</label>
                    <textarea id="description" v-model="formulaire.description" class="champ-saisie min-h-28" maxlength="3000" />
                </div>
                <div class="flex flex-col gap-1.5 sm:col-span-2">
                    <label for="objectifs" class="text-sm font-semibold">Objectifs <span class="font-normal text-encre-douce">(un par ligne)</span></label>
                    <textarea id="objectifs" v-model="formulaire.objectifs" class="champ-saisie min-h-24" maxlength="3000" />
                </div>
                <div class="flex flex-col gap-1.5 sm:col-span-2">
                    <label for="organisateur" class="text-sm font-semibold">Organisateur</label>
                    <input id="organisateur" v-model="formulaire.organisateur" class="champ-saisie" maxlength="200">
                </div>
                <div class="flex flex-col gap-1.5 sm:col-span-2">
                    <label for="affiche" class="text-sm font-semibold">Affiche officielle <span class="font-normal text-encre-douce">(facultatif)</span></label>
                    <input id="affiche" type="file" accept="image/jpeg,image/png,image/webp" class="champ-saisie py-3" @change="choisirAffiche">
                    <p class="text-xs text-encre-douce">Image JPEG, PNG ou WebP. {{ MODE_DEMONSTRATION ? 'En démonstration, l’affiche est seulement prévisualisée, pas enregistrée.' : '' }}</p>
                    <img v-if="affiche" :src="affiche" alt="Aperçu de l'affiche choisie" class="mt-2 max-h-64 self-start rounded-xl border border-ligne">
                </div>
            </section>

            <section class="carte grid gap-5 p-6 sm:grid-cols-3">
                <h2 class="text-lg font-bold sm:col-span-3">Date et lieu</h2>
                <div class="flex flex-col gap-1.5">
                    <label for="date" class="text-sm font-semibold">Date</label>
                    <input id="date" v-model="formulaire.date" class="champ-saisie" type="date" v-bind="champ('date')">
                    <p v-if="erreurs.date" id="erreur-date" class="text-xs font-semibold text-danger">{{ erreurs.date }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="heure" class="text-sm font-semibold">Heure de début</label>
                    <input id="heure" v-model="formulaire.heure" class="champ-saisie" placeholder="21 h" maxlength="20" v-bind="champ('heure')">
                    <p v-if="erreurs.heure" id="erreur-heure" class="text-xs font-semibold text-danger">{{ erreurs.heure }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="heure-fin" class="text-sm font-semibold">Heure de fin <span class="font-normal text-encre-douce">(facultatif)</span></label>
                    <input id="heure-fin" v-model="formulaire.heureFin" class="champ-saisie" placeholder="5 h" maxlength="20">
                </div>
                <div class="flex flex-col gap-1.5 sm:col-span-3">
                    <label for="lieu" class="text-sm font-semibold">Lieu</label>
                    <input id="lieu" v-model="formulaire.lieu" class="champ-saisie" maxlength="150" v-bind="champ('lieu')">
                    <p v-if="erreurs.lieu" id="erreur-lieu" class="text-xs font-semibold text-danger">{{ erreurs.lieu }}</p>
                </div>
            </section>

            <section class="carte grid gap-5 p-6 sm:grid-cols-2">
                <h2 class="text-lg font-bold sm:col-span-2">Inscriptions</h2>
                <div class="flex flex-col gap-1.5">
                    <label for="capacite" class="text-sm font-semibold">Capacité maximale <span class="font-normal text-encre-douce">(vide : illimitée)</span></label>
                    <input id="capacite" v-model="formulaire.capacite" class="champ-saisie" type="number" min="1" inputmode="numeric" v-bind="champ('capacite')">
                    <p v-if="erreurs.capacite" id="erreur-capacite" class="text-xs font-semibold text-danger">{{ erreurs.capacite }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="max-accompagnateurs" class="text-sm font-semibold">Accompagnateurs par personne</label>
                    <input id="max-accompagnateurs" v-model.number="formulaire.maxAccompagnateurs" class="champ-saisie" type="number" min="0" max="10" inputmode="numeric" v-bind="champ('maxAccompagnateurs')">
                    <p v-if="erreurs.maxAccompagnateurs" id="erreur-maxAccompagnateurs" class="text-xs font-semibold text-danger">{{ erreurs.maxAccompagnateurs }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="ouverture" class="text-sm font-semibold">Ouverture prévue <span class="font-normal text-encre-douce">(facultatif)</span></label>
                    <input id="ouverture" v-model="formulaire.ouverturePrevue" class="champ-saisie" type="date">
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="fermeture" class="text-sm font-semibold">Fermeture prévue <span class="font-normal text-encre-douce">(facultatif)</span></label>
                    <input id="fermeture" v-model="formulaire.fermeturePrevue" class="champ-saisie" type="date" v-bind="champ('fermeturePrevue')">
                    <p v-if="erreurs.fermeturePrevue" id="erreur-fermeturePrevue" class="text-xs font-semibold text-danger">{{ erreurs.fermeturePrevue }}</p>
                    <p v-else class="text-xs text-encre-douce">Sert aux rappels J-7, J-3 et J-1. La fermeture reste toujours manuelle.</p>
                </div>
                <div class="flex flex-col gap-1.5 sm:col-span-2">
                    <label for="conditions" class="text-sm font-semibold">Conditions de participation</label>
                    <textarea id="conditions" v-model="formulaire.conditions" class="champ-saisie min-h-24" maxlength="2000" />
                </div>
            </section>

            <section v-if="close" class="carte flex flex-col gap-3 border-l-4 border-l-attention p-6" aria-labelledby="titre-exceptionnel">
                <h2 id="titre-exceptionnel" class="text-lg font-bold">Modification exceptionnelle</h2>
                <p class="text-sm text-encre-douce">Cette activité est close. La modifier est réservé à l’administrateur ; le motif est noté au journal d’audit.</p>
                <label for="motif-exceptionnel" class="text-sm font-semibold">Motif de la modification</label>
                <input id="motif-exceptionnel" v-model="motifExceptionnel" class="champ-saisie" maxlength="300" v-bind="champ('motifExceptionnel')">
                <p v-if="erreurs.motifExceptionnel" id="erreur-motifExceptionnel" class="text-xs font-semibold text-danger">{{ erreurs.motifExceptionnel }}</p>
            </section>

            <div class="flex flex-wrap justify-end gap-3">
                <RouterLink :to="{ name: close ? 'admin-archives' : 'admin-activites' }" class="bouton-discret">Annuler</RouterLink>
                <button type="submit" class="bouton-primaire" :disabled="envoi">{{ envoi ? 'Enregistrement…' : (identifiant ? 'Enregistrer les modifications' : 'Créer l’activité') }}</button>
            </div>
        </form>
    </div>
</template>
