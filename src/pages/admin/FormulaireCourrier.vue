<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Alerte from '../../components/Alerte.vue';
import DocumentCourrier from '../../components/DocumentCourrier.vue';
import Icone from '../../components/Icone.vue';
import { aujourdhui, dateCourte } from '../../donnees-exemple.js';
import {
    appliquerModele,
    enregistrerCourrier,
    envoyerCourrier,
    erreursAvantEnvoi,
    lireBrouillon,
    listerDestinatairesPossibles,
    listerModeles,
    PARAMETRES_COURRIER,
    prochaineReference,
    textesACompleter,
} from '../../services/courriers.js';
import { listerActivitesAdmin, MODE_DEMONSTRATION } from '../../services/donnees.js';

/**
 * Création d'un courrier (cahier des charges, section 6), en deux étapes : on le rédige (depuis un
 * modèle, ou en important un PDF signé), puis on relit l'aperçu et le récapitulatif avant de
 * l'approuver. Rien ne part sans cette approbation ; avant, c'est un brouillon.
 */
const route = useRoute();
const router = useRouter();
const identifiant = computed(() => route.params.id ?? null);

const etape = ref(route.query.etape === 'verifier' ? 'verifier' : 'rediger');
const chargee = ref(false);
const introuvable = ref(false);
const modeles = ref([]);
const activites = ref([]);
const groupes = ref([]);
const fichierChoisi = ref(null);
const fichierEnregistre = ref(null);
const erreurs = ref({});
const message = ref(route.query.enregistre ? { ton: 'ok', texte: 'Brouillon enregistré. Il ne part qu’après votre approbation.' } : null);
const resume = ref(null);
const envoi = ref(false);
const approuve = ref(false);

const formulaire = reactive({
    source: 'modele',
    modeleId: '',
    reference: '',
    objet: '',
    contenu: {
        date: aujourdhui(),
        lieu: PARAMETRES_COURRIER.lieu,
        destinataire: 'Aux membres du bureau régional\nAEEMCI — Hambol',
        formule: '',
        corps: '',
        pour: PARAMETRES_COURRIER.pour,
        titreSignataire: PARAMETRES_COURRIER.titreSignataire,
        nomSignataire: PARAMETRES_COURRIER.nomSignataire,
    },
    activiteId: '',
    reponseAttendue: true,
    echeance: '',
    instructions: '',
    destinataires: [],
});

const modelesApprouves = computed(() => modeles.value.filter((modele) => modele.approuve));
const activiteChoisie = computed(() => activites.value.find((activite) => activite.id === formulaire.activiteId) ?? null);
const membres = computed(() => groupes.value.flatMap((groupe) => groupe.membres));

/** Le courrier tel qu'il sera envoyé, pour l'aperçu et les vérifications. */
const apercu = computed(() => ({
    reference: formulaire.reference.trim(),
    objet: formulaire.objet.trim(),
    source: formulaire.source,
    contenu: Object.fromEntries(Object.entries(formulaire.contenu).map(([cle, valeur]) => [cle, valeur.trim()])),
    fichier: fichierChoisi.value ? { nom: fichierChoisi.value.name } : fichierEnregistre.value,
    reponseAttendue: formulaire.reponseAttendue,
    echeance: formulaire.reponseAttendue ? formulaire.echeance : null,
    destinatairesPrevus: formulaire.destinataires,
}));

const aCompleter = computed(() => textesACompleter(apercu.value));

onMounted(async () => {
    [modeles.value, activites.value, groupes.value] = await Promise.all([listerModeles(), listerActivitesAdmin(), listerDestinatairesPossibles()]);

    if (identifiant.value) {
        const brouillon = await lireBrouillon(identifiant.value);

        if (!brouillon) {
            introuvable.value = true;

            return;
        }

        if (brouillon.statut !== 'brouillon') {
            await router.replace({ name: 'admin-courrier', params: { id: brouillon.id } });

            return;
        }

        Object.assign(formulaire, {
            source: brouillon.source,
            modeleId: brouillon.modeleId ?? '',
            reference: brouillon.reference,
            objet: brouillon.objet,
            contenu: { ...formulaire.contenu, ...brouillon.contenu },
            activiteId: brouillon.activiteId ?? '',
            reponseAttendue: brouillon.reponseAttendue,
            echeance: brouillon.echeance ?? '',
            instructions: brouillon.instructions,
            destinataires: brouillon.destinatairesPrevus ?? [],
        });
        fichierEnregistre.value = brouillon.fichier;
    } else {
        formulaire.reference = prochaineReference();
        formulaire.activiteId = typeof route.query.activite === 'string' ? route.query.activite : '';
    }

    chargee.value = true;
});

