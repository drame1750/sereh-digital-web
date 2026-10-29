<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import Alerte from '../../components/Alerte.vue';
import BadgeStatut from '../../components/BadgeStatut.vue';
import DocumentCourrier from '../../components/DocumentCourrier.vue';
import Icone from '../../components/Icone.vue';
import MessageFlottant from '../../components/MessageFlottant.vue';
import { aujourdhui, dateCourte, instant } from '../../donnees-exemple.js';
import {
    accepterReponseTardive,
    accorderDelai,
    deciderDemande,
    remplacerDocument,
    repondreQuestion,
    trouverCourrier,
} from '../../services/courriers.js';
import { MODE_DEMONSTRATION } from '../../services/donnees.js';

/**
 * Suivi d'un courrier envoyé : qui l'a consulté, qui a répondu et comment, et ce qui attend une
 * décision de l'administrateur. Rien n'est effacé : chaque décision rejoint l'historique.
 */
const route = useRoute();
const courrier = ref(null);
const introuvable = ref(false);
const message = ref(route.query.envoye ? { ton: 'ok', texte: 'Courrier approuvé et envoyé. Chaque destinataire le trouve dans son espace.' } : null);
const confirmation = ref('');
const erreur = ref({ cle: '', texte: '' });
const enCours = ref('');
const filtre = ref('tous');
const nouveauDocument = ref(null);
const champDocument = ref(null);

const reponses = reactive({});
const commentaires = reactive({});
const delais = reactive({});

const FILTRES = [
    { cle: 'tous', libelle: 'Tous' },
    { cle: 'sans-reponse', libelle: 'Sans réponse définitive' },
    { cle: 'presences', libelle: 'Présences' },
    { cle: 'absences', libelle: 'Absences' },
    { cle: 'non-consultes', libelle: 'Non consultés' },
];

async function charger() {
    const trouve = await trouverCourrier(route.params.id);
    introuvable.value = !trouve;
    courrier.value = trouve;
}

/** Une erreur s'affiche à côté du bouton concerné (« cle ») ; une réussite, dans un message flottant. */
async function agir(cle, action, texte) {
    enCours.value = cle;
    message.value = null;
    confirmation.value = '';
    erreur.value = { cle: '', texte: '' };

    try {
        await action();
        confirmation.value = texte;
        await charger();

        return true;
    } catch (probleme) {
        erreur.value = { cle, texte: probleme.message };

        return false;
    } finally {
        enCours.value = '';
    }
}

const aExaminer = computed(() => {
    if (!courrier.value) {
        return { questions: [], demandes: [], tardives: [] };
    }

    const liste = courrier.value.destinataires;

    return {
        questions: liste.flatMap((destinataire) => destinataire.questions.filter((question) => !question.reponse).map((question) => ({ destinataire, question }))),
        demandes: liste.flatMap((destinataire) => destinataire.demandes.filter((demande) => !demande.decision).map((demande) => ({ destinataire, demande }))),
        tardives: liste.filter((destinataire) => destinataire.suivi.tardiveAExaminer),
    };
});

const rienAExaminer = computed(() => !aExaminer.value.questions.length && !aExaminer.value.demandes.length && !aExaminer.value.tardives.length);

const destinatairesAffiches = computed(() => (courrier.value?.destinataires ?? []).filter((destinataire) => ({
    tous: true,
    'sans-reponse': courrier.value.reponseAttendue && !destinataire.definitive,
    presences: destinataire.definitive && destinataire.reponse.choix === 'presence',
    absences: destinataire.definitive && destinataire.reponse.choix === 'absence',
    'non-consultes': !destinataire.consulteLe,
}[filtre.value])));

const libelleReponse = (destinataire) => (destinataire.reponse?.choix === 'presence' ? 'présence' : `absence · motif : ${destinataire.reponse?.motif}`);

function choisirDocument(evenement) {
    nouveauDocument.value = evenement.target.files?.[0] ?? null;
}

async function remplacer() {
    if (await agir('document', () => remplacerDocument(courrier.value.id, nouveauDocument.value), 'Document remplacé. L’historique garde la trace du document précédent.')) {
        nouveauDocument.value = null;
        champDocument.value.value = '';
    }
}

onMounted(charger);
</script>

