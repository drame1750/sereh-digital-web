<script setup>
import { computed, onMounted, ref } from 'vue';
import Alerte from '../../components/Alerte.vue';
import BadgeStatut from '../../components/BadgeStatut.vue';
import Icone from '../../components/Icone.vue';
import { listerMembres } from '../../services/courriers.js';
import { MODE_DEMONSTRATION } from '../../services/donnees.js';

/**
 * Membres du bureau régional et l'état de leurs courriers : reçus, non consultés, sans réponse,
 * confirmés. La création des comptes et les remplacements temporaires relèvent de la rubrique
 * Comptes et utilisateurs.
 */
const membres = ref(null);

const groupes = computed(() => {
    const parGroupe = new Map();

    for (const membre of membres.value ?? []) {
        if (!parGroupe.has(membre.groupe)) {
            parGroupe.set(membre.groupe, []);
        }

        parGroupe.get(membre.groupe).push(membre);
    }

    return [...parGroupe.entries()].map(([groupe, liste]) => ({ groupe, membres: liste }));
});

onMounted(async () => {
    membres.value = await listerMembres();
});
</script>

<template>
    <div class="mx-auto flex max-w-6xl flex-col gap-6">
        <header class="flex flex-wrap items-end justify-between gap-4">
            <div class="flex flex-col gap-2">
                <p class="surtitre">Bureau</p>
                <h1 class="text-3xl font-extrabold tracking-tight">Secrétaires régionaux</h1>
            </div>
            <RouterLink :to="{ name: 'admin-courrier-nouveau' }" class="bouton-primaire"><Icone nom="courrier" class="size-4" /> Affecter un courrier</RouterLink>
        </header>

        <Alerte v-if="MODE_DEMONSTRATION" ton="info" titre="Démonstration">
            Les membres sont fictifs. Les noms complets des secrétariats et la liste réelle du bureau restent à fournir ; la création des comptes arrivera avec la rubrique « Comptes et utilisateurs ».
        </Alerte>

        <div v-if="!membres" class="grid gap-4 sm:grid-cols-2" aria-hidden="true">
            <div v-for="index in 4" :key="index" class="squelette h-40" />
        </div>

        <section v-for="groupe in groupes" :key="groupe.groupe" class="flex flex-col gap-3" :aria-labelledby="`groupe-${groupe.groupe}`">
            <h2 :id="`groupe-${groupe.groupe}`" class="titre-section text-lg">{{ groupe.groupe === 'Direction' ? 'Direction du bureau' : groupe.groupe }}</h2>
            <div class="grid gap-4 sm:grid-cols-2">
                <article v-for="membre in groupe.membres" :key="membre.id" class="carte flex flex-col gap-4 p-5">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <p class="font-bold">{{ membre.nom }}</p>
                            <p class="text-sm text-encre-douce">{{ membre.poste }}</p>
                        </div>
                        <span v-if="membre.compteDemonstration" class="rounded-full bg-info-fond px-2.5 py-1 text-xs font-semibold text-info">Compte de démonstration</span>
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
    </div>
</template>
