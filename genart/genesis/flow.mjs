import { fractalPerlin2D, perlin2D } from "./perlin.mjs";
import { hsvToRgb, rnd, times } from "./utils.js";

const run = (canvas) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const { height, width } = canvas;

    const SIZE = Math.min(height, width) * 0.005;

    const tick = () => {
        const offset = rnd(255);

        context.fillStyle = 'white';
        context.fillRect(0, 0, width, height);

        const cols = width / SIZE;
        const rows = height / SIZE;
        const scale = 0.003;
        const field = [];

        for (let row = 0; row < rows; row++) {
            field[row] = [];

            for (let col = 0; col < cols; col++) {
                const cx = col * SIZE;
                const cy = row * SIZE;
                const n = perlin2D(cx * scale + offset, cy * scale + offset);
                const noiseAngle = n * Math.PI * 2;

                field[row][col] = noiseAngle;
            }
        }

        context.lineWidth = 1;

        const tension = 0.1;

        times(25000, () => {
            const points = [];

            let x = rnd(width);
            let y = rnd(height);

            const h = fractalPerlin2D(x * 0.01, y * 0.01);
            const v = fractalPerlin2D(x * 0.03, y * 0.03);
            const { r, g, b } = hsvToRgb(h, 0.7, v);

            context.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;

            points.push({ x, y });

            for (let n = 0; n < 10; n++) {
                const c = Math.floor(x / SIZE);
                const r = Math.floor(y / SIZE);

                if (c > cols - 1 || r > rows - 1 || c < 0 || r < 0) {
                    break;
                }

                const a = field[r][c];

                x = x + Math.cos(a) * 50;
                y = y + Math.sin(a) * 50;

                points.push({ x, y });
            }

            context.beginPath();
            context.moveTo(points[0].x, points[0].y);

            for (let i = 1; i < points.length - 2; i++) {
                const p0 = points[i - 1];
                const p1 = points[i];
                const p2 = points[i + 1];
                const p3 = points[i + 2];

                const c1x = p1.x + (p2.x - p0.x) * tension;
                const c1y = p1.y + (p2.y - p0.y) * tension;
                const c2x = p2.x - (p3.x - p1.x) * tension;
                const c2y = p2.y - (p3.y - p1.y) * tension;

                context.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
            }

            context.stroke();
        });
    };

    canvas.addEventListener('pointerup', tick);

    tick();
};

export default run;
