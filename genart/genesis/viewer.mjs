import scaffold from './scaffold.mjs';

const renderers = {
    '#scaffold': scaffold
};

const renderer = renderers[location.hash];

const canvas = document.getElementById('canvas');

const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
};

window.addEventListener('resize', resize);

resize();

renderer?.(canvas);
