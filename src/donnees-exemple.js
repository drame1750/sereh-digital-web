/**
 * Données d'EXEMPLE pour la démonstration. Elles servent seulement à montrer le rendu et le
 * fonctionnement des écrans : aucune n'est une donnée enregistrée, et chaque écran qui les utilise
 * l'indique clairement. Elles disparaîtront quand la base Supabase sera branchée.
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
        objectifs: [
            'Rassembler la jeunesse autour de la récitation et de la méditation du Coran.',
            'Encourager l’apprentissage et la mémorisation.',
        ],
        organisateur: 'AEEMCI — Secrétariat régional du Hambol',
        conditions: 'Ouverte à toute la jeunesse. Une personne mineure s’inscrit avec l’accord d’un parent ou d’un tuteur.',
        inscriptionsOuvertes: true,
        capacite: 300,
        maxAccompagnateurs: 3,
    },
    {
        id: 'seminaire-exemple',
        titre: 'Séminaire de formation',
        edition: 'Exemple',
        date: '2027-01-16',
        heure: '9 h',
        lieu: 'Katiola',
        description: 'Activité d’exemple, pour montrer une activité complète : les nouvelles inscriptions passent en attente.',
        objectifs: ['Montrer le comportement quand toutes les places sont prises.'],
        organisateur: 'AEEMCI — Secrétariat régional du Hambol',
        conditions: 'Activité d’exemple.',
        inscriptionsOuvertes: true,
        capacite: 2,
        maxAccompagnateurs: 1,
    },
    {
        id: 'journee-exemple',
        titre: 'Journée d’intégration',
        edition: 'Exemple',
        date: '2027-02-06',
        heure: '8 h 30',
        lieu: 'Dabakala',
        description: 'Activité d’exemple, pour montrer une activité dont les inscriptions ne sont pas encore ouvertes.',
        objectifs: ['Montrer une activité publiée dont les inscriptions sont fermées.'],
        organisateur: 'AEEMCI — Secrétariat régional du Hambol',
        conditions: 'Activité d’exemple.',
        inscriptionsOuvertes: false,
        capacite: null,
        maxAccompagnateurs: 0,
    },
];

/**
 * Sous-Comités du Hambol (liste des SR mandatés, à confirmer). Les Sections sont des EXEMPLES :
 * la vraie liste reste à fournir.
 */
export const sousComitesExemple = [
    'Katiola', 'Niakara', 'Dabakala', 'Tafiré', 'Bonieré', 'Satama', 'Foumbolo',
].map((nom) => ({
    nom,
    sections: [`Lycée de ${nom} (exemple)`, `Collège de ${nom} (exemple)`, `Section de quartier de ${nom} (exemple)`],
}));

/**
 * Inscriptions fictives pré-enregistrées, avec des codes fixes : ainsi, le pointage de démonstration
 * marche sur n'importe quel appareil, même si l'inscription a été faite ailleurs.
 */
export const inscriptionsExemple = [
    { id: 'demo-1', activiteId: 'nuit-du-coran', nom: 'Participant Démo Un', sexe: 'homme', role: 'principal', statut: 'admise', codeQr: 'SEREH-DEMO-ADMIS-1', groupe: 'g1' },
    { id: 'demo-2', activiteId: 'nuit-du-coran', nom: 'Participante Démo Deux', sexe: 'femme', role: 'accompagnateur', statut: 'admise', codeQr: 'SEREH-DEMO-ADMIS-2', groupe: 'g1' },
    { id: 'demo-3', activiteId: 'nuit-du-coran', nom: 'Participant Démo Trois', sexe: 'homme', role: 'principal', statut: 'en_attente', codeQr: 'SEREH-DEMO-ATTENTE-3', groupe: 'g2' },
    { id: 'demo-4', activiteId: 'seminaire-exemple', nom: 'Participante Démo Quatre', sexe: 'femme', role: 'principal', statut: 'admise', codeQr: 'SEREH-DEMO-AUTRE-4', groupe: 'g3' },
    { id: 'demo-5', activiteId: 'seminaire-exemple', nom: 'Participant Démo Cinq', sexe: 'homme', role: 'principal', statut: 'admise', codeQr: 'SEREH-DEMO-AUTRE-5', groupe: 'g4' },
];

/** Nombre de places déjà prises pour la démonstration, en plus des inscriptions ci-dessus. */
export const placesDejaPrisesExemple = { 'nuit-du-coran': 178 };

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
