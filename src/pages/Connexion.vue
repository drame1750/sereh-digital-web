<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Alerte from '../components/Alerte.vue';
import Icone from '../components/Icone.vue';
import { MODE_DEMONSTRATION } from '../services/donnees.js';
import {
    accueilDuRole,
    CODE_DEMONSTRATION,
    COMPTES_DEMONSTRATION,
    LIBELLES_ROLES,
    reprendreConnexion,
    remplacerMotDePasseProvisoire,
    seConnecter,
    seDeconnecter,
    session,
    validerCode,
} from '../services/session.js';
import { formaterTelephone } from '../telephone.js';

/**
 * Connexion aux espaces privés : numéro de téléphone et mot de passe, puis code de double
 * authentification pour un administrateur, et remplacement d'un mot de passe provisoire
 * (cahier des charges, section 10). Aucun SMS n'est envoyé.
 */
const route = useRoute();
const router = useRouter();

const telephone = ref('');
const motDePasse = ref('');
const motDePasseVisible = ref(false);
const code = ref('');
const nouveau = ref('');
const confirmation = ref('');
const erreur = ref('');
const envoi = ref(false);
const aideOuverte = ref(false);
const champEtape = ref(null);

const ESPACES = {
    administrateur: { titre: 'Espace administrateur', icone: 'securite' },
    secretaire: { titre: 'Espace secrétaire régional', icone: 'secretaires' },
    pointage: { titre: 'Pointage', icone: 'pointage' },
};
const espace = computed(() => ESPACES[route.query.espace] ?? { titre: 'Connexion', icone: 'connexion' });

async function poursuivre(action) {
    erreur.value = '';
    envoi.value = true;

    try {
        await action();

        if (session.utilisateur) {
            const retour = typeof route.query.retour === 'string' && route.query.retour.startsWith('/') ? route.query.retour : null;

            // Le rôle Communication n'a pas encore d'espace : la personne reste ici, avec un mot.
            if (session.utilisateur.role === 'communication') {
                session.message = 'Connecté. L’espace Communication (préparer les textes et l’affiche d’une activité, sans les publier) n’est pas encore construit.';

                return;
            }

            await router.replace(retour ?? accueilDuRole());
        } else {
            await nextTick();
            champEtape.value?.focus();
        }
    } catch (probleme) {
        erreur.value = probleme.message;
    } finally {
        envoi.value = false;
    }
}

const envoyerIdentifiants = () => poursuivre(async () => {
    await seConnecter(telephone.value, motDePasse.value);
    motDePasse.value = '';
});

const envoyerCode = () => poursuivre(() => validerCode(code.value.trim()));
const envoyerNouveauMotDePasse = () => poursuivre(() => remplacerMotDePasseProvisoire(nouveau.value, confirmation.value));

function recommencer() {
    reprendreConnexion();
    erreur.value = '';
    code.value = '';
    nouveau.value = '';
    confirmation.value = '';
}

onMounted(() => {
    // Une étape commencée dans une autre visite ne peut pas reprendre : on repart du numéro.
    if (!session.utilisateur) {
        reprendreConnexion();
    }
});
</script>

