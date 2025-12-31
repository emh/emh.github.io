import scaffold from './scaffold.mjs';
import shape from './shape.mjs';
import pattern from './pattern.mjs';
import noise from './noise.mjs';
import flow from './flow.mjs'
import morph from './morph.mjs';
import rules from './rules.mjs';
import life from './life.mjs';
import chaos from './chaos.mjs';
import colour from './colour.mjs';
import tile from './tile.mjs';
import graph from './graph.mjs';
import seed from './seed.mjs';
import emerge from './emerge.mjs';
import growth from './growth.mjs';
import formula from './formula.mjs';
import move from './move.mjs';
import symmetry from './symmetry.mjs';
import constraint from './constraint.mjs';

const renderers = {
    '#scaffold': scaffold,
    '#shape': shape,
    '#pattern': pattern,
    '#noise': noise,
    '#flow': flow,
    '#morph': morph,
    '#rules': rules,
    '#life': life,
    '#chaos': chaos,
    '#colour': colour,
    '#tile': tile,
    '#graph': graph,
    '#seed': seed,
    '#emerge': emerge,
    '#growth': growth,
    '#formula': formula,
    '#move': move,
    '#symmetry': symmetry,
    '#constraint': constraint
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
