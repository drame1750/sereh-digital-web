/**
 * Fichiers Excel (.xlsx) et CSV, écrits et lus dans le navigateur, sans outil extérieur ni nouvelle
 * dépendance (cahier des charges, section 8).
 *
 * - Écriture : le classeur Excel est un fichier ZIP « rangé » (sans compression), lisible par Excel,
 *   LibreOffice et Google Sheets ; le CSV utilise le point-virgule, comme l'Excel français.
 * - Lecture : le classeur est décompressé par le navigateur lui-même (DecompressionStream).
 * - Une cellule qui commence par =, +, - ou @ est neutralisée dans le CSV, pour qu'aucune formule ne
 *   s'exécute à l'ouverture.
 */
const encodeur = new TextEncoder();

/* ------------------------------------------------------------------------------------------------
 * CSV
 * ---------------------------------------------------------------------------------------------- */

function celluleCsv(valeur) {
    let texte = valeur === null || valeur === undefined ? '' : String(valeur);

    if (/^[=+\-@]/.test(texte)) {
        texte = `'${texte}`;
    }

    return /[";\n\r]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

/**
 * @param {Array<Record<string, unknown>>} lignes une ligne par objet ; les clés du premier donnent les colonnes
 * @returns {Blob}
 */
export function fichierCsv(lignes, colonnes = Object.keys(lignes[0] ?? {})) {
    const texte = [colonnes, ...lignes.map((ligne) => colonnes.map((colonne) => ligne[colonne]))]
        .map((cellules) => cellules.map(celluleCsv).join(';'))
        .join('\r\n');

    return new Blob(['﻿', texte], { type: 'text/csv;charset=utf-8' });
}

function detecterSeparateur(premiereLigne) {
    const comptes = [';', ',', '\t'].map((separateur) => [separateur, premiereLigne.split(separateur).length]);

    return comptes.sort((a, b) => b[1] - a[1])[0][0];
}

function analyserCsv(texte) {
    const separateur = detecterSeparateur(texte.split(/\r?\n/, 1)[0] ?? '');
    const lignes = [];
    let ligne = [];
    let cellule = '';
    let entreGuillemets = false;

    for (let index = 0; index < texte.length; index++) {
        const caractere = texte[index];

        if (entreGuillemets) {
            if (caractere === '"' && texte[index + 1] === '"') {
                cellule += '"';
                index++;
            } else if (caractere === '"') {
                entreGuillemets = false;
            } else {
                cellule += caractere;
            }
        } else if (caractere === '"') {
            entreGuillemets = true;
        } else if (caractere === separateur) {
            ligne.push(cellule);
            cellule = '';
        } else if (caractere === '\n' || caractere === '\r') {
            if (caractere === '\r' && texte[index + 1] === '\n') {
                index++;
            }

            ligne.push(cellule);
            lignes.push(ligne);
            ligne = [];
            cellule = '';
        } else {
            cellule += caractere;
        }
    }

    if (cellule !== '' || ligne.length > 0) {
        ligne.push(cellule);
        lignes.push(ligne);
    }

    return lignes.filter((cellules) => cellules.some((valeur) => valeur.trim() !== ''));
}

function decoderTexte(octets) {
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(octets).replace(/^﻿/, '');
    } catch {
        // Fichier enregistré par un ancien Excel : encodage Windows.
        return new TextDecoder('windows-1252').decode(octets);
    }
}

/* ------------------------------------------------------------------------------------------------
 * ZIP rangé (écriture) et lecture d'un ZIP
 * ---------------------------------------------------------------------------------------------- */

const TABLE_CRC = Array.from({ length: 256 }, (_, n) => {
    let c = n;

    for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }

    return c >>> 0;
});

function crc32(octets) {
    let crc = 0xffffffff;

    for (const octet of octets) {
        crc = TABLE_CRC[(crc ^ octet) & 0xff] ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
}

function zipRange(fichiers) {
    const morceaux = [];
    const central = [];
    let position = 0;
    const date = new Date();
    const heureDos = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const dateDos = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

    for (const { nom, contenu } of fichiers) {
        const nomOctets = encodeur.encode(nom);
        const donnees = typeof contenu === 'string' ? encodeur.encode(contenu) : contenu;
        const crc = crc32(donnees);
        const entete = new DataView(new ArrayBuffer(30));
        [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, heureDos, 2], [12, dateDos, 2], [14, crc, 4], [18, donnees.length, 4], [22, donnees.length, 4], [26, nomOctets.length, 2], [28, 0, 2]]
            .forEach(([decalage, valeur, taille]) => (taille === 4 ? entete.setUint32(decalage, valeur, true) : entete.setUint16(decalage, valeur, true)));

        const repertoire = new DataView(new ArrayBuffer(46));
        [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, heureDos, 2], [14, dateDos, 2], [16, crc, 4], [20, donnees.length, 4], [24, donnees.length, 4], [28, nomOctets.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, position, 4]]
            .forEach(([decalage, valeur, taille]) => (taille === 4 ? repertoire.setUint32(decalage, valeur, true) : repertoire.setUint16(decalage, valeur, true)));

        morceaux.push(new Uint8Array(entete.buffer), nomOctets, donnees);
        central.push(new Uint8Array(repertoire.buffer), nomOctets);
        position += 30 + nomOctets.length + donnees.length;
    }

    const tailleCentral = central.reduce((total, morceau) => total + morceau.length, 0);
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true);
    fin.setUint16(8, fichiers.length, true);
    fin.setUint16(10, fichiers.length, true);
    fin.setUint32(12, tailleCentral, true);
    fin.setUint32(16, position, true);

    return [...morceaux, ...central, new Uint8Array(fin.buffer)];
}

