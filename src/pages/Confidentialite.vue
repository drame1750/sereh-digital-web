<script setup>
import Alerte from '../components/Alerte.vue';

/**
 * Politique de confidentialité : PROJET tiré du cahier des charges (section 10), à valider par le
 * SEREH et à vérifier au regard de la loi n° 2013-450 avant toute donnée réelle.
 */
const CONSERVATION = [
    ['Inscriptions : noms, téléphones, parent ou tuteur, QR codes, pointages', '12 mois après l’activité, puis rendues anonymes'],
    ['Comptes des secrétaires régionaux et des agents', 'Jusqu’à la fin de la fonction, puis 12 mois'],
    ['Journal des actions (sécurité)', '12 mois'],
    ['Sauvegardes', 'Les 8 dernières, soit environ 2 mois'],
    ['Journaux techniques', '30 jours'],
];
</script>

<template>
    <div class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
        <header class="flex flex-col gap-3">
            <p class="surtitre">SEREH Digital</p>
            <h1 class="text-3xl font-extrabold tracking-tight sm:text-4xl">Politique de confidentialité</h1>
            <Alerte ton="attention" titre="Projet en attente de validation">Ce texte reprend les décisions du cahier des charges. Il doit être complété par le SEREH et vérifié au regard de la loi ivoirienne n° 2013-450 avant toute inscription réelle.</Alerte>
        </header>

        <article class="carte flex flex-col gap-7 p-6 text-sm leading-relaxed sm:p-8">
            <section class="flex flex-col gap-2">
                <h2 class="text-lg font-bold">Qui est responsable de vos données</h2>
                <p>L'Association des Élèves et Étudiants Musulmans de Côte d'Ivoire, Secrétariat régional du Hambol (SEREH), dont le siège est à Katiola.</p>
                <p class="rounded-lg bg-attention-fond p-2 text-attention">À compléter par le SEREH : adresse, téléphone et contact pour les demandes.</p>
            </section>

            <section class="flex flex-col gap-2">
                <h2 class="text-lg font-bold">Informations recueillies</h2>
                <ul class="flex list-disc flex-col gap-1 pl-5">
                    <li>Pour la personne inscrite : nom complet, téléphone, sexe, ville ou commune et, si elle le souhaite, Sous-Comité et Section.</li>
                    <li>Pour une personne de moins de 18 ans : nom et téléphone d'un parent ou d'un tuteur, et la déclaration de son accord.</li>
                    <li>Pour chaque accompagnateur : nom complet, sexe et, s'il est indiqué, téléphone.</li>
                    <li>Le jour de l'activité : l'heure de passage à l'entrée.</li>
                </ul>
            </section>

            <section class="flex flex-col gap-2">
                <h2 class="text-lg font-bold">À quoi elles servent, et qui les voit</h2>
                <p>Organiser l'activité, contrôler l'entrée grâce aux QR codes et établir un bilan en chiffres d'ensemble. Elles ne sont ni vendues ni cédées.</p>
                <p>Seules les personnes habilitées du SEREH y accèdent, selon leur rôle. Les agents d'accueil ne voient jamais les numéros de téléphone. Votre nom n'est publié que si vous l'avez accepté.</p>
            </section>

            <section class="flex flex-col gap-3">
                <h2 class="text-lg font-bold">Combien de temps elles sont conservées</h2>
                <div class="overflow-x-auto">
                    <table class="w-full min-w-[28rem] border-collapse text-left">
                        <thead>
                            <tr class="border-b border-ligne">
                                <th class="py-2 pr-4 font-semibold">Données</th>
                                <th class="py-2 font-semibold">Durée</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="[donnees, duree] in CONSERVATION" :key="donnees" class="border-b border-ligne/60">
                                <td class="py-2 pr-4">{{ donnees }}</td>
                                <td class="py-2">{{ duree }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <section class="flex flex-col gap-2">
                <h2 class="text-lg font-bold">Où elles sont hébergées</h2>
                <p>Chez Supabase, dans une région européenne. Ce transfert hors de la CEDEAO est soumis à l'autorisation préalable de l'ARTCI, que le SEREH doit obtenir avant toute donnée réelle.</p>
            </section>

            <section class="flex flex-col gap-2">
                <h2 class="text-lg font-bold">Vos droits</h2>
                <p>Vous pouvez demander à consulter, corriger ou supprimer vos informations. L'administration du SEREH traite la demande après avoir vérifié votre identité.</p>
            </section>

            <section class="flex flex-col gap-2">
                <h2 class="text-lg font-bold">Votre lien personnel</h2>
                <p>Après l'inscription, un lien personnel vous permet de retrouver vos QR codes. Toute personne qui a ce lien voit vos informations : gardez-le pour vous.</p>
            </section>
        </article>
    </div>
</template>
