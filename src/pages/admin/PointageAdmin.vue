<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Alerte from '../../components/Alerte.vue';
import CompteurAnime from '../../components/CompteurAnime.vue';
import Icone from '../../components/Icone.vue';
import MessageFlottant from '../../components/MessageFlottant.vue';
import { useAction } from '../../composables/useAction.js';
import { libelleRole } from '../../billet.js';
import { dateLongue, instant } from '../../donnees-exemple.js';
import { listerComptes } from '../../services/comptes.js';
import {
    corrigerPointage,
    examinerPassage,
    listeDeSecours,
    listerActivitesAdmin,
    listerParticipants,
    MODE_DEMONSTRATION,
    passagesActivite,
} from '../../services/donnees.js';

/**
 * Pointage, côté Responsable et administrateur (cahier des charges, section 5) : chiffres en direct,
 * passages acceptés et refusés avec l'agent et l'appareil, scans hors connexion à examiner,
 * corrections motivées et liste de secours à imprimer.
 */
const route = useRoute();
const activites = ref([]);
const activiteId = ref(typeof route.query.activite === 'string' ? route.query.activite : '');
const passages = ref(null);
const agents = ref([]);
const recherche = ref('');
const trouvees = ref([]);
const motifs = reactive({});

const activite = computed(() => activites.value.find((candidate) => candidate.id === activiteId.value) ?? null);
const aExaminer = computed(() => (passages.value ?? []).filter((passage) => passage.aExaminer && !passage.examineLe));
const refuses = computed(() => (passages.value ?? []).filter((passage) => passage.resultat !== 'accepte').length);
const agentsDeLActivite = computed(() => agents.value.filter((compte) => ['pointage', 'responsable'].includes(compte.role) && (!compte.activiteId || compte.activiteId === activiteId.value)));

const RESULTATS = { accepte: 'Accepté', deja_pointe: 'Déjà pointé', non_admise: 'Non admise', annulee: 'Annulée', autre_activite: 'Autre activité', inconnu: 'Code inconnu' };

async function charger() {
    activites.value = await listerActivitesAdmin({ archivees: 'toutes' });
    passages.value = activiteId.value ? await passagesActivite(activiteId.value) : [];
    await chercher();
}

const { enCours, confirmation, agir, erreurDe } = useAction(charger);

async function chercher() {
    trouvees.value = activiteId.value && recherche.value.trim().length >= 2
        ? (await listerParticipants({ activiteId: activiteId.value, texte: recherche.value, statut: 'admise' })).slice(0, 10)
        : [];
}

async function corriger(personne, action) {
    if (await agir(`correction-${personne.id}`, () => corrigerPointage(personne.id, action, motifs[personne.id] ?? ''), action === 'annuler' ? `Passage de ${personne.nom} annulé.` : `${personne.nom} pointé à la main.`)) {
        motifs[personne.id] = '';
    }
}

