import { dateLongue } from './donnees-exemple.js';
import {
    BAS,
    chargerLogo,
    chargerPolices,
    couperEnLignes,
    ecrireLigne,
    ENCRE,
    ENCRE_DOUCE,
    fond,
    HAUTEUR,
    INTERLIGNE,
    LARGEUR,
    MARGE,
    mm,
    OR,
    police,
    texteCentre,
    typographier,
    VERT,
} from './lettre.js';

/**
 * Rapport d'activité au format A4, dessiné page par page comme les courriers : en-tête AEEMCI,
 * présentation, chiffres clés, répartitions, réponses du bureau, déroulement et conclusion. Un
 * brouillon porte la mention « BROUILLON » : seul un rapport approuvé se télécharge et s'imprime.
 */
const LARGEUR_TEXTE = LARGEUR - 2 * MARGE;

function filigraneBrouillon(contexte) {
    contexte.save();
    contexte.translate(LARGEUR / 2, HAUTEUR / 2 + mm(40));
    contexte.rotate(-Math.PI / 5);
    texteCentre(contexte, 'BROUILLON · NON APPROUVÉ', 0, 0, police(46, 800), 'rgb(163 38 29 / 0.08)');
    contexte.restore();
}

function enTete(contexte, logo, rapport, chiffres) {
    const hauteurLogo = mm(18);

    if (logo) {
        contexte.drawImage(logo, MARGE, mm(12), (hauteurLogo * logo.width) / logo.height, hauteurLogo);
    }

    contexte.textAlign = 'right';
    contexte.font = police(10, 700);
    contexte.fillStyle = VERT;
    contexte.fillText('Association des Elèves et Etudiants Musulmans de Côte d’Ivoire', LARGEUR - MARGE, mm(19));
    contexte.font = police(10, 600);
    contexte.fillStyle = ENCRE;
    contexte.fillText('SECRÉTARIAT RÉGIONAL DU HAMBOL', LARGEUR - MARGE, mm(25));
    contexte.textAlign = 'left';

    contexte.fillStyle = OR;
    contexte.fillRect(MARGE, mm(35), LARGEUR_TEXTE, mm(0.9));
    contexte.fillStyle = VERT;
    contexte.fillRect(MARGE, mm(36.5), LARGEUR_TEXTE, mm(0.3));

    texteCentre(contexte, 'RAPPORT D’ACTIVITÉ', LARGEUR / 2, mm(50), police(18, 800), VERT);
    const nom = chiffres.activite.edition ? `${chiffres.activite.titre} · ${chiffres.activite.edition}` : chiffres.activite.titre;
    texteCentre(contexte, typographier(nom), LARGEUR / 2, mm(59), police(13, 700), ENCRE);
    const quand = `${dateLongue(chiffres.activite.date)}, ${chiffres.activite.heure} · ${chiffres.activite.lieu}`;
    texteCentre(contexte, quand.charAt(0).toUpperCase() + quand.slice(1), LARGEUR / 2, mm(66), police(10.5, 500), ENCRE_DOUCE);

    const etat = rapport.statut === 'approuve'
        ? `Approuvé le ${new Date(rapport.approuveLe).toLocaleDateString('fr-FR', { dateStyle: 'long' })} par ${rapport.approuvePar}`
        : 'Brouillon : non approuvé, à ne pas diffuser';
    texteCentre(contexte, etat, LARGEUR / 2, mm(73), police(9.5, 700, 'italic'), rapport.statut === 'approuve' ? VERT : '#a3261d');

    return mm(86);
}

function piedDePage(contexte, rapport, numero, total) {
    contexte.fillStyle = OR;
    contexte.fillRect(MARGE, HAUTEUR - mm(20), LARGEUR_TEXTE, mm(0.4));
    contexte.font = police(8.5, 500);
    contexte.fillStyle = ENCRE_DOUCE;
    contexte.fillText(`SEREH Digital · ${rapport.titre}`.slice(0, 110), MARGE, HAUTEUR - mm(14));
    contexte.textAlign = 'right';
    contexte.fillText(`${numero}/${total}`, LARGEUR - MARGE, HAUTEUR - mm(14));
    contexte.textAlign = 'left';
}

