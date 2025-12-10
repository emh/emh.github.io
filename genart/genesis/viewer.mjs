import scaffold from './scaffold.mjs';
import shape from './shape.mjs';
import pattern from './pattern.mjs';
import noise from './noise.mjs';
import flow from './flow.mjs'
import morph from './morph.mjs';
import rules from './rules.mjs';
import life from './life.mjs';
import chaos from './chaos.mjs';

const renderers = {
    '#scaffold': scaffold,
    '#shape': shape,
    '#pattern': pattern,
    '#noise': noise,
    '#flow': flow,
    '#morph': morph,
    '#rules': rules,
    '#life': life,
    '#chaos': chaos
};

const renderer = renderers[location.hash];
const canvas = document.getElementById('canvas');

const resize = () => {
    const rect = canvas.getBoundingClientRect();

    canvas.width  = rect.width;
    canvas.height = rect.height;
};

window.addEventListener('resize', resize);

resize();

renderer?.(canvas);
