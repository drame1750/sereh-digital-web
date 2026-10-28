/**
 * Génère les icônes PNG de l'application installable (192 et 512 pixels, plus une version
 * « masquable » pour Android) à partir de la même géométrie que public/icone.svg : une étoile à huit
 * branches dorée sur fond vert. Icône provisoire, en attendant le logo officiel ; ce n'est pas un
 * logo de l'AEEMCI.
 *
 * Aucune dépendance : le dessin est calculé point par point (avec lissage) et le PNG est écrit avec
 * zlib, fourni par Node. Lancer avec : node scripts/generer-icones.mjs
 */
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const VERT_CLAIR = [0x0b, 0x5d, 0x2a];
const VERT_FONCE = [0x03, 0x2a, 0x10];
const OR_CLAIR = [0xf0, 0xd9, 0x8f];
const OR_FONCE = [0xc9, 0xa2, 0x4a];
const SURECHANTILLONNAGE = 4;

const melanger = (a, b, t) => a.map((valeur, index) => valeur + (b[index] - valeur) * t);

/** Distance d'un point au contour d'un carré centré, tourné de « angle » degrés. */
function distanceCarre(x, y, cx, cy, demi, angle) {
    const rad = (-angle * Math.PI) / 180;
    const dx = Math.abs((x - cx) * Math.cos(rad) - (y - cy) * Math.sin(rad));
    const dy = Math.abs((x - cx) * Math.sin(rad) + (y - cy) * Math.cos(rad));

    if (dx <= demi && dy <= demi) {
        return Math.min(demi - dx, demi - dy);
    }

    return Math.hypot(Math.max(dx - demi, 0), Math.max(dy - demi, 0));
}

function dansRectangleArrondi(x, y, taille, rayon) {
    const dx = Math.max(rayon - x, x - (taille - rayon), 0);
    const dy = Math.max(rayon - y, y - (taille - rayon), 0);

    return x >= 0 && y >= 0 && x <= taille && y <= taille && dx * dx + dy * dy <= rayon * rayon;
}

/**
 * Couleur d'un point, dans le repère 512 × 512 de l'icône SVG. Pour la version masquable, le fond
 * couvre tout le carré et le motif est réduit à 72 % pour rester dans la zone sûre d'Android.
 */
function couleurPoint(x, y, masquable) {
    if (!masquable && !dansRectangleArrondi(x, y, 512, 112)) {
        return null;
    }

    const fond = melanger(VERT_CLAIR, VERT_FONCE, Math.min(1, Math.max(0, (x + y) / 1024)));
    const echelle = masquable ? 0.72 : 1;
    const mx = 256 + (x - 256) / echelle;
    const my = 256 + (y - 256) / echelle;
    const demiTrait = 9;

    const surLeTrait = distanceCarre(mx, my, 256, 256, 110, 0) <= demiTrait
        || distanceCarre(mx, my, 256, 256, 110, 45) <= demiTrait
        || Math.abs(Math.hypot(mx - 256, my - 256) - 58) <= demiTrait;

    return surLeTrait ? melanger(OR_CLAIR, OR_FONCE, Math.min(1, Math.max(0, (mx + my) / 1024))) : fond;
}

function dessiner(taille, masquable) {
    const pixels = Buffer.alloc(taille * taille * 4);
    const pas = 512 / taille;

    for (let ligne = 0; ligne < taille; ligne++) {
        for (let colonne = 0; colonne < taille; colonne++) {
            let rouge = 0;
            let vert = 0;
            let bleu = 0;
            let couverture = 0;

            for (let sy = 0; sy < SURECHANTILLONNAGE; sy++) {
                for (let sx = 0; sx < SURECHANTILLONNAGE; sx++) {
                    const couleur = couleurPoint(
                        (colonne + (sx + 0.5) / SURECHANTILLONNAGE) * pas,
                        (ligne + (sy + 0.5) / SURECHANTILLONNAGE) * pas,
                        masquable,
                    );

                    if (couleur) {
                        rouge += couleur[0];
                        vert += couleur[1];
                        bleu += couleur[2];
                        couverture++;
                    }
                }
            }

            const decalage = (ligne * taille + colonne) * 4;

            if (couverture > 0) {
                pixels[decalage] = Math.round(rouge / couverture);
                pixels[decalage + 1] = Math.round(vert / couverture);
                pixels[decalage + 2] = Math.round(bleu / couverture);
            }

            pixels[decalage + 3] = Math.round((couverture / SURECHANTILLONNAGE ** 2) * 255);
        }
    }

    return encoderPng(taille, pixels);
}

const TABLE_CRC = Array.from({ length: 256 }, (_, n) => {
    let c = n;

    for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }

    return c >>> 0;
});

function crc32(donnees) {
    let crc = 0xffffffff;

    for (const octet of donnees) {
        crc = TABLE_CRC[(crc ^ octet) & 0xff] ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
}

function bloc(type, donnees) {
    const longueur = Buffer.alloc(4);
    longueur.writeUInt32BE(donnees.length);
    const typeEtDonnees = Buffer.concat([Buffer.from(type, 'ascii'), donnees]);
    const controle = Buffer.alloc(4);
    controle.writeUInt32BE(crc32(typeEtDonnees));

    return Buffer.concat([longueur, typeEtDonnees, controle]);
}

function encoderPng(taille, pixels) {
    const entete = Buffer.alloc(13);
    entete.writeUInt32BE(taille, 0);
    entete.writeUInt32BE(taille, 4);
    entete[8] = 8; // 8 bits par canal
    entete[9] = 6; // rouge, vert, bleu, transparence

    // Chaque ligne commence par l'octet de filtre 0 (aucun filtre).
    const lignes = Buffer.alloc(taille * (taille * 4 + 1));

    for (let ligne = 0; ligne < taille; ligne++) {
        pixels.copy(lignes, ligne * (taille * 4 + 1) + 1, ligne * taille * 4, (ligne + 1) * taille * 4);
    }

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        bloc('IHDR', entete),
        bloc('IDAT', deflateSync(lignes, { level: 9 })),
        bloc('IEND', Buffer.alloc(0)),
    ]);
}

const sorties = [
    ['public/icone-192.png', 192, false],
    ['public/icone-512.png', 512, false],
    ['public/icone-512-masquable.png', 512, true],
];

for (const [chemin, taille, masquable] of sorties) {
    const png = dessiner(taille, masquable);
    writeFileSync(chemin, png);
    console.log(`${chemin} : ${taille} × ${taille}, ${Math.round(png.length / 1024)} Ko`);
}
