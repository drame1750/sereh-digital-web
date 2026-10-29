<script setup>
import { onMounted, reactive, ref } from 'vue';
import Alerte from '../../components/Alerte.vue';
import ConfirmationSensible from '../../components/ConfirmationSensible.vue';
import Icone from '../../components/Icone.vue';
import MessageFlottant from '../../components/MessageFlottant.vue';
import { useAction } from '../../composables/useAction.js';
import { telecharger } from '../../billet.js';
import { instant } from '../../donnees-exemple.js';
import { MODE_DEMONSTRATION } from '../../services/donnees.js';
import { creerSauvegarde, etatSauvegardes, lireSauvegarde, noterCopieExterne, restaurerSauvegarde } from '../../services/systeme.js';

/**
 * Sauvegardes et restauration (cahier des charges, section 11, et module 8) : export chiffré par
 * une phrase secrète, alerte après 7 jours, copie sur un support externe, 8 dernières gardées, et
 * restauration d'abord essayée sur le projet de test.
 */
const etat = ref(null);
const creation = reactive({ phrase: '', confirmation: '' });
const restauration = reactive({ fichier: null, phrase: '', contenu: null, erreur: '', ouverture: false, confirmer: false });
const retirees = ref([]);

async function charger() {
    etat.value = await etatSauvegardes();
}

const { enCours, confirmation, agir, erreurDe } = useAction(charger);

async function sauvegarder() {
    const resultat = await agir('creer', () => creerSauvegarde(creation.phrase, creation.confirmation), 'Sauvegarde créée et téléchargée. Copiez-la maintenant sur un support externe.');

    if (resultat) {
        telecharger(resultat.blob, resultat.nom);
        retirees.value = resultat.retirees;
        Object.assign(creation, { phrase: '', confirmation: '' });
    }
}

function choisirFichier(evenement) {
    Object.assign(restauration, { fichier: evenement.target.files?.[0] ?? null, contenu: null, erreur: '', confirmer: false });
}

async function ouvrir() {
    restauration.ouverture = true;
    restauration.erreur = '';

    try {
        restauration.contenu = await lireSauvegarde(restauration.fichier, restauration.phrase);
        restauration.phrase = '';
    } catch (probleme) {
        restauration.erreur = probleme.message;
    } finally {
        restauration.ouverture = false;
    }
}

async function restaurer() {
    restauration.confirmer = false;
    await restaurerSauvegarde(restauration.contenu, restauration.fichier.name);
    location.reload();
}

onMounted(charger);
</script>

