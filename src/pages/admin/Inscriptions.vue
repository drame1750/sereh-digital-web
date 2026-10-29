<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Alerte from '../../components/Alerte.vue';
import BadgeStatut from '../../components/BadgeStatut.vue';
import Icone from '../../components/Icone.vue';
import { libelleRole } from '../../billet.js';
import {
    annulerGroupe,
    chiffresActivite,
    inscrireManuellement,
    listerActivitesAdmin,
    listerGroupes,
    marquerDoublonExamine,
    MODE_DEMONSTRATION,
    renvoyerLien,
    validerGroupe,
} from '../../services/donnees.js';
import { formaterTelephone } from '../../telephone.js';

/**
 * Gestion des inscriptions d'une activité (cahier des charges, section 4) : validation des
 * inscriptions en attente, examen des doublons, annulation motivée, nouveau lien personnel et
 * inscription à la main. Rien n'est supprimé ni fusionné automatiquement.
 */
const route = useRoute();
const router = useRouter();
const activites = ref([]);
const activiteId = ref(typeof route.query.activite === 'string' ? route.query.activite : '');
const groupes = ref(null);
const chiffres = ref(null);
const message = ref(null);
const enCours = ref('');
const annulation = reactive({ groupe: '', motif: '' });
const lien = reactive({ groupe: '', identiteVerifiee: false, adresse: '' });
const ajout = reactive({ ouvert: false, nom: '', telephone: '', sexe: '', erreur: '', adresse: '' });
const filtres = reactive({ statut: 'toutes', pointage: 'tous', doublons: false, texte: '' });

