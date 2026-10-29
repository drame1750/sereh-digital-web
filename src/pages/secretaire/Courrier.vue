<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import Alerte from '../../components/Alerte.vue';
import BadgeStatut from '../../components/BadgeStatut.vue';
import DocumentCourrier from '../../components/DocumentCourrier.vue';
import Icone from '../../components/Icone.vue';
import MessageFlottant from '../../components/MessageFlottant.vue';
import { dateCourte, dateLongue, instant } from '../../donnees-exemple.js';
import {
    confirmerReponse,
    demanderModification,
    enregistrerBrouillonReponse,
    noterTelechargement,
    ouvrirMonCourrier,
    poserQuestion,
} from '../../services/courriers.js';
import { MODE_DEMONSTRATION } from '../../services/donnees.js';

/**
 * Un courrier dans l'espace du secrétaire régional. L'ouvrir le marque « consulté » ; répondre se
 * fait à part : brouillon possible, récapitulatif, puis confirmation définitive, verrouillée. Une
 * réponse verrouillée ne change que par une demande motivée, examinée par l'administrateur.
 */
const route = useRoute();
const courrier = ref(null);
const introuvable = ref(false);
const confirmation = ref('');
const erreur = ref({ zone: '', texte: '' });
const erreurs = ref({});
const envoi = ref(false);
const etapeReponse = ref('saisie');
const recapitulatif = ref(null);
const reponse = reactive({ choix: '', motif: '', justificatifNom: '' });
const demandeOuverte = ref(false);
const motifDemande = ref('');
const question = ref('');

async function charger() {
    const trouve = await ouvrirMonCourrier(route.params.id);
    introuvable.value = !trouve;
    courrier.value = trouve;

    if (trouve?.moi.reponse && !trouve.moi.definitive) {
        Object.assign(reponse, { choix: trouve.moi.reponse.choix, motif: trouve.moi.reponse.motif, justificatifNom: trouve.moi.reponse.justificatif?.nom ?? '' });
    }
}

const moi = computed(() => courrier.value?.moi);
const suivi = computed(() => courrier.value?.suivi);
const demandeEnCours = computed(() => moi.value?.demandes.find((demande) => !demande.decision) ?? null);
const libelleChoix = (choix) => (choix === 'presence' ? 'Je serai présent(e)' : 'Je serai absent(e)');

/**
 * Une erreur s'affiche dans la partie concernée (« zone » : réponse, demande ou question) ; une
 * réussite, dans un message flottant visible même en bas de la page.
 */
async function agir(zone, action, texte) {
    confirmation.value = '';
    erreur.value = { zone: '', texte: '' };
    erreurs.value = {};
    envoi.value = true;

    try {
        await action();
        confirmation.value = texte;
        await charger();

        return true;
    } catch (probleme) {
        erreurs.value = probleme.erreurs ?? {};
        erreur.value = { zone, texte: probleme.message };

        return false;
    } finally {
        envoi.value = false;
    }
}

function choisirJustificatif(evenement) {
    reponse.justificatifNom = evenement.target.files?.[0]?.name ?? '';
}

const enregistrerBrouillon = () => agir('reponse', () => enregistrerBrouillonReponse(courrier.value.id, reponse), 'Brouillon enregistré. Ce n’est pas encore une confirmation : revenez la terminer avant la date limite.');

async function verifierReponse() {
    erreurs.value = {};
    erreur.value = { zone: '', texte: '' };

    if (!reponse.choix) {
        erreurs.value = { choix: 'Choisissez votre réponse.' };
    } else if (reponse.choix === 'absence' && reponse.motif.trim().length < 5) {
        erreurs.value = { motif: 'Le motif est obligatoire (au moins 5 caractères).' };
    }

    if (Object.keys(erreurs.value).length > 0) {
        erreur.value = { zone: 'reponse', texte: 'Votre réponse est incomplète.' };

        return;
    }

    etapeReponse.value = 'recapitulatif';
    await nextTick();
    recapitulatif.value?.focus();
}

async function confirmer() {
    const reussi = await agir('reponse', () => confirmerReponse(courrier.value.id, reponse), 'Votre réponse est confirmée et verrouillée. Merci.');

    if (reussi) {
        etapeReponse.value = 'saisie';
    }
}

async function envoyerDemande() {
    if (await agir('demande', () => demanderModification(courrier.value.id, motifDemande.value), 'Demande envoyée. L’administrateur l’examinera ; votre réponse reste verrouillée en attendant.')) {
        motifDemande.value = '';
        demandeOuverte.value = false;
    }
}

