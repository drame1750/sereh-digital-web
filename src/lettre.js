import logoAdresse from './assets/logo-aeemci-provisoire.jpg';
import { dateSimple } from './donnees-exemple.js';

/**
 * Courrier officiel créé sur la plateforme, d'après le modèle de courrier du SEREH : en-tête AEEMCI,
 * référence, « Katiola, le … », destinataire, objet, texte, signature par le nom et le titre (sans
 * image de signature ni de cachet), pied de page et devise.
 *
 * Chaque page est dessinée comme une feuille A4 à 200 points par pouce, puis rangée dans un vrai
 * fichier PDF, sans service extérieur. Le texte du PDF est une image : pour un courrier à signer, on
 * l'imprime, on le signe, on le scanne, puis on importe le PDF signé à la place.
 */
const DPI = 200;
const mm = (valeur) => (valeur * DPI) / 25.4;
const pt = (valeur) => (valeur * DPI) / 72;

const LARGEUR = Math.round(mm(210));
const HAUTEUR = Math.round(mm(297));
const MARGE = mm(22);
const BAS = HAUTEUR - mm(32);
const HAUT_SUITE = mm(30);
const INTERLIGNE = pt(11) * 1.5;

const POLICE = '"Montserrat Variable", Montserrat, system-ui, sans-serif';
const ENCRE = '#1d1a16';
const ENCRE_DOUCE = '#5c4f42';
const VERT = '#0b5d2a';
const OR = '#c9a24a';

const police = (taille, graisse = 400, style = 'normal') => `${style} ${graisse} ${pt(taille)}px ${POLICE}`;

