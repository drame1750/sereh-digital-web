<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import Alerte from '../../components/Alerte.vue';
import BadgeStatut from '../../components/BadgeStatut.vue';
import DocumentCourrier from '../../components/DocumentCourrier.vue';
import Icone from '../../components/Icone.vue';
import { aujourdhui } from '../../donnees-exemple.js';
import { appliquerModele, approuverModele, enregistrerModele, listerModeles, PARAMETRES_COURRIER } from '../../services/courriers.js';

/**
 * Modèles de courrier, modifiables par l'administrateur. Un modèle créé ou modifié doit être relu
 * en aperçu, puis approuvé, avant d'être proposé dans le formulaire d'un courrier.
 */
const modeles = ref(null);
const enEdition = ref(null);
const apercuOuvert = ref(null);
const message = ref(null);
const erreurs = ref({});
const envoi = ref(false);
const champNom = ref(null);
const formulaire = reactive({ nom: '', objet: '', formule: '', corps: '' });

async function charger() {
    modeles.value = await listerModeles();
}

async function modifier(modele) {
    enEdition.value = modele?.id ?? 'nouveau';
    apercuOuvert.value = null;
    erreurs.value = {};
    message.value = null;
    Object.assign(formulaire, modele
        ? { nom: modele.nom, objet: modele.objet, formule: modele.formule, corps: modele.corps }
        : { nom: '', objet: '', formule: 'Honorable membre du bureau régional,', corps: '' });

    // Le formulaire s'ouvre en haut de la page : on l'amène sous les yeux, même depuis le bas.
    await nextTick();
    champNom.value?.focus({ preventScroll: true });
    champNom.value?.closest('form').scrollIntoView({ block: 'start', behavior: document.documentElement.dataset.animations === 'oui' ? 'smooth' : 'auto' });
}

async function enregistrer() {
    envoi.value = true;
    erreurs.value = {};

    try {
        const id = await enregistrerModele(enEdition.value === 'nouveau' ? null : enEdition.value, formulaire);
        enEdition.value = null;
        apercuOuvert.value = id;
        message.value = { ton: 'attention', texte: 'Modèle enregistré. Relisez son aperçu ci-dessous puis approuvez-le : il ne sera proposé qu’après approbation.' };
        await charger();
    } catch (erreur) {
        erreurs.value = erreur.erreurs ?? {};
        message.value = { ton: 'danger', texte: erreur.message };
    } finally {
        envoi.value = false;
    }
}

async function approuver(modele) {
    envoi.value = true;

    try {
        await approuverModele(modele.id);
        message.value = { ton: 'ok', texte: `« ${modele.nom} » est approuvé : il est proposé dans le formulaire des courriers.` };
        apercuOuvert.value = null;
        await charger();
    } finally {
        envoi.value = false;
    }
}

/** Aperçu sans activité : les informations d'activité apparaissent entre crochets. */
function exemple(modele) {
    const texte = appliquerModele(modele, null);

    return {
        reference: `${PARAMETRES_COURRIER.prefixeReference}/AA-000/${PARAMETRES_COURRIER.suffixeReference}`,
        objet: texte.objet,
        source: 'modele',
        contenu: {
            date: aujourdhui(),
            lieu: PARAMETRES_COURRIER.lieu,
            destinataire: 'Aux membres du bureau régional',
            formule: texte.formule,
            corps: texte.corps,
            pour: PARAMETRES_COURRIER.pour,
            titreSignataire: PARAMETRES_COURRIER.titreSignataire,
            nomSignataire: PARAMETRES_COURRIER.nomSignataire,
        },
        fichier: null,
    };
}

const modeleApercu = computed(() => modeles.value?.find((modele) => modele.id === apercuOuvert.value) ?? null);

onMounted(charger);
</script>

