<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import Alerte from '../../components/Alerte.vue';
import BadgeStatut from '../../components/BadgeStatut.vue';
import Icone from '../../components/Icone.vue';
import MessageFlottant from '../../components/MessageFlottant.vue';
import { useAction } from '../../composables/useAction.js';
import { enregistrerMembre, listerMembres } from '../../services/courriers.js';
import { MODE_DEMONSTRATION } from '../../services/donnees.js';
import { parametres } from '../../services/parametres.js';

/**
 * Membres du bureau régional et l'état de leurs courriers : reçus, non consultés, sans réponse,
 * confirmés. On ajoute ici un membre, ou on le retire du bureau ; ses comptes et ses remplacements
 * se règlent dans la rubrique Comptes et utilisateurs.
 */
const membres = ref(null);
const fiche = reactive({ ouverte: false, id: null, nom: '', poste: '', groupe: '', actif: true });

const GROUPES = computed(() => ['Direction', ...parametres.secretariats.map((secretariat) => secretariat.sigle)]);
const nomDuGroupe = (sigle) => (sigle === 'Direction' ? 'Direction du bureau' : parametres.secretariats.find((secretariat) => secretariat.sigle === sigle)?.nom || sigle);

const groupes = computed(() => {
    const parGroupe = new Map();

    for (const membre of (membres.value ?? []).filter((candidat) => candidat.actif !== false)) {
        if (!parGroupe.has(membre.groupe)) {
            parGroupe.set(membre.groupe, []);
        }

        parGroupe.get(membre.groupe).push(membre);
    }

    return [...parGroupe.entries()].map(([groupe, liste]) => ({ groupe, membres: liste }));
});

const anciens = computed(() => (membres.value ?? []).filter((membre) => membre.actif === false));

async function charger() {
    membres.value = await listerMembres();
}

const { enCours, confirmation, erreur, agir, erreurDe } = useAction(charger);

function ouvrir(membre = null) {
    Object.assign(fiche, membre ? { ouverte: true, id: membre.id, nom: membre.nom, poste: membre.poste, groupe: membre.groupe, actif: membre.actif !== false } : { ouverte: true, id: null, nom: '', poste: '', groupe: '', actif: true });
}

async function enregistrer() {
    if (await agir('fiche', () => enregistrerMembre(fiche.id, fiche), fiche.id ? 'Fiche du membre enregistrée.' : 'Membre ajouté au bureau.')) {
        fiche.ouverte = false;
    }
}

onMounted(charger);
</script>