<template>
    <div class="mx-auto flex max-w-6xl flex-col gap-6">
        <RouterLink :to="{ name: 'admin-courriers' }" class="inline-flex items-center gap-1 self-start text-sm font-semibold text-lien"><Icone nom="chevron-gauche" class="size-4" /> Courriers</RouterLink>

        <div v-if="introuvable" class="carte p-6"><p class="font-semibold">Courrier introuvable.</p></div>
        <div v-else-if="!courrier" class="squelette h-96" aria-hidden="true" />

        <template v-else>
            <header class="flex flex-col gap-2">
                <div class="flex flex-wrap gap-2">
                    <BadgeStatut :statut="courrier.statut === 'envoye' ? 'envoye' : 'brouillon'" />
                    <BadgeStatut v-if="!courrier.reponseAttendue" statut="information" />
                </div>
                <h1 class="text-3xl font-extrabold tracking-tight">{{ courrier.objet }}</h1>
                <p class="text-sm text-encre-douce">
                    Réf. <span class="font-mono">{{ courrier.reference }}</span>
                    <template v-if="courrier.envoyeLe"> · envoyé le {{ instant(courrier.envoyeLe) }}</template>
                    <template v-if="courrier.activite"> · activité : <RouterLink :to="{ name: 'admin-inscriptions', query: { activite: courrier.activite.id } }" class="font-semibold text-lien underline">{{ courrier.activite.titre }}</RouterLink></template>
                    <template v-if="courrier.echeance"> · date limite : <strong>{{ dateCourte(courrier.echeance) }}</strong></template>
                </p>
            </header>

            <Alerte v-if="MODE_DEMONSTRATION" ton="info" titre="Démonstration">Courrier et destinataires fictifs. Connectez-vous avec un compte de secrétaire régional de démonstration pour répondre de l’autre côté.</Alerte>
            <Alerte v-if="message" :ton="message.ton">{{ message.texte }}</Alerte>

            <div v-if="courrier.statut === 'brouillon'" class="carte flex flex-wrap items-center justify-between gap-4 p-6">
                <p>Ce courrier est encore un brouillon : il n’a été envoyé à personne.</p>
                <RouterLink :to="{ name: 'admin-courrier-modifier', params: { id: courrier.id } }" class="bouton-primaire"><Icone nom="crayon" class="size-4" /> Reprendre le brouillon</RouterLink>
            </div>

            <template v-else>
                <dl class="grid grid-cols-2 gap-3 text-center sm:grid-cols-3 lg:grid-cols-6">
                    <div class="carte p-4"><dt class="text-xs text-encre-douce">Destinataires</dt><dd class="text-2xl font-extrabold tabular-nums">{{ courrier.nombres.destinataires }}</dd></div>
                    <div class="carte p-4"><dt class="text-xs text-encre-douce">Consultés</dt><dd class="text-2xl font-extrabold tabular-nums">{{ courrier.nombres.consultes }}</dd></div>
                    <template v-if="courrier.reponseAttendue">
                        <div class="carte p-4"><dt class="text-xs text-encre-douce">Confirmations définitives</dt><dd class="text-2xl font-extrabold tabular-nums">{{ courrier.nombres.confirmations }}</dd></div>
                        <div class="carte p-4"><dt class="text-xs text-encre-douce">Présences</dt><dd class="text-2xl font-extrabold tabular-nums text-ok">{{ courrier.nombres.presences }}</dd></div>
                        <div class="carte p-4"><dt class="text-xs text-encre-douce">Absences</dt><dd class="text-2xl font-extrabold tabular-nums text-danger">{{ courrier.nombres.absences }}</dd></div>
                        <div class="carte p-4"><dt class="text-xs text-encre-douce">Sans réponse définitive</dt><dd class="text-2xl font-extrabold tabular-nums">{{ courrier.nombres.enAttente }}</dd></div>
                    </template>
                </dl>
                <p v-if="courrier.reponseAttendue" class="-mt-3 text-xs text-encre-douce">Les brouillons ({{ courrier.nombres.brouillons }}) ne comptent pas comme des confirmations, ni les réponses tardives tant que vous ne les avez pas acceptées.</p>

                <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-examiner">
                    <h2 id="titre-examiner" class="text-lg font-bold">À examiner</h2>
                    <p v-if="rienAExaminer" class="text-sm text-encre-douce">Rien n’attend de décision pour ce courrier.</p>

                    <article v-for="{ destinataire, question } in aExaminer.questions" :key="question.id" class="flex flex-col gap-3 rounded-xl border border-info/30 bg-info-fond/50 p-4">
                        <p class="flex items-center gap-2 text-sm font-semibold"><Icone nom="bulle" class="size-4 flex-none text-info" /> Question de {{ destinataire.membre.nom }} · {{ instant(question.poseeLe) }}</p>
                        <p class="rounded-lg bg-surface p-3 text-sm">{{ question.texte }}</p>
                        <label :for="`reponse-${question.id}`" class="text-sm font-semibold">Votre réponse</label>
                        <textarea :id="`reponse-${question.id}`" v-model="reponses[question.id]" class="champ-saisie min-h-20" maxlength="1000" />
                        <button
                            type="button"
                            class="bouton-primaire self-start"
                            :disabled="enCours === question.id"
                            @click="agir(question.id, () => repondreQuestion(courrier.id, destinataire.membreId, question.id, reponses[question.id] ?? ''), `Réponse envoyée à ${destinataire.membre.nom}.`)"
                        >Répondre</button>
                        <p v-if="erreur.cle === question.id" class="text-sm font-semibold text-danger" role="alert">{{ erreur.texte }}</p>
                    </article>

                    <article v-for="{ destinataire, demande } in aExaminer.demandes" :key="demande.id" class="flex flex-col gap-3 rounded-xl border border-attention/30 bg-attention-fond/50 p-4">
                        <p class="flex items-center gap-2 text-sm font-semibold"><Icone nom="cadenas" class="size-4 flex-none text-attention" /> Demande de modification de {{ destinataire.membre.nom }} · {{ instant(demande.demandeeLe) }}</p>
                        <p class="text-sm">Réponse verrouillée : <strong>{{ libelleReponse(destinataire) }}</strong>, confirmée le {{ instant(destinataire.confirmeeLe) }}.</p>
                        <p class="rounded-lg bg-surface p-3 text-sm"><span class="font-semibold">Motif :</span> {{ demande.motif }}</p>
                        <label :for="`commentaire-${demande.id}`" class="text-sm font-semibold">Commentaire <span class="font-normal text-encre-douce">(obligatoire pour un refus)</span></label>
                        <textarea :id="`commentaire-${demande.id}`" v-model="commentaires[demande.id]" class="champ-saisie min-h-16" maxlength="500" />
                        <div class="flex flex-wrap gap-2">
                            <button
                                type="button"
                                class="bouton-primaire"
                                :disabled="enCours === demande.id"
                                @click="agir(demande.id, () => deciderDemande(courrier.id, destinataire.membreId, demande.id, true, commentaires[demande.id] ?? ''), `Demande acceptée : la réponse de ${destinataire.membre.nom} est rouverte.`)"
                            >Accepter et rouvrir la réponse</button>
                            <button
                                type="button"
                                class="bouton-danger"
                                :disabled="enCours === demande.id"
                                @click="agir(demande.id, () => deciderDemande(courrier.id, destinataire.membreId, demande.id, false, commentaires[demande.id] ?? ''), 'Demande refusée : la réponse reste verrouillée.')"
                            >Refuser</button>
                        </div>
                        <p v-if="erreur.cle === demande.id" class="text-sm font-semibold text-danger" role="alert">{{ erreur.texte }}</p>
                    </article>

                    <article v-for="destinataire in aExaminer.tardives" :key="`tardive-${destinataire.membreId}`" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-attention/30 bg-attention-fond/50 p-4">
                        <div class="text-sm">
                            <p class="font-semibold">Réponse tardive de {{ destinataire.membre.nom }}</p>
                            <p>{{ libelleReponse(destinataire) }}, confirmée le {{ instant(destinataire.confirmeeLe) }} (date limite : {{ dateCourte(destinataire.suivi.echeance) }}).</p>
                        </div>
                        <button
                            type="button"
                            class="bouton-primaire"
                            :disabled="enCours === `tardive-${destinataire.membreId}`"
                            @click="agir(`tardive-${destinataire.membreId}`, () => accepterReponseTardive(courrier.id, destinataire.membreId), 'Réponse tardive acceptée : elle compte désormais.')"
                        >Accepter la réponse tardive</button>
                        <p v-if="erreur.cle === `tardive-${destinataire.membreId}`" class="w-full text-sm font-semibold text-danger" role="alert">{{ erreur.texte }}</p>
                    </article>
                </section>

                <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-suivi">
                    <h2 id="titre-suivi" class="text-lg font-bold">Suivi des destinataires</h2>
                    <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrer les destinataires">
                        <button
                            v-for="choix in FILTRES"
                            :key="choix.cle"
                            type="button"
                            class="inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold"
                            :class="filtre === choix.cle ? 'bg-accent text-accent-texte' : 'bg-surface-2 hover:bg-ligne'"
                            :aria-pressed="filtre === choix.cle"
                            @click="filtre = choix.cle"
                        >{{ choix.libelle }}</button>
                    </div>

                    <p v-if="destinatairesAffiches.length === 0" class="text-sm text-encre-douce">Personne dans cette catégorie.</p>

                    <ul class="flex flex-col divide-y divide-ligne">
                        <li v-for="destinataire in destinatairesAffiches" :key="destinataire.membreId" class="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
                            <div class="flex min-w-0 flex-col gap-1">
                                <p class="font-semibold">{{ destinataire.membre.nom }} <span class="font-normal text-encre-douce">· {{ destinataire.membre.poste }}</span></p>
                                <p class="text-xs text-encre-douce">
                                    {{ destinataire.consulteLe ? `Consulté le ${instant(destinataire.consulteLe)}` : 'Pas encore consulté' }}
                                    <template v-if="destinataire.telechargeLe"> · PDF téléchargé le {{ instant(destinataire.telechargeLe) }}</template>
                                    <template v-if="destinataire.confirmeeLe && destinataire.definitive"> · confirmé le {{ instant(destinataire.confirmeeLe) }}</template>
                                    <template v-if="destinataire.delaiJusquau"> · délai accordé jusqu’au {{ dateCourte(destinataire.delaiJusquau) }}</template>
                                </p>
                                <p v-if="destinataire.definitive && destinataire.reponse.choix === 'absence'" class="text-sm"><span class="font-semibold">Motif :</span> {{ destinataire.reponse.motif }}<template v-if="destinataire.reponse.justificatif"> · justificatif : {{ destinataire.reponse.justificatif.nom }}</template></p>
                                <form
                                    v-if="destinataire.suivi.echeanceDepassee"
                                    class="mt-1 flex flex-wrap items-end gap-2"
                                    @submit.prevent="agir(`delai-${destinataire.membreId}`, () => accorderDelai(courrier.id, destinataire.membreId, delais[destinataire.membreId] ?? ''), `Délai accordé à ${destinataire.membre.nom}.`)"
                                >
                                    <label class="flex flex-col gap-1 text-xs font-semibold">
                                        Nouvelle date limite
                                        <input v-model="delais[destinataire.membreId]" type="date" class="champ-saisie min-h-10 py-1" :min="aujourdhui()">
                                    </label>
                                    <button type="submit" class="bouton-secondaire min-h-10" :disabled="enCours === `delai-${destinataire.membreId}`">Accorder un délai</button>
                                    <p v-if="erreur.cle === `delai-${destinataire.membreId}`" class="w-full text-sm font-semibold text-danger" role="alert">{{ erreur.texte }}</p>
                                </form>
                            </div>
                            <div class="flex flex-wrap gap-1.5 sm:max-w-[50%] sm:justify-end">
                                <BadgeStatut :statut="destinataire.suivi.consultation" />
                                <BadgeStatut :statut="destinataire.suivi.reponse" />
                                <BadgeStatut v-if="destinataire.definitive" statut="confirmation-definitive" />
                                <BadgeStatut v-if="destinataire.suivi.demandeEnCours" statut="demande-modification" />
                                <BadgeStatut v-if="destinataire.suivi.tardive" :statut="destinataire.tardiveAcceptee ? 'tardive-acceptee' : 'reponse-tardive'" />
                                <BadgeStatut v-if="destinataire.suivi.echeanceDepassee" statut="echeance-depassee" />
                                <BadgeStatut v-if="destinataire.suivi.questionsEnAttente" statut="question-posee" />
                            </div>
                        </li>
                    </ul>
                </section>

                <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-document">
                    <h2 id="titre-document" class="text-lg font-bold">Document</h2>
                    <DocumentCourrier :courrier="courrier" />
                    <div class="flex flex-col gap-2 rounded-xl bg-surface-2 p-4">
                        <label for="nouveau-document" class="text-sm font-semibold">Remplacer le document</label>
                        <p class="text-xs text-encre-douce">Par exemple par la version imprimée, signée et scannée. Le remplacement est noté dans l’historique, avec la date, votre nom et le document précédent.</p>
                        <div class="flex flex-wrap gap-2">
                            <input id="nouveau-document" ref="champDocument" type="file" accept="application/pdf" class="champ-saisie min-w-0 flex-1 py-3" @change="choisirDocument">
                            <button type="button" class="bouton-secondaire" :disabled="!nouveauDocument || enCours === 'document'" @click="remplacer"><Icone nom="importer" class="size-4" /> Remplacer</button>
                        </div>
                        <p v-if="erreur.cle === 'document'" class="text-sm font-semibold text-danger" role="alert">{{ erreur.texte }}</p>
                    </div>
                </section>
            </template>

            <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-historique">
                <h2 id="titre-historique" class="text-lg font-bold">Historique</h2>
                <ol class="relative flex flex-col gap-4 border-l-2 border-ligne pl-5">
                    <li v-for="(entree, index) in courrier.historique" :key="index" class="relative">
                        <span class="absolute top-1.5 -left-[1.6rem] size-3 rounded-full border-2 border-surface bg-or-500" aria-hidden="true" />
                        <p class="text-sm font-semibold">{{ entree.action }}</p>
                        <p v-if="entree.detail" class="text-sm">{{ entree.detail }}</p>
                        <p class="text-xs text-encre-douce">{{ instant(entree.le) }} · {{ entree.auteur }}</p>
                    </li>
                </ol>
            </section>
        </template>

        <MessageFlottant :texte="confirmation" @fermer="confirmation = ''" />
    </div>
</template>
