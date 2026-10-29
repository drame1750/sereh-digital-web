<script setup>
import QrScanner from 'qr-scanner';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Alerte from '../../components/Alerte.vue';
import Icone from '../../components/Icone.vue';
import RetourPointage from '../../components/RetourPointage.vue';
import { libelleRole, qrCodeImage } from '../../billet.js';
import { inscriptionsExemple } from '../../donnees-exemple.js';
import {
    listerActivites,
    MODE_DEMONSTRATION,
    pointerParIdentifiant,
    rechercherInscrits,
    statistiquesPointage,
    verifierCode,
} from '../../services/donnees.js';

/**
 * Écran de pointage d'un agent (cahier des charges, section 5) : caméra, lecteur externe ou saisie,
 * et recherche par nom en secours. Le retour se voit de loin ; l'agent ne voit jamais les numéros
 * de téléphone et ne peut pas corriger un pointage.
 */
const DELAI_RELECTURE_MS = 3000;
const DUREE_RETOUR_MS = 2600;

const activites = ref([]);
const activiteId = ref('nuit-du-coran');
const mode = ref('camera');
const retour = ref(null);
const statistiques = ref({ admis: 0, presents: 0 });
const video = ref(null);
const cameraActive = ref(false);
const erreurCamera = ref('');
const recherche = ref('');
const resultats = ref([]);
const saisie = ref('');
const champSaisie = ref(null);
const codesDemonstration = ref([]);
let scanner = null;
let dernierCode = '';
let derniereLecture = 0;
let minuterieRetour = 0;
let minuterieRecherche = 0;

const heure = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Abidjan' });
const activite = computed(() => activites.value.find((candidate) => candidate.id === activiteId.value));

const MODES = [
    { cle: 'camera', libelle: 'Caméra', icone: 'qr' },
    { cle: 'recherche', libelle: 'Recherche', icone: 'recherche' },
    { cle: 'saisie', libelle: 'Lecteur ou saisie', icone: 'pointage' },
];

function decrire(reponse) {
    const personne = reponse.personne;

    switch (reponse.resultat) {
        case 'accepte':
            return { accepte: true, titre: 'Entrée acceptée', detail: `${personne.nom} · ${libelleRole(personne)}` };
        case 'deja_pointe':
            return { accepte: false, titre: 'Déjà pointé', detail: `${personne.nom} · premier passage à ${heure(reponse.premierPassage)}. Second passage bloqué.` };
        case 'non_admise':
            return { accepte: false, titre: 'Inscription en attente', detail: `${personne.nom} · pas encore validée. Orientez la personne vers un responsable.` };
        case 'annulee':
            return { accepte: false, titre: 'Inscription annulée', detail: `${personne.nom} · cette inscription a été annulée.` };
        case 'autre_activite':
            return { accepte: false, titre: 'Autre activité', detail: 'Ce QR code appartient à une autre activité.' };
        default:
            return { accepte: false, titre: 'QR code inconnu', detail: 'Ce code ne correspond à aucune inscription.' };
    }
}

async function afficherReponse(reponse) {
    const description = decrire(reponse);
    retour.value = { ...description, cle: Date.now() };

    if ('vibrate' in navigator) {
        navigator.vibrate(description.accepte ? 150 : [200, 100, 200]);
    }

    clearTimeout(minuterieRetour);
    minuterieRetour = setTimeout(() => {
        retour.value = null;
    }, DUREE_RETOUR_MS);

    statistiques.value = await statistiquesPointage(activiteId.value);
}

async function lireCode(code, moyen) {
    const texte = String(code).trim();
    const maintenant = Date.now();

    if (!texte || (texte === dernierCode && maintenant - derniereLecture < DELAI_RELECTURE_MS)) {
        return;
    }

    dernierCode = texte;
    derniereLecture = maintenant;
    await afficherReponse(await verifierCode(activiteId.value, texte, moyen));
}

