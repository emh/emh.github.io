import { rnd, times } from "./utils.js";

const DT = 1 / 240;

const N = 50;

const MAX_POINTS = 2000;

const INITIAL_STATE = {
    theta1: Math.PI,
    theta2: -Math.PI / 4,
    omega1: 0,
    omega2: 0,
    length1: 200,
    length2: 100,
    mass1: 5,
    mass2: 5,
    gravity: 9.81,
    x0: 0, y0: 0, x1: 0, y1: 0, x2: 0, y2: 0

};

const run = (canvas) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    let { height, width } = canvas;

    let states;
    let pendulums;
    let baseHue;

    const hueStep = 180 / N;

    const init = () => {
        const eps = 1e-5;
        const mid = (N - 1) / 2;

        const length = (Math.min(width, height) / 2) * 0.8;
        const length1 = length * (Math.random() * 0.5 + 0.25);
        const length2 = length - length1;

        const mass1 = rnd(10) + 10;
        const mass2 = rnd(10) + 10;

        states = times(N, () => ({ ...INITIAL_STATE }));

        states.forEach((state, i) => {
            const d = (i - mid) * eps;

            state.x0 = width * 0.5;
            state.y0 = height * 0.5;
            state.theta2 = INITIAL_STATE.theta2 + d;
            state.length1 = length1;
            state.length2 = length2;
            state.mass1 = mass1;
            state.mass2 = mass2;
        });

        pendulums = times(N, () => []);

        baseHue = rnd(360);
    };

    const deriv = (S, p) => {
        // S = [theta1, omega1, theta2, omega2]
        const [t1, w1, t2, w2] = S;
        const { length1: L1, length2: L2, mass1: m1, mass2: m2, gravity: g } = p;

        const d = t1 - t2;
        const den = (2 * m1 + m2 - m2 * Math.cos(2 * d));

        const a1 = (
            -g * (2 * m1 + m2) * Math.sin(t1)
            - m2 * g * Math.sin(t1 - 2 * t2)
            - 2 * Math.sin(d) * m2 * (w2 * w2 * L2 + w1 * w1 * L1 * Math.cos(d))
        ) / (L1 * den);

        const a2 = (
            2 * Math.sin(d) * (
                w1 * w1 * L1 * (m1 + m2)
                + g * (m1 + m2) * Math.cos(t1)
                + w2 * w2 * L2 * m2 * Math.cos(d)
            )
        ) / (L2 * den);

        // d/dt [t1, w1, t2, w2]
        return [w1, a1, w2, a2];
    };

    const rk4Step = (S, p) => {
        const k1 = deriv(S, p);

        const S2 = S.map((v, i) => v + 0.5 * DT * k1[i]);
        const k2 = deriv(S2, p);

        const S3 = S.map((v, i) => v + 0.5 * DT * k2[i]);
        const k3 = deriv(S3, p);

        const S4 = S.map((v, i) => v + DT * k3[i]);
        const k4 = deriv(S4, p);

        return S.map((v, i) => v + (DT / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    };

    const update = () => {
        states.forEach((state, i) => {
            let S = [state.theta1, state.omega1, state.theta2, state.omega2];
            S = rk4Step(S, state);

            [state.theta1, state.omega1, state.theta2, state.omega2] = S;

            // Update positions for rendering
            const x1 = state.x0 + state.length1 * Math.sin(state.theta1);
            const y1 = state.y0 + state.length1 * Math.cos(state.theta1);

            const x2 = x1 + state.length2 * Math.sin(state.theta2);
            const y2 = y1 + state.length2 * Math.cos(state.theta2);

            state.x1 = x1; state.y1 = y1;
            state.x2 = x2; state.y2 = y2;

            pendulums[i].push({ x: x2, y: y2 });

            if (pendulums[i].length > MAX_POINTS) pendulums[i].shift();
        });
    };

    const clear = (a) => {
        context.fillStyle = `rgba(255, 255, 255, ${a})`;
        context.fillRect(0, 0, width, height);
    };

    const drawPendulumPath = (points, color) => {
        const tension = 0.2;
        const n = points.length;

        context.strokeStyle = color;
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);

        for (let i = 0; i < n - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const p0 = points[i - 1] || p1;
            const p3 = points[i + 2] || p2;

            const c1x = p1.x + (p2.x - p0.x) * tension;
            const c1y = p1.y + (p2.y - p0.y) * tension;
            const c2x = p2.x - (p3.x - p1.x) * tension;
            const c2y = p2.y - (p3.y - p1.y) * tension;

            context.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
        }

        context.stroke();
    };

    const render = () => {
        context.lineWidth = 4;
        context.strokeStyle = "black";
        context.lineCap = "round";
        context.lineJoin = "round";

        pendulums.forEach((points, i) => {
            const color = `hsla(${(baseHue + hueStep * i) % 360}, 50%, 40%, 0.9)`;

            drawPendulumPath(points, color);
        });
    };

    const tick = () => {
        if (width !== canvas.width || height !== canvas.height) {
            width = canvas.width;
            height = canvas.height;
        }

        clear(0.06);
        times(25, update);
        render();

        requestAnimationFrame(tick);
    };

    canvas.addEventListener('pointerup', (e) => {
        clear(1);
        init();
    });

    init();
    tick();
};

export default run;