const echapper = (texte) => String(texte ?? '').replace(/[&<>"]/g, (caractere) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[caractere]));

/** Liste de secours : les personnes admises, par ordre alphabétique, avec une case à cocher à la main. */
async function imprimerListe() {
    const personnes = await listeDeSecours(activiteId.value);
    const zone = document.createElement('div');
    zone.className = 'zone-impression-liste';
    zone.innerHTML = `
        <h1>${echapper(activite.value.titre)}${activite.value.edition ? ` · ${echapper(activite.value.edition)}` : ''}</h1>
        <p>Liste de secours · ${echapper(dateLongue(activite.value.date))} · ${personnes.length} personne(s) admise(s)${MODE_DEMONSTRATION ? ' · DÉMONSTRATION, personnes fictives' : ''}</p>
        <table><thead><tr><th>Présent</th><th>Nom</th><th>Rôle</th><th>Inscrit par</th><th>Déjà pointé</th></tr></thead><tbody>
        ${personnes.map((personne) => `<tr><td class="case"></td><td>${echapper(personne.nom)}</td><td>${echapper(libelleRole(personne))}</td><td>${echapper(personne.inscritPar ?? '')}</td><td>${personne.pointeA ? 'oui' : ''}</td></tr>`).join('')}
        </tbody></table>
        <p class="pied">Imprimée le ${new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}. Cochez à la main, puis saisissez les présences dans la plateforme dès le retour du réseau. Document confidentiel.</p>`;
    const style = document.createElement('style');
    style.textContent = `
        @page { size: A4; margin: 14mm; }
        @media screen { .zone-impression-liste { display: none; } }
        @media print {
            body > *:not(.zone-impression-liste) { display: none !important; }
            .zone-impression-liste { font: 10pt Montserrat, sans-serif; color: #000; }
            .zone-impression-liste h1 { font-size: 15pt; margin: 0 0 2mm; }
            .zone-impression-liste table { width: 100%; border-collapse: collapse; margin-top: 4mm; }
            .zone-impression-liste th, .zone-impression-liste td { border: 0.3mm solid #444; padding: 1.6mm 2mm; text-align: left; }
            .zone-impression-liste .case { width: 14mm; }
            .zone-impression-liste .pied { margin-top: 4mm; font-size: 8.5pt; }
            .zone-impression-liste tr { break-inside: avoid; }
        }`;
    const nettoyer = () => {
        zone.remove();
        style.remove();
        window.removeEventListener('afterprint', nettoyer);
    };

    document.head.append(style);
    document.body.append(zone);
    window.addEventListener('afterprint', nettoyer);
    window.print();
}

let minuterie = 0;
watch(recherche, () => {
    clearTimeout(minuterie);
    minuterie = setTimeout(chercher, 250);
});
watch(activiteId, charger);

onMounted(async () => {
    agents.value = await listerComptes();
    activites.value = await listerActivitesAdmin({ archivees: 'toutes' });
    activiteId.value ||= activites.value.filter((candidate) => !candidate.archivee).at(-1)?.id ?? activites.value[0]?.id ?? '';
    await charger();
});
</script>

<template>
    <div class="mx-auto flex max-w-5xl flex-col gap-6">
        <header class="flex flex-wrap items-end justify-between gap-4">
            <div class="flex flex-col gap-2">
                <p class="surtitre">Activités</p>
                <h1 class="text-3xl font-extrabold tracking-tight">Pointage</h1>
            </div>
            <RouterLink :to="{ name: 'pointage' }" class="bouton-primaire"><Icone nom="pointage" class="size-4" /> Ouvrir l’écran de pointage</RouterLink>
        </header>

        <Alerte v-if="MODE_DEMONSTRATION" ton="info" titre="Démonstration">Passages fictifs. Avec Supabase, le serveur gardera le premier passage accepté, même si deux téléphones scannent le même code au même instant.</Alerte>

        <label class="flex max-w-md flex-col gap-1.5 text-sm font-semibold">Activité
            <select v-model="activiteId" class="champ-saisie font-normal">
                <option v-for="choix in activites" :key="choix.id" :value="choix.id">{{ choix.titre }}{{ choix.edition ? ` · ${choix.edition}` : '' }}</option>
            </select>
        </label>

        <section v-if="activite" class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Chiffres du pointage">
            <article v-for="indicateur in [
                { libelle: 'Personnes admises', valeur: activite.nombres.admises },
                { libelle: 'Présentes (pointées)', valeur: activite.nombres.presents },
                { libelle: 'Scans refusés', valeur: refuses },
                { libelle: 'Scans à examiner', valeur: aExaminer.length },
            ]" :key="indicateur.libelle" class="carte flex flex-col gap-1 p-4">
                <p class="text-3xl font-extrabold tabular-nums"><CompteurAnime :valeur="indicateur.valeur" /></p>
                <p class="text-xs font-semibold text-encre-douce">{{ indicateur.libelle }}</p>
            </article>
        </section>

        <section v-if="aExaminer.length > 0" class="carte flex flex-col gap-3 border-l-4 border-l-attention p-5" aria-labelledby="titre-examiner">
            <h2 id="titre-examiner" class="font-bold">Scans hors connexion à examiner</h2>
            <p class="text-sm text-encre-douce">Ces codes avaient déjà été pointés ailleurs. Le premier passage accepté reste celui qui compte ; vérifiez qu’il ne s’agit pas d’un billet copié.</p>
            <ul class="flex flex-col gap-2">
                <li v-for="passage in aExaminer" :key="passage.id" class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 p-3 text-sm">
                    <span><span class="font-semibold">{{ passage.personne?.nom ?? 'Code inconnu' }}</span> · scanné le {{ instant(passage.le) }}, envoyé le {{ instant(passage.synchroniseLe) }} · {{ passage.agent }}</span>
                    <button type="button" class="bouton-discret" :disabled="enCours === `examen-${passage.id}`" @click="agir(`examen-${passage.id}`, () => examinerPassage(passage.id), 'Scan marqué comme examiné.')"><Icone nom="coche" class="size-4" /> Examiné</button>
                </li>
            </ul>
        </section>

        <div class="grid gap-6 lg:grid-cols-2">
            <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-correction">
                <h2 id="titre-correction" class="text-lg font-bold">Corriger un pointage</h2>
                <p class="text-sm text-encre-douce">Réservé aux Responsables et à l’administrateur. Le motif est obligatoire et la correction reste dans l’historique.</p>
                <label class="relative">
                    <span class="sr-only">Rechercher une personne admise</span>
                    <Icone nom="recherche" class="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-encre-douce" />
                    <input v-model="recherche" type="search" class="champ-saisie pl-11" placeholder="Nom d’une personne admise">
                </label>
                <ul class="flex flex-col gap-3">
                    <li v-for="personne in trouvees" :key="personne.id" class="flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
                        <p class="text-sm"><span class="font-semibold">{{ personne.nom }}</span> · {{ personne.pointeA ? `pointé le ${instant(personne.pointeA)}` : 'pas encore pointé' }}</p>
                        <input v-model="motifs[personne.id]" class="champ-saisie" :placeholder="personne.pointeA ? 'Motif : scan par erreur, mauvaise personne…' : 'Motif : présent mais QR code illisible…'">
                        <p v-if="erreurDe(`correction-${personne.id}`)" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe(`correction-${personne.id}`) }}</p>
                        <button v-if="personne.pointeA" type="button" class="bouton-danger self-start" :disabled="enCours === `correction-${personne.id}`" @click="corriger(personne, 'annuler')">Annuler le passage</button>
                        <button v-else type="button" class="bouton-primaire self-start" :disabled="enCours === `correction-${personne.id}`" @click="corriger(personne, 'pointer')">Pointer à la main</button>
                    </li>
                </ul>
            </section>

            <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-secours">
                <h2 id="titre-secours" class="text-lg font-bold">Liste de secours</h2>
                <p class="text-sm text-encre-douce">Si le réseau tombe à l’entrée : la liste des personnes admises, par ordre alphabétique, avec une case à cocher. Document confidentiel, à détruire après l’activité.</p>
                <button type="button" class="bouton-secondaire self-start" :disabled="!activite" @click="imprimerListe"><Icone nom="imprimer" class="size-4" /> Imprimer la liste</button>
                <h3 class="mt-2 text-sm font-bold">Agents et Responsables de cette activité</h3>
                <p v-if="agentsDeLActivite.length === 0" class="text-sm text-encre-douce">Aucun compte de pointage attribué.</p>
                <ul class="flex flex-col gap-1 text-sm">
                    <li v-for="compte in agentsDeLActivite" :key="compte.id"><span class="font-semibold">{{ compte.nom }}</span> <span class="text-encre-douce">· {{ compte.role === 'responsable' ? 'Responsable' : 'Agent' }}{{ compte.plage ? ` · de ${new Date(compte.plage.debut).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })} à ${new Date(compte.plage.fin).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}` : '' }}{{ compte.etat === 'inactif' ? ' · inactif' : '' }}</span></li>
                </ul>
                <RouterLink :to="{ name: 'admin-comptes', query: { nouveau: '1' } }" class="font-semibold text-lien underline">Créer un compte d’agent</RouterLink>
            </section>
        </div>

        <section class="carte overflow-hidden" aria-labelledby="titre-passages">
            <h2 id="titre-passages" class="p-5 pb-0 text-lg font-bold">Derniers passages</h2>
            <div v-if="!passages" class="squelette m-5 h-24" aria-hidden="true" />
            <p v-else-if="passages.length === 0" class="p-5 text-sm text-encre-douce">Aucun passage pour cette activité.</p>
            <div v-else class="overflow-x-auto p-2">
                <table class="w-full min-w-[44rem] text-left text-sm">
                    <thead class="text-xs tracking-wide text-encre-douce uppercase">
                        <tr><th scope="col" class="px-3 py-2">Heure</th><th scope="col" class="px-3 py-2">Personne</th><th scope="col" class="px-3 py-2">Résultat</th><th scope="col" class="px-3 py-2">Moyen</th><th scope="col" class="px-3 py-2">Agent · appareil</th></tr>
                    </thead>
                    <tbody>
                        <tr v-for="passage in passages.slice(0, 60)" :key="passage.id" class="border-t border-ligne align-top">
                            <td class="px-3 py-2 whitespace-nowrap">{{ instant(passage.le) }}<span v-if="passage.synchroniseLe" class="block text-xs text-encre-douce">envoyé {{ instant(passage.synchroniseLe) }}</span></td>
                            <td class="px-3 py-2">{{ passage.personne?.nom ?? '—' }}</td>
                            <td class="px-3 py-2"><span class="font-semibold" :class="[passage.resultat === 'accepte' ? 'text-ok' : 'text-danger', passage.annule ? 'line-through' : '']">{{ RESULTATS[passage.resultat] }}</span><span v-if="passage.annule" class="block text-xs text-danger">annulé : {{ passage.motifAnnulation }}</span></td>
                            <td class="px-3 py-2">{{ passage.moyen }}</td>
                            <td class="px-3 py-2 text-encre-douce">{{ passage.agent }} · <span class="font-mono text-xs">{{ passage.appareil }}</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <MessageFlottant :texte="confirmation" @fermer="confirmation = ''" />
    </div>
</template>