async function decompresser(octets) {
    const flux = new Blob([octets]).stream().pipeThrough(new DecompressionStream('deflate-raw'));

    return new Uint8Array(await new Response(flux).arrayBuffer());
}

async function lireZip(octets) {
    const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
    let fin = octets.length - 22;

    while (fin >= 0 && vue.getUint32(fin, true) !== 0x06054b50) {
        fin--;
    }

    if (fin < 0) {
        throw new Error('Ce fichier n’est pas un classeur Excel (.xlsx) lisible.');
    }

    const nombre = vue.getUint16(fin + 10, true);
    let position = vue.getUint32(fin + 16, true);
    const fichiers = new Map();

    for (let index = 0; index < nombre; index++) {
        const methode = vue.getUint16(position + 10, true);
        const tailleCompressee = vue.getUint32(position + 20, true);
        const longueurNom = vue.getUint16(position + 28, true);
        const longueurExtra = vue.getUint16(position + 30, true);
        const longueurCommentaire = vue.getUint16(position + 32, true);
        const entete = vue.getUint32(position + 42, true);
        const nom = new TextDecoder().decode(octets.slice(position + 46, position + 46 + longueurNom));
        fichiers.set(nom, { methode, tailleCompressee, entete });
        position += 46 + longueurNom + longueurExtra + longueurCommentaire;
    }

    return async (nom) => {
        const fichier = fichiers.get(nom);

        if (!fichier) {
            return null;
        }

        const debut = fichier.entete + 30 + vue.getUint16(fichier.entete + 26, true) + vue.getUint16(fichier.entete + 28, true);
        const donnees = octets.slice(debut, debut + fichier.tailleCompressee);

        return new TextDecoder().decode(fichier.methode === 8 ? await decompresser(donnees) : donnees);
    };
}

/* ------------------------------------------------------------------------------------------------
 * Excel
 * ---------------------------------------------------------------------------------------------- */

const echapperXml = (texte) => String(texte)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function lettreColonne(index) {
    let lettres = '';
    let reste = index + 1;

    while (reste > 0) {
        const modulo = (reste - 1) % 26;
        lettres = String.fromCharCode(65 + modulo) + lettres;
        reste = Math.floor((reste - modulo) / 26);
    }

    return lettres;
}

function celluleXml(valeur, reference, style) {
    if (typeof valeur === 'number' && Number.isFinite(valeur)) {
        return `<c r="${reference}"${style}><v>${valeur}</v></c>`;
    }

    const texte = valeur === null || valeur === undefined ? '' : String(valeur);

    return `<c r="${reference}" t="inlineStr"${style}><is><t xml:space="preserve">${echapperXml(texte)}</t></is></c>`;
}

/**
 * Classeur Excel d'une feuille : la première ligne porte le nom des colonnes, en gras et figée.
 *
 * @returns {Blob}
 */