async function demarrerCamera() {
    erreurCamera.value = '';

    if (!window.isSecureContext) {
        erreurCamera.value = 'La caméra exige une adresse sécurisée (https://).';

        return;
    }

    scanner ??= new QrScanner(video.value, (resultat) => lireCode(resultat.data, 'camera'), {
        returnDetailedScanResult: true,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: 'environment',
    });

    try {
        await scanner.start();
        cameraActive.value = true;
    } catch (erreur) {
        erreurCamera.value = `La caméra n’a pas pu démarrer : ${erreur?.message ?? erreur}. Utilisez la recherche ou la saisie.`;
    }
}

function arreterCamera() {
    scanner?.stop();
    cameraActive.value = false;
}

async function validerSaisie() {
    const code = saisie.value;
    saisie.value = '';
    dernierCode = '';
    await lireCode(code, 'lecteur externe ou saisie');
    champSaisie.value?.focus();
}

async function pointer(personne) {
    await afficherReponse(await pointerParIdentifiant(activiteId.value, personne.id));
    resultats.value = await rechercherInscrits(activiteId.value, recherche.value);
}

watch(recherche, (texte) => {
    clearTimeout(minuterieRecherche);
    minuterieRecherche = setTimeout(async () => {
        resultats.value = await rechercherInscrits(activiteId.value, texte);
    }, 250);
});

watch(mode, async (nouveau) => {
    if (nouveau !== 'camera') {
        arreterCamera();
    }

    if (nouveau === 'saisie') {
        await nextTick();
        champSaisie.value?.focus();
    }
});

watch(activiteId, async () => {
    statistiques.value = await statistiquesPointage(activiteId.value);
    resultats.value = [];
    recherche.value = '';
});

onMounted(async () => {
    activites.value = await listerActivites();
    statistiques.value = await statistiquesPointage(activiteId.value);

    if (MODE_DEMONSTRATION) {
        codesDemonstration.value = await Promise.all(inscriptionsExemple.map(async (inscription) => ({
            ...inscription,
            image: await qrCodeImage(inscription.codeQr, 180),
        })));
    }
});

onBeforeUnmount(() => {
    scanner?.destroy();
    clearTimeout(minuterieRetour);
    clearTimeout(minuterieRecherche);
});
</script>

