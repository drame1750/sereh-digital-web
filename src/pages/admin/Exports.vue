<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import Alerte from '../../components/Alerte.vue';
import ConfirmationSensible from '../../components/ConfirmationSensible.vue';
import Icone from '../../components/Icone.vue';
import MessageFlottant from '../../components/MessageFlottant.vue';
import { useAction } from '../../composables/useAction.js';
import { telecharger } from '../../billet.js';
import { instant } from '../../donnees-exemple.js';
import { lignesReponses } from '../../services/courriers.js';
import { importerInscriptions, listerActivitesAdmin, listerImports, MODE_DEMONSTRATION, preparerImport } from '../../services/donnees.js';
import { journaliserExport, lignesInscriptions, statistiquesGenerales } from '../../services/rapports.js';
import { fichierCsv, fichierXlsx, lireTableur, modeleImport } from '../../tableur.js';

/**
 * Exports Excel et CSV, et import de listes (cahier des charges, sections 4 et 8). Un export avec
 * les numéros de téléphone demande une nouvelle saisie du mot de passe ; chaque export et chaque
 * import est noté au journal. L'import montre d'abord un aperçu des erreurs, puis attend une
 * confirmation : rien n'est fusionné ni modifié automatiquement.
 */
const activites = ref([]);
const imports = ref([]);
const exportation = reactive({ jeu: 'inscriptions', activiteId: '', format: 'xlsx', coordonnees: false });
const demandeConfirmation = ref(false);
const importation = reactive({ activiteId: '', fichier: null, nom: '', apercu: null, colonnes: [], reconnues: [], confirme: false, resultat: null, erreur: '' });
const champFichier = ref(null);

const JEUX = {
    inscriptions: 'Inscriptions d’une activité',
    reponses: 'Réponses des membres du bureau',
    statistiques: 'Statistiques des activités',
};

const comptesApercu = computed(() => {
    const lignes = importation.apercu ?? [];

    return {
        total: lignes.length,
        valides: lignes.filter((ligne) => ligne.erreurs.length === 0).length,
        rejetees: lignes.filter((ligne) => ligne.erreurs.length > 0).length,
        doublons: lignes.filter((ligne) => ligne.erreurs.length === 0 && ligne.doublon).length,
    };
});

const activiteImport = computed(() => activites.value.find((activite) => activite.id === importation.activiteId) ?? null);

async function charger() {
    imports.value = await listerImports();
}

const { enCours, confirmation, agir, erreurDe } = useAction(charger);

async function lignesDuJeu() {
    if (exportation.jeu === 'inscriptions') {
        return lignesInscriptions(exportation.activiteId, exportation.coordonnees);
    }

    if (exportation.jeu === 'reponses') {
        return lignesReponses(exportation.activiteId);
    }

    return (await statistiquesGenerales()).map((ligne) => ({ Activité: ligne.titre, Édition: ligne.edition, Date: ligne.date, Archivée: ligne.archivee ? 'Oui' : 'Non', Admis: ligne.admis, Présents: ligne.presents, Accompagnateurs: ligne.accompagnateurs, 'Taux de présence (%)': ligne.taux ?? '' }));
}

function demanderExport() {
    if (exportation.jeu === 'inscriptions' && !exportation.activiteId) {
        confirmation.value = '';

        return agir('export', async () => {
            throw new Error('Choisissez l’activité.');
        }, '');
    }

    if (exportation.jeu === 'inscriptions' && exportation.coordonnees) {
        demandeConfirmation.value = true;

        return null;
    }

    return exporter();
}

function exporter() {
    demandeConfirmation.value = false;

    return agir('export', async () => {
        const lignes = await lignesDuJeu();

        if (lignes.length === 0) {
            throw new Error('Rien à exporter pour ce choix.');
        }

        const activite = activites.value.find((candidate) => candidate.id === exportation.activiteId);
        const nom = `${JEUX[exportation.jeu]}${activite ? ` · ${activite.titre}${activite.edition ? ` ${activite.edition}` : ''}` : ''}`;
        const base = `sereh-${exportation.jeu}${activite ? `-${activite.id}` : ''}-${new Date().toISOString().slice(0, 10)}`;
        const avecCoordonnees = exportation.jeu === 'inscriptions' && exportation.coordonnees;

        telecharger(exportation.format === 'xlsx' ? fichierXlsx(lignes, JEUX[exportation.jeu]) : fichierCsv(lignes), `${base}.${exportation.format}`);
        journaliserExport(nom, lignes.length, exportation.format === 'xlsx' ? 'Excel' : 'CSV', avecCoordonnees);

        return lignes.length;
    }, (nombre) => `Fichier téléchargé : ${nombre} ligne${nombre > 1 ? 's' : ''}. L’export est noté au journal.`);
}

