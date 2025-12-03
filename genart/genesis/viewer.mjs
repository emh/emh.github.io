import scaffold from './scaffold.mjs';
import shape from './shape.mjs';

const renderers = {
    '#scaffold': scaffold,
    '#shape': shape
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
