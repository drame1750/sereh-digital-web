import { reactive, watch } from 'vue';

const CLE_STOCKAGE = 'sereh.affichage';

/** Réglages par défaut : tout suit l'appareil (cahier des charges, section 8). */
const REGLAGES_PAR_DEFAUT = {
    theme: 'auto',
    texte: 'normal',
    contraste: 'normal',
    animations: 'oui',
};

const VALEURS_PERMISES = {
    theme: ['auto', 'clair', 'sombre'],
    texte: ['normal', 'grand'],
    contraste: ['normal', 'renforce'],
    animations: ['oui', 'non'],
};

const preferenceSombre = window.matchMedia('(prefers-color-scheme: dark)');
const preferenceMouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');

/**
 * Réglages du menu Affichage, mémorisés sur cet appareil seulement. Le stockage peut être indisponible
 * (navigation privée, réglages du navigateur) : le site fonctionne alors avec les réglages par défaut.
 */
export const reglages = reactive({ ...REGLAGES_PAR_DEFAUT, ...lireReglages() });

function lireReglages() {
    try {
        const enregistres = JSON.parse(window.localStorage.getItem(CLE_STOCKAGE) ?? '{}');

        return Object.fromEntries(
            Object.entries(enregistres).filter(([cle, valeur]) => VALEURS_PERMISES[cle]?.includes(valeur)),
        );
    } catch {
        return {};
    }
}

function enregistrerReglages() {
    try {
        window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(reglages));
    } catch {
        // Stockage indisponible : le réglage vaut pour cette visite seulement.
    }
}

/** Applique les réglages sur <html>, où la feuille de style les lit. */
function appliquerReglages() {
    const racine = document.documentElement;
    const sombre = reglages.theme === 'sombre' || (reglages.theme === 'auto' && preferenceSombre.matches);
    const animations = reglages.animations === 'oui' && !preferenceMouvementReduit.matches;

    racine.dataset.theme = sombre ? 'sombre' : 'clair';
    racine.dataset.texte = reglages.texte;
    racine.dataset.contraste = reglages.contraste;
    racine.dataset.animations = animations ? 'oui' : 'non';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', sombre ? '#0c140f' : '#053f16');
}

/** Vrai quand les animations peuvent jouer (interrupteur actif et appareil d'accord). */
export function animationsActives() {
    return document.documentElement.dataset.animations === 'oui';
}

export function remettreParDefaut() {
    Object.assign(reglages, REGLAGES_PAR_DEFAUT);
}

export function installerAffichage() {
    appliquerReglages();
    watch(reglages, () => {
        appliquerReglages();
        enregistrerReglages();
    });
    preferenceSombre.addEventListener('change', appliquerReglages);
    preferenceMouvementReduit.addEventListener('change', appliquerReglages);
}
