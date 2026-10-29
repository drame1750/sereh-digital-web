import '@fontsource-variable/montserrat';
import './styles/app.css';
import { createApp } from 'vue';
import { installerAffichage } from './affichage.js';
import App from './App.vue';
import { apparition } from './directives/apparition.js';
import { router } from './router.js';
import { installerSurveillance } from './services/systeme.js';

// Les réglages d'affichage s'appliquent avant le premier rendu, pour éviter un éclair du mauvais thème.
installerAffichage();

const application = createApp(App);

// Les erreurs de l'interface rejoignent le journal technique (État du système), sans donnée personnelle.
installerSurveillance(application);

application
    .use(router)
    .directive('apparition', apparition)
    .mount('#app');
