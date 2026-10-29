<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import Alerte from '../../components/Alerte.vue';
import ConfirmationSensible from '../../components/ConfirmationSensible.vue';
import Icone from '../../components/Icone.vue';
import MessageFlottant from '../../components/MessageFlottant.vue';
import { useAction } from '../../composables/useAction.js';
import { dateCourte, instant } from '../../donnees-exemple.js';
import {
    changerNumero,
    creerCompte,
    desactiverCompte,
    DROITS_PAR_ROLE,
    fermerSession,
    listerComptes,
    modifierDroits,
    programmerDesactivation,
    quotasDesSecretariats,
    reactiverCompte,
    reinitialiserMotDePasse,
    ROLES,
} from '../../services/comptes.js';
import { listerFichesMembres } from '../../services/courriers.js';
import { listerActivitesAdmin, MODE_DEMONSTRATION } from '../../services/donnees.js';
import { LIBELLES_ROLES } from '../../services/session.js';
import { formaterTelephone } from '../../telephone.js';

/**
 * Comptes et utilisateurs (cahier des charges, section 6) : création par l'administrateur seul,
 * droits par rôle, désactivation immédiate ou programmée, remplaçants datés, mot de passe provisoire,
 * changement de numéro après vérification et sessions actives.
 */
const route = useRoute();
const comptes = ref(null);
const quotas = ref([]);
const membres = ref([]);
const activites = ref([]);
const filtres = reactive({ texte: '', role: '', etat: '' });
const creation = reactive({ ouverte: route.query.nouveau === '1', nom: '', telephone: '', role: 'sr', membreId: '', activiteId: '', plageDebut: '', plageFin: '', validiteDu: '', validiteAu: '' });
const motDePasseAffiche = ref(null);
const ouvert = ref('');
const panneau = ref('');
const champs = reactive({ motif: '', date: '', identiteVerifiee: false, numeroVerifie: false, numero: '', droits: {} });
const confirmationSensible = ref('');

const { enCours, confirmation, erreur, agir, erreurDe } = useAction(charger);

const ETATS = { actif: { libelle: 'Actif', classes: 'bg-ok-fond text-ok' }, inactif: { libelle: 'Inactif', classes: 'bg-danger-fond text-danger' }, 'en-attente': { libelle: 'Hors de sa période', classes: 'bg-attention-fond text-attention' } };

const comptesFiltres = computed(() => (comptes.value ?? []).filter((compte) => {
    const texte = filtres.texte.trim().toLocaleLowerCase('fr');

    return (!filtres.role || compte.role === filtres.role)
        && (!filtres.etat || compte.etat === filtres.etat)
        && (!texte || compte.nom.toLocaleLowerCase('fr').includes(texte) || compte.telephone.includes(texte.replace(/\D/g, '') || '—'));
}));

const membresParGroupe = computed(() => {
    const groupes = new Map();

    for (const membre of membres.value.filter((candidat) => candidat.actif !== false)) {
        groupes.set(membre.groupe, [...(groupes.get(membre.groupe) ?? []), membre]);
    }

    return [...groupes.entries()];
});

async function charger() {
    [comptes.value, quotas.value] = await Promise.all([listerComptes(), quotasDesSecretariats()]);
}

const besoinMembre = (role) => ['sr', 'remplacant'].includes(role);
const besoinActivite = (role) => ['pointage', 'responsable'].includes(role);

async function creer() {
    const resultat = await agir('creation', () => creerCompte({ ...creation }), () => `Compte de ${creation.nom.trim()} créé.`);

    if (resultat) {
        motDePasseAffiche.value = { nom: creation.nom.trim(), motDePasse: resultat.motDePasseProvisoire };
        Object.assign(creation, { ouverte: false, nom: '', telephone: '', role: 'sr', membreId: '', activiteId: '', plageDebut: '', plageFin: '', validiteDu: '', validiteAu: '' });
    }
}