<template>
    <div class="flex flex-col gap-5">
        <Alerte v-if="MODE_DEMONSTRATION" ton="info" titre="Démonstration">Écran de pointage avec des inscriptions fictives. Dans l'application, seul un agent connecté et affecté à l'activité y accède, pendant sa plage horaire.</Alerte>

        <section class="carte flex flex-col gap-4 p-5">
            <div class="flex flex-col gap-1.5">
                <label for="activite" class="text-sm font-semibold">Activité</label>
                <select id="activite" v-model="activiteId" class="champ-saisie">
                    <option v-for="candidate in activites" :key="candidate.id" :value="candidate.id">{{ candidate.titre }} · {{ candidate.edition }}</option>
                </select>
            </div>
            <div class="grid grid-cols-2 gap-3 text-center">
                <div class="rounded-xl bg-surface-2 p-3">
                    <p class="text-3xl font-extrabold text-lien tabular-nums">{{ statistiques.presents }}</p>
                    <p class="text-xs font-semibold text-encre-douce">présents</p>
                </div>
                <div class="rounded-xl bg-surface-2 p-3">
                    <p class="text-3xl font-extrabold tabular-nums">{{ statistiques.admis }}</p>
                    <p class="text-xs font-semibold text-encre-douce">admis (exemple)</p>
                </div>
            </div>
        </section>

        <div class="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1" role="tablist" aria-label="Façon de pointer">
            <button
                v-for="option in MODES"
                :key="option.cle"
                type="button"
                role="tab"
                class="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-xs font-semibold sm:flex-row sm:gap-2 sm:text-sm"
                :class="mode === option.cle ? 'bg-surface text-lien shadow-sm' : 'text-encre-douce'"
                :aria-selected="mode === option.cle"
                @click="mode = option.cle"
            >
                <Icone :nom="option.icone" class="size-5" /> {{ option.libelle }}
            </button>
        </div>

        <!-- Sans transition de sortie : à l'entrée, chaque résultat doit s'afficher sans attendre. -->
        <RetourPointage v-if="retour" :key="retour.cle" :accepte="retour.accepte" :titre="retour.titre" :detail="retour.detail" />

        <section v-show="mode === 'camera'" class="carte flex flex-col gap-4 p-5" aria-label="Pointage par caméra">
            <div class="relative overflow-hidden rounded-2xl bg-black" :class="cameraActive ? '' : 'hidden'">
                <video ref="video" class="aspect-square w-full object-cover" muted playsinline />
            </div>
            <div v-if="!cameraActive" class="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-ligne p-8 text-center">
                <Icone nom="qr" class="size-12 text-or-600" />
                <p class="text-sm text-encre-douce">Présentez le QR code devant la caméra arrière du téléphone.</p>
            </div>
            <Alerte v-if="erreurCamera" ton="danger" titre="Caméra indisponible">{{ erreurCamera }}</Alerte>
            <button v-if="!cameraActive" type="button" class="bouton-primaire min-h-13 text-base" @click="demarrerCamera">Démarrer la caméra</button>
            <button v-else type="button" class="bouton-secondaire" @click="arreterCamera">Arrêter la caméra</button>
        </section>

        <section v-show="mode === 'recherche'" class="carte flex flex-col gap-4 p-5" aria-label="Recherche par nom">
            <div class="flex flex-col gap-1.5">
                <label for="recherche" class="text-sm font-semibold">Nom de la personne</label>
                <input id="recherche" v-model="recherche" class="champ-saisie" type="search" autocomplete="off" placeholder="Au moins 2 lettres">
            </div>
            <p v-if="recherche.trim().length >= 2 && resultats.length === 0" class="text-sm text-encre-douce">Aucune personne trouvée.</p>
            <ul class="flex flex-col gap-2">
                <li v-for="personne in resultats" :key="personne.id" class="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                    <div class="min-w-0 flex-1">
                        <p class="truncate font-semibold">{{ personne.nom }}</p>
                        <p class="text-xs text-encre-douce">
                            {{ libelleRole(personne) }} ·
                            {{ personne.pointeA ? `pointé à ${heure(personne.pointeA)}` : (personne.statut === 'admise' ? 'admis, pas encore pointé' : 'inscription en attente') }}
                        </p>
                    </div>
                    <button type="button" class="bouton-primaire flex-none" :disabled="personne.statut !== 'admise' || Boolean(personne.pointeA)" @click="pointer(personne)">Pointer</button>
                </li>
            </ul>
        </section>

        <section v-show="mode === 'saisie'" class="carte flex flex-col gap-4 p-5" aria-label="Lecteur externe ou saisie">
            <p class="text-sm text-encre-douce">Un lecteur externe se comporte comme un clavier : il tape le code puis appuie sur Entrée.</p>
            <form class="flex flex-col gap-3 sm:flex-row" @submit.prevent="validerSaisie">
                <label for="code" class="sr-only">Code du QR code</label>
                <input id="code" ref="champSaisie" v-model="saisie" class="champ-saisie font-mono" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Code du QR code">
                <button type="submit" class="bouton-primaire flex-none">Vérifier</button>
            </form>
        </section>

        <details v-if="MODE_DEMONSTRATION" class="carte p-5">
            <summary class="cursor-pointer font-semibold">QR codes de démonstration</summary>
            <p class="mt-3 text-sm text-encre-douce">Affichez-les sur un autre écran, ou imprimez-les, puis scannez-les avec le téléphone. Ces inscriptions fictives existent sur tous les appareils.</p>
            <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <figure v-for="code in codesDemonstration" :key="code.id" class="flex flex-col items-center gap-2 text-center">
                    <img :src="code.image" :alt="`QR code de démonstration : ${code.nom}`" width="140" height="140" class="rounded-lg bg-white p-1">
                    <figcaption class="text-xs">
                        <span class="font-semibold">{{ code.nom }}</span><br>
                        <span class="text-encre-douce">{{ code.activiteId === 'nuit-du-coran' ? (code.statut === 'admise' ? 'admis' : 'en attente') : 'autre activité' }}</span>
                    </figcaption>
                </figure>
            </div>
        </details>
    </div>
</template>