<template>
    <div class="mx-auto flex max-w-5xl flex-col gap-6">
        <header class="flex flex-wrap items-end justify-between gap-4">
            <div class="flex flex-col gap-2">
                <RouterLink :to="{ name: 'admin-courriers' }" class="inline-flex items-center gap-1 self-start text-sm font-semibold text-lien"><Icone nom="chevron-gauche" class="size-4" /> Courriers</RouterLink>
                <h1 class="text-3xl font-extrabold tracking-tight">Modèles de courrier</h1>
            </div>
            <button type="button" class="bouton-primaire" @click="modifier(null)"><Icone nom="plus" class="size-4" /> Nouveau modèle</button>
        </header>

        <Alerte ton="info">
            Dans le texte, <strong>{activite}</strong>, <strong>{date}</strong>, <strong>{heure}</strong> et <strong>{lieu}</strong> sont remplacés par les informations de l’activité liée au courrier. Les passages entre crochets, comme <strong>[Sous-Comité]</strong>, sont à compléter à la main ; l’aperçu les signale avant l’envoi.
        </Alerte>
        <Alerte v-if="message" :ton="message.ton">{{ message.texte }}</Alerte>

        <form v-if="enEdition" class="carte flex flex-col gap-5 p-6" novalidate @submit.prevent="enregistrer">
            <h2 class="text-lg font-bold">{{ enEdition === 'nouveau' ? 'Nouveau modèle' : 'Modifier le modèle' }}</h2>
            <div class="flex flex-col gap-1.5">
                <label for="modele-nom" class="text-sm font-semibold">Nom du modèle</label>
                <input id="modele-nom" ref="champNom" v-model="formulaire.nom" class="champ-saisie" maxlength="100" :aria-invalid="erreurs.nom ? 'true' : undefined">
                <p v-if="erreurs.nom" class="text-xs font-semibold text-danger">{{ erreurs.nom }}</p>
            </div>
            <div class="flex flex-col gap-1.5">
                <label for="modele-objet" class="text-sm font-semibold">Objet proposé</label>
                <input id="modele-objet" v-model="formulaire.objet" class="champ-saisie" maxlength="200" :aria-invalid="erreurs.objet ? 'true' : undefined">
                <p v-if="erreurs.objet" class="text-xs font-semibold text-danger">{{ erreurs.objet }}</p>
            </div>
            <div class="flex flex-col gap-1.5">
                <label for="modele-formule" class="text-sm font-semibold">Formule d’appel</label>
                <input id="modele-formule" v-model="formulaire.formule" class="champ-saisie" maxlength="120">
            </div>
            <div class="flex flex-col gap-1.5">
                <label for="modele-corps" class="text-sm font-semibold">Texte <span class="font-normal text-encre-douce">(une ligne vide entre deux paragraphes)</span></label>
                <textarea id="modele-corps" v-model="formulaire.corps" class="champ-saisie min-h-56" maxlength="6000" :aria-invalid="erreurs.corps ? 'true' : undefined" />
                <p v-if="erreurs.corps" class="text-xs font-semibold text-danger">{{ erreurs.corps }}</p>
            </div>
            <div class="flex flex-wrap justify-end gap-3">
                <button type="button" class="bouton-discret" @click="enEdition = null">Annuler</button>
                <button type="submit" class="bouton-primaire" :disabled="envoi">{{ envoi ? 'Enregistrement…' : 'Enregistrer' }}</button>
            </div>
        </form>

        <div v-if="!modeles" class="flex flex-col gap-4" aria-hidden="true">
            <div v-for="index in 3" :key="index" class="squelette h-28" />
        </div>

        <article v-for="modele in modeles" :key="modele.id" class="carte flex flex-col gap-4 p-5 sm:p-6">
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="flex min-w-0 flex-col gap-1.5">
                    <BadgeStatut :statut="modele.approuve ? 'approuve' : 'a-approuver'" class="self-start" />
                    <h2 class="text-lg font-bold">{{ modele.nom }}</h2>
                    <p class="text-sm text-encre-douce">Objet : {{ modele.objet }}</p>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button type="button" class="bouton-discret" :aria-expanded="apercuOuvert === modele.id" @click="apercuOuvert = apercuOuvert === modele.id ? null : modele.id">
                        <Icone :nom="apercuOuvert === modele.id ? 'oeil-barre' : 'oeil'" class="size-4" /> Aperçu
                    </button>
                    <button type="button" class="bouton-secondaire" @click="modifier(modele)"><Icone nom="crayon" class="size-4" /> Modifier</button>
                </div>
            </div>
            <p v-if="!modele.approuve" class="text-sm font-semibold text-attention">À approuver : ce modèle n’est pas encore proposé dans le formulaire des courriers.</p>

            <div v-if="apercuOuvert === modele.id && modeleApercu" class="flex flex-col gap-4 border-t border-ligne pt-4">
                <DocumentCourrier :courrier="exemple(modeleApercu)" />
                <button v-if="!modele.approuve" type="button" class="bouton-primaire self-start" :disabled="envoi" @click="approuver(modele)"><Icone nom="coche" class="size-4" /> J’ai relu l’aperçu : approuver ce modèle</button>
            </div>
        </article>
    </div>
</template>
