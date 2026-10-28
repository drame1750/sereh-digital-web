/**
 * Numéros ivoiriens au format international : +225 suivi des 10 chiffres (01, 05, 07, 21, 25 ou 27).
 * Même règle que les fonctions serveur des essais (sereh-essais) : les deux doivent rester identiques.
 */
export function normaliserTelephone(valeur) {
    let chiffres = String(valeur).replace(/[\s.\-()/]/g, '');

    if (chiffres.startsWith('+225')) {
        chiffres = chiffres.slice(4);
    } else if (chiffres.startsWith('00225')) {
        chiffres = chiffres.slice(5);
    } else if (chiffres.length === 13 && chiffres.startsWith('225')) {
        chiffres = chiffres.slice(3);
    }

    return /^(0[157]|2[157])\d{8}$/.test(chiffres) ? `+225${chiffres}` : null;
}

/** Domaine fictif réservé : aucun courriel ne peut y être envoyé. */
export const DOMAINE_IDENTIFIANT = 'telephone.sereh.invalid';

/** Adresse technique tirée du numéro, pour la variante « identifiant » de l'essai 1. */
export function identifiantTechnique(telephoneNormalise) {
    return `${telephoneNormalise.slice(1)}@${DOMAINE_IDENTIFIANT}`;
}

/** Présente un numéro enregistré sous la forme lisible « 07 07 07 07 07 ». */
export function formaterTelephone(telephoneNormalise) {
    return telephoneNormalise.slice(4).replace(/(\d{2})(?=\d)/g, '$1 ');
}
