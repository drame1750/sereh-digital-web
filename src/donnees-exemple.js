/**
 * Données d'EXEMPLE pour la maquette du module 2. Elles servent seulement à montrer le rendu des pages :
 * aucune n'est une donnée enregistrée, et chaque écran qui les utilise l'indique clairement.
 * Elles disparaîtront quand les vraies données arriveront (modules 3 à 6).
 */
export const activitesExemple = [
    {
        id: 'nuit-du-coran',
        titre: 'Nuit du Coran',
        edition: '2e édition',
        date: '2026-11-21',
        heure: '21 h',
        lieu: 'Mairie de Katiola',
        description: 'Une nuit de récitation et de méditation ouverte à toute la jeunesse.',
        statut: 'inscriptions-ouvertes',
        placesRestantes: 120,
    },
    {
        id: 'seminaire-exemple',
        titre: 'Séminaire de formation',
        edition: 'Exemple',
        date: '2027-01-16',
        heure: '9 h',
        lieu: 'Katiola',
        description: 'Activité d’exemple, pour montrer une carte dont les inscriptions sont complètes.',
        statut: 'complet',
        placesRestantes: 0,
    },
    {
        id: 'journee-exemple',
        titre: 'Journée d’intégration',
        edition: 'Exemple',
        date: '2027-02-06',
        heure: '8 h 30',
        lieu: 'Dabakala',
        description: 'Activité d’exemple, pour montrer une carte dont les inscriptions ne sont pas encore ouvertes.',
        statut: 'inscriptions-fermees',
        placesRestantes: null,
    },
];

export const tableauDeBordExemple = {
    indicateurs: [
        { libelle: 'Inscriptions reçues', valeur: 342, icone: 'inscriptions', detail: 'Nuit du Coran' },
        { libelle: 'Participants admis', valeur: 318, icone: 'participants', detail: 'dont 64 accompagnateurs' },
        { libelle: 'Courriers en attente', valeur: 7, icone: 'courrier', detail: 'sur 18 envoyés' },
        { libelle: 'Confirmations définitives', valeur: 11, icone: 'secretaires', detail: 'brouillons exclus' },
    ],
    alertes: [
        { ton: 'attention', titre: '24 inscriptions en attente', texte: 'La capacité est atteinte : décidez de fermer ou de continuer.' },
        { ton: 'info', titre: '3 doublons possibles', texte: 'Un même numéro a servi à plusieurs inscriptions.' },
        { ton: 'danger', titre: 'Sauvegarde à faire', texte: 'La dernière sauvegarde date de plus de 7 jours.' },
    ],
    operations: [
        { quand: 'il y a 5 min', texte: 'Inscription reçue (groupe de 3 personnes)' },
        { quand: 'il y a 18 min', texte: 'Le SERAMO a confirmé sa présence' },
        { quand: 'il y a 1 h', texte: 'Courrier « Mission AGO de Niakara » envoyé à 2 SR' },
        { quand: 'hier', texte: 'Inscriptions ouvertes pour la Nuit du Coran' },
    ],
    echeances: [
        { date: '2026-11-14', texte: 'Réponses attendues : mission AGO de Niakara' },
        { date: '2026-11-18', texte: 'Fermeture prévue des inscriptions : Nuit du Coran' },
    ],
};

const formatDateLongue = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const formatJour = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', timeZone: 'UTC' });
const formatMois = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });

export const dateLongue = (iso) => formatDateLongue.format(new Date(`${iso}T00:00:00Z`));
export const jour = (iso) => formatJour.format(new Date(`${iso}T00:00:00Z`));
export const mois = (iso) => formatMois.format(new Date(`${iso}T00:00:00Z`)).replace('.', '');
