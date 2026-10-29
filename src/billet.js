import QRCode from 'qrcode';
import { dateLongue } from './donnees-exemple.js';
import { chargerPolices, fond, HAUTEUR, LARGEUR, mm, police } from './lettre.js';

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

/**
 * Planches A4 de QR codes à imprimer en lot : huit cartes par page (deux colonnes, quatre rangées),
 * chacune avec l'activité, le nom, le rôle et le QR code. Format provisoire, en attendant le format
 * définitif des badges.
 *
 * @returns {Promise<HTMLCanvasElement[]>}
 */
export async function planchesDeQrCodes(personnes, activite, { demonstration = false } = {}) {
    await chargerPolices();
    const pages = [];
    const colonnes = 2;
    const rangees = 4;
    const marge = mm(10);
    const largeurCarte = (LARGEUR - 2 * marge) / colonnes;
    const hauteurCarte = (HAUTEUR - 2 * marge) / rangees;
    const tailleQr = hauteurCarte - mm(18);
    const date = dateLongue(activite.date);
    let contexte;

    const ecrire = (texte, x, y, largeur, style, couleur) => {
        contexte.font = style;
        contexte.fillStyle = couleur;
        let ligne = texte;

        while (contexte.measureText(ligne).width > largeur && ligne.length > 4) {
            ligne = `${ligne.slice(0, -2).trimEnd()}…`;
        }

        contexte.fillText(ligne, x, y);
    };

    for (const [index, personne] of personnes.entries()) {
        if (index % (colonnes * rangees) === 0) {
            const canevas = Object.assign(document.createElement('canvas'), { width: LARGEUR, height: HAUTEUR });
            contexte = canevas.getContext('2d');
            fond(contexte, demonstration);
            pages.push(canevas);
        }

        const place = index % (colonnes * rangees);
        const x = marge + (place % colonnes) * largeurCarte;
        const y = marge + Math.floor(place / colonnes) * hauteurCarte;

        // Trait de découpe en pointillés.
        contexte.save();
        contexte.setLineDash([mm(2), mm(1.5)]);
        contexte.strokeStyle = 'rgb(29 26 22 / 0.35)';
        contexte.lineWidth = mm(0.25);
        contexte.strokeRect(x, y, largeurCarte, hauteurCarte);
        contexte.restore();

        contexte.fillStyle = '#0b5d2a';
        contexte.fillRect(x, y, largeurCarte, mm(9));
        ecrire(`${activite.titre}${activite.edition ? ` · ${activite.edition}` : ''}`, x + mm(4), y + mm(6.2), largeurCarte - mm(8), police(9, 700), '#ffffff');

        const qr = new Image();
        qr.src = await qrCodeImage(personne.codeQr, Math.round(tailleQr));
        await qr.decode();
        contexte.drawImage(qr, x + mm(4), y + mm(13), tailleQr, tailleQr);

        const texteX = x + mm(8) + tailleQr;
        const largeurTexte = largeurCarte - tailleQr - mm(12);
        ecrire(personne.nom, texteX, y + mm(22), largeurTexte, police(10.5, 800), '#2b2118');
        ecrire(libelleRole(personne), texteX, y + mm(28), largeurTexte, police(9, 600), '#7d6120');
        ecrire(`${date.charAt(0).toUpperCase()}${date.slice(1)}`, texteX, y + mm(36), largeurTexte, police(8.5, 500), '#5c4f42');
        ecrire(`${activite.heure} · ${activite.lieu}`, texteX, y + mm(41), largeurTexte, police(8.5, 500), '#5c4f42');
        ecrire(demonstration ? 'Démonstration : non valable' : 'À présenter à l’entrée', texteX, y + mm(49), largeurTexte, police(8, 600, 'italic'), '#0b6b2f');
    }

    return pages;
}
