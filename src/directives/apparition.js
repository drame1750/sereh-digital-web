/**
 * v-apparition : l'élément apparaît en douceur quand il entre à l'écran. La valeur facultative est un
 * délai en millisecondes, pour faire apparaître des cartes l'une après l'autre (v-apparition="120").
 * Sans animations, la feuille de style laisse l'élément visible tout de suite.
 */
const observateur = 'IntersectionObserver' in window
    ? new IntersectionObserver((entrees) => {
        for (const entree of entrees) {
            if (entree.isIntersecting) {
                entree.target.classList.add('apparition--visible');
                observateur.unobserve(entree.target);
            }
        }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    : null;

export const apparition = {
    mounted(element, { value }) {
        element.classList.add('apparition');

        if (value) {
            element.style.setProperty('--delai', `${value}ms`);
        }

        if (observateur) {
            observateur.observe(element);
        } else {
            element.classList.add('apparition--visible');
        }
    },
    unmounted(element) {
        observateur?.unobserve(element);
    },
};
