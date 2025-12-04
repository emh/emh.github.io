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

export const fractalPerlin2D = (x, y, octaves = 4, persistence = 0.5, lacunarity = 2.0) => {
    let amplitude = 1.0;
    let frequency = 1.0;
    let value = 0.0;
    let maxAmplitude = 0.0;

    for (let o = 0; o < octaves; o++) {
        value += perlin2D(x * frequency, y * frequency) * amplitude;
        maxAmplitude += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }

    return value / maxAmplitude;
};