function gerer(compte, quoi) {
    const meme = ouvert.value === compte.id && panneau.value === quoi;
    ouvert.value = meme ? '' : compte.id;
    panneau.value = meme ? '' : quoi;
    confirmationSensible.value = '';
    Object.assign(champs, {
        motif: '',
        date: compte.desactivationPrevueLe ?? '',
        identiteVerifiee: false,
        numeroVerifie: false,
        numero: '',
        droits: {
            role: compte.role,
            membreId: compte.membreId ?? '',
            activiteId: compte.activiteId ?? '',
            plageDebut: compte.plage?.debut ?? '',
            plageFin: compte.plage?.fin ?? '',
            validiteDu: compte.validite?.du ?? '',
            validiteAu: compte.validite?.au ?? '',
        },
    });
}

async function desactiver(compte) {
    if (await agir(`desactiver-${compte.id}`, () => desactiverCompte(compte.id, champs.motif), `Compte de ${compte.nom} désactivé : ses sessions sont fermées.`)) {
        panneau.value = '';
    }
}

async function programmer(compte) {
    if (await agir(`programme-${compte.id}`, () => programmerDesactivation(compte.id, champs.date), champs.date ? `Désactivation de ${compte.nom} programmée.` : 'Programmation annulée.')) {
        panneau.value = '';
    }
}

async function reinitialiser(compte) {
    const motDePasse = await agir(`mdp-${compte.id}`, () => reinitialiserMotDePasse(compte.id, champs.identiteVerifiee), `Nouveau mot de passe provisoire pour ${compte.nom}.`);

    if (motDePasse) {
        motDePasseAffiche.value = { nom: compte.nom, motDePasse };
        panneau.value = '';
    }
}

async function apresConfirmation(compte) {
    const action = confirmationSensible.value;
    confirmationSensible.value = '';

    if (action === 'droits') {
        if (await agir(`droits-${compte.id}`, () => modifierDroits(compte.id, champs.droits), `Droits de ${compte.nom} modifiés.`)) {
            panneau.value = '';
        }
    } else if (action === 'numero') {
        if (await agir(`numero-${compte.id}`, () => changerNumero(compte.id, champs.numero, champs), `Numéro de ${compte.nom} changé. Ses sessions sont fermées.`)) {
            panneau.value = '';
        }
    }
}

function rattachementLisible(compte) {
    const morceaux = [];

    if (compte.membre) {
        morceaux.push(compte.role === 'remplacant' ? `Remplace : ${compte.membre.nom} (${compte.membre.poste})` : `${compte.membre.poste} · ${compte.membre.groupe}`);
    }

    if (compte.validite) {
        morceaux.push(`Du ${dateCourte(compte.validite.du)} au ${dateCourte(compte.validite.au)}`);
    }

    if (compte.activiteId) {
        morceaux.push(`Activité : ${activites.value.find((activite) => activite.id === compte.activiteId)?.titre ?? compte.activiteId}`);
    }

    if (compte.plage) {
        morceaux.push(`Plage : ${new Date(compte.plage.debut).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })} → ${new Date(compte.plage.fin).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`);
    }

    return morceaux;
}

async function copier(texte) {
    try {
        await navigator.clipboard.writeText(texte);
        confirmation.value = 'Mot de passe copié.';
    } catch {
        confirmation.value = '';
    }
}

onMounted(async () => {
    [membres.value, activites.value] = await Promise.all([listerFichesMembres(), listerActivitesAdmin()]);
    await charger();
});
</script>

