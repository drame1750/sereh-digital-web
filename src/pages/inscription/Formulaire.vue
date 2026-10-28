<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Alerte from '../../components/Alerte.vue';
import BadgeStatut from '../../components/BadgeStatut.vue';
import Icone from '../../components/Icone.vue';
import { dateLongue } from '../../donnees-exemple.js';
import { inscrire, listerSousComites, MODE_DEMONSTRATION, trouverActivite } from '../../services/donnees.js';
import { normaliserTelephone } from '../../telephone.js';

/**
 * Formulaire public d'inscription (cahier des charges, section 4) : court, lisible sur téléphone,
 * avec les champs facultatifs signalés et les consentements séparés. Le navigateur vérifie les
 * champs pour aider la personne ; le serveur refera toutes les vérifications.
 */
const route = useRoute();
const router = useRouter();
const activite = ref(undefined);
const sousComites = ref([]);
const envoi = ref(false);
const erreurEnvoi = ref('');
const erreurs = reactive({});
const resume = ref(null);

const formulaire = reactive({
    nom: '',
    telephone: '',
    sexe: '',
    ville: '',
    sousComite: '',
    section: '',
    mineur: null,
    tuteurNom: '',
    tuteurTelephone: '',
    accordTuteur: false,
    accompagnateurs: [],
    confidentialite: false,
    publicationAcceptee: false,
});

const sections = computed(() => sousComites.value.find((sousComite) => sousComite.nom === formulaire.sousComite)?.sections ?? []);
const peutAjouterAccompagnateur = computed(() => activite.value && formulaire.accompagnateurs.length < activite.value.maxAccompagnateurs);

onMounted(async () => {
    [activite.value, sousComites.value] = await Promise.all([trouverActivite(route.params.id), listerSousComites()]);
});

function ajouterAccompagnateur() {
    formulaire.accompagnateurs.push({ cle: crypto.randomUUID(), nom: '', sexe: '', telephone: '' });
}

function retirerAccompagnateur(index) {
    formulaire.accompagnateurs.splice(index, 1);
}

function verifier() {
    for (const cle of Object.keys(erreurs)) {
        delete erreurs[cle];
    }

    if (formulaire.nom.trim().length < 3) {
        erreurs.nom = 'Indiquez votre nom complet (au moins 3 caractères).';
    }

    if (normaliserTelephone(formulaire.telephone) === null) {
        erreurs.telephone = 'Numéro invalide : 10 chiffres commençant par 01, 05, 07, 21, 25 ou 27.';
    }

    if (!formulaire.sexe) {
        erreurs.sexe = 'Choisissez « Homme » ou « Femme ».';
    }

    if (formulaire.ville.trim().length < 2) {
        erreurs.ville = 'Indiquez votre ville ou commune.';
    }

    if (formulaire.mineur === null) {
        erreurs.mineur = 'Indiquez si vous avez moins de 18 ans.';
    }

    if (formulaire.mineur) {
        if (formulaire.tuteurNom.trim().length < 3) {
            erreurs.tuteurNom = 'Indiquez le nom du parent ou du tuteur.';
        }

        if (normaliserTelephone(formulaire.tuteurTelephone) === null) {
            erreurs.tuteurTelephone = 'Numéro du parent ou du tuteur invalide.';
        }

        if (!formulaire.accordTuteur) {
            erreurs.accordTuteur = 'L’accord du parent ou du tuteur est obligatoire pour une personne de moins de 18 ans.';
        }
    }

    formulaire.accompagnateurs.forEach((accompagnateur, index) => {
        if (accompagnateur.nom.trim().length < 3) {
            erreurs[`accompagnateur-${index}-nom`] = `Indiquez le nom de l’accompagnateur ${index + 1}.`;
        }

        if (!accompagnateur.sexe) {
            erreurs[`accompagnateur-${index}-sexe`] = `Choisissez le sexe de l’accompagnateur ${index + 1}.`;
        }

        if (accompagnateur.telephone.trim() && normaliserTelephone(accompagnateur.telephone) === null) {
            erreurs[`accompagnateur-${index}-telephone`] = `Numéro de l’accompagnateur ${index + 1} invalide.`;
        }
    });

    if (!formulaire.confidentialite) {
        erreurs.confidentialite = 'Vous devez accepter la politique de confidentialité pour vous inscrire.';
    }

    return Object.keys(erreurs).length === 0;
}