export function fichierXlsx(lignes, nomFeuille = 'Feuille 1', colonnes = Object.keys(lignes[0] ?? {})) {
    const tableau = [colonnes, ...lignes.map((ligne) => colonnes.map((colonne) => ligne[colonne]))];
    const largeurs = colonnes.map((_, index) => Math.min(50, Math.max(8, ...tableau.map((cellules) => String(cellules[index] ?? '').length + 2))));
    const rangees = tableau.map((cellules, rang) => `<row r="${rang + 1}">${cellules.map((valeur, index) => celluleXml(valeur, `${lettreColonne(index)}${rang + 1}`, rang === 0 ? ' s="1"' : '')).join('')}</row>`).join('');
    const nom = echapperXml(nomFeuille.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31));

    const feuille = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${largeurs.map((largeur, index) => `<col min="${index + 1}" max="${index + 1}" width="${largeur}" customWidth="1"/>`).join('')}</cols><sheetData>${rangees}</sheetData></worksheet>`;

    const fichiers = [
        { nom: '[Content_Types].xml', contenu: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
        { nom: '_rels/.rels', contenu: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
        { nom: 'xl/workbook.xml', contenu: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${nom}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
        { nom: 'xl/_rels/workbook.xml.rels', contenu: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
        { nom: 'xl/styles.xml', contenu: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>' },
        { nom: 'xl/worksheets/sheet1.xml', contenu: feuille },
    ];

    return new Blob(zipRange(fichiers), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function texteDe(element) {
    return Array.from(element.getElementsByTagNameNS('*', 't'), (morceau) => morceau.textContent).join('');
}

async function analyserXlsx(octets) {
    const lire = await lireZip(octets);
    const xml = (texte) => new DOMParser().parseFromString(texte, 'application/xml');
    const partages = await lire('xl/sharedStrings.xml');
    const chaines = partages ? Array.from(xml(partages).getElementsByTagNameNS('*', 'si'), texteDe) : [];
    const feuille = await lire('xl/worksheets/sheet1.xml');

    if (!feuille) {
        throw new Error('La première feuille du classeur est introuvable.');
    }

    return Array.from(xml(feuille).getElementsByTagNameNS('*', 'row'), (rangee) => {
        const cellules = [];

        for (const cellule of rangee.getElementsByTagNameNS('*', 'c')) {
            const colonne = (cellule.getAttribute('r') ?? '').replace(/\d+/g, '');
            const index = colonne ? [...colonne].reduce((total, lettre) => total * 26 + lettre.charCodeAt(0) - 64, 0) - 1 : cellules.length;
            const type = cellule.getAttribute('t');
            const valeur = cellule.getElementsByTagNameNS('*', 'v')[0]?.textContent ?? '';
            cellules[index] = type === 's' ? (chaines[Number(valeur)] ?? '') : type === 'inlineStr' ? texteDe(cellule) : valeur;
        }

        return Array.from(cellules, (valeur) => valeur ?? '');
    }).filter((cellules) => cellules.some((valeur) => String(valeur).trim() !== ''));
}

/* ------------------------------------------------------------------------------------------------
 * Lecture d'un fichier d'import
 * ---------------------------------------------------------------------------------------------- */

const SYNONYMES = {
    nom: ['nom', 'nom_complet', 'nom_et_prenoms', 'nom_prenoms', 'nom_et_prenom'],
    telephone: ['telephone', 'tel', 'numero', 'numero_de_telephone', 'contact', 'whatsapp'],
    sexe: ['sexe', 'genre'],
    ville: ['ville', 'commune', 'ville_commune', 'ville_ou_commune'],
    sous_comite: ['sous_comite', 'souscomite', 'sous_comites'],
    section: ['section', 'structure', 'structure_ou_section'],
};

const normaliserEntete = (texte) => String(texte).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

/**
 * Lit un fichier Excel (.xlsx) ou CSV. La première ligne donne le nom des colonnes ; les colonnes
 * reconnues sont celles du modèle d'import.
 *
 * @returns {Promise<{ colonnes: string[], reconnues: string[], lignes: Array<Record<string, string>> }>}
 */
export async function lireTableur(fichier) {
    const octets = new Uint8Array(await fichier.arrayBuffer());
    const extension = fichier.name.split('.').pop().toLowerCase();

    if (extension === 'xls') {
        throw new Error('Ancien format Excel (.xls) : enregistrez le fichier au format .xlsx ou .csv, puis recommencez.');
    }

    if (!['xlsx', 'csv', 'txt'].includes(extension)) {
        throw new Error('Choisissez un fichier Excel (.xlsx) ou CSV.');
    }

    const tableau = extension === 'xlsx' ? await analyserXlsx(octets) : analyserCsv(decoderTexte(octets));

    if (tableau.length < 2) {
        throw new Error('Le fichier ne contient aucune ligne après celle des titres de colonnes.');
    }

    const colonnes = tableau[0].map((titre) => String(titre).trim());
    const cles = colonnes.map((titre) => Object.entries(SYNONYMES).find(([, noms]) => noms.includes(normaliserEntete(titre)))?.[0] ?? null);

    return {
        colonnes,
        reconnues: cles.filter(Boolean),
        lignes: tableau.slice(1).map((cellules) => Object.fromEntries(cles.map((cle, index) => [cle, String(cellules[index] ?? '').trim()]).filter(([cle]) => cle))),
    };
}

/** Modèle Excel d'import, avec les colonnes attendues et deux lignes d'exemple fictives. */
export function modeleImport() {
    return fichierXlsx([
        { 'Nom complet': 'Participant Modèle Un', Téléphone: '07 00 00 99 01', Sexe: 'Homme', 'Ville / commune': 'Katiola', 'Sous-Comité': 'Katiola', Section: 'Lycée de Katiola (exemple)' },
        { 'Nom complet': 'Participante Modèle Deux', Téléphone: '05 00 00 99 02', Sexe: 'Femme', 'Ville / commune': 'Niakara', 'Sous-Comité': 'Niakara', Section: '' },
    ], 'Inscriptions');
}