function appliquer() {
    const modele = modeles.value.find((candidat) => candidat.id === formulaire.modeleId);

    if (!modele) {
        return;
    }

    const texte = appliquerModele(modele, activiteChoisie.value);
    formulaire.objet = texte.objet;
    formulaire.contenu.formule = texte.formule;
    formulaire.contenu.corps = texte.corps;
}

function choisirModele() {
    // Un texte déjà rédigé n'est jamais écrasé sans le bouton « Appliquer le modèle ».
    if (!formulaire.contenu.corps.trim()) {
        appliquer();
    }
}

function choisirFichier(evenement) {
    const fichier = evenement.target.files?.[0] ?? null;
    erreurs.value = { ...erreurs.value, fichier: undefined };

    if (fichier && fichier.type !== 'application/pdf') {
        erreurs.value = { ...erreurs.value, fichier: 'Choisissez un fichier PDF.' };
        fichierChoisi.value = null;

        return;
    }

    fichierChoisi.value = fichier;
}

const groupeComplet = (groupe) => groupe.membres.every((candidat) => formulaire.destinataires.includes(candidat.id));
const groupePartiel = (groupe) => !groupeComplet(groupe) && groupe.membres.some((candidat) => formulaire.destinataires.includes(candidat.id));

function basculerGroupe(groupe) {
    const identifiants = groupe.membres.map((candidat) => candidat.id);
    formulaire.destinataires = groupeComplet(groupe)
        ? formulaire.destinataires.filter((id) => !identifiants.includes(id))
        : [...new Set([...formulaire.destinataires, ...identifiants])];
}

function donnees() {
    return { ...formulaire, contenu: { ...formulaire.contenu }, destinataires: [...formulaire.destinataires] };
}

async function montrerErreurs(probleme) {
    erreurs.value = probleme.erreurs ?? {};
    message.value = { ton: 'danger', texte: probleme.message };
    await nextTick();
    resume.value?.focus();
}

async function enregistrer(suite = null) {
    const id = await enregistrerCourrier(identifiant.value, donnees(), fichierChoisi.value);

    if (fichierChoisi.value) {
        fichierEnregistre.value = (await lireBrouillon(id)).fichier;
        fichierChoisi.value = null;
    }

    if (!identifiant.value) {
        await router.replace({ name: 'admin-courrier-modifier', params: { id }, query: suite === 'verifier' ? { etape: 'verifier' } : { enregistre: '1' } });
    }

    return id;
}

async function enregistrerBrouillon() {
    erreurs.value = {};
    message.value = null;
    envoi.value = true;

    try {
        await enregistrer();
        message.value = { ton: 'ok', texte: 'Brouillon enregistré. Il ne part qu’après votre approbation.' };
    } catch (probleme) {
        await montrerErreurs(probleme);
    } finally {
        envoi.value = false;
    }
}

async function verifier() {
    erreurs.value = {};
    message.value = null;
    const trouvees = erreursAvantEnvoi(apercu.value);

    if (Object.keys(trouvees).length > 0) {
        await montrerErreurs(Object.assign(new Error('Quelques informations manquent avant l’aperçu.'), { erreurs: trouvees }));

        return;
    }

    envoi.value = true;

    try {
        await enregistrer('verifier');
        etape.value = 'verifier';
        approuve.value = false;
        window.scrollTo({ top: 0 });
    } catch (probleme) {
        await montrerErreurs(probleme);
    } finally {
        envoi.value = false;
    }
}

async function envoyer() {
    message.value = null;
    envoi.value = true;

    try {
        await envoyerCourrier(identifiant.value, approuve.value);
        await router.push({ name: 'admin-courrier', params: { id: identifiant.value }, query: { envoye: '1' } });
    } catch (probleme) {
        await montrerErreurs(probleme);
    } finally {
        envoi.value = false;
    }
}

function revenir() {
    etape.value = 'rediger';
    message.value = null;
    window.scrollTo({ top: 0 });
}

