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

/**
 * Secrétariats thématiques du bureau (liste des SR mandatés). Leurs noms complets restent à fournir :
 * seuls les sigles sont affichés.
 */
export const SECRETARIATS = ['SERAMO', 'SERACREX', 'SERAESS', 'SERAFAD', 'SERASIP'];

/**
 * Membres du bureau régional : TOUS FICTIFS. Les deux premiers ont un compte de démonstration
 * (voir services/session.js) pour essayer l'espace secrétaire régional.
 */
export const membresBureauExemple = [
    { id: 'membre-sr', nom: 'Secrétaire régional de démonstration', poste: 'Secrétaire Régional', groupe: 'Direction' },
    { id: 'membre-vice-sr', nom: 'Vice-SR de démonstration', poste: 'Vice-Secrétaire Régional', groupe: 'Direction' },
    { id: 'membre-seramo-1', nom: 'Membre Démo Un', poste: 'Membre du SERAMO', groupe: 'SERAMO' },
    { id: 'membre-seramo-2', nom: 'Membre Démo Deux', poste: 'Membre du SERAMO', groupe: 'SERAMO' },
    { id: 'membre-seracrex-1', nom: 'Membre Démo Trois', poste: 'Membre du SERACREX', groupe: 'SERACREX' },
    { id: 'membre-seracrex-2', nom: 'Membre Démo Quatre', poste: 'Membre du SERACREX', groupe: 'SERACREX' },
    { id: 'membre-seraess-1', nom: 'Membre Démo Cinq', poste: 'Membre du SERAESS', groupe: 'SERAESS' },
    { id: 'membre-seraess-2', nom: 'Membre Démo Six', poste: 'Membre du SERAESS', groupe: 'SERAESS' },
    { id: 'membre-serafad-2', nom: 'Membre Démo Sept', poste: 'Membre du SERAFAD', groupe: 'SERAFAD' },
    { id: 'membre-serasip-1', nom: 'Membre Démo Huit', poste: 'Membre du SERASIP', groupe: 'SERASIP' },
    { id: 'membre-serasip-2', nom: 'Membre Démo Neuf', poste: 'Membre du SERASIP', groupe: 'SERASIP' },
];

/**
 * En-tête, signature et pied de page des courriers créés sur la plateforme, d'après le modèle de
 * courrier du SEREH. Les coordonnées et le nom du signataire sont à compléter : ils seront réglés
 * dans les Paramètres, jamais écrits dans le code.
 */
export const parametresCourrierExemple = {
    lieu: 'Katiola',
    organeEmetteur: 'Secrétariat Régional du Hambol',
    pour: 'Pour le Secrétariat Régional',
    titreSignataire: 'Le Secrétaire Régional',
    nomSignataire: 'Nom du Secrétaire Régional (exemple)',
    siege: 'Secrétariat Régional du Hambol · Siège : Katiola',
    contacts: 'Contacts : à compléter dans les Paramètres',
    devise: 'AEEMCI, pour une identité islamique !',
    // Format de la référence encore provisoire : le sens de chaque partie reste à confirmer.
    prefixeReference: 'EEM-SR',
    suffixeReference: 'DI',
};

/**
 * Modèles de courrier de départ, modifiables par l'administrateur. Les mots entre accolades sont
 * remplacés par les informations de l'activité choisie ; les passages entre crochets sont à
 * compléter à la main, et l'aperçu le signale avant l'envoi.
 */
export const modelesCourrierExemple = [
    {
        id: 'invitation-activite',
        nom: 'Invitation à une activité',
        objet: 'Invitation : {activite}',
        formule: 'Honorable membre du bureau régional,',
        corps: 'Le Secrétariat Régional du Hambol a l’honneur de vous inviter à l’activité « {activite} », qui se tiendra le {date} à {heure}. Lieu : {lieu}.\n\nVotre présence contribuera à la bonne organisation de cette activité. Nous vous prions de bien vouloir confirmer votre présence ou signaler votre absence sur SEREH Digital, avant la date limite indiquée.\n\nVeuillez agréer, Honorable membre, l’expression de nos salutations fraternelles.',
        approuve: true,
    },
    {
        id: 'mission-sous-comite',
        nom: 'Mission auprès d’un Sous-Comité',
        objet: 'Mission : AGO du Sous-Comité de [Sous-Comité]',
        formule: 'Honorable membre du bureau régional,',
        corps: 'Le Secrétariat Régional du Hambol a le plaisir de vous informer que vous êtes désigné(e) pour le représenter à l’Assemblée générale ordinaire du Sous-Comité de [Sous-Comité], prévue le [date].\n\nVous voudrez bien prendre contact avec le bureau du Sous-Comité pour préparer votre venue, et confirmer votre disponibilité sur SEREH Digital avant la date limite indiquée.\n\nVeuillez agréer, Honorable membre, l’expression de nos salutations fraternelles.',
        approuve: true,
    },
    {
        id: 'information-bureau',
        nom: 'Information du bureau',
        objet: 'Information : [objet]',
        formule: 'Honorable membre du bureau régional,',
        corps: 'Le Secrétariat Régional du Hambol a le plaisir de vous informer que [information].\n\nNous restons à votre disposition pour toute précision.\n\nVeuillez agréer, Honorable membre, l’expression de nos salutations fraternelles.',
        approuve: true,
    },
];