async function envoyer() {
    erreurEnvoi.value = '';

    if (!verifier()) {
        await nextTick();
        resume.value?.focus();

        return;
    }

    envoi.value = true;

    try {
        const { jeton } = await inscrire(activite.value.id, {
            nom: formulaire.nom,
            telephone: formulaire.telephone,
            sexe: formulaire.sexe,
            ville: formulaire.ville,
            sousComite: formulaire.sousComite,
            section: formulaire.section,
            mineur: formulaire.mineur,
            tuteurNom: formulaire.tuteurNom,
            tuteurTelephone: formulaire.tuteurTelephone,
            accompagnateurs: formulaire.accompagnateurs,
            publicationAcceptee: formulaire.publicationAcceptee,
        });

        await router.push({ name: 'page-personnelle', params: { jeton }, query: { nouvelle: '1' } });
    } catch (erreur) {
        erreurEnvoi.value = erreur.message ?? 'L’inscription n’a pas pu être enregistrée. Réessayez.';
    } finally {
        envoi.value = false;
    }
}

const champ = (cle) => ({ 'aria-invalid': erreurs[cle] ? 'true' : undefined, 'aria-describedby': erreurs[cle] ? `erreur-${cle}` : undefined });
</script>

<template>
    <div class="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div v-if="activite === undefined" class="flex flex-col gap-4" aria-hidden="true">
            <div class="squelette h-8 w-2/3" />
            <div class="squelette h-64" />
        </div>

        <div v-else-if="activite === null" class="carte flex flex-col gap-3 p-8">
            <h1 class="text-2xl font-bold">Activité introuvable</h1>
            <RouterLink to="/" class="bouton-primaire self-start">Revenir à l'accueil</RouterLink>
        </div>

        <div v-else-if="activite.statut !== 'inscriptions-ouvertes' && activite.statut !== 'complet'" class="carte flex flex-col gap-3 p-8">
            <h1 class="text-2xl font-bold">Inscriptions fermées</h1>
            <p class="text-encre-douce">Les inscriptions ne sont pas ouvertes pour « {{ activite.titre }} ».</p>
            <RouterLink :to="{ name: 'activite', params: { id: activite.id } }" class="bouton-secondaire self-start">Voir l'activité</RouterLink>
        </div>

        <form v-else class="flex flex-col gap-6" novalidate @submit.prevent="envoyer">
            <header class="flex flex-col gap-2">
                <RouterLink :to="{ name: 'activite', params: { id: activite.id } }" class="inline-flex items-center gap-1 self-start text-sm font-semibold text-lien">
                    <Icone nom="chevron-gauche" class="size-4" /> {{ activite.titre }}
                </RouterLink>
                <h1 class="text-3xl font-extrabold tracking-tight">Inscription</h1>
                <p class="text-encre-douce">
                    {{ activite.titre }} · {{ activite.edition }} · <span class="first-letter:uppercase">{{ dateLongue(activite.date) }}</span>, {{ activite.heure }}, {{ activite.lieu }}
                </p>
                <div class="flex flex-wrap gap-2">
                    <BadgeStatut :statut="activite.statut" />
                    <BadgeStatut v-if="MODE_DEMONSTRATION" statut="exemple" />
                </div>
            </header>

            <Alerte v-if="MODE_DEMONSTRATION" ton="info" titre="Démonstration">N'y saisissez aucune donnée réelle : les informations restent dans cet onglet et disparaissent à sa fermeture.</Alerte>
            <Alerte v-if="activite.statut === 'complet'" ton="attention" titre="Toutes les places sont prises">Votre inscription sera enregistrée en attente de validation par l'organisation.</Alerte>
            <Alerte ton="info" titre="Déjà inscrit ?">Utilisez votre lien personnel, ou contactez l'organisation.</Alerte>

            <div v-if="Object.keys(erreurs).length" ref="resume" tabindex="-1" class="rounded-xl border border-danger/40 bg-danger-fond p-4 text-danger" role="alert">
                <p class="font-bold">Quelques informations sont à corriger :</p>
                <ul class="mt-1 list-disc pl-5 text-sm">
                    <li v-for="(message, cle) in erreurs" :key="cle">{{ message }}</li>
                </ul>
            </div>

            <fieldset class="bloc carte">
                <legend class="titre-bloc"><span class="numero">1</span> Vous</legend>
                <div class="grid gap-5 sm:grid-cols-2">
                    <div class="flex flex-col gap-1.5 sm:col-span-2">
                        <label for="nom" class="etiquette">Nom complet</label>
                        <input id="nom" v-model="formulaire.nom" class="champ-saisie" autocomplete="name" maxlength="150" v-bind="champ('nom')">
                        <p v-if="erreurs.nom" id="erreur-nom" class="message-erreur">{{ erreurs.nom }}</p>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label for="telephone" class="etiquette">Numéro de téléphone</label>
                        <input id="telephone" v-model="formulaire.telephone" class="champ-saisie" type="tel" inputmode="tel" autocomplete="tel" placeholder="07 07 07 07 07" v-bind="champ('telephone')">
                        <p v-if="erreurs.telephone" id="erreur-telephone" class="message-erreur">{{ erreurs.telephone }}</p>
                        <p v-else class="text-xs text-encre-douce">Il peut aussi servir pour WhatsApp.</p>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label for="ville" class="etiquette">Ville ou commune</label>
                        <input id="ville" v-model="formulaire.ville" class="champ-saisie" autocomplete="address-level2" maxlength="100" v-bind="champ('ville')">
                        <p v-if="erreurs.ville" id="erreur-ville" class="message-erreur">{{ erreurs.ville }}</p>
                    </div>
                    <fieldset class="flex flex-col gap-1.5 sm:col-span-2" v-bind="champ('sexe')">
                        <legend class="etiquette mb-1.5">Sexe</legend>
                        <div class="grid grid-cols-2 gap-3">
                            <label v-for="option in [{ valeur: 'homme', libelle: 'Homme' }, { valeur: 'femme', libelle: 'Femme' }]" :key="option.valeur" class="choix" :class="{ 'choix--actif': formulaire.sexe === option.valeur }">
                                <input v-model="formulaire.sexe" type="radio" name="sexe" :value="option.valeur" class="sr-only"> {{ option.libelle }}
                            </label>
                        </div>
                        <p v-if="erreurs.sexe" id="erreur-sexe" class="message-erreur">{{ erreurs.sexe }}</p>
                    </fieldset>
                    <div class="flex flex-col gap-1.5">
                        <label for="sous-comite" class="etiquette">Sous-Comité <span class="facultatif">(facultatif)</span></label>
                        <select id="sous-comite" v-model="formulaire.sousComite" class="champ-saisie" @change="formulaire.section = ''">
                            <option value="">Aucun ou je ne sais pas</option>
                            <option v-for="sousComite in sousComites" :key="sousComite.nom" :value="sousComite.nom">{{ sousComite.nom }}</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label for="section" class="etiquette">Section <span class="facultatif">(facultatif)</span></label>
                        <select id="section" v-model="formulaire.section" class="champ-saisie" :disabled="!formulaire.sousComite">
                            <option value="">{{ formulaire.sousComite ? 'Aucune ou je ne sais pas' : 'D’abord le Sous-Comité' }}</option>
                            <option v-for="section in sections" :key="section" :value="section">{{ section }}</option>
                        </select>
                    </div>
                </div>
            </fieldset>

            <fieldset class="bloc carte">
                <legend class="titre-bloc"><span class="numero">2</span> Âge</legend>
                <fieldset class="flex flex-col gap-1.5" v-bind="champ('mineur')">
                    <legend class="etiquette mb-1.5">Avez-vous moins de 18 ans ?</legend>
                    <div class="grid grid-cols-2 gap-3">
                        <label class="choix" :class="{ 'choix--actif': formulaire.mineur === false }"><input v-model="formulaire.mineur" type="radio" name="mineur" :value="false" class="sr-only"> Non</label>
                        <label class="choix" :class="{ 'choix--actif': formulaire.mineur === true }"><input v-model="formulaire.mineur" type="radio" name="mineur" :value="true" class="sr-only"> Oui</label>
                    </div>
                    <p v-if="erreurs.mineur" id="erreur-mineur" class="message-erreur">{{ erreurs.mineur }}</p>
                </fieldset>
                <Transition name="deplier">
                    <div v-if="formulaire.mineur" class="mt-5 grid gap-5 rounded-xl border border-attention/30 bg-attention-fond/60 p-4 sm:grid-cols-2">
                        <p class="text-sm sm:col-span-2">Pour une personne de moins de 18 ans, l'accord d'un parent ou d'un tuteur est obligatoire.</p>
                        <div class="flex flex-col gap-1.5">
                            <label for="tuteur-nom" class="etiquette">Nom du parent ou du tuteur</label>
                            <input id="tuteur-nom" v-model="formulaire.tuteurNom" class="champ-saisie" autocomplete="off" v-bind="champ('tuteurNom')">
                            <p v-if="erreurs.tuteurNom" id="erreur-tuteurNom" class="message-erreur">{{ erreurs.tuteurNom }}</p>
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label for="tuteur-telephone" class="etiquette">Téléphone du parent ou du tuteur</label>
                            <input id="tuteur-telephone" v-model="formulaire.tuteurTelephone" class="champ-saisie" type="tel" inputmode="tel" autocomplete="off" v-bind="champ('tuteurTelephone')">
                            <p v-if="erreurs.tuteurTelephone" id="erreur-tuteurTelephone" class="message-erreur">{{ erreurs.tuteurTelephone }}</p>
                        </div>
                        <label class="flex items-start gap-3 text-sm sm:col-span-2">
                            <input v-model="formulaire.accordTuteur" type="checkbox" class="mt-0.5 size-5 accent-vert-700" v-bind="champ('accordTuteur')">
                            <span>Mon parent ou mon tuteur est d'accord pour cette inscription.</span>
                        </label>
                    </div>
                </Transition>
            </fieldset>

            <fieldset v-if="activite.maxAccompagnateurs > 0" class="bloc carte">
                <legend class="titre-bloc"><span class="numero">3</span> Accompagnateurs <span class="facultatif">(facultatif)</span></legend>
                <p class="mb-4 text-sm text-encre-douce">Jusqu'à {{ activite.maxAccompagnateurs }} accompagnateur(s). Chacun recevra son propre QR code.</p>
                <TransitionGroup name="liste" tag="div" class="flex flex-col gap-4">
                    <div v-for="(accompagnateur, index) in formulaire.accompagnateurs" :key="accompagnateur.cle" class="grid gap-4 rounded-xl bg-surface-2 p-4 sm:grid-cols-[1fr_auto]">
                        <div class="grid gap-4 sm:grid-cols-2">
                            <div class="flex flex-col gap-1.5 sm:col-span-2">
                                <label :for="`accompagnateur-${index}-nom`" class="etiquette">Nom complet de l'accompagnateur {{ index + 1 }}</label>
                                <input :id="`accompagnateur-${index}-nom`" v-model="accompagnateur.nom" class="champ-saisie" autocomplete="off" v-bind="champ(`accompagnateur-${index}-nom`)">
                            </div>
                            <div class="flex flex-col gap-1.5">
                                <label :for="`accompagnateur-${index}-sexe`" class="etiquette">Sexe</label>
                                <select :id="`accompagnateur-${index}-sexe`" v-model="accompagnateur.sexe" class="champ-saisie" v-bind="champ(`accompagnateur-${index}-sexe`)">
                                    <option value="">Choisir…</option>
                                    <option value="homme">Homme</option>
                                    <option value="femme">Femme</option>
                                </select>
                            </div>
                            <div class="flex flex-col gap-1.5">
                                <label :for="`accompagnateur-${index}-telephone`" class="etiquette">Téléphone <span class="facultatif">(facultatif)</span></label>
                                <input :id="`accompagnateur-${index}-telephone`" v-model="accompagnateur.telephone" class="champ-saisie" type="tel" inputmode="tel" autocomplete="off" v-bind="champ(`accompagnateur-${index}-telephone`)">
                            </div>
                        </div>
                        <button type="button" class="bouton-discret self-start text-danger" @click="retirerAccompagnateur(index)">
                            <Icone nom="fermer" class="size-4" /> Retirer
                        </button>
                    </div>
                </TransitionGroup>
                <button v-if="peutAjouterAccompagnateur" type="button" class="bouton-secondaire mt-4" @click="ajouterAccompagnateur">
                    <Icone nom="plus" class="size-4" /> Ajouter un accompagnateur
                </button>
            </fieldset>

            <fieldset class="bloc carte">
                <legend class="titre-bloc"><span class="numero">{{ activite.maxAccompagnateurs > 0 ? 4 : 3 }}</span> Confidentialité</legend>
                <div class="flex flex-col gap-4">
                    <label class="flex items-start gap-3 text-sm">
                        <input v-model="formulaire.confidentialite" type="checkbox" class="mt-0.5 size-5 accent-vert-700" v-bind="champ('confidentialite')">
                        <span>J'ai lu la <RouterLink :to="{ name: 'confidentialite' }" target="_blank" class="font-semibold text-lien underline underline-offset-4">politique de confidentialité</RouterLink> et j'accepte que mes informations servent à organiser cette activité.</span>
                    </label>
                    <p v-if="erreurs.confidentialite" id="erreur-confidentialite" class="message-erreur">{{ erreurs.confidentialite }}</p>
                    <label class="flex items-start gap-3 text-sm">
                        <input v-model="formulaire.publicationAcceptee" type="checkbox" class="mt-0.5 size-5 accent-vert-700">
                        <span>J'accepte que mon nom figure sur la liste publique des participants, si l'organisation la publie. <span class="facultatif">(facultatif)</span></span>
                    </label>
                    <p class="rounded-xl bg-surface-2 p-3 text-xs text-encre-douce">Un test anti-robot gratuit sera ajouté ici quand la base de données sera branchée.</p>
                </div>
            </fieldset>

            <Alerte v-if="erreurEnvoi" ton="danger" titre="Inscription non enregistrée">{{ erreurEnvoi }}</Alerte>

            <button type="submit" class="bouton-primaire min-h-13 w-full text-base sm:w-auto sm:self-end" :disabled="envoi">
                {{ envoi ? 'Enregistrement…' : 'Envoyer mon inscription' }}
            </button>
        </form>
    </div>
