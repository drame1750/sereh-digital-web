import QRCode from 'qrcode';
import { dateLongue } from './donnees-exemple.js';

/**
 * Billets et QR codes des personnes inscrites. Le QR code ne contient que le code aléatoire de
 * l'inscription, jamais de donnée personnelle (cahier des charges, section 5).
 */
export function qrCodeImage(code, largeur = 280) {
    return QRCode.toDataURL(code, { width: largeur, margin: 1, errorCorrectionLevel: 'Q', color: { dark: '#032a10', light: '#ffffff' } });
}

/** Libellé du rôle, accordé au sexe de la personne. */
export function libelleRole(personne) {
    const femme = personne.sexe === 'femme';

    if (personne.role === 'accompagnateur') {
        return femme ? 'Accompagnatrice' : 'Accompagnateur';
    }

    return femme ? 'Inscrite' : 'Inscrit';
}

const POLICE = '"Montserrat Variable", Montserrat, system-ui, sans-serif';

function texteCentre(contexte, texte, y, taille, graisse, couleur, largeurMax) {
    contexte.font = `${graisse} ${taille}px ${POLICE}`;
    contexte.fillStyle = couleur;
    contexte.textAlign = 'center';
    let ligne = texte;

    while (contexte.measureText(ligne).width > largeurMax && ligne.length > 4) {
        ligne = `${ligne.slice(0, -2).trimEnd()}…`;
    }

    contexte.fillText(ligne, 540, y);
}

/**
 * Billet PNG d'une personne, à enregistrer dans la galerie du téléphone ou à imprimer.
 *
 * @returns {Promise<Blob>}
 */
export async function billetPng(personne, activite, { demonstration = false } = {}) {
    await document.fonts.load(`700 48px ${POLICE}`).catch(() => {});

    const canevas = document.createElement('canvas');
    canevas.width = 1080;
    canevas.height = 1620;
    const contexte = canevas.getContext('2d');

    // Fond parchemin et carte ivoire.
    contexte.fillStyle = '#f3ead7';
    contexte.fillRect(0, 0, 1080, 1620);
    contexte.fillStyle = '#fbf6ea';
    contexte.beginPath();
    contexte.roundRect(48, 48, 984, 1524, 48);
    contexte.fill();

    // En-tête vert, filet doré.
    const degrade = contexte.createLinearGradient(48, 48, 1032, 420);
    degrade.addColorStop(0, '#0b5d2a');
    degrade.addColorStop(1, '#032a10');
    contexte.fillStyle = degrade;
    contexte.beginPath();
    contexte.roundRect(48, 48, 984, 380, [48, 48, 0, 0]);
    contexte.fill();
    contexte.fillStyle = '#c9a24a';
    contexte.fillRect(48, 428, 984, 8);

    texteCentre(contexte, 'SEREH DIGITAL', 140, 30, 700, '#e8cf8e', 880);
    texteCentre(contexte, activite.titre, 230, 64, 800, '#ffffff', 880);
    texteCentre(contexte, activite.edition, 296, 36, 600, '#f0d98f', 880);
    const date = dateLongue(activite.date);
    texteCentre(contexte, `${date.charAt(0).toUpperCase()}${date.slice(1)} · ${activite.heure}`, 370, 32, 500, '#eef7f0', 880);

    texteCentre(contexte, personne.nom, 540, 58, 800, '#2b2118', 880);
    texteCentre(contexte, libelleRole(personne), 604, 34, 600, '#7d6120', 880);

    const qr = new Image();
    qr.src = await qrCodeImage(personne.codeQr, 640);
    await qr.decode();
    contexte.drawImage(qr, 220, 660, 640, 640);

    const admise = personne.statut === 'admise';
    texteCentre(contexte, activite.lieu, 1380, 36, 600, '#2b2118', 880);
    texteCentre(contexte, admise ? 'Inscription admise' : 'Inscription en attente : pas encore valable à l’entrée', 1440, 32, 700, admise ? '#0b6b2f' : '#7a5a12', 900);
    texteCentre(contexte, demonstration ? 'Billet de démonstration : non valable' : 'Présentez ce QR code à l’entrée', 1510, 28, 500, '#5c4f42', 880);

    return new Promise((resoudre) => canevas.toBlob(resoudre, 'image/png'));
}

/** Déclenche l'enregistrement d'un fichier sur l'appareil. */
export function telecharger(blob, nomFichier) {
    const adresse = URL.createObjectURL(blob);
    const lien = Object.assign(document.createElement('a'), { href: adresse, download: nomFichier });
    document.body.append(lien);
    lien.click();
    lien.remove();
    setTimeout(() => URL.revokeObjectURL(adresse), 1000);
}