async function envoyerQuestion() {
    if (await agir('question', () => poserQuestion(courrier.value.id, question.value), 'Question envoyée à l’administrateur. Sa réponse apparaîtra ici.')) {
        question.value = '';
    }
}

// Le signe « # » sert déjà aux adresses des pages : on fait défiler sans changer l'adresse.
function allerALaReponse() {
    document.getElementById('reponse')?.scrollIntoView({ behavior: document.documentElement.dataset.animations === 'oui' ? 'smooth' : 'auto' });
}

async function telecharge() {
    await noterTelechargement(courrier.value.id);
}

const delai = computed(() => {
    const jours = suivi.value?.joursRestants;

    if (jours === null || jours === undefined) {
        return '';
    }

    if (jours < 0) {
        return `dépassée depuis ${-jours} jour${jours < -1 ? 's' : ''}`;
    }

    return { 0: 'aujourd’hui', 1: 'demain' }[jours] ?? `dans ${jours} jours`;
});

onMounted(charger);
</script>

<template>
    <div class="flex flex-col gap-6">
        <RouterLink :to="{ name: 'espace-secretaire' }" class="inline-flex items-center gap-1 self-start text-sm font-semibold text-lien"><Icone nom="chevron-gauche" class="size-4" /> Mon espace</RouterLink>

        <div v-if="introuvable" class="carte flex flex-col gap-2 p-6">
            <p class="font-semibold">Courrier introuvable.</p>
            <p class="text-sm text-encre-douce">Il n’existe pas, ou il ne vous est pas adressé.</p>
        </div>
        <div v-else-if="!courrier" class="squelette h-96" aria-hidden="true" />

        <template v-else>
            <header class="flex flex-col gap-3">
                <div class="flex flex-wrap gap-1.5">
                    <BadgeStatut v-if="suivi.urgence === 'depassee'" statut="echeance-depassee" />
                    <BadgeStatut v-else-if="suivi.urgence === 'proche'" statut="echeance-proche" />
                    <BadgeStatut :statut="suivi.reponse" />
                    <BadgeStatut v-if="suivi.definitive" statut="confirmation-definitive" />
                    <BadgeStatut v-if="suivi.demandeEnCours" statut="demande-modification" />
                </div>
                <h1 class="text-2xl font-extrabold tracking-tight sm:text-3xl">{{ courrier.objet }}</h1>
                <dl class="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    <div><dt class="inline text-encre-douce">Référence : </dt><dd class="inline font-mono font-semibold">{{ courrier.reference }}</dd></div>
                    <div><dt class="inline text-encre-douce">Transmis le </dt><dd class="inline font-semibold">{{ instant(courrier.envoyeLe) }}</dd></div>
                    <div v-if="suivi.echeance">
                        <dt class="inline text-encre-douce">Date limite de réponse : </dt>
                        <dd class="inline font-semibold" :class="{ 'text-danger': suivi.urgence === 'depassee', 'text-attention': suivi.urgence === 'proche' }">{{ dateCourte(suivi.echeance) }}<template v-if="suivi.aTraiter"> ({{ delai }})</template></dd>
                    </div>
                    <div v-if="courrier.activite"><dt class="inline text-encre-douce">Activité : </dt><dd class="inline font-semibold">{{ courrier.activite.titre }}</dd></div>
                </dl>
                <button v-if="courrier.reponseAttendue" type="button" class="bouton-or self-start sm:hidden" @click="allerALaReponse"><Icone nom="secretaires" class="size-4" /> Aller à ma réponse</button>
            </header>

            <Alerte v-if="courrier.documentRemplaceLe" ton="info">Le document de ce courrier a été remplacé le {{ instant(courrier.documentRemplaceLe) }}.</Alerte>
            <Alerte v-if="courrier.instructions" ton="attention" titre="Instructions de l’administrateur"><span class="whitespace-pre-line">{{ courrier.instructions }}</span></Alerte>

            <section v-if="courrier.activite" class="carte flex gap-3 p-5" aria-label="Activité concernée">
                <Icone nom="calendrier" class="mt-0.5 size-5 flex-none text-or-600" />
                <div class="text-sm">
                    <p class="font-semibold">{{ courrier.activite.titre }}<template v-if="courrier.activite.edition"> · {{ courrier.activite.edition }}</template></p>
                    <p class="text-encre-douce first-letter:uppercase">{{ dateLongue(courrier.activite.date) }}, {{ courrier.activite.heure }} · {{ courrier.activite.lieu }}</p>
                </div>
            </section>

            <section class="carte flex flex-col gap-4 p-5 sm:p-6" aria-labelledby="titre-document">
                <h2 id="titre-document" class="text-lg font-bold">Le courrier</h2>
                <DocumentCourrier :courrier="courrier" @telecharge="telecharge" />
            </section>

            <section v-if="courrier.reponseAttendue" id="reponse" class="carte flex scroll-mt-24 flex-col gap-5 p-5 sm:p-6" aria-labelledby="titre-reponse">
                <h2 id="titre-reponse" class="text-lg font-bold">Votre réponse</h2>

                <!-- Réponse confirmée : verrouillée -->
                <template v-if="moi.definitive">
                    <div class="flex gap-4 rounded-xl border border-ok/30 bg-ok-fond/60 p-4">
                        <Icone nom="cadenas" class="mt-0.5 size-6 flex-none text-ok" />
                        <div class="flex flex-col gap-1 text-sm">
                            <p class="font-bold">{{ libelleChoix(moi.reponse.choix) }}</p>
                            <p v-if="moi.reponse.choix === 'absence'"><span class="font-semibold">Motif :</span> {{ moi.reponse.motif }}</p>
                            <p v-if="moi.reponse.justificatif"><span class="font-semibold">Justificatif :</span> {{ moi.reponse.justificatif.nom }}</p>
                            <p class="text-encre-douce">Confirmée définitivement le {{ instant(moi.confirmeeLe) }}. Elle est verrouillée.</p>
                            <p v-if="moi.tardive" class="font-semibold text-attention">
                                {{ moi.tardiveAcceptee ? 'Réponse arrivée après la date limite, acceptée par l’administrateur.' : 'Réponse arrivée après la date limite : elle comptera une fois acceptée par l’administrateur.' }}
                            </p>
                        </div>
                    </div>

                    <div v-if="demandeEnCours" class="rounded-xl bg-attention-fond p-4 text-sm text-attention">
                        <p class="font-bold">Demande de modification en attente</p>
                        <p>Envoyée le {{ instant(demandeEnCours.demandeeLe) }} : « {{ demandeEnCours.motif }} ». L’administrateur l’examinera.</p>
                    </div>
                    <template v-else>
                        <button v-if="!demandeOuverte" type="button" class="bouton-secondaire self-start" @click="demandeOuverte = true">Demander une modification</button>
                        <form v-else class="flex flex-col gap-3 rounded-xl bg-surface-2 p-4" @submit.prevent="envoyerDemande">
                            <label for="motif-demande" class="text-sm font-semibold">Pourquoi voulez-vous modifier votre réponse ?</label>
                            <textarea id="motif-demande" v-model="motifDemande" class="champ-saisie min-h-24" maxlength="1000" required />
                            <p class="text-xs text-encre-douce">Votre réponse reste verrouillée tant que l’administrateur n’a pas accepté la demande.</p>
                            <p v-if="erreur.zone === 'demande'" class="text-sm font-semibold text-danger" role="alert">{{ erreur.texte }}</p>
                            <div class="flex flex-wrap gap-2">
                                <button type="submit" class="bouton-primaire" :disabled="envoi">Envoyer la demande</button>
                                <button type="button" class="bouton-discret" @click="demandeOuverte = false">Annuler</button>
                            </div>
                        </form>
                    </template>
                </template>

                <!-- Réponse à donner : saisie, brouillon, récapitulatif -->
                <template v-else>
                    <Alerte v-if="moi.reouverte" ton="info" titre="Réponse rouverte">L’administrateur a accepté votre demande : modifiez votre réponse, puis confirmez-la de nouveau.</Alerte>
                    <Alerte v-else-if="suivi.echeanceDepassee" ton="attention" titre="Date limite dépassée">Vous pouvez encore répondre, mais votre réponse sera marquée tardive : elle comptera une fois acceptée par l’administrateur.</Alerte>
                    <p v-if="moi.reponse && !moi.reouverte" class="flex items-center gap-2 rounded-xl bg-surface-2 p-3 text-sm">
                        <Icone nom="crayon" class="size-4 flex-none text-or-600" /> Brouillon enregistré le {{ instant(moi.reponse.enregistreeLe) }}. Ce n’est pas encore une confirmation.
                    </p>

                    <form v-if="etapeReponse === 'saisie'" class="flex flex-col gap-4" novalidate @submit.prevent="verifierReponse">
                        <fieldset class="grid gap-3 sm:grid-cols-2" :aria-invalid="erreurs.choix ? 'true' : undefined">
                            <legend class="mb-2 text-sm font-semibold">Serez-vous présent(e) ?</legend>
                            <label class="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 p-4" :class="reponse.choix === 'presence' ? 'border-ok bg-ok-fond/60' : 'border-ligne'">
                                <input v-model="reponse.choix" type="radio" value="presence" class="size-5 accent-[var(--c-ok)]">
                                <span class="font-semibold">Je confirme ma présence</span>
                            </label>
                            <label class="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 p-4" :class="reponse.choix === 'absence' ? 'border-danger bg-danger-fond/60' : 'border-ligne'">
                                <input v-model="reponse.choix" type="radio" value="absence" class="size-5 accent-[var(--c-danger)]">
                                <span class="font-semibold">Je signale mon absence</span>
                            </label>
                        </fieldset>
                        <p v-if="erreurs.choix" class="-mt-2 text-xs font-semibold text-danger">{{ erreurs.choix }}</p>

                        <template v-if="reponse.choix === 'absence'">
                            <div class="flex flex-col gap-1.5">
                                <label for="motif" class="text-sm font-semibold">Motif de l’absence <span class="font-normal text-encre-douce">(obligatoire)</span></label>
                                <textarea id="motif" v-model="reponse.motif" class="champ-saisie min-h-24" maxlength="1000" :aria-invalid="erreurs.motif ? 'true' : undefined" :aria-describedby="erreurs.motif ? 'erreur-motif' : undefined" />
                                <p v-if="erreurs.motif" id="erreur-motif" class="text-xs font-semibold text-danger">{{ erreurs.motif }}</p>
                            </div>
                            <div class="flex flex-col gap-1.5">
                                <label for="justificatif" class="text-sm font-semibold">Justificatif <span class="font-normal text-encre-douce">(facultatif)</span></label>
                                <input id="justificatif" type="file" accept="application/pdf,image/jpeg,image/png" class="champ-saisie py-3" @change="choisirJustificatif">
                                <p class="text-xs text-encre-douce">{{ reponse.justificatifNom ? `Choisi : ${reponse.justificatifNom}. ` : '' }}{{ MODE_DEMONSTRATION ? 'En démonstration, seul le nom du fichier est noté : le fichier n’est envoyé nulle part.' : '' }}</p>
                            </div>
                        </template>

                        <p v-if="erreur.zone === 'reponse'" class="text-sm font-semibold text-danger" role="alert">{{ erreur.texte }}</p>
                        <div class="flex flex-wrap gap-2">
                            <button type="submit" class="bouton-primaire" :disabled="envoi">Vérifier ma réponse <Icone nom="fleche-droite" class="size-4" /></button>
                            <button type="button" class="bouton-secondaire" :disabled="envoi || !reponse.choix" @click="enregistrerBrouillon">Enregistrer le brouillon</button>
                        </div>
                    </form>

                    <div v-else ref="recapitulatif" tabindex="-1" class="flex flex-col gap-4 rounded-xl border-2 border-or-400/70 p-4 outline-none">
                        <h3 class="font-bold">Récapitulatif avant confirmation</h3>
                        <dl class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
                            <dt class="font-semibold text-encre-douce">Courrier</dt><dd>{{ courrier.objet }}</dd>
                            <dt class="font-semibold text-encre-douce">Votre réponse</dt><dd class="font-bold">{{ libelleChoix(reponse.choix) }}</dd>
                            <template v-if="reponse.choix === 'absence'">
                                <dt class="font-semibold text-encre-douce">Motif</dt><dd class="whitespace-pre-line">{{ reponse.motif.trim() }}</dd>
                                <dt class="font-semibold text-encre-douce">Justificatif</dt><dd>{{ reponse.justificatifNom || 'Aucun' }}</dd>
                            </template>
                            <dt v-if="suivi.echeance" class="font-semibold text-encre-douce">Date limite</dt><dd v-if="suivi.echeance">{{ dateCourte(suivi.echeance) }}{{ suivi.echeanceDepassee ? ' · dépassée : réponse tardive' : '' }}</dd>
                        </dl>
                        <Alerte ton="attention">Après confirmation, votre réponse sera <strong>verrouillée</strong>. Pour la changer ensuite, il faudra une demande motivée, examinée par l’administrateur.</Alerte>
                        <p v-if="erreur.zone === 'reponse'" class="text-sm font-semibold text-danger" role="alert">{{ erreur.texte }}</p>
                        <div class="flex flex-wrap gap-2">
                            <button type="button" class="bouton-primaire" :disabled="envoi" @click="confirmer"><Icone nom="cadenas" class="size-4" /> {{ envoi ? 'Confirmation…' : 'Confirmer définitivement' }}</button>
                            <button type="button" class="bouton-discret" :disabled="envoi" @click="etapeReponse = 'saisie'"><Icone nom="chevron-gauche" class="size-4" /> Modifier ma réponse</button>
                        </div>
                    </div>
                </template>

                <div v-if="moi.demandes.some((demande) => demande.decision)" class="flex flex-col gap-2 border-t border-ligne pt-4">
                    <h3 class="text-sm font-bold">Mes demandes de modification</h3>
                    <ul class="flex flex-col gap-2 text-sm">
                        <li v-for="demande in moi.demandes.filter((d) => d.decision)" :key="demande.id" class="rounded-xl bg-surface-2 p-3">
                            <p><span class="font-semibold">{{ demande.decision === 'acceptee' ? 'Acceptée' : 'Refusée' }}</span> le {{ instant(demande.decideeLe) }} · demande : « {{ demande.motif }} »</p>
                            <p v-if="demande.commentaire" class="text-encre-douce">Commentaire de l’administrateur : {{ demande.commentaire }}</p>
                        </li>
                    </ul>
                </div>
            </section>

            <section class="carte flex flex-col gap-4 p-5 sm:p-6" aria-labelledby="titre-questions">
                <h2 id="titre-questions" class="flex items-center gap-2 text-lg font-bold"><Icone nom="bulle" class="size-5 flex-none text-or-600" /> Une question sur ce courrier ?</h2>
                <ul v-if="moi.questions.length" class="flex flex-col gap-3">
                    <li v-for="item in moi.questions" :key="item.id" class="flex flex-col gap-2 rounded-xl bg-surface-2 p-3 text-sm">
                        <p><span class="font-semibold">Vous, le {{ instant(item.poseeLe) }} :</span> {{ item.texte }}</p>
                        <p v-if="item.reponse" class="rounded-lg bg-surface p-2"><span class="font-semibold">Administrateur, le {{ instant(item.reponduLe) }} :</span> {{ item.reponse }}</p>
                        <p v-else class="text-encre-douce">En attente de réponse de l’administrateur.</p>
                    </li>
                </ul>
                <form class="flex flex-col gap-3" @submit.prevent="envoyerQuestion">
                    <label for="question" class="text-sm font-semibold">Demander une précision à l’administrateur</label>
                    <textarea id="question" v-model="question" class="champ-saisie min-h-20" maxlength="1000" />
                    <p class="text-xs text-encre-douce">Une question ne remplace pas votre réponse{{ courrier.reponseAttendue ? ' : pensez à confirmer votre présence ou votre absence' : '' }}.</p>
                    <p v-if="erreur.zone === 'question'" class="text-sm font-semibold text-danger" role="alert">{{ erreur.texte }}</p>
                    <button type="submit" class="bouton-secondaire self-start" :disabled="envoi || question.trim().length === 0"><Icone nom="envoyer" class="size-4" /> Envoyer la question</button>
                </form>
            </section>

            <section v-if="courrier.historique.length" class="carte flex flex-col gap-4 p-5 sm:p-6" aria-labelledby="titre-historique">
                <h2 id="titre-historique" class="text-lg font-bold">Historique de ce courrier</h2>
                <ol class="relative flex flex-col gap-4 border-l-2 border-ligne pl-5">
                    <li v-for="(entree, index) in courrier.historique" :key="index" class="relative">
                        <span class="absolute top-1.5 -left-[1.6rem] size-3 rounded-full border-2 border-surface bg-or-500" aria-hidden="true" />
                        <p class="text-sm font-semibold">{{ entree.action }}</p>
                        <p v-if="entree.detail" class="text-sm text-encre-douce">{{ entree.detail }}</p>
                        <p class="text-xs text-encre-douce">{{ instant(entree.le) }} · {{ entree.parLeMembre ? 'vous' : entree.auteur }}</p>
                    </li>
                </ol>
            </section>
        </template>

        <MessageFlottant :texte="confirmation" @fermer="confirmation = ''" />
    </div>
</template>