<template>
    <div class="mx-auto flex max-w-6xl flex-col gap-6">
        <header class="flex flex-wrap items-end justify-between gap-4">
            <div class="flex flex-col gap-2">
                <p class="surtitre">Bureau</p>
                <h1 class="text-3xl font-extrabold tracking-tight">Secrétaires régionaux</h1>
            </div>
            <div class="flex flex-wrap gap-2">
                <button type="button" class="bouton-secondaire" @click="ouvrir()"><Icone nom="plus" class="size-4" /> Ajouter un membre</button>
                <RouterLink :to="{ name: 'admin-courrier-nouveau' }" class="bouton-primaire"><Icone nom="courrier" class="size-4" /> Affecter un courrier</RouterLink>
            </div>
        </header>

        <Alerte v-if="MODE_DEMONSTRATION" ton="info" titre="Démonstration">
            Les membres sont fictifs. Leurs comptes de connexion se créent dans la rubrique <RouterLink :to="{ name: 'admin-comptes' }" class="font-semibold underline">Comptes et utilisateurs</RouterLink>.
        </Alerte>

        <form v-if="fiche.ouverte" class="carte flex flex-col gap-4 p-6" novalidate @submit.prevent="enregistrer">
            <h2 class="text-lg font-bold">{{ fiche.id ? 'Modifier la fiche' : 'Nouveau membre du bureau' }}</h2>
            <div class="grid gap-4 sm:grid-cols-3">
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Nom complet<input v-model="fiche.nom" class="champ-saisie font-normal">
                    <span v-if="erreur.cle === 'fiche' && erreur.erreurs.nom" class="text-xs text-danger">{{ erreur.erreurs.nom }}</span>
                </label>
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Poste<input v-model="fiche.poste" class="champ-saisie font-normal" placeholder="Membre du SERAMO">
                    <span v-if="erreur.cle === 'fiche' && erreur.erreurs.poste" class="text-xs text-danger">{{ erreur.erreurs.poste }}</span>
                </label>
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Secrétariat
                    <select v-model="fiche.groupe" class="champ-saisie font-normal">
                        <option value="">Choisir…</option>
                        <option v-for="groupe in GROUPES" :key="groupe" :value="groupe">{{ nomDuGroupe(groupe) }}</option>
                    </select>
                    <span v-if="erreur.cle === 'fiche' && erreur.erreurs.groupe" class="text-xs text-danger">{{ erreur.erreurs.groupe }}</span>
                </label>
            </div>
            <label v-if="fiche.id" class="flex items-start gap-2 text-sm"><input v-model="fiche.actif" type="checkbox" class="mt-1 size-4 accent-[var(--c-accent)]"> Membre du bureau en fonction (décochez à la fin de son mandat : ses courriers restent dans l’historique).</label>
            <p v-if="erreurDe('fiche') && !Object.keys(erreur.erreurs).length" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe('fiche') }}</p>
            <div class="flex flex-wrap gap-3">
                <button type="submit" class="bouton-primaire" :disabled="enCours === 'fiche'">Enregistrer</button>
                <button type="button" class="bouton-discret" @click="fiche.ouverte = false">Annuler</button>
            </div>
        </form>

        <div v-if="!membres" class="grid gap-4 sm:grid-cols-2" aria-hidden="true">
            <div v-for="index in 4" :key="index" class="squelette h-40" />
        </div>

        <section v-for="groupe in groupes" :key="groupe.groupe" class="flex flex-col gap-3" :aria-labelledby="`groupe-${groupe.groupe}`">
            <h2 :id="`groupe-${groupe.groupe}`" class="titre-section text-lg">{{ nomDuGroupe(groupe.groupe) }}</h2>
            <div class="grid gap-4 sm:grid-cols-2">
                <article v-for="membre in groupe.membres" :key="membre.id" class="carte flex flex-col gap-4 p-5">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <p class="font-bold">{{ membre.nom }}</p>
                            <p class="text-sm text-encre-douce">{{ membre.poste }}</p>
                        </div>
                        <div class="flex flex-col items-end gap-1.5">
                            <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="membre.aUnCompte ? 'bg-ok-fond text-ok' : 'bg-surface-2 text-encre-douce'">{{ membre.aUnCompte ? 'A un compte' : 'Sans compte' }}</span>
                            <button type="button" class="text-xs font-semibold text-lien underline" @click="ouvrir(membre)">Modifier</button>
                        </div>
                    </div>
                    <dl class="grid grid-cols-4 gap-2 text-center">
                        <div class="rounded-xl bg-surface-2 p-2"><dt class="text-[0.6875rem] leading-tight text-encre-douce">Reçus</dt><dd class="text-lg font-bold tabular-nums">{{ membre.nombres.recus }}</dd></div>
                        <div class="rounded-xl bg-surface-2 p-2"><dt class="text-[0.6875rem] leading-tight text-encre-douce">Non consultés</dt><dd class="text-lg font-bold tabular-nums">{{ membre.nombres.nonConsultes }}</dd></div>
                        <div class="rounded-xl bg-surface-2 p-2"><dt class="text-[0.6875rem] leading-tight text-encre-douce">Sans réponse</dt><dd class="text-lg font-bold tabular-nums">{{ membre.nombres.enAttente }}</dd></div>
                        <div class="rounded-xl bg-surface-2 p-2"><dt class="text-[0.6875rem] leading-tight text-encre-douce">Confirmés</dt><dd class="text-lg font-bold tabular-nums">{{ membre.nombres.confirmes }}</dd></div>
                    </dl>
                    <BadgeStatut v-if="membre.nombres.depassees" statut="echeance-depassee" class="self-start" />
                </article>
            </div>
        </section>

        <section v-if="anciens.length > 0" class="flex flex-col gap-3" aria-labelledby="titre-anciens">
            <h2 id="titre-anciens" class="titre-section text-lg">Anciens membres</h2>
            <ul class="carte divide-y divide-ligne">
                <li v-for="membre in anciens" :key="membre.id" class="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                    <span><span class="font-semibold">{{ membre.nom }}</span> · {{ membre.poste }} · {{ membre.nombres.recus }} courrier(s) dans l’historique</span>
                    <button type="button" class="font-semibold text-lien underline" @click="ouvrir(membre)">Modifier</button>
                </li>
            </ul>
        </section>

        <MessageFlottant :texte="confirmation" @fermer="confirmation = ''" />
    </div>
</template>
