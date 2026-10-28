# SEREH Digital — interface

Interface de la plateforme du Secrétariat régional du Hambol (AEEMCI), publiée par GitHub Pages. Les données, les comptes et les règles de sécurité seront chez Supabase (cahier des charges, section 9).

État : **module 2, socle et design**. Les pages montrent le rendu avec des **données d'exemple** ; aucune n'est une donnée enregistrée, et chaque écran concerné l'indique.

## Ce que contient le module 2

- La charte : vert profond, or et blanc ; mode clair « parchemin et or », mode sombre, contraste renforcé, grand texte ; police Montserrat installée avec le site.
- Le menu « Affichage » (thème, taille du texte, contraste, animations), mémorisé sur l'appareil.
- Les animations, qui s'arrêtent si l'appareil demande de réduire les animations ou si l'interrupteur est coupé.
- La mise en page publique, avec « Espace administrateur » en haut de chaque page, et celle de l'administration, avec sa barre latérale repliable.
- Les pages : accueil (`#/`), vitrine des composants (`#/composants`), maquette du tableau de bord (`#/maquette/tableau-de-bord`).
- L'application installable : manifeste, icônes et fichiers gardés sur l'appareil (jamais de données).

## Lancer sur ce poste

```bash
npm install
```

```bash
npm run dev
```

## Icônes

Les icônes PNG sont produites par un script sans dépendance, à relancer si la géométrie change :

```bash
node scripts/generer-icones.mjs
```

L'icône actuelle est provisoire : une étoile géométrique, qui n'est pas le logo de l'AEEMCI. Le logo en en-tête est la version JPEG provisoire reçue le 22 octobre 2026.
