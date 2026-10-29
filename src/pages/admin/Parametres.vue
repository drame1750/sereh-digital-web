<script setup>
import { reactive } from 'vue';
import Alerte from '../../components/Alerte.vue';
import Icone from '../../components/Icone.vue';
import MessageFlottant from '../../components/MessageFlottant.vue';
import { useAction } from '../../composables/useAction.js';
import { instant } from '../../donnees-exemple.js';
import { MODE_DEMONSTRATION } from '../../services/donnees.js';
import { DUREES_CONSERVATION, enregistrerParametres, parametres } from '../../services/parametres.js';

/**
 * Paramètres de la plateforme : identité, coordonnées officielles, courriers, organisation du bureau,
 * rappels et durées de conservation. Chaque partie s'enregistre à part et rejoint le journal d'audit.
 */
/** Copie simple des paramètres partagés, pour que le formulaire ne les modifie pas avant l'enregistrement. */
const copier = (valeur) => JSON.parse(JSON.stringify(valeur));

const copie = () => copier({
    identite: parametres.identite,
    contacts: parametres.contacts,
    courrier: parametres.courrier,
    secretariats: parametres.secretariats,
    sousComites: parametres.sousComites.map((sousComite) => ({ nom: sousComite.nom, sections: sousComite.sections.join('\n') })),
    rappels: parametres.rappels,
});

const formulaires = reactive(copie());
const { enCours, confirmation, erreur, agir, erreurDe } = useAction();

const CHAMPS_COURRIER = [
    { cle: 'lieu', libelle: 'Lieu (« Katiola, le … »)' },
    { cle: 'organeEmetteur', libelle: 'Organe émetteur, sous l’en-tête' },
    { cle: 'pour', libelle: 'Formule au-dessus de la signature' },
    { cle: 'titreSignataire', libelle: 'Titre du signataire' },
    { cle: 'nomSignataire', libelle: 'Nom du signataire' },
    { cle: 'siege', libelle: 'Siège, au pied de page' },
    { cle: 'contacts', libelle: 'Contacts, au pied de page' },
    { cle: 'devise', libelle: 'Devise, au pied de page' },
    { cle: 'prefixeReference', libelle: 'Début de la référence' },
    { cle: 'suffixeReference', libelle: 'Fin de la référence' },
];

const CHAMPS_CONTACTS = [
    { cle: 'telephone', libelle: 'Téléphone', type: 'tel' },
    { cle: 'whatsapp', libelle: 'WhatsApp', type: 'tel' },
    { cle: 'email', libelle: 'E-mail', type: 'email' },
    { cle: 'adresse', libelle: 'Adresse ou siège', type: 'text' },
    { cle: 'horaires', libelle: 'Horaires ou permanence', type: 'text' },
];

function enregistrer(partie) {
    const valeurs = partie === 'sousComites'
        ? formulaires.sousComites.map((sousComite) => ({ nom: sousComite.nom, sections: sousComite.sections }))
        : formulaires[partie];

    return agir(partie, () => enregistrerParametres(partie, copier(valeurs)), 'Paramètres enregistrés : ils s’appliquent tout de suite à tout le site.');
}

const erreurChamp = (partie, champ) => (erreur.value.cle === partie ? erreur.value.erreurs[champ] : '');
</script>