<template>
    <div class="mx-auto flex max-w-4xl flex-col gap-6">
        <header class="flex flex-col gap-2">
            <p class="surtitre">Système</p>
            <h1 class="text-3xl font-extrabold tracking-tight">Sauvegardes</h1>
        </header>

        <Alerte v-if="MODE_DEMONSTRATION" ton="info" titre="Démonstration">
            La sauvegarde est un vrai fichier chiffré, mais elle contient les données fictives de cet onglet. Avec Supabase, elle contiendra la base du projet ; l’offre gratuite n’ayant aucune sauvegarde automatique, cette sauvegarde chaque semaine sera indispensable.
        </Alerte>

        <Alerte v-if="etat?.alerte" ton="danger" titre="Sauvegarde à faire">{{ etat.derniere ? `La dernière sauvegarde date de ${etat.joursDepuis} jours : plus de 7 jours.` : 'Aucune sauvegarde n’a encore été faite.' }}</Alerte>
        <Alerte v-else-if="etat" ton="ok" titre="Sauvegardes à jour">Dernière sauvegarde il y a {{ etat.joursDepuis }} jour{{ etat.joursDepuis > 1 ? 's' : '' }}.</Alerte>

        <form class="carte flex flex-col gap-4 p-6" novalidate @submit.prevent="sauvegarder">
            <h2 class="flex items-center gap-2 text-lg font-bold"><Icone nom="sauvegardes" class="size-5 text-or-600" /> Créer une sauvegarde chiffrée</h2>
            <p class="text-sm text-encre-douce">Choisissez une phrase secrète d’au moins 12 caractères, et gardez-la à part du fichier (dans un carnet rangé, pas dans le téléphone). Sans elle, la sauvegarde est illisible : personne ne pourra la retrouver, pas même l’administrateur.</p>
            <div class="grid gap-4 sm:grid-cols-2">
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Phrase secrète<input v-model="creation.phrase" type="password" class="champ-saisie font-normal" autocomplete="new-password"></label>
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Retapez la phrase<input v-model="creation.confirmation" type="password" class="champ-saisie font-normal" autocomplete="new-password"></label>
            </div>
            <p v-if="erreurDe('creer')" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe('creer') }}</p>
            <button type="submit" class="bouton-primaire self-start" :disabled="enCours === 'creer'"><Icone nom="telecharger" class="size-4" /> {{ enCours === 'creer' ? 'Chiffrement…' : 'Créer et télécharger' }}</button>
            <p v-if="retirees.length > 0" class="text-sm text-attention">Seules les {{ etat?.gardees }} dernières sauvegardes restent au registre. Effacez aussi du support externe : {{ retirees.join(', ') }}.</p>
        </form>

        <section class="carte flex flex-col gap-3 p-6" aria-labelledby="titre-registre">
            <h2 id="titre-registre" class="text-lg font-bold">Registre des sauvegardes</h2>
            <p v-if="!etat || etat.sauvegardes.length === 0" class="text-sm text-encre-douce">Aucune sauvegarde.</p>
            <ul class="flex flex-col gap-2">
                <li v-for="sauvegarde in etat?.sauvegardes ?? []" :key="sauvegarde.id" class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 p-3 text-sm">
                    <span class="min-w-0">
                        <span class="block font-semibold break-all">{{ sauvegarde.fichier }}{{ sauvegarde.exemple ? ' (exemple)' : '' }}</span>
                        <span class="block text-xs text-encre-douce">{{ instant(sauvegarde.le) }} · {{ sauvegarde.par }} · {{ Math.round(sauvegarde.taille / 1024) }} Ko{{ sauvegarde.empreinte !== 'exemple' ? ` · empreinte ${sauvegarde.empreinte.slice(0, 12)}…` : '' }}</span>
                    </span>
                    <span v-if="sauvegarde.copieExterne" class="rounded-full bg-ok-fond px-2.5 py-1 text-xs font-semibold text-ok">Copie externe faite</span>
                    <button v-else type="button" class="bouton-discret" :disabled="enCours === `copie-${sauvegarde.id}`" @click="agir(`copie-${sauvegarde.id}`, () => noterCopieExterne(sauvegarde.id), 'Copie externe notée.')"><Icone nom="coche" class="size-4" /> J’ai fait la copie externe</button>
                </li>
            </ul>
        </section>

        <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-restaurer">
            <h2 id="titre-restaurer" class="flex items-center gap-2 text-lg font-bold"><Icone nom="importer" class="size-5 text-or-600" /> Restaurer une sauvegarde</h2>
            <Alerte ton="attention">Une restauration se fait <strong>toujours d’abord sur le projet de test</strong>. Le site en production ne sera restauré qu’après cet essai réussi et votre confirmation explicite. Ici, en démonstration, la restauration remplace les données de cet onglet.</Alerte>
            <div class="grid gap-4 sm:grid-cols-2">
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Fichier de sauvegarde (.sereh)<input type="file" accept=".sereh" class="champ-saisie font-normal" @change="choisirFichier"></label>
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Phrase secrète<input v-model="restauration.phrase" type="password" class="champ-saisie font-normal" autocomplete="off"></label>
            </div>
            <p v-if="restauration.erreur" class="text-sm font-semibold text-danger" role="alert">{{ restauration.erreur }}</p>
            <button type="button" class="bouton-secondaire self-start" :disabled="!restauration.fichier || !restauration.phrase || restauration.ouverture" @click="ouvrir">{{ restauration.ouverture ? 'Ouverture…' : 'Ouvrir et vérifier' }}</button>

            <div v-if="restauration.contenu" class="flex flex-col gap-3 rounded-xl bg-surface-2 p-4">
                <p class="text-sm font-semibold">Sauvegarde du {{ instant(restauration.contenu.creeLe) }}, faite par {{ restauration.contenu.creePar }}</p>
                <p class="text-sm text-encre-douce">
                    {{ restauration.contenu.resume.activites }} activité(s), {{ restauration.contenu.resume.inscriptions }} inscription(s), {{ restauration.contenu.resume.pointages }} passage(s),
                    {{ restauration.contenu.resume.courriers }} courrier(s), {{ restauration.contenu.resume.comptes }} compte(s), {{ restauration.contenu.resume.fichiers }} PDF.
                </p>
                <p class="text-xs text-encre-douce">Empreinte du fichier : <span class="font-mono break-all">{{ restauration.contenu.empreinte }}</span></p>
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Environnement
                    <select class="champ-saisie font-normal" disabled>
                        <option>Projet de test (cette démonstration)</option>
                    </select>
                </label>
                <ConfirmationSensible v-if="restauration.confirmer" titre="Restauration" mot-a-recopier="RESTAURER" libelle-bouton="Restaurer maintenant" @confirmer="restaurer" @annuler="restauration.confirmer = false">
                    Toutes les données de la démonstration seront remplacées par celles de la sauvegarde, puis la page se rechargera. Vous devrez peut-être vous reconnecter.
                </ConfirmationSensible>
                <button v-else type="button" class="bouton-danger self-start" @click="restauration.confirmer = true">Restaurer sur le projet de test</button>
            </div>

            <div v-if="etat?.restaurations.length" class="flex flex-col gap-2 border-t border-ligne pt-4">
                <h3 class="text-sm font-bold">Restaurations faites</h3>
                <ul class="flex flex-col gap-1.5 text-sm">
                    <li v-for="(ligne, index) in etat.restaurations" :key="index" class="rounded-lg bg-surface-2 p-2.5"><span class="font-semibold">{{ ligne.fichier }}</span> · {{ ligne.environnement }} · {{ ligne.resultat }} <span class="text-xs text-encre-douce">· {{ instant(ligne.le) }}, {{ ligne.par }}</span></li>
                </ul>
            </div>
        </section>

        <details class="carte p-6 text-sm">
            <summary class="cursor-pointer text-lg font-bold">Routine d’exploitation</summary>
            <ol class="mt-4 flex list-decimal flex-col gap-2 pl-5">
                <li><strong>Chaque semaine</strong> (par exemple le dimanche soir) : créer une sauvegarde chiffrée, la copier sur une clé USB ou un disque gardé au siège, puis cocher « copie externe faite ».</li>
                <li><strong>Une fois par trimestre</strong> : restaurer la dernière sauvegarde sur le projet de test, vérifier quelques inscriptions et un courrier, noter le résultat.</li>
                <li><strong>Avant toute intervention importante</strong> : sauvegarder, activer la maintenance (État du système), intervenir, vérifier, puis désactiver la maintenance.</li>
                <li><strong>En cas d’incident</strong> : le signaler dans Sécurité, bloquer les comptes touchés, puis restaurer après essai sur le projet de test.</li>
                <li><strong>Phrase secrète</strong> : la même pour toutes les sauvegardes, connue de l’administrateur principal et de l’administrateur de secours, jamais envoyée par message.</li>
            </ol>
        </details>

        <MessageFlottant :texte="confirmation" @fermer="confirmation = ''" />
    </div>
</template>