const UN_JOUR_MS = 24 * 60 * 60 * 1000;

/** Date du jour à Abidjan (UTC), au format AAAA-MM-JJ. */
export const aujourdhui = () => new Date().toISOString().slice(0, 10);

/** Date située à « nombre » jours d'aujourd'hui (négatif : dans le passé), au format AAAA-MM-JJ. */
export const dansJours = (nombre) => new Date(Date.now() + nombre * UN_JOUR_MS).toISOString().slice(0, 10);

/** Instant situé à « nombre » jours de maintenant, au format ISO complet. */
const ilYa = (jours, heures = 0) => new Date(Date.now() - jours * UN_JOUR_MS - heures * 60 * 60 * 1000).toISOString();

/** Suivi d'un destinataire, au moment où le courrier lui est affecté. */
export function nouveauDestinataire(membreId, affecteLe, suivi = {}) {
    return {
        membreId,
        affecteLe,
        consulteLe: null,
        telechargeLe: null,
        delaiJusquau: null,
        reponse: null,
        definitive: false,
        confirmeeLe: null,
        tardive: false,
        tardiveAcceptee: false,
        reouverte: false,
        demandes: [],
        questions: [],
        ...suivi,
    };
}

/**
 * Courriers fictifs de départ, datés par rapport au jour de la visite pour que les échéances proches,
 * dépassées et lointaines se voient toujours. Ils montrent chaque étape du suivi.
 */