<template>
    <div class="mx-auto flex max-w-4xl flex-col gap-6">
        <header class="flex flex-col gap-2">
            <p class="surtitre">Système</p>
            <h1 class="text-3xl font-extrabold tracking-tight">Paramètres</h1>
            <p v-if="parametres.modifieLe" class="text-sm text-encre-douce">Dernière modification le {{ instant(parametres.modifieLe) }} par {{ parametres.modifiePar }}.</p>
        </header>

        <Alerte v-if="MODE_DEMONSTRATION" ton="info" titre="Démonstration">Les valeurs ci-dessous sont des exemples à remplacer par les informations officielles. Elles restent dans cet onglet.</Alerte>

        <form class="carte flex flex-col gap-4 p-6" novalidate @submit.prevent="enregistrer('identite')">
            <h2 class="flex items-center gap-2 text-lg font-bold"><Icone nom="accueil" class="size-5 text-or-600" /> Identité de la plateforme</h2>
            <p class="text-sm text-encre-douce">Réservée à l’administrateur principal. Le logo officiel et les couleurs se changeront ici quand le logo en bonne qualité sera fourni.</p>
            <div class="grid gap-4 sm:grid-cols-2">
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Nom<input v-model="formulaires.identite.nom" class="champ-saisie font-normal" maxlength="60"></label>
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Slogan<input v-model="formulaires.identite.slogan" class="champ-saisie font-normal" maxlength="120"></label>
            </div>
            <p v-if="erreurChamp('identite', 'nom')" class="text-xs font-semibold text-danger">{{ erreurChamp('identite', 'nom') }}</p>
            <p v-if="erreurDe('identite')" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe('identite') }}</p>
            <button type="submit" class="bouton-primaire self-start" :disabled="enCours === 'identite'">Enregistrer l’identité</button>
        </form>

        <form class="carte flex flex-col gap-4 p-6" novalidate @submit.prevent="enregistrer('contacts')">
            <h2 class="flex items-center gap-2 text-lg font-bold"><Icone nom="lieu" class="size-5 text-or-600" /> Coordonnées officielles</h2>
            <p class="text-sm text-encre-douce">Affichées au pied de chaque page publique et dans la politique de confidentialité. Laissez vide ce qui n’existe pas encore.</p>
            <div class="grid gap-4 sm:grid-cols-2">
                <label v-for="champ in CHAMPS_CONTACTS" :key="champ.cle" class="flex flex-col gap-1.5 text-sm font-semibold">{{ champ.libelle }}
                    <input v-model="formulaires.contacts[champ.cle]" :type="champ.type" class="champ-saisie font-normal" :inputmode="champ.type === 'tel' ? 'tel' : undefined">
                    <span v-if="erreurChamp('contacts', champ.cle)" class="text-xs text-danger">{{ erreurChamp('contacts', champ.cle) }}</span>
                </label>
            </div>
            <p v-if="erreurDe('contacts')" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe('contacts') }}</p>
            <button type="submit" class="bouton-primaire self-start" :disabled="enCours === 'contacts'">Enregistrer les coordonnées</button>
        </form>

        <form class="carte flex flex-col gap-4 p-6" novalidate @submit.prevent="enregistrer('courrier')">
            <h2 class="flex items-center gap-2 text-lg font-bold"><Icone nom="courrier" class="size-5 text-or-600" /> Courriers officiels</h2>
            <p class="text-sm text-encre-douce">En-tête, signature et pied de page des courriers créés sur la plateforme. Le sens de chaque partie de la référence reste à confirmer.</p>
            <div class="grid gap-4 sm:grid-cols-2">
                <label v-for="champ in CHAMPS_COURRIER" :key="champ.cle" class="flex flex-col gap-1.5 text-sm font-semibold">{{ champ.libelle }}
                    <input v-model="formulaires.courrier[champ.cle]" class="champ-saisie font-normal">
                    <span v-if="erreurChamp('courrier', champ.cle)" class="text-xs text-danger">{{ erreurChamp('courrier', champ.cle) }}</span>
                </label>
            </div>
            <p class="text-sm text-encre-douce">Exemple de référence : <strong class="font-mono">{{ formulaires.courrier.prefixeReference }}/26-001/{{ formulaires.courrier.suffixeReference }}</strong></p>
            <p v-if="erreurDe('courrier')" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe('courrier') }}</p>
            <button type="submit" class="bouton-primaire self-start" :disabled="enCours === 'courrier'">Enregistrer les courriers</button>
        </form>

        <form class="carte flex flex-col gap-4 p-6" novalidate @submit.prevent="enregistrer('secretariats')">
            <h2 class="flex items-center gap-2 text-lg font-bold"><Icone nom="secretaires" class="size-5 text-or-600" /> Secrétariats</h2>
            <p class="text-sm text-encre-douce">Nom complet de chaque secrétariat et nombre de comptes autorisés pour ses membres.</p>
            <div class="flex flex-col gap-3">
                <div v-for="(secretariat, index) in formulaires.secretariats" :key="secretariat.sigle" class="grid items-end gap-3 rounded-xl bg-surface-2 p-3 sm:grid-cols-[6rem_1fr_9rem]">
                    <p class="font-bold">{{ secretariat.sigle }}</p>
                    <label class="flex flex-col gap-1.5 text-sm font-semibold">Nom complet<input v-model="secretariat.nom" class="champ-saisie font-normal" placeholder="À compléter"></label>
                    <label class="flex flex-col gap-1.5 text-sm font-semibold">Comptes autorisés<input v-model.number="secretariat.comptesAutorises" type="number" min="0" max="20" class="champ-saisie font-normal">
                        <span v-if="erreurChamp('secretariats', `comptes-${index}`)" class="text-xs text-danger">{{ erreurChamp('secretariats', `comptes-${index}`) }}</span>
                    </label>
                </div>
            </div>
            <p v-if="erreurDe('secretariats')" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe('secretariats') }}</p>
            <button type="submit" class="bouton-primaire self-start" :disabled="enCours === 'secretariats'">Enregistrer les secrétariats</button>
        </form>

        <form class="carte flex flex-col gap-4 p-6" novalidate @submit.prevent="enregistrer('sousComites')">
            <h2 class="flex items-center gap-2 text-lg font-bold"><Icone nom="participants" class="size-5 text-or-600" /> Sous-Comités et Sections</h2>
            <p class="text-sm text-encre-douce">La liste proposée dans le formulaire d’inscription : le Sous-Comité, puis la Section. Une Section par ligne.</p>
            <div class="grid gap-3 md:grid-cols-2">
                <div v-for="(sousComite, index) in formulaires.sousComites" :key="index" class="flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
                    <div class="flex items-end gap-2">
                        <label class="flex flex-1 flex-col gap-1.5 text-sm font-semibold">Sous-Comité<input v-model="sousComite.nom" class="champ-saisie font-normal"></label>
                        <button type="button" class="bouton-discret" @click="formulaires.sousComites.splice(index, 1)"><Icone nom="fermer" class="size-4" libelle="Retirer ce Sous-Comité" /></button>
                    </div>
                    <span v-if="erreurChamp('sousComites', `nom-${index}`)" class="text-xs text-danger">{{ erreurChamp('sousComites', `nom-${index}`) }}</span>
                    <label class="flex flex-col gap-1.5 text-sm font-semibold">Sections<textarea v-model="sousComite.sections" class="champ-saisie min-h-24 font-normal" /></label>
                </div>
            </div>
            <div class="flex flex-wrap gap-3">
                <button type="button" class="bouton-secondaire" @click="formulaires.sousComites.push({ nom: '', sections: '' })"><Icone nom="plus" class="size-4" /> Ajouter un Sous-Comité</button>
                <button type="submit" class="bouton-primaire" :disabled="enCours === 'sousComites'">Enregistrer la liste</button>
            </div>
            <p v-if="erreurDe('sousComites')" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe('sousComites') }}</p>
        </form>

        <form class="carte flex flex-col gap-4 p-6" novalidate @submit.prevent="enregistrer('rappels')">
            <h2 class="flex items-center gap-2 text-lg font-bold"><Icone nom="notifications" class="size-5 text-or-600" /> Rappels</h2>
            <p class="text-sm text-encre-douce">Avant chaque date limite de réponse et chaque fermeture prévue des inscriptions, dans le centre de notifications.</p>
            <div class="flex flex-wrap gap-4">
                <label v-for="nombre in [7, 3, 1]" :key="nombre" class="flex items-center gap-2 text-sm font-semibold"><input v-model="formulaires.rappels[`j${nombre}`]" type="checkbox" class="size-4 accent-[var(--c-accent)]"> J-{{ nombre }}</label>
            </div>
            <button type="submit" class="bouton-primaire self-start" :disabled="enCours === 'rappels'">Enregistrer les rappels</button>
        </form>

        <section class="carte flex flex-col gap-3 p-6" aria-labelledby="titre-conservation">
            <h2 id="titre-conservation" class="flex items-center gap-2 text-lg font-bold"><Icone nom="archives" class="size-5 text-or-600" /> Durées de conservation</h2>
            <p class="text-sm text-encre-douce">Validées dans la définition fonctionnelle, à confirmer avec l’ARTCI. Elles ne se modifient pas ici.</p>
            <dl class="flex flex-col gap-2">
                <div v-for="ligne in DUREES_CONSERVATION" :key="ligne.donnee" class="flex flex-wrap justify-between gap-2 rounded-xl bg-surface-2 p-3 text-sm">
                    <dt class="font-semibold">{{ ligne.donnee }}</dt>
                    <dd class="text-encre-douce">{{ ligne.duree }}</dd>
                </div>
            </dl>
        </section>

        <MessageFlottant :texte="confirmation" @fermer="confirmation = ''" />
    </div>
</template>