/**
 * @param {object} rapport le rapport, avec ses sections et ses chiffres
 * @returns {Promise<HTMLCanvasElement[]>}
 */
export async function pagesDeRapport(rapport, { demonstration = false } = {}) {
    await chargerPolices();
    const logo = await chargerLogo();
    const chiffres = rapport.chiffres;
    const pages = [];
    let contexte;
    let y;

    const nouvellePage = () => {
        const canevas = Object.assign(document.createElement('canvas'), { width: LARGEUR, height: HAUTEUR });
        contexte = canevas.getContext('2d');
        fond(contexte, demonstration);

        if (rapport.statut !== 'approuve') {
            filigraneBrouillon(contexte);
        }

        pages.push(canevas);
        y = mm(24);
    };

    const garderPlace = (hauteur) => {
        if (y + hauteur > BAS) {
            nouvellePage();
        }
    };

    const titre = (texte) => {
        garderPlace(mm(22));
        y += mm(8);
        contexte.font = police(12.5, 800);
        contexte.fillStyle = VERT;
        contexte.fillText(texte, MARGE, y);
        contexte.fillStyle = OR;
        contexte.fillRect(MARGE, y + mm(2), mm(18), mm(0.6));
        y += mm(5);
    };

    const paragraphe = (texte, { taille = 10.5, couleur = ENCRE } = {}) => {
        for (const morceau of String(texte).split(/\n+/)) {
            contexte.font = police(taille, 500);
            const lignes = couperEnLignes(contexte, morceau, LARGEUR_TEXTE);

            for (const [index, mots] of lignes.entries()) {
                garderPlace(INTERLIGNE);
                y += INTERLIGNE;
                contexte.font = police(taille, 500);
                contexte.fillStyle = couleur;
                ecrireLigne(contexte, mots, MARGE, y, LARGEUR_TEXTE, index < lignes.length - 1);
            }

            y += mm(2);
        }
    };

    /** Tableau simple : la première colonne à gauche, les nombres alignés à droite. */
    const tableau = (entetes, lignes, proportions) => {
        const largeurs = proportions.map((part) => part * LARGEUR_TEXTE);
        const hauteurLigne = mm(8);
        const dessinerLigne = (cellules, entete) => {
            garderPlace(hauteurLigne);

            if (entete) {
                contexte.fillStyle = 'rgb(11 93 42 / 0.09)';
                contexte.fillRect(MARGE, y, LARGEUR_TEXTE, hauteurLigne);
            }

            let x = MARGE;
            contexte.font = police(9.5, entete ? 700 : 500);
            contexte.fillStyle = ENCRE;

            cellules.forEach((cellule, index) => {
                let texte = String(cellule ?? '');

                while (contexte.measureText(texte).width > largeurs[index] - mm(3) && texte.length > 3) {
                    texte = `${texte.slice(0, -2)}…`;
                }

                if (index === 0) {
                    contexte.fillText(texte, x + mm(1.5), y + mm(5.4));
                } else {
                    contexte.textAlign = 'right';
                    contexte.fillText(texte, x + largeurs[index] - mm(1.5), y + mm(5.4));
                    contexte.textAlign = 'left';
                }

                x += largeurs[index];
            });

            y += hauteurLigne;
            contexte.fillStyle = 'rgb(29 26 22 / 0.12)';
            contexte.fillRect(MARGE, y - mm(0.2), LARGEUR_TEXTE, mm(0.2));
        };

        y += mm(2);
        dessinerLigne(entetes, true);
        lignes.forEach((ligne) => dessinerLigne(ligne, false));
        y += mm(3);
    };

    nouvellePage();
    y = enTete(contexte, logo, rapport, chiffres);

    titre('1. Présentation');
    paragraphe(rapport.sections.introduction);

    titre('2. Chiffres clés');
    const { inscriptions, presence } = chiffres;
    paragraphe(presence.admis > 0
        ? `Sur ${presence.admis} personne${presence.admis > 1 ? 's' : ''} admise${presence.admis > 1 ? 's' : ''}, ${presence.presents} ${presence.presents > 1 ? 'se sont présentées' : 's’est présentée'} à l’entrée, soit un taux de présence de ${presence.taux} %. Les présences sont celles réellement pointées.`
        : 'Aucune personne admise pour le moment.', { taille: 10 });
    tableau(['Indicateur', 'Nombre'], [
        ['Inscriptions reçues', inscriptions.recues],
        ['Personnes admises', inscriptions.admises],
        ['dont accompagnateurs', inscriptions.accompagnateurs],
        ['Inscriptions en attente', inscriptions.enAttente],
        ['Inscriptions annulées', inscriptions.annulees],
        ['Présents (pointés)', presence.presents],
        ['Admis non présents', presence.absents],
        ['Taux de présence', presence.taux === null ? '—' : `${presence.taux} %`],
    ], [0.7, 0.3]);

    titre('3. Répartition des personnes admises');
    tableau(['Sexe', 'Admis', 'Présents'], chiffres.parSexe.map((ligne) => [ligne.libelle, ligne.admis, ligne.presents]), [0.5, 0.25, 0.25]);
    tableau(['Sous-Comité', 'Admis', 'Présents'], chiffres.parSousComite.map((ligne) => [ligne.libelle, ligne.admis, ligne.presents]), [0.5, 0.25, 0.25]);

    titre('4. Réponses des membres du bureau');
    const reponses = chiffres.reponses;

    if (reponses.destinataires === 0) {
        paragraphe('Aucun courrier n’a été lié à cette activité.', { taille: 10, couleur: ENCRE_DOUCE });
    } else {
        paragraphe(`${reponses.courriers} courrier${reponses.courriers > 1 ? 's' : ''}, ${reponses.destinataires} destinataire${reponses.destinataires > 1 ? 's' : ''} : ${reponses.consultes} consulté${reponses.consultes > 1 ? 's' : ''}, ${reponses.confirmations} confirmation${reponses.confirmations > 1 ? 's' : ''} définitive${reponses.confirmations > 1 ? 's' : ''} (${reponses.presences} présence${reponses.presences > 1 ? 's' : ''}, ${reponses.absences} absence${reponses.absences > 1 ? 's' : ''}), ${reponses.enAttente} en attente. Les brouillons ne sont pas comptés.`, { taille: 10 });
        tableau(['Secrétariat', 'Destinataires', 'Confirmés', 'Présences', 'Absences', 'En attente'], reponses.parSecretariat.map((ligne) => [ligne.groupe, ligne.destinataires, ligne.confirmations, ligne.presences, ligne.absences, ligne.enAttente]), [0.3, 0.14, 0.14, 0.14, 0.14, 0.14]);

        if (reponses.motifs.length > 0) {
            tableau(['Absence déclarée', 'Motif'], reponses.motifs.map((ligne) => [ligne.membre, ligne.motif]), [0.4, 0.6]);
        }
    }

    titre('5. Déroulement');
    paragraphe(rapport.sections.deroulement);

    titre('6. Conclusion et recommandations');
    paragraphe(rapport.sections.conclusion);

    garderPlace(mm(16));
    y += mm(8);
    contexte.font = police(9, 500, 'italic');
    contexte.fillStyle = ENCRE_DOUCE;
    contexte.fillText(`Chiffres calculés le ${new Date(chiffres.calculeLe).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Africa/Abidjan' })}.`, MARGE, y);

    pages.forEach((canevas, index) => piedDePage(canevas.getContext('2d'), rapport, index + 1, pages.length));

    return pages;
}
