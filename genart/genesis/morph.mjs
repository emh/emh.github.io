import { times } from "./utils.js";

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

const D_A = 1.0;
const D_B = 0.5;
let feed = 0.03;
let kill = 0.06;
const dt = 1.0;

const stripes = () => {
    feed = Math.random() * 0.01 + 0.03;
    kill = Math.random() * 0.01 + 0.055;
};

const spots = () => {
    feed = Math.random() * 0.02 + 0.025;
    kill = Math.random() * 0.015 + 0.06;
};

const holes = () => {
    feed = Math.random() * 0.015 + 0.055;
    kill = Math.random() * 0.02 + 0.06;
};

const maze = () => {
    feed = Math.random() * 0.03 + 0.03;
    kill = Math.random() * 0.015 + 0.05;
};

const pulse = () => {
    feed = Math.random() * 0.01 + 0.02;
    kill = Math.random() * 0.01 + 0.05;
};

const chaos = () => {
    feed = Math.random() * 0.01 + 0.06;
    kill = Math.random() * 0.02 + 0.03;
};

const random = () => {
    const funcs = [stripes, spots, holes, maze, pulse, chaos];
    const fn = funcs[Math.floor(Math.random() * funcs.length)];

    fn();

    console.log(fn.name, { feed, kill });
};

const run = (canvas) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    let { height, width } = canvas;

    let image;
    let data;

    let A, B, A2, B2;

    const init = (px, py) => {
        image = context.getImageData(0, 0, width, height);
        data = image.data;

        const n = height * width;

        A = new Float32Array(n);
        B = new Float32Array(n);
        A2 = new Float32Array(n);
        B2 = new Float32Array(n);

        for (let i = 0; i < n; i++) {
            A[i] = 1;
            B[i] = 0;
        }

        const r = Math.floor(Math.min(width, height) / 10);
        const cx = px ?? Math.floor(width / 2);
        const cy = py ?? Math.floor(height / 2);

        for (let y = cy - r; y < cy + r; y++) {
            for (let x = cx - r; x < cx + r; x++) {
                const dx = x - cx;
                const dy = y - cy;

                if ((dx * dx) + (dy * dy) < (r * r)) {
                    const i = y * width + x;
                    A[i] = 0;
                    B[i] = 1;
                }
            }
        }
    };

    const update = () => {
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const i = y * width + x;

                const a = A[i];
                const b = B[i];

                const iL = y * width + (x - 1);
                const iR = y * width + (x + 1);
                const iT = (y - 1) * width + x;
                const iB = (y + 1) * width + x;
                const iTL = (y - 1) * width + (x - 1);
                const iTR = (y - 1) * width + (x + 1);
                const iBL = (y + 1) * width + (x - 1);
                const iBR = (y + 1) * width + (x + 1);

                let lapA = -a;
                lapA += 0.2 * A[iL] + 0.2 * A[iR] + 0.2 * A[iT] + 0.2 * A[iB];
                lapA += 0.05 * A[iTL] + 0.05 * A[iTR] + 0.05 * A[iBL] + 0.05 * A[iBR];

                let lapB = -b;
                lapB += 0.2 * B[iL] + 0.2 * B[iR] + 0.2 * B[iT] + 0.2 * B[iB];
                lapB += 0.05 * B[iTL] + 0.05 * B[iTR] + 0.05 * B[iBL] + 0.05 * B[iBR];

                const reaction = a * b * b;

                const a2 = a + (D_A * lapA - reaction + feed * (1 - a)) * dt;
                const b2 = b + (D_B * lapB + reaction - (kill + feed) * b) * dt;

                A2[i] = clamp(a2, 0, 1);
                B2[i] = clamp(b2, 0, 1);
            }
        }

        for (let x = 0; x < width; x++) {
            let iTop = x;
            let iBot = (height - 1) * width + x;
            A2[iTop] = A[iTop];
            B2[iTop] = B[iTop];
            A2[iBot] = A[iBot];
            B2[iBot] = B[iBot];
        }

        for (let y = 0; y < height; y++) {
            let iL = y * width;
            let iR = y * width + (width - 1);
            A2[iL] = A[iL];
            B2[iL] = B[iL];
            A2[iR] = A[iR];
            B2[iR] = B[iR];
        }

        [A, A2] = [A2, A];
        [B, B2] = [B2, B];
    };

    const render = () => {
        let blank = true;
        const n = height * width;

        for (let i = 0; i < n; i++) {
            const j = i * 4;

            const v = Math.abs(A[i] - B[i]);
            const c = clamp(Math.floor(v * 255), 0, 255);

            if (c !== 255) blank = false;

            data[j] = c;
            data[j + 1] = c;
            data[j + 2] = c;
            data[j + 3] = 255;
        }

        context.putImageData(image, 0, 0);

        if (blank) {
            console.log('blank!');
            random();
            init();
        }
    };

    const tick = () => {
        if (width !== canvas.width || height !== canvas.height) {
            width = canvas.width;
            height = canvas.height;

            context.clearRect(0, 0, canvas.width, canvas.height);

            init();
        }

        times(10, update);
        render();

        requestAnimationFrame(tick);
    };

    canvas.addEventListener('pointerup', (e) => {
        random();
        init(Math.floor(e.clientX), Math.floor(e.clientY));
    });

    init();
    tick();
};

export default run;
