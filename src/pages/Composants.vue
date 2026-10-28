<script setup>
import { ref } from 'vue';
import Alerte from '../components/Alerte.vue';
import BadgeStatut from '../components/BadgeStatut.vue';
import CarteActivite from '../components/CarteActivite.vue';
import CompteurAnime from '../components/CompteurAnime.vue';
import Icone from '../components/Icone.vue';
import RetourPointage from '../components/RetourPointage.vue';
import { activitesExemple } from '../donnees-exemple.js';

/**
 * Vitrine des composants du module 2 : chaque brique de l'interface, dans tous ses états, pour
 * valider la charte avant de construire les vraies pages.
 */
const chargement = ref(true);
const retour = ref({ accepte: true, cle: 0 });
const telephone = ref('');
const erreurTelephone = ref(false);

function rejouerRetour(accepte) {
    retour.value = { accepte, cle: retour.value.cle + 1 };
}

const STATUTS_ACTIVITE = ['inscriptions-ouvertes', 'inscriptions-fermees', 'complet', 'terminee'];
const STATUTS_COURRIER = ['non-consulte', 'consulte', 'brouillon', 'presence-confirmee', 'absence-declaree', 'reponse-tardive'];
</script>

<template>
    <div class="mx-auto flex max-w-6xl flex-col gap-14 px-4 py-12 sm:px-6">
        <header class="flex flex-col gap-3">
            <p class="surtitre">Module 2 · Socle et design</p>
            <h1 class="text-3xl font-extrabold tracking-tight sm:text-4xl">Vitrine des composants</h1>
            <p class="max-w-2xl text-encre-douce">Chaque brique de l'interface dans ses différents états. Essayez le menu « Affichage » en haut : thème, grand texte, contraste renforcé et animations.</p>
        </header>

        <section class="flex flex-col gap-5" aria-labelledby="titre-boutons">
            <h2 id="titre-boutons" class="titre-section">Boutons</h2>
            <div class="carte flex flex-wrap items-center gap-3 p-6">
                <button type="button" class="bouton-primaire"><Icone nom="plus" class="size-4" /> Créer une activité</button>
                <button type="button" class="bouton-or">Voir les activités</button>
                <button type="button" class="bouton-secondaire">Enregistrer le brouillon</button>
                <button type="button" class="bouton-discret">Annuler</button>
                <button type="button" class="bouton-danger">Supprimer définitivement</button>
                <button type="button" class="bouton-primaire" disabled>Indisponible</button>
            </div>
        </section>

        <section class="flex flex-col gap-5" aria-labelledby="titre-statuts">
            <h2 id="titre-statuts" class="titre-section">Statuts</h2>
            <div class="carte flex flex-col gap-4 p-6">
                <div class="flex flex-wrap gap-2">
                    <BadgeStatut v-for="statut in STATUTS_ACTIVITE" :key="statut" :statut="statut" />
                </div>
                <div class="flex flex-wrap gap-2">
                    <BadgeStatut v-for="statut in STATUTS_COURRIER" :key="statut" :statut="statut" />
                </div>
            </div>
        </section>

        <section class="flex flex-col gap-5" aria-labelledby="titre-formulaires">
            <h2 id="titre-formulaires" class="titre-section">Formulaires</h2>
            <form class="carte grid gap-5 p-6 sm:grid-cols-2" @submit.prevent="erreurTelephone = !/^0[157]\d{8}$/.test(telephone.replace(/\s/g, ''))">
                <div class="flex flex-col gap-1.5">
                    <label for="exemple-nom" class="text-sm font-semibold">Nom complet</label>
                    <input id="exemple-nom" class="champ-saisie" autocomplete="name" placeholder="Prénom et nom">
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="exemple-telephone" class="text-sm font-semibold">Numéro de téléphone</label>
                    <input
                        id="exemple-telephone"
                        v-model="telephone"
                        class="champ-saisie"
                        type="tel"
                        inputmode="tel"
                        placeholder="07 07 07 07 07"
                        :aria-invalid="erreurTelephone"
                        aria-describedby="aide-telephone"
                    >
                    <p id="aide-telephone" class="text-xs" :class="erreurTelephone ? 'font-semibold text-danger' : 'text-encre-douce'">
                        {{ erreurTelephone ? 'Numéro invalide : 10 chiffres commençant par 01, 05 ou 07.' : '10 chiffres. Il sert aussi pour WhatsApp.' }}
                    </p>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="exemple-sexe" class="text-sm font-semibold">Sexe</label>
                    <select id="exemple-sexe" class="champ-saisie">
                        <option value="">Choisir…</option>
                        <option>Homme</option>
                        <option>Femme</option>
                    </select>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label for="exemple-section" class="text-sm font-semibold">Sous-Comité <span class="font-normal text-encre-douce">(facultatif)</span></label>
                    <select id="exemple-section" class="champ-saisie">
                        <option value="">Choisir…</option>
                        <option>Katiola</option>
                        <option>Niakara</option>
                        <option>Dabakala</option>
                    </select>
                </div>
                <label class="flex items-start gap-3 text-sm sm:col-span-2">
                    <input type="checkbox" class="mt-1 size-5 accent-vert-700">
                    <span>J'accepte que mon nom figure sur la liste publique des participants. <span class="text-encre-douce">Facultatif, jamais coché d'avance.</span></span>
                </label>
                <div class="sm:col-span-2">
                    <button type="submit" class="bouton-primaire">Vérifier le numéro</button>
                </div>
            </form>
        </section>

        <section class="flex flex-col gap-5" aria-labelledby="titre-messages">
            <h2 id="titre-messages" class="titre-section">Messages</h2>
            <div class="grid gap-4 md:grid-cols-2">
                <Alerte ton="ok" titre="Inscription enregistrée">Votre QR code est prêt. Gardez votre lien personnel.</Alerte>
                <Alerte ton="info" titre="Déjà inscrit ?">Utilisez votre lien personnel, ou contactez l'organisation.</Alerte>
                <Alerte ton="attention" titre="Activité complète">Votre inscription sera enregistrée en attente de validation.</Alerte>
                <Alerte ton="danger" titre="Connexion impossible">Le numéro ou le mot de passe est incorrect.</Alerte>
            </div>
        </section>

        <section class="flex flex-col gap-5" aria-labelledby="titre-chiffres">
            <h2 id="titre-chiffres" class="titre-section">Chiffres animés</h2>
            <div class="grid gap-4 sm:grid-cols-3">
                <div class="carte p-6">
                    <p class="text-sm text-encre-douce">Inscriptions (exemple)</p>
                    <p class="text-4xl font-extrabold text-lien"><CompteurAnime :valeur="342" /></p>
                </div>
                <div class="carte p-6">
                    <p class="text-sm text-encre-douce">Présents (exemple)</p>
                    <p class="text-4xl font-extrabold text-lien"><CompteurAnime :valeur="1250" /></p>
                </div>
                <div class="carte p-6">
                    <p class="text-sm text-encre-douce">Taux de présence (exemple)</p>
                    <p class="text-4xl font-extrabold text-lien"><CompteurAnime :valeur="87" /> %</p>
                </div>
            </div>
        </section>

        <section class="flex flex-col gap-5" aria-labelledby="titre-chargement">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 id="titre-chargement" class="titre-section">Chargement</h2>
                <button type="button" class="bouton-secondaire" @click="chargement = !chargement">{{ chargement ? 'Afficher le contenu' : 'Revoir le chargement' }}</button>
            </div>
            <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <template v-if="chargement">
                    <div v-for="index in 3" :key="index" class="carte flex flex-col gap-3 p-5" aria-hidden="true">
                        <div class="squelette h-32" />
                        <div class="squelette h-5 w-1/3" />
                        <div class="squelette h-6 w-3/4" />
                        <div class="squelette h-4 w-full" />
                    </div>
                    <p class="sr-only" role="status">Chargement des activités…</p>
                </template>
                <template v-else>
                    <CarteActivite v-for="activite in activitesExemple" :key="activite.id" :activite="activite" />
                </template>
            </div>
        </section>

        <section class="flex flex-col gap-5" aria-labelledby="titre-pointage">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 id="titre-pointage" class="titre-section">Retour du pointage</h2>
                <div class="flex gap-2">
                    <button type="button" class="bouton-secondaire" @click="rejouerRetour(true)">Entrée acceptée</button>
                    <button type="button" class="bouton-secondaire" @click="rejouerRetour(false)">Entrée refusée</button>
                </div>
            </div>
            <div class="max-w-md">
                <RetourPointage
                    :key="retour.cle"
                    :accepte="retour.accepte"
                    :titre="retour.accepte ? 'Entrée acceptée' : 'Déjà pointé'"
                    :detail="retour.accepte ? 'Participant d’exemple · admis · 21 h 04' : 'Premier passage à 21 h 04. Second passage bloqué.'"
                />
            </div>
        </section>
    </div>
</template>