/** Espaces insécables de la typographie française : « Objet : » ne se coupe jamais avant le deux-points. */
function typographier(texte) {
    return texte
        .replace(/[ \t]+([?!:;»])/g, ' $1')
        .replace(/«[ \t]+/g, '« ')
        .replace(/'/g, '’');
}

function couperEnLignes(contexte, texte, largeur, retrait = 0) {
    const mots = typographier(texte).replace(/[ \t]+/g, ' ').trim().split(' ').filter(Boolean);
    const lignes = [];
    let ligne = [];
    let disponible = largeur - retrait;

    for (const mot of mots) {
        if (ligne.length > 0 && contexte.measureText([...ligne, mot].join(' ')).width > disponible) {
            lignes.push(ligne);
            ligne = [];
            disponible = largeur;
        }

        ligne.push(mot);
    }

    if (ligne.length > 0) {
        lignes.push(ligne);
    }

    return lignes;
}

/** Ligne justifiée, sauf si les espaces deviendraient trop larges. */
function ecrireLigne(contexte, mots, x, y, largeur, justifier) {
    const largeurMots = mots.reduce((total, mot) => total + contexte.measureText(mot).width, 0);
    const espace = mots.length > 1 ? (largeur - largeurMots) / (mots.length - 1) : 0;

    if (!justifier || mots.length < 2 || espace > contexte.measureText(' ').width * 3) {
        contexte.fillText(mots.join(' '), x, y);

        return;
    }

    let position = x;

    for (const mot of mots) {
        contexte.fillText(mot, position, y);
        position += contexte.measureText(mot).width + espace;
    }
}

function texteCentre(contexte, texte, x, y, style, couleur) {
    contexte.font = style;
    contexte.fillStyle = couleur;
    contexte.textAlign = 'center';
    contexte.fillText(texte, x, y);
    contexte.textAlign = 'left';
}

async function chargerPolices() {
    await Promise.all([400, 600, 700, 800].map((graisse) => document.fonts.load(`${graisse} 40px ${POLICE}`).catch(() => {})));
}

let logoCharge = null;

function chargerLogo() {
    logoCharge ??= new Promise((resoudre) => {
        const image = new Image();
        image.onload = () => resoudre(image);
        image.onerror = () => resoudre(null);
        image.src = logoAdresse;
    });

    return logoCharge;
}

function fond(contexte, demonstration) {
    contexte.fillStyle = '#ffffff';
    contexte.fillRect(0, 0, LARGEUR, HAUTEUR);

    if (demonstration) {
        contexte.save();
        contexte.translate(LARGEUR / 2, HAUTEUR / 2);
        contexte.rotate(-Math.PI / 5);
        texteCentre(contexte, 'EXEMPLE · DÉMONSTRATION', 0, 0, police(54, 800), 'rgb(11 93 42 / 0.07)');
        contexte.restore();
    }

    contexte.textBaseline = 'alphabetic';
}

function enTete(contexte, logo, lettre) {
    const hauteurLogo = mm(20);

    if (logo) {
        const largeurLogo = (hauteurLogo * logo.width) / logo.height;
        contexte.drawImage(logo, MARGE, mm(11), largeurLogo, hauteurLogo);
        texteCentre(contexte, 'AEEMCI', MARGE + largeurLogo / 2, mm(37), police(13, 800), VERT);
    } else {
        texteCentre(contexte, 'AEEMCI', MARGE + mm(13), mm(24), police(15, 800), VERT);
    }

    const centreDroite = LARGEUR - MARGE - mm(36);
    texteCentre(contexte, 'République de Côte d’Ivoire', centreDroite, mm(20), police(11.5, 700), ENCRE);
    texteCentre(contexte, 'Union - Discipline - Travail', centreDroite, mm(26), police(10, 500, 'italic'), ENCRE_DOUCE);

    // Filet aux couleurs nationales : orange, blanc, vert.
    const largeurFilet = mm(24);
    contexte.fillStyle = '#f77f00';
    contexte.fillRect(centreDroite - largeurFilet / 2, mm(28.5), largeurFilet / 3, mm(0.8));
    contexte.fillStyle = '#009e60';
    contexte.fillRect(centreDroite + largeurFilet / 6, mm(28.5), largeurFilet / 3, mm(0.8));

    texteCentre(contexte, 'Association des Elèves et Etudiants Musulmans de Côte d’Ivoire', LARGEUR / 2, mm(47), police(11.5, 700), VERT);
    texteCentre(contexte, lettre.organeEmetteur.toLocaleUpperCase('fr'), LARGEUR / 2, mm(54), police(12.5, 800), ENCRE);

    contexte.fillStyle = OR;
    contexte.fillRect(MARGE, mm(57.5), LARGEUR - 2 * MARGE, mm(0.9));
    contexte.fillStyle = VERT;
    contexte.fillRect(MARGE, mm(59), LARGEUR - 2 * MARGE, mm(0.3));

    // Référence à gauche, lieu et date à droite.
    const ligneReference = mm(69);
    contexte.font = police(10.5, 700);
    contexte.fillStyle = ENCRE;
    contexte.fillText('N/Réf. :', MARGE, ligneReference);
    const decalage = contexte.measureText('N/Réf. : ').width;
    contexte.font = police(10.5, 500);
    contexte.fillText(lettre.reference || '……………', MARGE + decalage, ligneReference);
    contexte.textAlign = 'right';
    contexte.fillText(`${lettre.lieu}, le ${lettre.date ? dateSimple(lettre.date) : '……………'}`, LARGEUR - MARGE, ligneReference);
    contexte.textAlign = 'left';

    // Destinataire, dans la moitié droite.
    const gaucheDestinataire = LARGEUR / 2 + mm(4);
    const largeurDestinataire = LARGEUR - MARGE - gaucheDestinataire;
    let y = mm(82);
    contexte.font = police(11, 700);
    contexte.fillText('À', gaucheDestinataire, y);
    contexte.font = police(11, 500);

    for (const ligne of lettre.destinataire.split('\n')) {
        for (const mots of couperEnLignes(contexte, ligne, largeurDestinataire)) {
            y += INTERLIGNE;
            contexte.fillText(mots.join(' '), gaucheDestinataire, y);
        }
    }

    return y + mm(12);
}

function suite(contexte, lettre, numero) {
    contexte.font = police(9, 500);
    contexte.fillStyle = ENCRE_DOUCE;
    contexte.fillText(`N/Réf. : ${lettre.reference} — suite, page ${numero}`, MARGE, mm(18));
    contexte.fillStyle = OR;
    contexte.fillRect(MARGE, mm(21), LARGEUR - 2 * MARGE, mm(0.4));
}

function piedDePage(contexte, lettre, numero, total) {
    contexte.fillStyle = OR;
    contexte.fillRect(MARGE, HAUTEUR - mm(25), LARGEUR - 2 * MARGE, mm(0.4));
    texteCentre(contexte, `${lettre.siege} · ${lettre.contacts}`, LARGEUR / 2, HAUTEUR - mm(19.5), police(8.5, 500), ENCRE_DOUCE);
    texteCentre(contexte, lettre.devise, LARGEUR / 2, HAUTEUR - mm(13.5), police(10, 700, 'italic'), VERT);

    if (total > 1) {
        contexte.font = police(8.5, 600);
        contexte.fillStyle = ENCRE_DOUCE;
        contexte.textAlign = 'right';
        contexte.fillText(`${numero}/${total}`, LARGEUR - MARGE, HAUTEUR - mm(13.5));
        contexte.textAlign = 'left';
    }
}

/**
 * Dessine les pages du courrier.
 *
 * @param {object} lettre en-tête, contenu et signature (voir PARAMETRES_COURRIER et le contenu d'un courrier)
 * @returns {Promise<HTMLCanvasElement[]>}
 */
export async function pagesDeLettre(lettre, { demonstration = false } = {}) {
    await chargerPolices();
    const logo = await chargerLogo();
    const pages = [];
    const largeurTexte = LARGEUR - 2 * MARGE;
    let contexte;

    const nouvellePage = () => {
        const canevas = Object.assign(document.createElement('canvas'), { width: LARGEUR, height: HAUTEUR });
        contexte = canevas.getContext('2d');
        fond(contexte, demonstration);
        pages.push(canevas);
    };

    nouvellePage();
    let y = enTete(contexte, logo, lettre);

    const garderPlace = (hauteur) => {
        if (y + hauteur > BAS) {
            nouvellePage();
            suite(contexte, lettre, pages.length);
            y = HAUT_SUITE;
        }
    };

    // Objet, avec un retrait pour les lignes suivantes.
    contexte.font = police(11, 800);
    contexte.fillStyle = ENCRE;
    const etiquette = 'Objet : ';
    const retrait = contexte.measureText(etiquette).width;
    contexte.fillText(etiquette, MARGE, y);
    contexte.fillRect(MARGE, y + mm(1), contexte.measureText('Objet').width, mm(0.3));
    contexte.font = police(11, 700);

    for (const [index, mots] of couperEnLignes(contexte, lettre.objet, largeurTexte, retrait).entries()) {
        if (index > 0) {
            y += INTERLIGNE;
        }

        contexte.fillText(mots.join(' '), MARGE + retrait, y);
    }

    y += mm(11);
    contexte.font = police(11, 500);
    contexte.fillText(typographier(lettre.formule), MARGE, y);
    y += mm(4);

    // Corps : paragraphes séparés par une ligne vide, retours à la ligne respectés, texte justifié.
    for (const paragraphe of lettre.corps.split(/\n\s*\n/)) {
        y += mm(3);

        for (const morceau of paragraphe.split('\n')) {
            const lignes = couperEnLignes(contexte, morceau, largeurTexte);

            for (const [index, mots] of lignes.entries()) {
                garderPlace(INTERLIGNE);
                y += INTERLIGNE;
                contexte.font = police(11, 500);
                contexte.fillStyle = ENCRE;
                ecrireLigne(contexte, mots, MARGE, y, largeurTexte, index < lignes.length - 1);
            }
        }
    }

    // Signature : l'organe, le titre, de la place pour signer à la main, puis le nom.
    const hauteurSignature = INTERLIGNE * 3 + mm(26);
    y += mm(10);
    garderPlace(hauteurSignature);
    const centreSignature = LARGEUR - MARGE - mm(42);
    y += INTERLIGNE;
    texteCentre(contexte, typographier(lettre.pour), centreSignature, y, police(11, 700), ENCRE);
    y += INTERLIGNE;
    texteCentre(contexte, typographier(lettre.titreSignataire), centreSignature, y, police(11, 600), ENCRE);
    y += mm(24);
    texteCentre(contexte, typographier(lettre.nomSignataire), centreSignature, y, police(11, 800), ENCRE);
    contexte.font = police(11, 800);
    const largeurNom = contexte.measureText(lettre.nomSignataire).width;
    contexte.fillRect(centreSignature - largeurNom / 2, y + mm(1.2), largeurNom, mm(0.3));

    pages.forEach((canevas, index) => piedDePage(canevas.getContext('2d'), lettre, index + 1, pages.length));

    return pages;
}

const enJpeg = (canevas) => new Promise((resoudre) => canevas.toBlob(resoudre, 'image/jpeg', 0.9));

/** Images des pages, pour les afficher dans la page. */
export function imagesDesPages(pages) {
    return pages.map((canevas) => canevas.toDataURL('image/jpeg', 0.9));
}

/** Titre du document en UTF-16, pour que les accents s'affichent dans les propriétés du PDF. */
function chaineUtf16(texte) {
    return `<FEFF${[...texte].map((caractere) => caractere.charCodeAt(0).toString(16).padStart(4, '0')).join('')}>`;
}

/**
 * Range les pages dans un fichier PDF au format A4, une image JPEG par page.
 *
 * @returns {Promise<Blob>}
 */
export async function pdfDesPages(pages, titre) {
    const encodeur = new TextEncoder();
    const morceaux = [];
    const positions = [];
    let taille = 0;

    const ajouter = (morceau) => {
        const octets = typeof morceau === 'string' ? encodeur.encode(morceau) : morceau;
        morceaux.push(octets);
        taille += octets.length;
    };

    const objet = (numero, ...contenu) => {
        positions[numero] = taille;
        ajouter(`${numero} 0 obj\n`);
        contenu.forEach(ajouter);
        ajouter('\nendobj\n');
    };

    ajouter('%PDF-1.4\n');
    ajouter(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

    const total = pages.length;
    const enfants = pages.map((page, index) => `${3 + index * 3} 0 R`).join(' ');
    const information = 3 + total * 3;
    objet(1, '<< /Type /Catalog /Pages 2 0 R >>');
    objet(2, `<< /Type /Pages /Kids [${enfants}] /Count ${total} >>`);

    for (const [index, canevas] of pages.entries()) {
        const numero = 3 + index * 3;
        const image = new Uint8Array(await (await enJpeg(canevas)).arrayBuffer());
        const dessin = 'q 595.28 0 0 841.89 0 0 cm /Im0 Do Q';

        objet(numero, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${numero + 1} 0 R >> >> /Contents ${numero + 2} 0 R >>`);
        objet(numero + 1, `<< /Type /XObject /Subtype /Image /Width ${canevas.width} /Height ${canevas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`, image, '\nendstream');
        objet(numero + 2, `<< /Length ${dessin.length} >>\nstream\n${dessin}\nendstream`);
    }

    objet(information, `<< /Title ${chaineUtf16(titre)} /Producer (SEREH Digital) >>`);

    const debutTable = taille;
    const lignes = positions.slice(1).map((position) => `${String(position).padStart(10, '0')} 00000 n \n`).join('');
    ajouter(`xref\n0 ${information + 1}\n0000000000 65535 f \n${lignes}`);
    ajouter(`trailer\n<< /Size ${information + 1} /Root 1 0 R /Info ${information} 0 R >>\nstartxref\n${debutTable}\n%%EOF\n`);

    return new Blob(morceaux, { type: 'application/pdf' });
}

/**
 * Imprime seulement les pages du courrier, au format A4 sans marge, puis remet la page en l'état.
 * La fenêtre d'impression permet aussi d'enregistrer le courrier en PDF.
 */
export function imprimerPages(adresses) {
    const zone = document.createElement('div');
    zone.className = 'zone-impression-courrier';
    zone.setAttribute('aria-hidden', 'true');

    for (const adresse of adresses) {
        zone.append(Object.assign(new Image(), { src: adresse, alt: '' }));
    }

    const style = document.createElement('style');
    style.textContent = `
        @page { size: A4; margin: 0; }
        @media screen { .zone-impression-courrier { display: none; } }
        @media print {
            body > *:not(.zone-impression-courrier) { display: none !important; }
            .zone-impression-courrier img { display: block; width: 209.5mm; height: auto; }
            .zone-impression-courrier img + img { break-before: page; }
        }`;

    const nettoyer = () => {
        zone.remove();
        style.remove();
        window.removeEventListener('afterprint', nettoyer);
    };

    document.head.append(style);
    document.body.append(zone);
    window.addEventListener('afterprint', nettoyer);
    Promise.all([...zone.querySelectorAll('img')].map((image) => image.decode().catch(() => {}))).then(() => window.print());
}
