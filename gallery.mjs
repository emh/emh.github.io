// The homepage shortlist, in previous/next order. Add only curated pieces here.
// Keep IDs stable: they are the public links (e.g. /#order_and_disorder).
const pieces = [
    {
        id: 'city',
        title: 'City',
        src: '/genart/genuary2026/08_city.html',
    },
    {
        id: 'order_and_disorder',
        title: 'Order and Disorder',
        src: '/genart/genuary2026/16_order_and_disorder.html',
    },
    {
        id: 'crazy_automaton',
        title: 'Crazy Automaton',
        src: '/genart/genuary2026/09_crazy_automaton.html',
    },
    {
        id: 'lights_onoff',
        title: 'Lights On/Off',
        src: '/genart/genuary2026/06_lights_onoff.html',
    },
    {
        id: 'boolean_algebra',
        title: 'Boolean Algebra',
        src: '/genart/genuary2026/07_boolean_algebra.html',
    },
    {
        id: 'emerge',
        title: 'Emerge',
        src: '/genart/genesis/viewer.html#emerge',
    },
    {
        id: 'glyph',
        title: 'Glyph',
        src: '/genart/genesis/viewer.html#glyph',
    },
];

let artwork = document.getElementById('artwork');
const title = document.getElementById('piece-title');
const previous = document.getElementById('previous');
const next = document.getElementById('next');
let currentIndex = -1;

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
    currentIndex = index;
    title.textContent = piece.title;
    document.title = `${piece.title} — @emh`;
    // Start a fresh document even when two pieces only differ by their hash.
    // Genesis chooses its renderer on load; replacing the frame also disposes
    // the previous animation and avoids adding iframe-only history entries.
    const nextArtwork = artwork.cloneNode(false);
    nextArtwork.title = `${piece.title} — generative art by @emh`;
    nextArtwork.src = piece.src;
    artwork.replaceWith(nextArtwork);
    artwork = nextArtwork;
}

function move(direction) {
    if (pieces.length < 2) return;
    const index = (currentIndex + direction + pieces.length) % pieces.length;
    // Hash navigation makes browser Back/Forward work between pieces too.
    window.location.hash = encodeURIComponent(pieces[index].id);
}

previous.disabled = next.disabled = pieces.length < 2;
previous.addEventListener('click', () => move(-1));
next.addEventListener('click', () => move(1));
window.addEventListener('hashchange', showFromHash);
showFromHash();