<template>
    <div class="mx-auto flex max-w-md flex-col gap-6 px-4 py-12 sm:px-6">
        <div class="carte flex flex-col gap-5 p-7 sm:p-8" v-apparition>
            <div class="flex flex-col items-center gap-3 text-center">
                <span class="inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-or-100 to-or-300 text-vert-900 shadow-md">
                    <Icone :nom="espace.icone" class="size-7" />
                </span>
                <h1 class="text-2xl font-extrabold">{{ espace.titre }}</h1>
            </div>

            <Alerte v-if="session.message" ton="info">{{ session.message }}</Alerte>

            <div v-if="session.utilisateur" class="flex flex-col gap-3 text-center">
                <p>Connecté : <strong>{{ session.utilisateur.nom }}</strong> ({{ LIBELLES_ROLES[session.utilisateur.role] }}).</p>
                <RouterLink v-if="session.utilisateur.role !== 'communication'" :to="accueilDuRole()" class="bouton-primaire">Ouvrir mon espace</RouterLink>
                <button v-else type="button" class="bouton-secondaire" @click="seDeconnecter('Vous êtes déconnecté.')">Se déconnecter</button>
            </div>

            <form v-else-if="!session.etape" class="flex flex-col gap-4" @submit.prevent="envoyerIdentifiants">
                <div class="flex flex-col gap-1.5">
                    <label for="telephone" class="text-sm font-semibold">Numéro de téléphone</label>
                    <input id="telephone" v-model="telephone" class="champ-saisie" type="tel" inputmode="tel" autocomplete="username" placeholder="07 07 07 07 07" required>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="mot-de-passe" class="text-sm font-semibold">Mot de passe</label>
                    <div class="relative">
                        <input id="mot-de-passe" v-model="motDePasse" class="champ-saisie pr-14" :type="motDePasseVisible ? 'text' : 'password'" autocomplete="current-password" required>
                        <button type="button" class="absolute inset-y-0 right-1 my-auto inline-flex size-11 items-center justify-center rounded-lg text-encre-douce hover:bg-surface" :aria-pressed="motDePasseVisible" @click="motDePasseVisible = !motDePasseVisible">
                            <Icone :nom="motDePasseVisible ? 'oeil-barre' : 'oeil'" class="size-5" :libelle="motDePasseVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'" />
                        </button>
                    </div>
                </div>
                <Alerte v-if="erreur" ton="danger">{{ erreur }}</Alerte>
                <button type="submit" class="bouton-primaire min-h-12 text-base" :disabled="envoi">{{ envoi ? 'Vérification…' : 'Se connecter' }}</button>
                <button type="button" class="bouton-discret" :aria-expanded="aideOuverte" @click="aideOuverte = !aideOuverte">Mot de passe oublié ?</button>
                <p v-if="aideOuverte" class="rounded-xl bg-surface-2 p-3 text-sm text-encre-douce">
                    Contactez l'administrateur. Après avoir vérifié votre identité, il vous donnera un mot de passe provisoire, valable 24 heures, à remplacer dès la connexion.
                </p>
            </form>

            <form v-else-if="session.etape === 'code'" class="flex flex-col gap-4" @submit.prevent="envoyerCode">
                <p class="text-sm text-encre-douce">Ouvrez votre application d'authentification et saisissez le code à 6 chiffres affiché pour SEREH Digital.</p>
                <div class="flex flex-col gap-1.5">
                    <label for="code" class="text-sm font-semibold">Code à 6 chiffres</label>
                    <input id="code" ref="champEtape" v-model="code" class="champ-saisie text-center font-mono text-2xl tracking-[0.4em]" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required>
                </div>
                <Alerte v-if="erreur" ton="danger">{{ erreur }}</Alerte>
                <button type="submit" class="bouton-primaire min-h-12 text-base" :disabled="envoi">{{ envoi ? 'Vérification…' : 'Valider' }}</button>
                <button type="button" class="bouton-discret" @click="recommencer">Recommencer</button>
            </form>

            <form v-else-if="session.etape === 'nouveau-mot-de-passe'" class="flex flex-col gap-4" @submit.prevent="envoyerNouveauMotDePasse">
                <Alerte ton="attention" titre="Mot de passe provisoire">Choisissez maintenant votre propre mot de passe : au moins 12 caractères, avec des lettres et des chiffres.</Alerte>
                <div class="flex flex-col gap-1.5">
                    <label for="nouveau" class="text-sm font-semibold">Nouveau mot de passe</label>
                    <input id="nouveau" ref="champEtape" v-model="nouveau" class="champ-saisie" type="password" autocomplete="new-password" minlength="12" required>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="confirmation" class="text-sm font-semibold">Confirmez le mot de passe</label>
                    <input id="confirmation" v-model="confirmation" class="champ-saisie" type="password" autocomplete="new-password" minlength="12" required>
                </div>
                <Alerte v-if="erreur" ton="danger">{{ erreur }}</Alerte>
                <button type="submit" class="bouton-primaire min-h-12 text-base" :disabled="envoi">{{ envoi ? 'Enregistrement…' : 'Enregistrer et continuer' }}</button>
                <button type="button" class="bouton-discret" @click="recommencer">Recommencer</button>
            </form>
        </div>

        <details v-if="MODE_DEMONSTRATION && !session.utilisateur" class="carte p-5 text-sm">
            <summary class="cursor-pointer font-semibold">Comptes de démonstration</summary>
            <p class="mt-3 text-encre-douce">Comptes fictifs, pour essayer les écrans. Code de double authentification : <strong class="font-mono">{{ CODE_DEMONSTRATION }}</strong>.</p>
            <ul class="mt-3 flex flex-col gap-2">
                <li v-for="compte in COMPTES_DEMONSTRATION" :key="compte.telephone" class="rounded-xl bg-surface-2 p-3">
                    <p class="font-semibold">{{ LIBELLES_ROLES[compte.role] }}</p>
                    <p class="font-mono text-xs">{{ formaterTelephone(compte.telephone) }} · {{ compte.motDePasse }}</p>
                    <p v-if="compte.motDePasseProvisoire" class="text-xs text-encre-douce">Mot de passe provisoire, à remplacer à la connexion.</p>
                </li>
            </ul>
            <p class="mt-3 text-encre-douce">Autres comptes fictifs, avec le mot de passe <strong class="font-mono">Demonstration2026</strong> : Responsable 07 00 00 00 05, Communication 07 00 00 00 06, Remplaçant d’un membre du SERAMO 07 00 00 00 07. Un agent limité à la nuit du 21 novembre (07 00 00 00 08) est refusé en dehors de sa plage horaire.</p>
        </details>
    </div>
</template>