<template>
    <div class="mx-auto flex max-w-5xl flex-col gap-6">
        <header class="flex flex-wrap items-end justify-between gap-4">
            <div class="flex flex-col gap-2">
                <p class="surtitre">Bureau</p>
                <h1 class="text-3xl font-extrabold tracking-tight">Comptes et utilisateurs</h1>
            </div>
            <button type="button" class="bouton-primaire" :aria-expanded="creation.ouverte" @click="creation.ouverte = !creation.ouverte"><Icone nom="plus" class="size-4" /> Créer un compte</button>
        </header>

        <Alerte v-if="MODE_DEMONSTRATION" ton="info" titre="Démonstration">Comptes fictifs, gardés dans cet onglet. Un compte créé ici peut vraiment se connecter, avec son mot de passe provisoire. Avec Supabase, ces opérations passeront par une fonction serveur réservée aux administrateurs.</Alerte>

        <div v-if="motDePasseAffiche" class="carte flex flex-col gap-3 border-l-4 border-l-or-500 p-5">
            <p class="font-bold">Mot de passe provisoire de {{ motDePasseAffiche.nom }}</p>
            <p class="flex flex-wrap items-center gap-3"><strong class="rounded-lg bg-surface-2 px-3 py-2 font-mono text-lg tracking-wider">{{ motDePasseAffiche.motDePasse }}</strong><button type="button" class="bouton-discret" @click="copier(motDePasseAffiche.motDePasse)">Copier</button></p>
            <p class="text-sm text-encre-douce">Il ne s’affiche qu’une fois. Transmettez-le à la personne de vive voix ou en main propre, jamais dans un groupe. Elle devra le remplacer à sa première connexion.</p>
            <button type="button" class="bouton-secondaire self-start" @click="motDePasseAffiche = null">J’ai transmis le mot de passe</button>
        </div>

        <form v-if="creation.ouverte" class="carte flex flex-col gap-5 p-6" novalidate @submit.prevent="creer">
            <h2 class="text-lg font-bold">Nouveau compte</h2>
            <div class="grid gap-4 sm:grid-cols-2">
                <div class="flex flex-col gap-1.5">
                    <label for="compte-nom" class="text-sm font-semibold">Nom complet</label>
                    <input id="compte-nom" v-model="creation.nom" class="champ-saisie" autocomplete="off" :aria-invalid="erreur.erreurs.nom ? 'true' : undefined">
                    <p v-if="erreur.erreurs.nom" class="text-xs font-semibold text-danger">{{ erreur.erreurs.nom }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="compte-telephone" class="text-sm font-semibold">Numéro de téléphone</label>
                    <input id="compte-telephone" v-model="creation.telephone" class="champ-saisie" inputmode="tel" autocomplete="off" placeholder="07 00 00 00 00" :aria-invalid="erreur.erreurs.telephone ? 'true' : undefined">
                    <p v-if="erreur.erreurs.telephone" class="text-xs font-semibold text-danger">{{ erreur.erreurs.telephone }}</p>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="compte-role" class="text-sm font-semibold">Rôle</label>
                    <select id="compte-role" v-model="creation.role" class="champ-saisie">
                        <option v-for="role in ROLES" :key="role" :value="role">{{ LIBELLES_ROLES[role] }}</option>
                    </select>
                </div>
                <div v-if="besoinMembre(creation.role)" class="flex flex-col gap-1.5">
                    <label for="compte-membre" class="text-sm font-semibold">{{ creation.role === 'sr' ? 'Fiche du membre du bureau' : 'Membre remplacé' }}</label>
                    <select id="compte-membre" v-model="creation.membreId" class="champ-saisie" :aria-invalid="erreur.erreurs.membreId ? 'true' : undefined">
                        <option value="">Choisir…</option>
                        <optgroup v-for="[groupe, liste] in membresParGroupe" :key="groupe" :label="groupe">
                            <option v-for="membre in liste" :key="membre.id" :value="membre.id">{{ membre.nom }} · {{ membre.poste }}</option>
                        </optgroup>
                    </select>
                    <p v-if="erreur.erreurs.membreId" class="text-xs font-semibold text-danger">{{ erreur.erreurs.membreId }}</p>
                </div>
                <template v-if="creation.role === 'remplacant'">
                    <div class="flex flex-col gap-1.5">
                        <label for="compte-du" class="text-sm font-semibold">Remplacement du</label>
                        <input id="compte-du" v-model="creation.validiteDu" type="date" class="champ-saisie">
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label for="compte-au" class="text-sm font-semibold">au (inclus)</label>
                        <input id="compte-au" v-model="creation.validiteAu" type="date" class="champ-saisie">
                        <p v-if="erreur.erreurs.validite" class="text-xs font-semibold text-danger">{{ erreur.erreurs.validite }}</p>
                    </div>
                </template>
                <div v-if="besoinActivite(creation.role)" class="flex flex-col gap-1.5">
                    <label for="compte-activite" class="text-sm font-semibold">Activité attribuée</label>
                    <select id="compte-activite" v-model="creation.activiteId" class="champ-saisie">
                        <option value="">Toutes les activités</option>
                        <option v-for="activite in activites" :key="activite.id" :value="activite.id">{{ activite.titre }}{{ activite.edition ? ` · ${activite.edition}` : '' }}</option>
                    </select>
                </div>
                <template v-if="creation.role === 'pointage'">
                    <div class="flex flex-col gap-1.5">
                        <label for="compte-plage-debut" class="text-sm font-semibold">Plage horaire : début <span class="font-normal text-encre-douce">(facultatif)</span></label>
                        <input id="compte-plage-debut" v-model="creation.plageDebut" type="datetime-local" class="champ-saisie">
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label for="compte-plage-fin" class="text-sm font-semibold">Plage horaire : fin</label>
                        <input id="compte-plage-fin" v-model="creation.plageFin" type="datetime-local" class="champ-saisie">
                        <p v-if="erreur.erreurs.plage" class="text-xs font-semibold text-danger">{{ erreur.erreurs.plage }}</p>
                    </div>
                </template>
            </div>
            <p v-if="creation.role === 'admin'" class="text-sm text-encre-douce">Un administrateur doit activer la double authentification par application à sa première connexion.</p>
            <p v-if="erreurDe('creation')" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe('creation') }}</p>
            <div class="flex flex-wrap justify-end gap-3">
                <button type="button" class="bouton-discret" @click="creation.ouverte = false">Annuler</button>
                <button type="submit" class="bouton-primaire" :disabled="enCours === 'creation'">{{ enCours === 'creation' ? 'Création…' : 'Créer le compte' }}</button>
            </div>
        </form>

        <section class="flex flex-col gap-3" aria-labelledby="titre-quotas">
            <h2 id="titre-quotas" class="text-sm font-bold text-encre-douce">Comptes par secrétariat <span class="font-normal">(nombre autorisé réglé dans les Paramètres)</span></h2>
            <div class="flex flex-wrap gap-2">
                <span v-for="quota in quotas" :key="quota.sigle" class="rounded-xl px-3 py-2 text-sm font-semibold" :class="quota.utilises >= quota.comptesAutorises ? 'bg-attention-fond text-attention' : 'bg-surface-2'">
                    {{ quota.sigle }} : {{ quota.utilises }}/{{ quota.comptesAutorises }}
                </span>
            </div>
        </section>

        <div class="flex flex-wrap gap-3">
            <label class="relative min-w-56 flex-1">
                <span class="sr-only">Rechercher un compte</span>
                <Icone nom="recherche" class="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-encre-douce" />
                <input v-model="filtres.texte" type="search" class="champ-saisie pl-11" placeholder="Nom ou numéro">
            </label>
            <label class="sr-only" for="filtre-role">Rôle</label>
            <select id="filtre-role" v-model="filtres.role" class="champ-saisie w-auto">
                <option value="">Tous les rôles</option>
                <option v-for="role in ROLES" :key="role" :value="role">{{ LIBELLES_ROLES[role] }}</option>
            </select>
            <label class="sr-only" for="filtre-etat">État</label>
            <select id="filtre-etat" v-model="filtres.etat" class="champ-saisie w-auto">
                <option value="">Tous les états</option>
                <option v-for="(etat, cle) in ETATS" :key="cle" :value="cle">{{ etat.libelle }}</option>
            </select>
        </div>

        <div v-if="!comptes" class="flex flex-col gap-3" aria-hidden="true">
            <div v-for="index in 4" :key="index" class="squelette h-24" />
        </div>

        <article v-for="compte in comptesFiltres" :key="compte.id" class="carte flex flex-col gap-4 p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="flex min-w-0 flex-col gap-1">
                    <div class="flex flex-wrap items-center gap-2">
                        <h2 class="font-bold">{{ compte.nom }}</h2>
                        <span class="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold">{{ LIBELLES_ROLES[compte.role] }}</span>
                        <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="ETATS[compte.etat].classes">{{ ETATS[compte.etat].libelle }}</span>
                        <span v-if="compte.estMoi" class="rounded-full bg-info-fond px-2.5 py-1 text-xs font-semibold text-info">Vous</span>
                    </div>
                    <p class="font-mono text-sm text-encre-douce">{{ formaterTelephone(compte.telephone) }}</p>
                    <p v-for="ligne in rattachementLisible(compte)" :key="ligne" class="text-sm text-encre-douce">{{ ligne }}</p>
                    <p v-if="compte.blocage" class="text-sm font-semibold text-attention">{{ compte.blocage }}{{ compte.motifDesactivation ? ` Motif : ${compte.motifDesactivation}.` : '' }}</p>
                    <p v-if="compte.desactivationPrevueLe && compte.actif" class="text-sm font-semibold text-attention">Désactivation programmée le {{ dateCourte(compte.desactivationPrevueLe) }}.</p>
                    <p class="text-xs text-encre-douce">
                        {{ compte.doubleAuthentification ? 'Double authentification activée' : 'Sans double authentification' }}
                        · {{ compte.motDePasseProvisoire ? 'mot de passe provisoire à remplacer' : 'mot de passe personnel' }}
                        · {{ compte.sessions.length }} appareil{{ compte.sessions.length > 1 ? 's' : '' }} connecté{{ compte.sessions.length > 1 ? 's' : '' }}
                    </p>
                </div>
            </div>

            <div class="flex flex-wrap gap-2">
                <button type="button" class="bouton-discret" :aria-expanded="ouvert === compte.id && panneau === 'droits'" @click="gerer(compte, 'droits')"><Icone nom="securite" class="size-4" /> Droits</button>
                <button v-if="compte.actif && !compte.estMoi" type="button" class="bouton-discret" :aria-expanded="ouvert === compte.id && panneau === 'desactiver'" @click="gerer(compte, 'desactiver')"><Icone nom="cadenas" class="size-4" /> Désactiver</button>
                <button v-if="!compte.actif" type="button" class="bouton-discret" :disabled="enCours === `reactiver-${compte.id}`" @click="agir(`reactiver-${compte.id}`, () => reactiverCompte(compte.id), `Compte de ${compte.nom} réactivé.`)"><Icone nom="coche" class="size-4" /> Réactiver</button>
                <button v-if="!compte.estMoi" type="button" class="bouton-discret" :aria-expanded="ouvert === compte.id && panneau === 'mot-de-passe'" @click="gerer(compte, 'mot-de-passe')"><Icone nom="crayon" class="size-4" /> Mot de passe</button>
                <button type="button" class="bouton-discret" :aria-expanded="ouvert === compte.id && panneau === 'numero'" @click="gerer(compte, 'numero')"><Icone nom="connexion" class="size-4" /> Numéro</button>
                <button type="button" class="bouton-discret" :aria-expanded="ouvert === compte.id && panneau === 'sessions'" @click="gerer(compte, 'sessions')"><Icone nom="deconnexion" class="size-4" /> Sessions ({{ compte.sessions.length }})</button>
            </div>
            <p v-if="erreurDe(`reactiver-${compte.id}`)" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe(`reactiver-${compte.id}`) }}</p>

            <div v-if="ouvert === compte.id && panneau === 'droits'" class="flex flex-col gap-4 border-t border-ligne pt-4">
                <div class="grid gap-4 sm:grid-cols-2">
                    <label class="flex flex-col gap-1.5 text-sm font-semibold">Rôle
                        <select v-model="champs.droits.role" class="champ-saisie font-normal">
                            <option v-for="role in ROLES" :key="role" :value="role">{{ LIBELLES_ROLES[role] }}</option>
                        </select>
                    </label>
                    <label v-if="besoinMembre(champs.droits.role)" class="flex flex-col gap-1.5 text-sm font-semibold">{{ champs.droits.role === 'sr' ? 'Fiche du membre' : 'Membre remplacé' }}
                        <select v-model="champs.droits.membreId" class="champ-saisie font-normal">
                            <option value="">Choisir…</option>
                            <optgroup v-for="[groupe, liste] in membresParGroupe" :key="groupe" :label="groupe">
                                <option v-for="membre in liste" :key="membre.id" :value="membre.id">{{ membre.nom }} · {{ membre.poste }}</option>
                            </optgroup>
                        </select>
                    </label>
                    <template v-if="champs.droits.role === 'remplacant'">
                        <label class="flex flex-col gap-1.5 text-sm font-semibold">Du<input v-model="champs.droits.validiteDu" type="date" class="champ-saisie font-normal"></label>
                        <label class="flex flex-col gap-1.5 text-sm font-semibold">Au (inclus)<input v-model="champs.droits.validiteAu" type="date" class="champ-saisie font-normal"></label>
                    </template>
                    <label v-if="besoinActivite(champs.droits.role)" class="flex flex-col gap-1.5 text-sm font-semibold">Activité attribuée
                        <select v-model="champs.droits.activiteId" class="champ-saisie font-normal">
                            <option value="">Toutes les activités</option>
                            <option v-for="activite in activites" :key="activite.id" :value="activite.id">{{ activite.titre }}</option>
                        </select>
                    </label>
                    <template v-if="champs.droits.role === 'pointage'">
                        <label class="flex flex-col gap-1.5 text-sm font-semibold">Plage : début<input v-model="champs.droits.plageDebut" type="datetime-local" class="champ-saisie font-normal"></label>
                        <label class="flex flex-col gap-1.5 text-sm font-semibold">Plage : fin<input v-model="champs.droits.plageFin" type="datetime-local" class="champ-saisie font-normal"></label>
                    </template>
                </div>
                <p v-if="erreurDe(`droits-${compte.id}`)" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe(`droits-${compte.id}`) }} {{ Object.values(erreur.erreurs).join(' ') }}</p>
                <ConfirmationSensible v-if="confirmationSensible === 'droits'" titre="Modification des droits" libelle-bouton="Modifier les droits" ton="attention" @confirmer="apresConfirmation(compte)" @annuler="confirmationSensible = ''">
                    {{ compte.nom }} deviendra « {{ LIBELLES_ROLES[champs.droits.role] }} ». Le changement sera noté au journal d’audit.
                </ConfirmationSensible>
                <button v-else type="button" class="bouton-primaire self-start" :disabled="enCours === `droits-${compte.id}`" @click="confirmationSensible = 'droits'">Enregistrer les droits</button>
            </div>

            <div v-if="ouvert === compte.id && panneau === 'desactiver'" class="grid gap-4 border-t border-ligne pt-4 md:grid-cols-2">
                <form class="flex flex-col gap-2" novalidate @submit.prevent="desactiver(compte)">
                    <label :for="`motif-${compte.id}`" class="text-sm font-semibold">Désactiver tout de suite : motif</label>
                    <input :id="`motif-${compte.id}`" v-model="champs.motif" class="champ-saisie" placeholder="Fin de fonction, perte du téléphone…">
                    <p v-if="erreurDe(`desactiver-${compte.id}`)" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe(`desactiver-${compte.id}`) }}</p>
                    <button type="submit" class="bouton-danger self-start" :disabled="enCours === `desactiver-${compte.id}`">Désactiver maintenant</button>
                </form>
                <form class="flex flex-col gap-2" novalidate @submit.prevent="programmer(compte)">
                    <label :for="`date-${compte.id}`" class="text-sm font-semibold">Ou programmer la désactivation</label>
                    <input :id="`date-${compte.id}`" v-model="champs.date" type="date" class="champ-saisie">
                    <p class="text-xs text-encre-douce">Laissez vide pour annuler une programmation.</p>
                    <p v-if="erreurDe(`programme-${compte.id}`)" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe(`programme-${compte.id}`) }}</p>
                    <button type="submit" class="bouton-secondaire self-start" :disabled="enCours === `programme-${compte.id}`">Enregistrer la date</button>
                </form>
            </div>

            <form v-if="ouvert === compte.id && panneau === 'mot-de-passe'" class="flex flex-col gap-3 border-t border-ligne pt-4" novalidate @submit.prevent="reinitialiser(compte)">
                <p class="text-sm">Sans SMS ni e-mail, le mot de passe oublié passe par vous : appelez la personne au numéro de son compte, vérifiez son identité, puis créez un mot de passe provisoire.</p>
                <label class="flex items-start gap-2 text-sm"><input v-model="champs.identiteVerifiee" type="checkbox" class="mt-1 size-4 accent-[var(--c-accent)]"> J’ai vérifié l’identité de la personne par téléphone.</label>
                <p v-if="erreurDe(`mdp-${compte.id}`)" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe(`mdp-${compte.id}`) }}</p>
                <button type="submit" class="bouton-primaire self-start" :disabled="enCours === `mdp-${compte.id}`">Créer un mot de passe provisoire</button>
            </form>

            <div v-if="ouvert === compte.id && panneau === 'numero'" class="flex flex-col gap-3 border-t border-ligne pt-4">
                <label :for="`numero-${compte.id}`" class="text-sm font-semibold">Nouveau numéro</label>
                <input :id="`numero-${compte.id}`" v-model="champs.numero" class="champ-saisie max-w-xs" inputmode="tel" placeholder="07 00 00 00 00">
                <label class="flex items-start gap-2 text-sm"><input v-model="champs.identiteVerifiee" type="checkbox" class="mt-1 size-4 accent-[var(--c-accent)]"> J’ai vérifié l’identité de la personne.</label>
                <label class="flex items-start gap-2 text-sm"><input v-model="champs.numeroVerifie" type="checkbox" class="mt-1 size-4 accent-[var(--c-accent)]"> J’ai appelé le nouveau numéro : il est bien le sien.</label>
                <p v-if="erreurDe(`numero-${compte.id}`)" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe(`numero-${compte.id}`) }}</p>
                <ConfirmationSensible v-if="confirmationSensible === 'numero'" titre="Changement de numéro" libelle-bouton="Changer le numéro" ton="attention" @confirmer="apresConfirmation(compte)" @annuler="confirmationSensible = ''">
                    Le compte de {{ compte.nom }} se connectera désormais avec le nouveau numéro. Ses sessions seront fermées.
                </ConfirmationSensible>
                <button v-else type="button" class="bouton-primaire self-start" @click="confirmationSensible = 'numero'">Changer le numéro</button>
            </div>

            <div v-if="ouvert === compte.id && panneau === 'sessions'" class="flex flex-col gap-2 border-t border-ligne pt-4">
                <p v-if="compte.sessions.length === 0" class="text-sm text-encre-douce">Aucun appareil connecté.</p>
                <div v-for="ouverte in compte.sessions" :key="ouverte.id" class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 p-3">
                    <span class="text-sm"><span class="block font-semibold">{{ ouverte.appareil }}</span><span class="block text-xs text-encre-douce">Connecté le {{ instant(ouverte.ouverteLe) }}</span></span>
                    <button type="button" class="bouton-discret" :disabled="enCours === `session-${ouverte.id}`" @click="agir(`session-${ouverte.id}`, () => fermerSession(compte.id, ouverte.id), 'Session fermée : l’appareil devra se reconnecter.')"><Icone nom="deconnexion" class="size-4" /> Déconnecter</button>
                </div>
            </div>
        </article>

        <p v-if="comptes && comptesFiltres.length === 0" class="carte p-5 text-encre-douce">Aucun compte ne correspond.</p>

        <section class="carte flex flex-col gap-3 p-6" aria-labelledby="titre-droits">
            <h2 id="titre-droits" class="text-lg font-bold">Droits par rôle</h2>
            <p class="text-sm text-encre-douce">Le menu s’adapte au rôle, mais c’est le serveur qui refusera toute action non autorisée.</p>
            <dl class="flex flex-col gap-2">
                <div v-for="ligne in DROITS_PAR_ROLE" :key="ligne.role" class="grid gap-1 rounded-xl bg-surface-2 p-3 sm:grid-cols-[12rem_1fr]">
                    <dt class="text-sm font-bold">{{ LIBELLES_ROLES[ligne.role] }}</dt>
                    <dd class="text-sm text-encre-douce">{{ ligne.droits }}</dd>
                </div>
            </dl>
        </section>

        <MessageFlottant :texte="confirmation" @fermer="confirmation = ''" />
    </div>
</template>