export function courriersExemple() {
    const signature = {
        lieu: parametresCourrierExemple.lieu,
        pour: parametresCourrierExemple.pour,
        titreSignataire: parametresCourrierExemple.titreSignataire,
        nomSignataire: parametresCourrierExemple.nomSignataire,
    };
    const envoi1 = ilYa(3, 2);
    const envoi2 = ilYa(1, 5);
    const envoi3 = ilYa(8);
    const envoi4 = ilYa(10);
    const historiqueEnvoi = (le) => [
        { le, auteur: 'Administrateur de démonstration', membreId: null, parLeMembre: false, action: 'Courrier approuvé et envoyé', detail: '' },
    ];

    return [
        {
            id: 'courrier-invitation-nuit',
            reference: 'EEM-SR/26-001/DI',
            objet: 'Invitation à la Nuit du Coran (2e édition)',
            source: 'modele',
            modeleId: 'invitation-activite',
            contenu: {
                ...signature,
                date: envoi1.slice(0, 10),
                destinataire: 'Aux membres du bureau régional\nAEEMCI — Hambol',
                formule: 'Honorable membre du bureau régional,',
                corps: 'Le Secrétariat Régional du Hambol a l’honneur de vous inviter à la Nuit du Coran (2e édition), qui se tiendra le samedi 21 novembre 2026 à 21 h, à la Mairie de Katiola.\n\nVotre présence contribuera à la bonne organisation de cette activité. Nous vous prions de bien vouloir confirmer votre présence ou signaler votre absence sur SEREH Digital, avant la date limite indiquée.\n\nVeuillez agréer, Honorable membre, l’expression de nos salutations fraternelles.',
            },
            fichier: null,
            activiteId: 'nuit-du-coran',
            echeance: dansJours(6),
            instructions: 'Courrier d’exemple. Merci de répondre avant la date limite ; en cas d’absence, indiquez le motif.',
            reponseAttendue: true,
            statut: 'envoye',
            creeLe: envoi1,
            envoyeLe: envoi1,
            historique: [
                ...historiqueEnvoi(envoi1),
                { le: ilYa(2), auteur: 'Vice-SR de démonstration', membreId: 'membre-vice-sr', parLeMembre: true, action: 'Présence confirmée définitivement', detail: '' },
                { le: ilYa(1), auteur: 'Membre Démo Un', membreId: 'membre-seramo-1', parLeMembre: true, action: 'Absence déclarée définitivement', detail: 'Examen à l’université ce jour-là (exemple)' },
                { le: ilYa(0, 6), auteur: 'Vice-SR de démonstration', membreId: 'membre-vice-sr', parLeMembre: true, action: 'Demande de modification envoyée', detail: 'Un déplacement imprévu le même jour (exemple)' },
                { le: ilYa(0, 3), auteur: 'Membre Démo Trois', membreId: 'membre-seracrex-1', parLeMembre: true, action: 'Question posée', detail: 'Un transport est-il prévu depuis Niakara ? (exemple)' },
            ],
            destinataires: [
                nouveauDestinataire('membre-sr', envoi1),
                nouveauDestinataire('membre-vice-sr', envoi1, {
                    consulteLe: ilYa(2, 3),
                    reponse: { choix: 'presence', motif: '', justificatif: null, enregistreeLe: ilYa(2) },
                    definitive: true,
                    confirmeeLe: ilYa(2),
                    demandes: [{ id: 'demande-1', motif: 'Un déplacement imprévu le même jour (exemple)', demandeeLe: ilYa(0, 6), decision: null, decideeLe: null, commentaire: '' }],
                }),
                nouveauDestinataire('membre-seramo-1', envoi1, {
                    consulteLe: ilYa(2),
                    reponse: { choix: 'absence', motif: 'Examen à l’université ce jour-là (exemple)', justificatif: null, enregistreeLe: ilYa(1) },
                    definitive: true,
                    confirmeeLe: ilYa(1),
                }),
                nouveauDestinataire('membre-seramo-2', envoi1, {
                    consulteLe: ilYa(1),
                    reponse: { choix: 'presence', motif: '', justificatif: null, enregistreeLe: ilYa(1) },
                }),
                nouveauDestinataire('membre-seracrex-1', envoi1, {
                    consulteLe: ilYa(0, 4),
                    questions: [{ id: 'question-1', texte: 'Un transport est-il prévu depuis Niakara ? (exemple)', poseeLe: ilYa(0, 3), reponse: '', reponduLe: null }],
                }),
                ...['membre-seracrex-2', 'membre-seraess-1', 'membre-seraess-2', 'membre-serafad-2', 'membre-serasip-1', 'membre-serasip-2'].map((id) => nouveauDestinataire(id, envoi1)),
            ],
        },
        {
            id: 'courrier-mission-niakara',
            reference: 'EEM-SR/26-002/DI',
            objet: 'Mission : AGO du Sous-Comité de Niakara (exemple)',
            source: 'modele',
            modeleId: 'mission-sous-comite',
            contenu: {
                ...signature,
                date: envoi2.slice(0, 10),
                destinataire: 'Au Secrétaire Régional\net au membre du SERAMO désigné',
                formule: 'Honorable membre du bureau régional,',
                corps: 'Le Secrétariat Régional du Hambol a le plaisir de vous informer que vous êtes désignés pour le représenter à l’Assemblée générale ordinaire du Sous-Comité de Niakara (exemple).\n\nVous voudrez bien prendre contact avec le bureau du Sous-Comité pour préparer votre venue, et confirmer votre disponibilité sur SEREH Digital avant la date limite indiquée.\n\nVeuillez agréer, Honorable membre, l’expression de nos salutations fraternelles.',
            },
            fichier: null,
            activiteId: null,
            echeance: dansJours(2),
            instructions: '',
            reponseAttendue: true,
            statut: 'envoye',
            creeLe: envoi2,
            envoyeLe: envoi2,
            historique: historiqueEnvoi(envoi2),
            destinataires: [
                nouveauDestinataire('membre-sr', envoi2),
                nouveauDestinataire('membre-seramo-1', envoi2, { consulteLe: ilYa(0, 20) }),
            ],
        },
        {
            id: 'courrier-reunion-bureau',
            reference: 'EEM-SR/26-003/DI',
            objet: 'Réunion du bureau régional (exemple)',
            source: 'modele',
            modeleId: 'information-bureau',
            contenu: {
                ...signature,
                date: envoi3.slice(0, 10),
                destinataire: 'Aux membres de la direction\ndu bureau régional',
                formule: 'Honorable membre du bureau régional,',
                corps: 'Le Secrétariat Régional du Hambol a le plaisir de vous informer qu’une réunion du bureau régional se tiendra prochainement à Katiola (exemple).\n\nNous vous prions de confirmer votre présence sur SEREH Digital avant la date limite indiquée.\n\nVeuillez agréer, Honorable membre, l’expression de nos salutations fraternelles.',
            },
            fichier: null,
            activiteId: null,
            echeance: dansJours(-1),
            instructions: '',
            reponseAttendue: true,
            statut: 'envoye',
            creeLe: envoi3,
            envoyeLe: envoi3,
            historique: [
                ...historiqueEnvoi(envoi3),
                { le: ilYa(0, 2), auteur: 'Vice-SR de démonstration', membreId: 'membre-vice-sr', parLeMembre: true, action: 'Présence confirmée définitivement', detail: 'Réponse tardive' },
            ],
            destinataires: [
                nouveauDestinataire('membre-sr', envoi3, { consulteLe: ilYa(6) }),
                nouveauDestinataire('membre-vice-sr', envoi3, {
                    consulteLe: ilYa(0, 3),
                    reponse: { choix: 'presence', motif: '', justificatif: null, enregistreeLe: ilYa(0, 2) },
                    definitive: true,
                    confirmeeLe: ilYa(0, 2),
                    tardive: true,
                }),
            ],
        },
        {
            id: 'courrier-calendrier',
            reference: 'EEM-SR/26-004/DI',
            objet: 'Information : calendrier des activités du trimestre (exemple)',
            source: 'modele',
            modeleId: 'information-bureau',
            contenu: {
                ...signature,
                date: envoi4.slice(0, 10),
                destinataire: 'Aux membres du bureau régional\nAEEMCI — Hambol',
                formule: 'Honorable membre du bureau régional,',
                corps: 'Le Secrétariat Régional du Hambol a le plaisir de vous informer du calendrier des activités du trimestre, présenté ici à titre d’exemple.\n\nNous restons à votre disposition pour toute précision.\n\nVeuillez agréer, Honorable membre, l’expression de nos salutations fraternelles.',
            },
            fichier: null,
            activiteId: null,
            echeance: null,
            instructions: 'Pour information : aucune réponse n’est demandée.',
            reponseAttendue: false,
            statut: 'envoye',
            creeLe: envoi4,
            envoyeLe: envoi4,
            historique: historiqueEnvoi(envoi4),
            destinataires: [
                nouveauDestinataire('membre-sr', envoi4, { consulteLe: ilYa(9) }),
                nouveauDestinataire('membre-vice-sr', envoi4, { consulteLe: ilYa(9) }),
            ],
        },
        {
            id: 'courrier-brouillon',
            reference: 'EEM-SR/26-005/DI',
            objet: 'Réunion préparatoire de la Nuit du Coran (exemple)',
            source: 'modele',
            modeleId: 'information-bureau',
            contenu: {
                ...signature,
                date: aujourdhui(),
                destinataire: 'Aux membres du bureau régional',
                formule: 'Honorable membre du bureau régional,',
                corps: 'Le Secrétariat Régional du Hambol a le plaisir de vous informer qu’une réunion préparatoire se tiendra le [date], à [lieu].\n\nVeuillez agréer, Honorable membre, l’expression de nos salutations fraternelles.',
            },
            fichier: null,
            activiteId: 'nuit-du-coran',
            echeance: dansJours(10),
            instructions: '',
            reponseAttendue: true,
            statut: 'brouillon',
            creeLe: ilYa(0, 1),
            envoyeLe: null,
            historique: [{ le: ilYa(0, 1), auteur: 'Administrateur de démonstration', membreId: null, parLeMembre: false, action: 'Brouillon créé', detail: '' }],
            destinataires: [],
            destinatairesPrevus: [],
        },
    ];
}

const formatDateLongue = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const formatDateSimple = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const formatDateCourte = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const formatInstant = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Abidjan' });
const formatJour = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', timeZone: 'UTC' });
const formatMois = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });

export const dateLongue = (iso) => formatDateLongue.format(new Date(`${iso}T00:00:00Z`));
/** « 29 octobre 2026 », pour la date d'un courrier. */
export const dateSimple = (iso) => formatDateSimple.format(new Date(`${iso}T00:00:00Z`));
/** « 29 oct. 2026 », pour une échéance. */
export const dateCourte = (iso) => formatDateCourte.format(new Date(`${iso}T00:00:00Z`));
/** « 29 oct., 14:05 », pour le moment d'une action. */
export const instant = (iso) => formatInstant.format(new Date(iso));
export const jour = (iso) => formatJour.format(new Date(`${iso}T00:00:00Z`));
export const mois = (iso) => formatMois.format(new Date(`${iso}T00:00:00Z`)).replace('.', '');
