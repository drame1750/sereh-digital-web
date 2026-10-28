import '@fontsource-variable/montserrat';
import './styles/app.css';
import { createApp } from 'vue';
import { installerAffichage } from './affichage.js';
import App from './App.vue';
import { apparition } from './directives/apparition.js';
import { router } from './router.js';

// Les réglages d'affichage s'appliquent avant le premier rendu, pour éviter un éclair du mauvais thème.
installerAffichage();

createApp(App)
    .use(router)
    .directive('apparition', apparition)
    .mount('#app');