async function choisirFichier(evenement) {
    const fichier = evenement.target.files?.[0];
    Object.assign(importation, { fichier: fichier ?? null, nom: fichier?.name ?? '', apercu: null, colonnes: [], reconnues: [], confirme: false, resultat: null, erreur: '' });

    if (!fichier) {
        return;
    }

    if (!importation.activiteId) {
        importation.erreur = 'Choisissez d’abord l’activité.';

        return;
    }

    try {
        const { colonnes, reconnues, lignes } = await lireTableur(fichier);
        const manquantes = ['nom', 'telephone', 'sexe'].filter((cle) => !reconnues.includes(cle));

        if (manquantes.length > 0) {
            throw new Error(`Colonnes obligatoires introuvables : ${manquantes.map((cle) => ({ nom: 'Nom complet', telephone: 'Téléphone', sexe: 'Sexe' }[cle])).join(', ')}. Partez du modèle Excel.`);
        }

        Object.assign(importation, { colonnes, reconnues, apercu: await preparerImport(importation.activiteId, lignes) });
    } catch (probleme) {
        importation.erreur = probleme.message;
    }
}

async function importer() {
    const resultat = await agir('import', () => importerInscriptions(importation.activiteId, importation.apercu, importation.nom), (bilan) => `Import terminé : ${bilan.ajoutees} personne(s) ajoutée(s).`);

    if (resultat) {
        Object.assign(importation, { resultat, apercu: null, fichier: null, confirme: false });

        if (champFichier.value) {
            champFichier.value.value = '';
        }
    }
}

onMounted(async () => {
    activites.value = await listerActivitesAdmin({ archivees: 'toutes' });
    exportation.activiteId = activites.value.find((activite) => !activite.archivee)?.id ?? '';
    importation.activiteId = activites.value.find((activite) => !activite.archivee && activite.statut !== 'terminee')?.id ?? '';
    await charger();
});
</script>