const champ = (cle) => ({ 'aria-invalid': erreurs.value[cle] ? 'true' : undefined, 'aria-describedby': erreurs.value[cle] ? `erreur-${cle}` : undefined });
const tailleLisible = (octets) => (octets >= 1024 * 1024 ? `${(octets / 1024 / 1024).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round(octets / 1024))} Ko`);
</script>

<template>
    <div class="mx-auto flex max-w-4xl flex-col gap-6">
        <header class="flex flex-col gap-2">
            <RouterLink :to="{ name: 'admin-courriers' }" class="inline-flex items-center gap-1 self-start text-sm font-semibold text-lien"><Icone nom="chevron-gauche" class="size-4" /> Courriers</RouterLink>
            <h1 class="text-3xl font-extrabold tracking-tight">{{ etape === 'verifier' ? 'Vérifier et envoyer' : (identifiant ? 'Reprendre le brouillon' : 'Nouveau courrier') }}</h1>
            <ol class="flex flex-wrap gap-2 text-sm" aria-label="Étapes">
                <li class="rounded-full px-3 py-1 font-semibold" :class="etape === 'rediger' ? 'bg-accent text-accent-texte' : 'bg-surface-2 text-encre-douce'" :aria-current="etape === 'rediger' ? 'step' : undefined">1. Rédiger</li>
                <li class="rounded-full px-3 py-1 font-semibold" :class="etape === 'verifier' ? 'bg-accent text-accent-texte' : 'bg-surface-2 text-encre-douce'" :aria-current="etape === 'verifier' ? 'step' : undefined">2. Vérifier et approuver</li>
            </ol>
        </header>

        <div v-if="introuvable" class="carte p-6"><p class="font-semibold">Courrier introuvable.</p></div>
        <div v-else-if="!chargee" class="squelette h-96" aria-hidden="true" />

        <template v-else>
            <div v-if="message?.ton === 'danger'" ref="resume" tabindex="-1" class="rounded-xl border border-danger/40 bg-danger-fond p-4 text-danger" role="alert">
                <p class="font-bold">{{ message.texte }}</p>
                <ul v-if="Object.values(erreurs).some(Boolean)" class="mt-1 list-disc pl-5 text-sm">
                    <li v-for="(texte, cle) in erreurs" v-show="texte" :key="cle">{{ texte }}</li>
                </ul>
            </div>
            <Alerte v-else-if="message" :ton="message.ton">{{ message.texte }}</Alerte>

            <!-- Étape 1 : rédaction -->
            <form v-if="etape === 'rediger'" class="flex flex-col gap-6" novalidate @submit.prevent="verifier">
                <section class="carte flex flex-col gap-5 p-6">
                    <h2 class="text-lg font-bold">Document</h2>
                    <fieldset class="grid gap-3 sm:grid-cols-2">
                        <legend class="sr-only">Comment créer le courrier</legend>
                        <label class="choix flex cursor-pointer gap-3 rounded-xl border-2 p-4" :class="formulaire.source === 'modele' ? 'border-accent bg-surface-2' : 'border-ligne'">
                            <input v-model="formulaire.source" type="radio" value="modele" class="mt-1 size-4 accent-[var(--c-accent)]">
                            <span><span class="block font-semibold">Créer depuis un modèle</span><span class="text-sm text-encre-douce">Le PDF est fabriqué à partir du texte, avec l’en-tête officiel.</span></span>
                        </label>
                        <label class="choix flex cursor-pointer gap-3 rounded-xl border-2 p-4" :class="formulaire.source === 'import' ? 'border-accent bg-surface-2' : 'border-ligne'">
                            <input v-model="formulaire.source" type="radio" value="import" class="mt-1 size-4 accent-[var(--c-accent)]">
                            <span><span class="block font-semibold">Importer un PDF signé</span><span class="text-sm text-encre-douce">Un courrier déjà imprimé, signé et scanné.</span></span>
                        </label>
                    </fieldset>

                    <div class="grid gap-5 sm:grid-cols-2">
                        <div class="flex flex-col gap-1.5">
                            <label for="reference" class="text-sm font-semibold">Référence</label>
                            <input id="reference" v-model="formulaire.reference" class="champ-saisie font-mono" maxlength="60" v-bind="champ('reference')">
                            <p v-if="erreurs.reference" id="erreur-reference" class="text-xs font-semibold text-danger">{{ erreurs.reference }}</p>
                            <p v-else class="text-xs text-encre-douce">Proposée automatiquement. Format provisoire : le sens de chaque partie reste à confirmer.</p>
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label for="objet" class="text-sm font-semibold">Objet</label>
                            <input id="objet" v-model="formulaire.objet" class="champ-saisie" maxlength="200" v-bind="champ('objet')">
                            <p v-if="erreurs.objet" id="erreur-objet" class="text-xs font-semibold text-danger">{{ erreurs.objet }}</p>
                        </div>
                    </div>

                    <div v-if="formulaire.source === 'import'" class="flex flex-col gap-1.5">
                        <label for="fichier" class="text-sm font-semibold">PDF du courrier signé</label>
                        <input id="fichier" type="file" accept="application/pdf" class="champ-saisie py-3" v-bind="champ('fichier')" @change="choisirFichier">
                        <p v-if="erreurs.fichier" id="erreur-fichier" class="text-xs font-semibold text-danger">{{ erreurs.fichier }}</p>
                        <p v-else-if="fichierChoisi" class="text-xs text-encre-douce">Choisi : {{ fichierChoisi.name }} ({{ tailleLisible(fichierChoisi.size) }}).</p>
                        <p v-else-if="fichierEnregistre" class="text-xs text-encre-douce">Déjà importé : {{ fichierEnregistre.nom }}. Choisissez un autre fichier pour le remplacer.</p>
                        <p v-else class="text-xs text-encre-douce">10 Mo au plus. {{ MODE_DEMONSTRATION ? 'En démonstration, le PDF n’est gardé que pendant la visite.' : '' }}</p>
                    </div>
                </section>

                <section v-if="formulaire.source === 'modele'" class="carte grid gap-5 p-6 sm:grid-cols-2">
                    <h2 class="text-lg font-bold sm:col-span-2">Texte du courrier</h2>
                    <div class="flex flex-col gap-1.5 sm:col-span-2">
                        <label for="modele" class="text-sm font-semibold">Modèle</label>
                        <div class="flex flex-wrap gap-2">
                            <select id="modele" v-model="formulaire.modeleId" class="champ-saisie min-w-0 flex-1" @change="choisirModele">
                                <option value="">Sans modèle</option>
                                <option v-for="modele in modelesApprouves" :key="modele.id" :value="modele.id">{{ modele.nom }}</option>
                            </select>
                            <button type="button" class="bouton-secondaire" :disabled="!formulaire.modeleId" @click="appliquer">Appliquer le modèle</button>
                        </div>
                        <p class="text-xs text-encre-douce">Choisissez d’abord l’activité liée (plus bas) : ses informations remplissent le texte. « Appliquer » remplace l’objet et le texte. Seuls les modèles approuvés sont proposés.</p>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label for="lieu" class="text-sm font-semibold">Lieu</label>
                        <input id="lieu" v-model="formulaire.contenu.lieu" class="champ-saisie" maxlength="60">
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label for="date-courrier" class="text-sm font-semibold">Date du courrier</label>
                        <input id="date-courrier" v-model="formulaire.contenu.date" class="champ-saisie" type="date">
                    </div>
                    <div class="flex flex-col gap-1.5 sm:col-span-2">
                        <label for="destinataire" class="text-sm font-semibold">Adressé à <span class="font-normal text-encre-douce">(tel qu’écrit sur le courrier)</span></label>
                        <textarea id="destinataire" v-model="formulaire.contenu.destinataire" class="champ-saisie min-h-20" maxlength="300" v-bind="champ('destinataire')" />
                        <p v-if="erreurs.destinataire" id="erreur-destinataire" class="text-xs font-semibold text-danger">{{ erreurs.destinataire }}</p>
                    </div>
                    <div class="flex flex-col gap-1.5 sm:col-span-2">
                        <label for="formule" class="text-sm font-semibold">Formule d’appel</label>
                        <input id="formule" v-model="formulaire.contenu.formule" class="champ-saisie" maxlength="120" placeholder="Honorable membre du bureau régional,">
                    </div>
                    <div class="flex flex-col gap-1.5 sm:col-span-2">
                        <label for="corps" class="text-sm font-semibold">Texte <span class="font-normal text-encre-douce">(une ligne vide entre deux paragraphes)</span></label>
                        <textarea id="corps" v-model="formulaire.contenu.corps" class="champ-saisie min-h-64" maxlength="6000" v-bind="champ('corps')" />
                        <p v-if="erreurs.corps" id="erreur-corps" class="text-xs font-semibold text-danger">{{ erreurs.corps }}</p>
                    </div>
                    <div class="flex flex-col gap-1.5 sm:col-span-2">
                        <label for="pour" class="text-sm font-semibold">Pour <span class="font-normal text-encre-douce">(l’organe)</span></label>
                        <input id="pour" v-model="formulaire.contenu.pour" class="champ-saisie" maxlength="120">
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label for="titre-signataire" class="text-sm font-semibold">Titre du signataire</label>
                        <input id="titre-signataire" v-model="formulaire.contenu.titreSignataire" class="champ-saisie" maxlength="120">
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label for="nom-signataire" class="text-sm font-semibold">Nom du signataire</label>
                        <input id="nom-signataire" v-model="formulaire.contenu.nomSignataire" class="champ-saisie" maxlength="120" v-bind="champ('nomSignataire')">
                        <p v-if="erreurs.nomSignataire" id="erreur-nomSignataire" class="text-xs font-semibold text-danger">{{ erreurs.nomSignataire }}</p>
                    </div>
                    <p class="text-xs text-encre-douce sm:col-span-2">Pas d’image de signature ni de cachet : pour un courrier signé à la main, imprimez-le, signez-le, scannez-le, puis remplacez le document depuis la fiche du courrier.</p>
                </section>

                <section class="carte grid gap-5 p-6 sm:grid-cols-2">
                    <h2 class="text-lg font-bold sm:col-span-2">Envoi</h2>
                    <div class="flex flex-col gap-1.5 sm:col-span-2">
                        <label for="activite" class="text-sm font-semibold">Activité liée <span class="font-normal text-encre-douce">(facultatif)</span></label>
                        <select id="activite" v-model="formulaire.activiteId" class="champ-saisie">
                            <option value="">Aucune</option>
                            <option v-for="activite in activites" :key="activite.id" :value="activite.id">{{ activite.titre }}{{ activite.edition ? ` · ${activite.edition}` : '' }} ({{ dateCourte(activite.date) }})</option>
                        </select>
                    </div>
                    <label class="flex cursor-pointer items-start gap-3 sm:col-span-2">
                        <input v-model="formulaire.reponseAttendue" type="checkbox" class="mt-1 size-5 accent-[var(--c-accent)]">
                        <span><span class="block font-semibold">Demander une réponse</span><span class="text-sm text-encre-douce">Chaque destinataire confirme sa présence ou signale son absence, avec un motif.</span></span>
                    </label>
                    <div v-if="formulaire.reponseAttendue" class="flex flex-col gap-1.5">
                        <label for="echeance" class="text-sm font-semibold">Date limite de réponse</label>
                        <input id="echeance" v-model="formulaire.echeance" class="champ-saisie" type="date" :min="aujourdhui()" v-bind="champ('echeance')">
                        <p v-if="erreurs.echeance" id="erreur-echeance" class="text-xs font-semibold text-danger">{{ erreurs.echeance }}</p>
                        <p v-else class="text-xs text-encre-douce">Rien ne se ferme à cette date : une réponse plus tardive est marquée « tardive », et vous décidez de l’accepter.</p>
                    </div>
                    <div class="flex flex-col gap-1.5 sm:col-span-2">
                        <label for="instructions" class="text-sm font-semibold">Instructions aux destinataires <span class="font-normal text-encre-douce">(facultatif, affichées avec le courrier)</span></label>
                        <textarea id="instructions" v-model="formulaire.instructions" class="champ-saisie min-h-20" maxlength="1000" />
                    </div>
                </section>

                <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-destinataires">
                    <div class="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 id="titre-destinataires" class="text-lg font-bold">Destinataires</h2>
                        <p class="text-sm text-encre-douce">{{ formulaire.destinataires.length }} choisi{{ formulaire.destinataires.length > 1 ? 's' : '' }}</p>
                    </div>
                    <p v-if="erreurs.destinataires" class="text-sm font-semibold text-danger">{{ erreurs.destinataires }}</p>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <fieldset v-for="groupe in groupes" :key="groupe.groupe" class="rounded-xl border border-ligne p-4">
                            <legend class="px-1">
                                <label class="flex cursor-pointer items-center gap-2 font-semibold">
                                    <input type="checkbox" class="size-4 accent-[var(--c-accent)]" :checked="groupeComplet(groupe)" :indeterminate="groupePartiel(groupe)" @change="basculerGroupe(groupe)">
                                    {{ groupe.groupe === 'Direction' ? 'Direction du bureau' : `Tout le ${groupe.groupe}` }}
                                </label>
                            </legend>
                            <div class="mt-1 flex flex-col gap-1">
                                <label v-for="candidat in groupe.membres" :key="candidat.id" class="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                                    <input v-model="formulaire.destinataires" type="checkbox" :value="candidat.id" class="size-4 accent-[var(--c-accent)]">
                                    <span>{{ candidat.nom }} <span class="text-encre-douce">· {{ candidat.poste }}</span></span>
                                </label>
                            </div>
                        </fieldset>
                    </div>
                </section>

                <div class="flex flex-wrap justify-end gap-3">
                    <RouterLink :to="{ name: 'admin-courriers' }" class="bouton-discret">Annuler</RouterLink>
                    <button type="button" class="bouton-secondaire" :disabled="envoi" @click="enregistrerBrouillon">Enregistrer le brouillon</button>
                    <button type="submit" class="bouton-primaire" :disabled="envoi">{{ envoi ? 'Préparation…' : 'Vérifier avant l’envoi' }} <Icone nom="fleche-droite" class="size-4" /></button>
                </div>
            </form>

            <!-- Étape 2 : aperçu, récapitulatif et approbation -->
            <div v-else class="flex flex-col gap-6">
                <Alerte v-if="aCompleter.length" ton="attention" titre="Passages à compléter">
                    Le courrier contient encore : {{ aCompleter.join(', ') }}. Revenez à la rédaction pour les remplacer, sauf s’ils sont voulus.
                </Alerte>

                <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-apercu">
                    <h2 id="titre-apercu" class="text-lg font-bold">Aperçu du courrier</h2>
                    <DocumentCourrier :courrier="apercu" />
                </section>

                <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-recapitulatif">
                    <h2 id="titre-recapitulatif" class="text-lg font-bold">Récapitulatif</h2>
                    <dl class="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[12rem_1fr]">
                        <dt class="font-semibold text-encre-douce">Référence</dt><dd class="font-mono">{{ apercu.reference }}</dd>
                        <dt class="font-semibold text-encre-douce">Objet</dt><dd>{{ apercu.objet }}</dd>
                        <dt class="font-semibold text-encre-douce">Document</dt><dd>{{ apercu.source === 'modele' ? 'PDF créé depuis le texte' : `PDF importé : ${apercu.fichier?.nom}` }}</dd>
                        <dt class="font-semibold text-encre-douce">Activité liée</dt><dd>{{ activiteChoisie ? activiteChoisie.titre : 'Aucune' }}</dd>
                        <dt class="font-semibold text-encre-douce">Réponse demandée</dt><dd>{{ formulaire.reponseAttendue ? `Oui, avant le ${dateCourte(formulaire.echeance)}` : 'Non, pour information' }}</dd>
                        <dt class="font-semibold text-encre-douce">Instructions</dt><dd class="whitespace-pre-line">{{ formulaire.instructions || 'Aucune' }}</dd>
                        <dt class="font-semibold text-encre-douce">Destinataires ({{ formulaire.destinataires.length }})</dt>
                        <dd>
                            <ul class="flex flex-wrap gap-1.5">
                                <li v-for="candidat in membres.filter((m) => formulaire.destinataires.includes(m.id))" :key="candidat.id" class="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold">{{ candidat.nom }}</li>
                            </ul>
                        </dd>
                    </dl>
                </section>

                <section class="carte flex flex-col gap-4 border-or-400/60 p-6">
                    <label class="flex cursor-pointer items-start gap-3">
                        <input v-model="approuve" type="checkbox" class="mt-1 size-5 accent-[var(--c-accent)]">
                        <span class="font-semibold">J’ai relu ce courrier et son récapitulatif, et j’approuve son envoi aux {{ formulaire.destinataires.length }} destinataire{{ formulaire.destinataires.length > 1 ? 's' : '' }}.</span>
                    </label>
                    <div class="flex flex-wrap justify-end gap-3">
                        <button type="button" class="bouton-discret" :disabled="envoi" @click="revenir"><Icone nom="chevron-gauche" class="size-4" /> Modifier</button>
                        <button type="button" class="bouton-primaire" :disabled="envoi || !approuve" @click="envoyer"><Icone nom="envoyer" class="size-4" /> {{ envoi ? 'Envoi…' : 'Approuver et envoyer' }}</button>
                    </div>
                </section>
            </div>
        </template>
    </div>
</template>
