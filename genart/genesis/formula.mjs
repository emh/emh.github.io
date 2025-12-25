import { fractalPerlin2D } from "./perlin.mjs";
import { clamp } from "./utils.js";

const STEPS = 2000;
const EPS = 1e-9;

const abs = (v) => Math.max(Math.abs(v), EPS);

const generateCurve = (cx, cy, scale, rotation, { m, a, b, n1, n2, n3 }) => {
    const points = [];

    const r = (phi) => {
        const aa = abs(a);
        const bb = abs(b);
        const nn1 = abs(n1);

        const t = (m * phi) / 4;
        const c = Math.cos(t) / aa;
        const s = Math.sin(t) / bb;

        const term1 = Math.pow(Math.abs(c), n2);
        const term2 = Math.pow(Math.abs(s), n3);

        const sum = term1 + term2;

        if (sum < EPS) return 1 / EPS;

        return Math.min(Math.pow(sum, -1 / nn1), 10);
    }

    for (let i = 0; i <= STEPS; i++) {
        const phi = (i / STEPS) * Math.PI * 2;
        const radius = r(phi);

        const ang = phi + rotation;
        const x = cx + Math.cos(ang) * radius * scale;
        const y = cy + Math.sin(ang) * radius * scale;

        points.push({ x, y });
    }

    return points;
};

const n11 = (v01) => v01 * 2 - 1;

const RANGES = {
    m: [1, 16],
    n1: [0.08, 2.5],
    n2: [0.2, 12],
    n3: [0.2, 12],
};

const BASE = { m: 5, a: 1, b: 1, n1: 0.12, n2: 1.9, n3: 1.8 };
const AMP = { m: 2.0, n1: 0.20, n2: 3.0, n3: 3.0 };

const OFF = {
    m: { x: 11.3, y: 91.7 },
    n1: { x: 23.1, y: 17.4 },
    n2: { x: 37.9, y: 63.2 },
    n3: { x: 51.6, y: 44.8 },
};

const SPEED = { m: 0.02, n1: 0.015, n2: 0.01, n3: 0.012 };

const sample = (t, off, speed) => fractalPerlin2D(off.x + t * speed, off.y + t * speed);

const morphParams = (t) => {
    const mRaw = BASE.m + AMP.m * n11(sample(t, OFF.m, SPEED.m));
    const n1Raw = BASE.n1 + AMP.n1 * n11(sample(t, OFF.n1, SPEED.n1));
    const n2Raw = BASE.n2 + AMP.n2 * n11(sample(t, OFF.n2, SPEED.n2));
    const n3Raw = BASE.n3 + AMP.n3 * n11(sample(t, OFF.n3, SPEED.n3));

    const m = clamp(mRaw, ...RANGES.m);

    return {
        ...BASE,
        m,
        n1: clamp(n1Raw, ...RANGES.n1),
        n2: clamp(n2Raw, ...RANGES.n2),
        n3: clamp(n3Raw, ...RANGES.n3),
    };
};

const baseScale = (w, h) => Math.min(w, h) * 0.25;

const scaleAt = (t, w, h) => {
    const b = baseScale(w, h);
    const n = fractalPerlin2D(300 + t * 0.003, 400, 4, 0.5, 2.0) * 2 - 1;
    const s = b * (1 + 0.25 * n);
    const lo = Math.min(w, h) * 0.10;
    const hi = Math.min(w, h) * 0.45;

    return Math.max(lo, Math.min(hi, s));
};

const hueFromNoise = (t) => {
    const n = fractalPerlin2D(10 + t * 0.003, 20, 4, 0.5, 2.0);

    return n * 360;
};

export function drawCurve(context, points, t) {
    const hue = hueFromNoise(t);
    const sat = 80;
    const light = 20;
    const alpha = 0.5;

    context.save();
    context.lineWidth = 2;
    context.lineJoin = "round";
    context.lineCap = "round";

    context.beginPath();
    context.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
        const p0 = points[i];
        const p1 = points[(i + 1) % points.length];

        context.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;

        context.beginPath();
        context.moveTo(p0.x, p0.y);
        context.lineTo(p1.x, p1.y);
        context.stroke();
    };
}

const run = (canvas) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    let { height, width } = canvas;

    let points = [];
    let step = 0;

    const init = () => {
        points = generateCurve(
            width / 2,
            height / 2,
            baseScale(width, height),
            0,
            BASE
        );
    };

    const update = () => {
        const rotation = step * 0.01;
        const params = morphParams(step * 0.05);

        points = generateCurve(
            width / 2,
            height / 2,
            scaleAt(step, width, height),
            rotation,
            params
        );

        step += 2;
    };

    const clear = () => {
        context.fillStyle = 'rgba(255, 255, 255, 0.1)';
        context.fillRect(0, 0, width, height);
    };

    const render = () => {
        drawCurve(context, points, step);
    };

    let paused = false;

    const tick = () => {
        if (width !== canvas.width || height !== canvas.height) {
            width = canvas.width;
            height = canvas.height;
        }

        if (!paused) {
            clear();
            update();
            render();
        }

        requestAnimationFrame(tick);
    };

    canvas.addEventListener('pointerup', (e) => {
        paused = !paused;
    });

    init();
    tick();
};

export default run;