<template>
    <div class="mx-auto flex max-w-5xl flex-col gap-6">
        <header class="flex flex-col gap-2">
            <RouterLink :to="{ name: 'admin-rapports' }" class="inline-flex items-center gap-1 self-start text-sm font-semibold text-lien"><Icone nom="chevron-gauche" class="size-4" /> Rapports et statistiques</RouterLink>
            <h1 class="text-3xl font-extrabold tracking-tight">Exports et imports</h1>
            <p class="text-encre-douce">Excel (.xlsx) et CSV. Les fichiers sont fabriqués et lus dans votre navigateur.</p>
        </header>

        <Alerte v-if="MODE_DEMONSTRATION" ton="info" titre="Démonstration">Les fichiers exportés contiennent des personnes fictives. Avec Supabase, seuls l’administrateur et les Responsables autorisés pourront exporter.</Alerte>

        <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-export">
            <h2 id="titre-export" class="flex items-center gap-2 text-lg font-bold"><Icone nom="telecharger" class="size-5 text-or-600" /> Exporter</h2>
            <div class="grid gap-4 sm:grid-cols-3">
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Données
                    <select v-model="exportation.jeu" class="champ-saisie font-normal">
                        <option v-for="(libelle, cle) in JEUX" :key="cle" :value="cle">{{ libelle }}</option>
                    </select>
                </label>
                <label v-if="exportation.jeu !== 'statistiques'" class="flex flex-col gap-1.5 text-sm font-semibold">Activité
                    <select v-model="exportation.activiteId" class="champ-saisie font-normal">
                        <option v-if="exportation.jeu === 'reponses'" value="">Tous les courriers</option>
                        <option v-for="activite in activites" :key="activite.id" :value="activite.id">{{ activite.titre }}{{ activite.edition ? ` · ${activite.edition}` : '' }}</option>
                    </select>
                </label>
                <fieldset class="flex flex-col gap-1.5">
                    <legend class="text-sm font-semibold">Format</legend>
                    <div class="flex gap-4 pt-2">
                        <label class="flex items-center gap-2 text-sm"><input v-model="exportation.format" type="radio" value="xlsx" class="size-4 accent-[var(--c-accent)]"> Excel</label>
                        <label class="flex items-center gap-2 text-sm"><input v-model="exportation.format" type="radio" value="csv" class="size-4 accent-[var(--c-accent)]"> CSV</label>
                    </div>
                </fieldset>
            </div>
            <label v-if="exportation.jeu === 'inscriptions'" class="flex items-start gap-2 text-sm"><input v-model="exportation.coordonnees" type="checkbox" class="mt-1 size-4 accent-[var(--c-accent)]"> Inclure les numéros de téléphone (données personnelles : votre mot de passe sera demandé).</label>
            <p v-if="exportation.jeu === 'reponses'" class="text-sm text-encre-douce">Une ligne par destinataire : secrétariat, statut de réponse, présence ou absence, motif. Les brouillons apparaissent comme « non comptés ».</p>

            <ConfirmationSensible v-if="demandeConfirmation" titre="Export de données personnelles" libelle-bouton="Exporter avec les numéros" ton="attention" @confirmer="exporter" @annuler="demandeConfirmation = false">
                Le fichier contiendra les numéros de téléphone. Gardez-le sur un appareil protégé, ne le transférez pas dans un groupe, et supprimez-le quand il ne sert plus.
            </ConfirmationSensible>
            <button v-else type="button" class="bouton-primaire self-start" :disabled="enCours === 'export'" @click="demanderExport"><Icone nom="telecharger" class="size-4" /> {{ enCours === 'export' ? 'Préparation…' : 'Télécharger le fichier' }}</button>
            <p v-if="erreurDe('export')" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe('export') }}</p>
        </section>

        <section class="carte flex flex-col gap-4 p-6" aria-labelledby="titre-import">
            <h2 id="titre-import" class="flex items-center gap-2 text-lg font-bold"><Icone nom="importer" class="size-5 text-or-600" /> Importer une liste d’inscriptions</h2>
            <ol class="list-decimal pl-5 text-sm text-encre-douce">
                <li>Téléchargez le modèle Excel et remplissez une ligne par personne.</li>
                <li>Choisissez l’activité, puis le fichier (.xlsx ou .csv) : un aperçu montre chaque erreur.</li>
                <li>Confirmez : les lignes valides sont ajoutées, les erreurs écartées. Un numéro déjà inscrit est ajouté mais signalé comme doublon possible, sans rien modifier.</li>
            </ol>
            <button type="button" class="bouton-secondaire self-start" @click="telecharger(modeleImport(), 'modele-import-sereh.xlsx')"><Icone nom="document" class="size-4" /> Télécharger le modèle Excel</button>
            <div class="grid gap-4 sm:grid-cols-2">
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Activité
                    <select v-model="importation.activiteId" class="champ-saisie font-normal" @change="importation.apercu = null">
                        <option value="" disabled>Choisir…</option>
                        <option v-for="activite in activites.filter((candidate) => !candidate.archivee)" :key="activite.id" :value="activite.id">{{ activite.titre }}{{ activite.edition ? ` · ${activite.edition}` : '' }}</option>
                    </select>
                </label>
                <label class="flex flex-col gap-1.5 text-sm font-semibold">Fichier
                    <input ref="champFichier" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="champ-saisie font-normal" @change="choisirFichier">
                </label>
            </div>
            <p v-if="importation.erreur" class="text-sm font-semibold text-danger" role="alert">{{ importation.erreur }}</p>

            <template v-if="importation.apercu">
                <div class="flex flex-wrap gap-2 text-sm">
                    <span class="rounded-xl bg-surface-2 px-3 py-2 font-semibold">{{ comptesApercu.total }} ligne{{ comptesApercu.total > 1 ? 's' : '' }}</span>
                    <span class="rounded-xl bg-ok-fond px-3 py-2 font-semibold text-ok">{{ comptesApercu.valides }} valide{{ comptesApercu.valides > 1 ? 's' : '' }}</span>
                    <span class="rounded-xl bg-attention-fond px-3 py-2 font-semibold text-attention">{{ comptesApercu.doublons }} doublon{{ comptesApercu.doublons > 1 ? 's' : '' }} possible{{ comptesApercu.doublons > 1 ? 's' : '' }}</span>
                    <span class="rounded-xl bg-danger-fond px-3 py-2 font-semibold text-danger">{{ comptesApercu.rejetees }} rejetée{{ comptesApercu.rejetees > 1 ? 's' : '' }}</span>
                </div>
                <div class="max-h-96 overflow-auto rounded-xl border border-ligne">
                    <table class="w-full min-w-[40rem] text-left text-sm">
                        <thead class="sticky top-0 bg-surface-2 text-xs tracking-wide text-encre-douce uppercase">
                            <tr><th scope="col" class="px-3 py-2">Ligne</th><th scope="col" class="px-3 py-2">Nom</th><th scope="col" class="px-3 py-2">Téléphone</th><th scope="col" class="px-3 py-2">Sexe</th><th scope="col" class="px-3 py-2">Vérification</th></tr>
                        </thead>
                        <tbody>
                            <tr v-for="ligne in importation.apercu" :key="ligne.numero" class="border-t border-ligne align-top">
                                <td class="px-3 py-2 tabular-nums">{{ ligne.numero }}</td>
                                <td class="px-3 py-2">{{ ligne.valeurs.nom || '—' }}</td>
                                <td class="px-3 py-2 font-mono text-xs">{{ ligne.valeurs.telephone || '—' }}</td>
                                <td class="px-3 py-2">{{ ligne.valeurs.sexe === 'femme' ? 'Femme' : ligne.valeurs.sexe === 'homme' ? 'Homme' : '—' }}</td>
                                <td class="px-3 py-2">
                                    <span v-if="ligne.erreurs.length > 0" class="font-semibold text-danger">Rejetée : {{ ligne.erreurs.join(', ') }}</span>
                                    <span v-else-if="ligne.doublon" class="font-semibold text-attention">{{ ligne.doublon === 'deja-inscrit' ? 'Numéro déjà inscrit : doublon à examiner' : 'Numéro répété dans le fichier : doublon à examiner' }}</span>
                                    <span v-else class="font-semibold text-ok">Valide</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <label class="flex items-start gap-2 text-sm"><input v-model="importation.confirme" type="checkbox" class="mt-1 size-4 accent-[var(--c-accent)]"> J’importe {{ comptesApercu.valides }} ligne{{ comptesApercu.valides > 1 ? 's' : '' }} valide{{ comptesApercu.valides > 1 ? 's' : '' }} dans « {{ activiteImport?.titre }} ». Les {{ comptesApercu.rejetees }} ligne(s) rejetée(s) seront écartées.</label>
                <p v-if="erreurDe('import')" class="text-sm font-semibold text-danger" role="alert">{{ erreurDe('import') }}</p>
                <button type="button" class="bouton-primaire self-start" :disabled="!importation.confirme || comptesApercu.valides === 0 || enCours === 'import'" @click="importer"><Icone nom="importer" class="size-4" /> Importer</button>
            </template>

            <Alerte v-if="importation.resultat" ton="ok" titre="Résumé de l’import">
                {{ importation.resultat.traitees }} ligne(s) traitée(s) : {{ importation.resultat.ajoutees }} personne(s) ajoutée(s), {{ importation.resultat.doublons }} doublon(s) à vérifier dans les Inscriptions, {{ importation.resultat.rejetees }} ligne(s) rejetée(s).
            </Alerte>

            <div v-if="imports.length > 0" class="flex flex-col gap-2 border-t border-ligne pt-4">
                <h3 class="text-sm font-bold">Imports précédents</h3>
                <ul class="flex flex-col gap-1.5 text-sm">
                    <li v-for="(entree, index) in imports" :key="index" class="rounded-lg bg-surface-2 p-2.5"><span class="font-semibold">{{ entree.fichier }}</span> → {{ entree.activite }} · {{ entree.ajoutees }} ajoutée(s), {{ entree.doublons }} doublon(s), {{ entree.rejetees }} rejetée(s) <span class="text-xs text-encre-douce">· {{ instant(entree.le) }}, {{ entree.auteur }}</span></li>
                </ul>
            </div>
        </section>

        <MessageFlottant :texte="confirmation" @fermer="confirmation = ''" />
    </div>
</template>
