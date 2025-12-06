import scaffold from './scaffold.mjs';
import shape from './shape.mjs';
import pattern from './pattern.mjs';
import noise from './noise.mjs';
import flow from './flow.mjs';

const renderers = {
    '#scaffold': scaffold,
    '#shape': shape,
    '#pattern': pattern,
    '#noise': noise,
    '#flow': flow
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
