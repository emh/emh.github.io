// The homepage shortlist, in previous/next order. Add only curated pieces here.
// Keep IDs stable: they are the public links (e.g. /#order_and_disorder).
const pieces = [
    {
        id: 'city',
        title: 'City',
        src: '/genart/genuary2026/08_city.html',
        module: '/genart/genuary2026/08_city.mjs',
    },
    {
        id: 'order_and_disorder',
        title: 'Order and Disorder',
        src: '/genart/genuary2026/16_order_and_disorder.html',
        module: '/genart/genuary2026/16_order_and_disorder.mjs',
    },
    {
        id: 'crazy_automaton',
        title: 'Crazy Automaton',
        src: '/genart/genuary2026/09_crazy_automaton.html',
        module: '/genart/genuary2026/09_crazy_automaton.mjs',
    },
    {
        id: 'lights_onoff',
        title: 'Lights On/Off',
        src: '/genart/genuary2026/06_lights_onoff.html',
        module: '/genart/genuary2026/06_lights_onoff.mjs',
    },
    {
        id: 'boolean_algebra',
        title: 'Boolean Algebra',
        src: '/genart/genuary2026/07_boolean_algebra.html',
        module: '/genart/genuary2026/07_boolean_algebra.mjs',
    },
    {
        id: 'emerge',
        title: 'Emerge',
        src: '/genart/genesis/viewer.html#emerge',
        module: '/genart/genesis/viewer.mjs',
    },
    {
        id: 'glyph',
        title: 'Glyph',
        src: '/genart/genesis/viewer.html#glyph',
        module: '/genart/genesis/viewer.mjs',
    },
];

const canvas = document.getElementById('canvas');
const label = document.querySelector('.art-label');
const title = document.getElementById('piece-title');
const previous = document.getElementById('previous');
const next = document.getElementById('next');
let currentIndex = -1;

// Keep the label in the visible area without a fixed viewport layer.
// Canvas sizing stays in CSS; this only positions the label.
function positionLabel() {
    const view = window.visualViewport;
    const bottom = window.scrollY + (view ? view.offsetTop + view.height : window.innerHeight);
    label.style.setProperty('--gallery-visible-bottom', `${bottom}px`);
}
window.addEventListener('resize', positionLabel, { passive: true });
window.addEventListener('pageshow', positionLabel);
window.addEventListener('focus', positionLabel);
window.visualViewport?.addEventListener('resize', positionLabel, { passive: true });
window.visualViewport?.addEventListener('scroll', positionLabel, { passive: true });
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) positionLabel();
});
positionLabel();

// Artwork modules install animation loops and window listeners on load. A full
// navigation between pieces gives each one the same lifecycle as its own page.
// Keep label interactions from reaching artwork listeners on window.
for (const event of ['pointerdown', 'pointerup', 'click']) {
    label.addEventListener(event, event => event.stopPropagation());
}

function showFromHash() {
    let id;
    try {
        id = decodeURIComponent(window.location.hash.slice(1));
    } catch {
        id = ''; // Malformed links should still open a piece.
    }

    let index = pieces.findIndex(piece => piece.id === id);
    if (index === -1) {
        index = Math.floor(Math.random() * pieces.length);
    }

    const piece = pieces[index];
    const hash = `#${encodeURIComponent(piece.id)}`;
    if (window.location.hash !== hash) {
        // Pick a piece on entry without adding an extra browser history step.
        window.history.replaceState(null, '', hash);
    }

    if (index === currentIndex) return;
    if (currentIndex !== -1) {
        window.location.reload();
        return;
    }
    currentIndex = index;
    title.textContent = piece.title;
    document.title = `${piece.title} — @emh`;
    canvas.setAttribute('aria-label', `${piece.title} — generative art by @emh`);
    import(piece.module).catch(error => {
        console.error('Could not load artwork:', error);
        const message = document.getElementById('artwork-error');
        message.querySelector('a').href = piece.src;
        message.hidden = false;
    });
}

function move(direction) {
    if (pieces.length < 2) return;
    const index = (currentIndex + direction + pieces.length) % pieces.length;
    // Update the shareable URL without native fragment navigation. The latter
    // adds a scroll-restoration step before reload on iPhone Chrome.
    window.history.pushState(null, '', `#${encodeURIComponent(pieces[index].id)}`);
    showFromHash();
}

previous.disabled = next.disabled = pieces.length < 2;
previous.addEventListener('click', () => move(-1));
next.addEventListener('click', () => move(1));
window.addEventListener('hashchange', showFromHash);
window.addEventListener('popstate', showFromHash);
window.addEventListener('pageshow', showFromHash);
showFromHash();

if (new URLSearchParams(location.search).get('debug') === 'viewport') {
    import('./viewport-debug.mjs?v=2');
}
