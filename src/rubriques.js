/**
 * Rubriques de l'espace administrateur (prompt, section 6), regroupées par thème, avec le module du
 * plan de réalisation qui les construira.
 */
export const RUBRIQUES = [
    {
        titre: 'Pilotage',
        rubriques: [
            { cle: 'tableau-de-bord', libelle: 'Tableau de bord', icone: 'accueil', module: 2 },
            { cle: 'notifications', libelle: 'Notifications', icone: 'notifications', module: 10 },
            { cle: 'rapports', libelle: 'Rapports et statistiques', icone: 'rapports', module: 11 },
        ],
    },
    {
        titre: 'Activités',
        rubriques: [
            { cle: 'activites', libelle: 'Activités', icone: 'calendrier', module: 5 },
            { cle: 'inscriptions', libelle: 'Inscriptions', icone: 'inscriptions', module: 6 },
            { cle: 'participants', libelle: 'Participants', icone: 'participants', module: 6 },
            { cle: 'accompagnateurs', libelle: 'Accompagnateurs', icone: 'accompagnateurs', module: 6 },
            { cle: 'qr-codes', libelle: 'QR codes', icone: 'qr', module: 7 },
            { cle: 'pointage', libelle: 'Pointage', icone: 'pointage', module: 7 },
        ],
    },
    {
        titre: 'Bureau',
        rubriques: [
            { cle: 'courriers', libelle: 'Courriers', icone: 'courrier', module: 9 },
            { cle: 'secretaires', libelle: 'Secrétaires régionaux', icone: 'secretaires', module: 9 },
            { cle: 'comptes', libelle: 'Comptes et utilisateurs', icone: 'comptes', module: 4 },
            { cle: 'archives', libelle: 'Archives', icone: 'archives', module: 12 },
        ],
    },
    {
        titre: 'Système',
        rubriques: [
            { cle: 'parametres', libelle: 'Paramètres', icone: 'parametres', module: 5 },
            { cle: 'securite', libelle: 'Sécurité', icone: 'securite', module: 4 },
            { cle: 'sauvegardes', libelle: 'Sauvegardes', icone: 'sauvegardes', module: 8 },
            { cle: 'etat-systeme', libelle: 'État du système', icone: 'etat', module: 8 },
        ],
    },
];

export const toutesLesRubriques = RUBRIQUES.flatMap((groupe) => groupe.rubriques);
