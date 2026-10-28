import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    // Chemins relatifs : le site fonctionne sous l'adresse https://<organisation>.github.io/<dépôt>/.
    base: './',
    plugins: [
        vue(),
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
            // Seuls les fichiers du site lui-même sont gardés sur l'appareil, jamais les données.
            workbox: {
                globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2}'],
                // Les alphabets cyrillique et vietnamien de la police ne servent pas : inutile de les télécharger à l'installation.
                globIgnores: ['**/*-cyrillic-*', '**/*-vietnamese-*'],
                navigateFallback: 'index.html',
                runtimeCaching: [],
            },
            includeAssets: ['icone.svg'],
            manifest: {
                name: 'SEREH Digital',
                short_name: 'SEREH',
                description: 'Activités, inscriptions, courriers et pointage du Secrétariat régional du Hambol (AEEMCI).',
                lang: 'fr',
                start_url: './',
                scope: './',
                display: 'standalone',
                theme_color: '#053f16',
                background_color: '#f3ead7',
                icons: [
                    { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
                    { src: 'icone-512-masquable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
            },
        }),
    ],
});
