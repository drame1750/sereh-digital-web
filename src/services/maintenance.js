import { reactive } from 'vue';

/**
 * Mode maintenance (cahier des charges, section 11). Pendant la maintenance, les modifications sont
 * bloquées ; l'administrateur peut encore consulter et vérifier. Seul l'administrateur principal
 * l'active, depuis « État du système ».
 *
 * VERSION DE DÉMONSTRATION : l'interrupteur vaut pour cet onglet. Avec Supabase, il sera gardé par
 * le serveur, qui refusera lui-même toute écriture tant qu'il est actif.
 */
const CLE_STOCKAGE = 'sereh.demonstration.maintenance';

function lire() {
    try {
        const enregistre = JSON.parse(window.sessionStorage.getItem(CLE_STOCKAGE) ?? 'null');

        if (typeof enregistre?.active === 'boolean') {
            return enregistre;
        }
    } catch {
        // Stockage indisponible : pas de maintenance.
    }

    return { active: false, depuis: null, par: null, message: '' };
}

export const maintenance = reactive(lire());

export function enregistrerMaintenance() {
    try {
        window.sessionStorage.setItem(CLE_STOCKAGE, JSON.stringify(maintenance));
    } catch {
        // Stockage indisponible : l'état vaut pour cette page seulement.
    }
}

/** À appeler avant toute écriture : refuse l'opération pendant la maintenance. */
export function verifierHorsMaintenance() {
    if (maintenance.active) {
        throw new Error('Maintenance en cours : les modifications sont bloquées. Vous pouvez seulement consulter.');
    }
}