const STATUTS = { admise: 'admise', en_attente: 'en-attente', annulee: 'annulee' };
const heure = (iso) => (iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Abidjan' }) : '');
const lienDe = (jeton) => `${location.origin}${location.pathname}#/inscription/${jeton}`;

const groupesFiltres = computed(() => (groupes.value ?? []).filter((groupe) => {
    const membres = [groupe.principal, ...groupe.accompagnateurs];
    const texte = filtres.texte.trim().toLocaleLowerCase('fr');
    const chiffresTexte = texte.replace(/\D/g, '');

    if (filtres.statut !== 'toutes' && groupe.statut !== filtres.statut) {
        return false;
    }

    if (filtres.doublons && !groupe.doublonPossible) {
        return false;
    }

    if (filtres.pointage === 'presents' && !membres.some((membre) => membre.pointeA)) {
        return false;
    }

    if (filtres.pointage === 'non-pointes' && membres.every((membre) => membre.pointeA)) {
        return false;
    }

    return !texte || membres.some((membre) => membre.nom.toLocaleLowerCase('fr').includes(texte)
        || (chiffresTexte.length >= 4 && (membre.telephone ?? '').includes(chiffresTexte)));
}));

async function charger() {
    if (!activiteId.value) {
        return;
    }

    [groupes.value, chiffres.value] = await Promise.all([listerGroupes(activiteId.value), chiffresActivite(activiteId.value)]);
}

async function agir(cle, action, texte) {
    enCours.value = cle;
    message.value = null;

    try {
        const resultat = await action();
        message.value = { ton: 'ok', texte: typeof texte === 'function' ? texte(resultat) : texte };
        await charger();

        return resultat;
    } catch (erreur) {
        message.value = { ton: 'danger', texte: erreur.message };

        return null;
    } finally {
        enCours.value = '';
    }
}

async function confirmerAnnulation(groupe) {
    const ok = await agir(groupe.groupe, () => annulerGroupe(groupe.groupe, annulation.motif).then(() => true), `Inscription de ${groupe.principal.nom} annulée. Elle reste visible, avec son motif.`);

    if (ok) {
        Object.assign(annulation, { groupe: '', motif: '' });
    }
}

async function emettreLien(groupe) {
    const jeton = await agir(groupe.groupe, () => renvoyerLien(groupe.groupe), 'Nouveau lien créé : l’ancien ne fonctionne plus. Transmettez-le à la personne.');

    if (jeton) {
        lien.adresse = lienDe(jeton);
    }
}

async function ajouter() {
    ajout.erreur = '';

    try {
        const { jeton, statut } = await inscrireManuellement(activiteId.value, { nom: ajout.nom, telephone: ajout.telephone, sexe: ajout.sexe });
        ajout.adresse = lienDe(jeton);
        message.value = { ton: 'ok', texte: `Inscription de ${ajout.nom} enregistrée${statut === 'admise' ? ' et admise' : ', en attente : il n’y a plus de place'}. La fiche pourra être complétée plus tard.` };
        Object.assign(ajout, { nom: '', telephone: '', sexe: '' });
        await charger();
    } catch (erreur) {
        ajout.erreur = erreur.message;
    }
}

watch(activiteId, async (id) => {
    await router.replace({ query: { ...route.query, activite: id } });
    groupes.value = null;
    await charger();
});

onMounted(async () => {
    activites.value = await listerActivitesAdmin();
    activiteId.value ||= activites.value.find((activite) => activite.statut === 'inscriptions-ouvertes')?.id ?? activites.value[0]?.id ?? '';
    await charger();
});
</script>

<template>
    <div class="mx-auto flex max-w-6xl flex-col gap-6">
        <header class="flex flex-wrap items-end justify-between gap-4">
            <div class="flex flex-col gap-2">
                <p class="surtitre">Administration</p>
                <h1 class="text-3xl font-extrabold tracking-tight">Inscriptions</h1>
            </div>
            <button type="button" class="bouton-primaire" :aria-expanded="ajout.ouvert" @click="ajout.ouvert = !ajout.ouvert">
                <Icone nom="plus" class="size-4" /> Inscrire quelqu'un
            </button>
        </header>

        <Alerte v-if="MODE_DEMONSTRATION" ton="info" titre="Démonstration">Inscriptions fictives. Dans l'application, ces actions seront réservées à l'administrateur et aux Responsables de l'activité, et notées dans le journal d'audit.</Alerte>

        <section class="carte flex flex-col gap-4 p-5">
            <div class="flex flex-col gap-1.5">
                <label for="activite" class="text-sm font-semibold">Activité</label>
                <select id="activite" v-model="activiteId" class="champ-saisie">
                    <option v-for="activite in activites" :key="activite.id" :value="activite.id">{{ activite.titre }} · {{ activite.edition }}</option>
                </select>
            </div>
            <dl v-if="chiffres" class="grid grid-cols-2 gap-2 text-center sm:grid-cols-4 lg:grid-cols-7">
                <div v-for="[libelle, valeur] in [['Reçues', chiffres.recues], ['Admises', chiffres.admises], ['En attente', chiffres.enAttente], ['Annulées', chiffres.annulees], ['Accompagnateurs', chiffres.accompagnateurs], ['Présents', chiffres.presents], ['Doublons', chiffres.doublons]]" :key="libelle" class="rounded-xl bg-surface-2 p-2.5">
                    <dt class="text-[0.6875rem] text-encre-douce">{{ libelle }}</dt>
                    <dd class="text-lg font-bold tabular-nums">{{ valeur }}</dd>
                </div>
            </dl>
        </section>

        <Transition name="deplier">
            <section v-if="ajout.ouvert" class="carte flex flex-col gap-4 p-5" aria-labelledby="titre-ajout">
                <h2 id="titre-ajout" class="text-lg font-bold">Inscription à la main</h2>
                <p class="text-sm text-encre-douce">Formulaire rapide : la fiche pourra être complétée plus tard. La règle de capacité s'applique comme pour le formulaire public.</p>
                <form class="grid gap-4 sm:grid-cols-[1.5fr_1fr_1fr_auto] sm:items-end" @submit.prevent="ajouter">
                    <div class="flex flex-col gap-1.5">
                        <label for="ajout-nom" class="text-sm font-semibold">Nom complet</label>
                        <input id="ajout-nom" v-model="ajout.nom" class="champ-saisie" autocomplete="off">
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label for="ajout-telephone" class="text-sm font-semibold">Téléphone</label>
                        <input id="ajout-telephone" v-model="ajout.telephone" class="champ-saisie" type="tel" inputmode="tel" autocomplete="off">
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label for="ajout-sexe" class="text-sm font-semibold">Sexe</label>
                        <select id="ajout-sexe" v-model="ajout.sexe" class="champ-saisie">
                            <option value="">Choisir…</option>
                            <option value="homme">Homme</option>
                            <option value="femme">Femme</option>
                        </select>
                    </div>
                    <button type="submit" class="bouton-primaire">Inscrire</button>
                </form>
                <Alerte v-if="ajout.erreur" ton="danger">{{ ajout.erreur }}</Alerte>
                <div v-if="ajout.adresse" class="flex flex-col gap-1.5">
                    <label for="ajout-lien" class="text-sm font-semibold">Lien personnel à transmettre</label>
                    <input id="ajout-lien" class="champ-saisie font-mono text-xs" :value="ajout.adresse" readonly @focus="$event.target.select()">
                </div>
            </section>
        </Transition>

        <Alerte v-if="message" :ton="message.ton">{{ message.texte }}</Alerte>

        <section class="carte grid gap-4 p-5 sm:grid-cols-[1.5fr_1fr_1fr_auto] sm:items-end" aria-label="Filtres">
            <div class="flex flex-col gap-1.5">
                <label for="filtre-texte" class="text-sm font-semibold">Rechercher</label>
                <input id="filtre-texte" v-model="filtres.texte" class="champ-saisie" type="search" placeholder="Nom ou téléphone">
            </div>
            <div class="flex flex-col gap-1.5">
                <label for="filtre-statut" class="text-sm font-semibold">Statut</label>
                <select id="filtre-statut" v-model="filtres.statut" class="champ-saisie">
                    <option value="toutes">Toutes</option>
                    <option value="admise">Admises</option>
                    <option value="en_attente">En attente</option>
                    <option value="annulee">Annulées</option>
                </select>
            </div>
            <div class="flex flex-col gap-1.5">
                <label for="filtre-pointage" class="text-sm font-semibold">Pointage</label>
                <select id="filtre-pointage" v-model="filtres.pointage" class="champ-saisie">
                    <option value="tous">Tous</option>
                    <option value="presents">Présents</option>
                    <option value="non-pointes">Non pointés</option>
                </select>
            </div>
            <label class="flex min-h-12 items-center gap-2 text-sm font-semibold">
                <input v-model="filtres.doublons" type="checkbox" class="size-5 accent-vert-700"> Doublons possibles
            </label>
        </section>

        <div v-if="!groupes" class="flex flex-col gap-4" aria-hidden="true">
            <div v-for="index in 3" :key="index" class="squelette h-32" />
        </div>
        <p v-else-if="groupesFiltres.length === 0" class="carte p-6 text-encre-douce">Aucune inscription ne correspond à ces critères.</p>

        <article v-for="groupe in groupesFiltres" :key="groupe.groupe" class="carte flex flex-col gap-4 p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="flex min-w-0 flex-col gap-1">
                    <div class="flex flex-wrap gap-2">
                        <BadgeStatut :statut="STATUTS[groupe.statut]" />
                        <span v-if="groupe.doublonPossible" class="inline-flex items-center gap-1 rounded-full bg-info-fond px-2.5 py-1 text-xs font-semibold text-info"><Icone nom="alerte" class="size-3.5" /> Doublon possible</span>
                        <span v-if="groupe.principal.mineur" class="inline-flex rounded-full bg-attention-fond px-2.5 py-1 text-xs font-semibold text-attention">Moins de 18 ans</span>
                        <span v-if="groupe.source === 'administration'" class="inline-flex rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-encre-douce">Ajout à la main</span>
                    </div>
                    <h2 class="text-lg font-bold">{{ groupe.principal.nom }}</h2>
                    <p class="text-sm text-encre-douce">
                        {{ groupe.principal.telephone ? formaterTelephone(groupe.principal.telephone) : 'Téléphone non renseigné' }}
                        <template v-if="groupe.principal.ville"> · {{ groupe.principal.ville }}</template>
                        <template v-if="groupe.principal.sousComite"> · {{ groupe.principal.sousComite }}</template>
                        <template v-if="groupe.recueLe"> · reçue le {{ heure(groupe.recueLe) }}</template>
                    </p>
                    <p v-if="groupe.principal.mineur && groupe.principal.tuteur" class="text-sm text-encre-douce">Parent ou tuteur : {{ groupe.principal.tuteur.nom }} · {{ formaterTelephone(groupe.principal.tuteur.telephone) }}</p>
                    <p v-if="groupe.statut === 'annulee'" class="text-sm text-danger">Motif : {{ groupe.principal.motifAnnulation }}</p>
                </div>
            </div>

            <ul class="flex flex-col gap-1.5">
                <li v-for="membre in [groupe.principal, ...groupe.accompagnateurs]" :key="membre.id" class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                    <span><strong>{{ membre.nom }}</strong> · {{ libelleRole(membre) }}</span>
                    <span class="text-encre-douce">{{ membre.pointeA ? `Pointé le ${heure(membre.pointeA)}` : 'Non pointé' }}</span>
                </li>
            </ul>

            <div class="flex flex-wrap gap-2">
                <button v-if="groupe.statut === 'en_attente'" type="button" class="bouton-primaire" :disabled="enCours === groupe.groupe" @click="agir(groupe.groupe, () => validerGroupe(groupe.groupe), `Inscription de ${groupe.principal.nom} validée : le groupe est admis.`)">
                    <Icone nom="coche" class="size-4" /> Valider
                </button>
                <button v-if="groupe.doublonPossible" type="button" class="bouton-secondaire" :disabled="enCours === groupe.groupe" @click="agir(groupe.groupe, () => marquerDoublonExamine(groupe.groupe), 'Doublon possible marqué comme examiné. Rien n’a été fusionné ni supprimé.')">
                    Doublon examiné
                </button>
                <button v-if="groupe.statut !== 'annulee'" type="button" class="bouton-secondaire" @click="Object.assign(lien, { groupe: groupe.groupe, identiteVerifiee: false, adresse: '' })">
                    <Icone nom="lien" class="size-4" /> Nouveau lien personnel
                </button>
                <button v-if="groupe.statut !== 'annulee'" type="button" class="bouton-discret text-danger" @click="Object.assign(annulation, { groupe: groupe.groupe, motif: '' })">
                    Annuler l'inscription
                </button>
            </div>

            <form v-if="annulation.groupe === groupe.groupe" class="flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger-fond/50 p-4" @submit.prevent="confirmerAnnulation(groupe)">
                <label :for="`motif-${groupe.groupe}`" class="text-sm font-semibold">Motif de l'annulation (obligatoire)</label>
                <input :id="`motif-${groupe.groupe}`" v-model="annulation.motif" class="champ-saisie" minlength="5" maxlength="300" required>
                <div class="flex flex-wrap gap-2">
                    <button type="submit" class="bouton-danger" :disabled="enCours === groupe.groupe">Confirmer l'annulation</button>
                    <button type="button" class="bouton-discret" @click="annulation.groupe = ''">Ne pas annuler</button>
                </div>
            </form>

            <div v-if="lien.groupe === groupe.groupe" class="flex flex-col gap-3 rounded-xl border border-or-400/50 bg-attention-fond/50 p-4">
                <template v-if="!lien.adresse">
                    <label class="flex items-start gap-3 text-sm">
                        <input v-model="lien.identiteVerifiee" type="checkbox" class="mt-0.5 size-5 accent-vert-700">
                        <span>J'ai vérifié l'identité de la personne, en appelant le numéro inscrit.</span>
                    </label>
                    <div class="flex flex-wrap gap-2">
                        <button type="button" class="bouton-primaire" :disabled="!lien.identiteVerifiee || enCours === groupe.groupe" @click="emettreLien(groupe)">Créer le nouveau lien</button>
                        <button type="button" class="bouton-discret" @click="lien.groupe = ''">Annuler</button>
                    </div>
                </template>
                <template v-else>
                    <label :for="`lien-${groupe.groupe}`" class="text-sm font-semibold">Nouveau lien à transmettre (l'ancien ne fonctionne plus)</label>
                    <input :id="`lien-${groupe.groupe}`" class="champ-saisie font-mono text-xs" :value="lien.adresse" readonly @focus="$event.target.select()">
                </template>
            </div>
        </article>
    </div>
</template>

<style scoped>
.deplier-enter-active,
.deplier-leave-active {
    transition: opacity 0.2s ease, transform 0.2s var(--ease-douce);
}

.deplier-enter-from,
.deplier-leave-to {
    opacity: 0;
    transform: translateY(-6px);
}
</style>
