import { hsvToRgb } from "./utils.js";

const pickParams = () => {
    const m = 2 * Math.PI;
    const n = Math.PI;
    let a, b, c, d;

    do {
        a = Math.random() * m - n;
        b = Math.random() * m - n;
        c = Math.random() * m - n;
        d = Math.random() * m - n;

        let good = 100;
        let x = 0;
        let y = 0;

        if (Math.abs(a) < 1) continue;
        if (Math.abs(b) < 1) continue;
        if (Math.abs(c) < 1) continue;
        if (Math.abs(d) < 1) continue;

        for (let i = 0; i < 10000; i++) {
            const nx = Math.sin(a * y) - Math.cos(b * x);
            const ny = Math.sin(c * x) - Math.cos(d * y);

            const v = ((x - nx) ** 2 + (y - ny) ** 2);

            x = nx; y = ny; 
            
            if (v < 1e-7) good--;
        }

        if (good > 0) break;
    } while (1);

    return { A: a, B: b, C: c, D: d };
};

const run = (canvas) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const { height, width } = canvas;
    const scale = Math.min(width, height) / 5;

    const F = (x, y) => ([
        Math.sin(A * y) - Math.cos(B * x),
        Math.sin(C * x) - Math.cos(D * y)
    ]);

    let counts = new Float32Array(width * height);
    let maxCount = 0;
    let x = 0.1;
    let y = 0.1;
    let h = Math.random();
    let A = 0.970, B = -1.899, C = 1.381, D = -1.506;

    const N = 10000;

    const reseed = () => {
        counts = new Float32Array(width * height);
        ({ A, B, C, D } = pickParams());
        h = Math.random();
        maxCount = 0;
        x = 0.1;
        y = 0.1;
    };

    const update = () => {
        for (let i = 0; i <= N; i++) {
            const [xp, yp] = F(x, y);

            const sx = Math.floor(width / 2 + x * scale);
            const sy = Math.floor(height / 2 + y * scale);

            if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
                const i = sy * width + sx;
                counts[i] += 1;

                if (counts[i] > maxCount) maxCount = counts[i];
            }

            x = xp;
            y = yp;
        }
    };

    const render = () => {
        const image = context.getImageData(0, 0, width, height);
        const data = image.data;

        for (let i = 0; i < counts.length; i++) {
            const count = counts[i];
            const i4 = i * 4;

            if (count > 0) {
                const t = count * (1 / maxCount);
                const s = Math.pow(t, 0.33);

                const { r, g, b } = hsvToRgb(h, s, 1 - s);

                data[i4 + 0] = r;
                data[i4 + 1] = g;
                data[i4 + 2] = b;
                data[i4 + 3] = 255;
            }
        }

        context.putImageData(image, 0, 0);
    };

    const tick = () => {
        update();
        render();

        requestAnimationFrame(tick);
    };

    canvas.addEventListener('pointerup', (e) => {
        context.clearRect(0, 0, canvas.width, canvas.height);

        reseed();
    });

    tick();
};

export default run;
