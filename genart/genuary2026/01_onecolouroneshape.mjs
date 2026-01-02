const canvas = document.getElementById('canvas');

const HEX_SIZE = 10;
const HEX_HEIGHT = 2 * HEX_SIZE;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;

const SQRT3_2 = Math.sqrt(3) / 2;

let offset = Math.random() * 255;

const toPixel = (col, row) => {
    const x = HEX_WIDTH * (col + 0.5 * (row & 1));
    const y = (3 / 4) * HEX_HEIGHT * row;

    return [x, y];
};

// 6t^5 - 15t^4 + 10t^3
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

const PERMUTATION = shuffle([...Array(256).keys()]);

const P = new Array(512);

for (let i = 0; i < 512; i++) {
    P[i] = PERMUTATION[i & 255];
}

const lerp = (t, a, b) => a + t * (b - a);

const grad = (hash, x, y) => {
    switch (hash & 0b11) {
        case 0: return x + y;
        case 1: return -x + y;
        case 2: return x - y;
        case 3: return -x - y;
        default: return 0;
    }
};

export const perlin2D = (x, y) => {
    const ix = Math.floor(x) & 255;
    const iy = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = P[P[ix] + iy];
    const ab = P[P[ix] + iy + 1];
    const ba = P[P[ix + 1] + iy];
    const bb = P[P[ix + 1] + iy + 1];
    const x1 = lerp(u, grad(aa, xf, yf), grad(ba, xf - 1, yf));
    const x2 = lerp(u, grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1));
    const value = lerp(v, x1, x2);

    return (value + 1) / 2;
};

const drawHex = (context, row, col, { h, s, l, a }, ts) => {
    const f = 0.05;

    const x = col * f + offset;
    const y = row * f + offset;
    const t = ts * 0.35; // time speed

    // two slow noise fields that "push" the domain around
    const wx = (perlin2D(x + 11.1, y + 7.7 + t) - 0.5) * 2;
    const wy = (perlin2D(x - 5.3, y + 3.9 - t) - 0.5) * 2;

    const warpAmp = 1.25; // increase for more randomness
    const nx = x + warpAmp * wx;
    const ny = y + warpAmp * wy;

    const value = perlin2D(nx + t * 0.2, ny - t * 0.15);
    const factor = value * 2;

    const size = HEX_SIZE * factor;

    const [cx, cy] = toPixel(col, row);

    context.fillStyle = `hsla(${h}, ${s}, ${l}, ${a})`;

    context.beginPath();
    context.moveTo(cx + 0, cy - size);
    context.lineTo(cx + SQRT3_2 * size, cy - size / 2);
    context.lineTo(cx + SQRT3_2 * size, cy + size / 2);
    context.lineTo(cx + 0, cy + size);
    context.lineTo(cx - SQRT3_2 * size, cy + size / 2);
    context.lineTo(cx - SQRT3_2 * size, cy - size / 2);
    context.closePath();
    context.fill();
};

const run = () => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    let { height, width } = canvas;

    let rows = Math.ceil(height / (HEX_HEIGHT * 0.75)) + 1;
    let cols = Math.ceil(width / HEX_WIDTH) + 1;

    const tick = (ts = 0) => {
        context.fillStyle = 'rgba(255, 255, 255, 1)';
        context.fillRect(0, 0, width, height);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                drawHex(context, row, col, { h: 240, s: '50%', l: '50%', a: 0.5 }, ts / 1000);
            }
        }

        requestAnimationFrame(tick);
    };

    tick();
};

const resize = () => {
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;

    run();
};

window.addEventListener('resize', resize);

resize();