</template>

<style scoped>
.bloc {
    padding: 1.5rem;
}

.titre-bloc {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    font-size: 1.125rem;
    font-weight: 700;
    float: left;
    width: 100%;
}

.titre-bloc + * {
    clear: both;
}

.numero {
    display: inline-flex;
    width: 2rem;
    height: 2rem;
    flex: none;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    font-size: 0.875rem;
    color: var(--color-vert-950);
    background: linear-gradient(135deg, var(--color-or-200), var(--color-or-500));
}

.etiquette {
    font-size: 0.875rem;
    font-weight: 600;
}

.facultatif {
    font-weight: 400;
    color: var(--c-encre-douce);
}

.message-erreur {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--c-danger);
}

.choix {
    display: flex;
    min-height: 3rem;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--c-ligne);
    border-radius: 0.75rem;
    background: var(--c-surface-2);
    font-weight: 600;
    transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}

.choix:has(:focus-visible) {
    outline: 3px solid var(--color-or-500);
    outline-offset: 2px;
}

.choix--actif {
    border-color: var(--c-accent);
    background: var(--c-surface);
    box-shadow: inset 0 0 0 1px var(--c-accent);
    color: var(--c-lien);
}

.deplier-enter-active,
.deplier-leave-active,
.liste-enter-active,
.liste-leave-active {
    transition: opacity 0.22s ease, transform 0.22s var(--ease-douce);
}

.deplier-enter-from,
.deplier-leave-to,
.liste-enter-from,
.liste-leave-to {
    opacity: 0;
    transform: translateY(-6px);
}
</style>
