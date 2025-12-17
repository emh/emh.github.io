import { rnd } from "./utils.js";

const triadic = (hue) => [
    hue,
    (hue + 120) % 360,
    (hue + 240) % 360
];

const rectTetradic = (hue) => [
    hue,
    (hue + 60) % 360,
    (hue + 180) % 360,
    (hue + 240) % 360
];

const squareTetradic = (hue) => [
    hue,
    (hue + 60) % 360,
    (hue + 180) % 360,
    (hue + 240) % 360
];

const hexadic = (hue) => [
    hue,
    (hue + 60) % 360,
    (hue + 120) % 360,
    (hue + 180) % 360,
    (hue + 240) % 360,
    (hue + 300) % 360
];

const analagous = (hue) => [
    hue,
    (hue + 60),
    (hue + 300) % 360
];

const complementary = (hue) => [
    hue,
    (hue + 180) % 360
];

const splitComplementary = (hue) => [
    hue,
    (hue + 150) % 360,
    (hue + 210) % 360
];

const paletteTypes = [
    triadic,
    rectTetradic,
    squareTetradic,
    hexadic,
    analagous,
    complementary,
    splitComplementary
];

const CELL_SIZE = 40;
const CELL_HEIGHT = 2 * CELL_SIZE;
const CELL_WIDTH = Math.sqrt(3) * CELL_SIZE;

const toPixel = (col, row) => {
    const x = CELL_WIDTH * (col + 0.5 * (row & 1));
    const y = (3 / 4) * CELL_HEIGHT * row;

    return [x, y];
};

const run = (canvas) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    let { height, width } = canvas;
    const r = CELL_SIZE;

    let rows = Math.ceil(height / (CELL_HEIGHT * 0.75)) + 1;
    let cols = Math.ceil(width / CELL_WIDTH) + 1;

    context.strokeStyle = 'black';
    context.lineWidth = 2;

    const clear = () => {
        context.fillStyle = 'white';
        context.fillRect(0, 0, width, height);
    };

    const drawPie = (cx, cy, palette) => {
        for (let i = 0; i < palette.length; i++) {
            const hue = palette[i];

            context.fillStyle = `hsl(${hue}, 80%, 60%)`;

            const arclength = (360 / palette.length);

            context.beginPath();
            context.moveTo(cx, cy);
            const startAngle = (i * arclength) * (Math.PI / 180);
            const endAngle = startAngle + arclength * (Math.PI / 180);
            context.arc(cx, cy, r, startAngle, endAngle);
            context.closePath();
            context.stroke();
            context.fill();
        }
    };

    const drawTarget = (cx, cy, palette) => {
        for (let i = 0; i < palette.length; i++) {
            const hue = palette[i];

            context.fillStyle = `hsl(${hue}, 80%, 60%)`;

            context.beginPath();
            context.moveTo(cx, cy);
            context.arc(cx, cy, r - (i * (r / palette.length)), 0, Math.PI * 2);
            context.closePath();
            context.stroke();
            context.fill();
        }
    };

    const drawStripedCircle = (cx, cy, palette) => {
        const n = palette.length;
        const bandHeight = (2 * r) / n;
        const angle = Math.random() * Math.PI;

        context.save();
        context.translate(cx, cy);
        context.beginPath();
        context.arc(0, 0, r, 0, Math.PI * 2);
        context.stroke();
        context.clip();
        context.rotate(angle);


        for (let i = 0; i < n; i++) {
            const y = -r + i * bandHeight;
            const hue = palette[i];

            context.fillStyle = `hsl(${hue}, 80%, 60%)`;
            context.fillRect(-r, y, 2 * r, bandHeight);
            context.strokeRect(-r, y, 2 * r, bandHeight);
        }

        context.restore();
    };

    const drawCheckedCircle = (cx, cy, palette) => {
        const n = palette.length;
        const cellSize = (2 * r) / n;
        const angle = Math.random() * Math.PI;

        context.save();
        context.translate(cx, cy);
        context.beginPath();
        context.arc(0, 0, r, 0, Math.PI * 2);
        context.stroke();
        context.clip();
        context.rotate(angle);

        for (let row = 0; row < rows; row++) {
            const y = -r + row * cellSize;

            for (let col = 0; col < cols; col++) {
                const x = -r + col * cellSize;
                const i = (row + col) % n;
                const hue = palette[i];

                context.fillStyle = `hsl(${hue}, 80%, 60%)`;
                context.fillRect(x, y, cellSize, cellSize);
                context.strokeRect(x, y, cellSize, cellSize);
            }
        }

        context.restore();
    };

    const shapes = [drawPie, drawTarget, drawStripedCircle, drawCheckedCircle];

    const drawPalette = () => {
        const row = rnd(rows);
        const col = rnd(cols);
        const [cx, cy] = toPixel(col, row);
        const base = rnd(360);
        const palette = paletteTypes[rnd(paletteTypes.length)](base);

        shapes[rnd(shapes.length)](cx, cy, palette);
    };

    const tick = () => {
        if (width !== canvas.width || height !== canvas.height) {
            width = canvas.width;
            height = canvas.height;
            rows = Math.ceil(height / (CELL_HEIGHT * 0.75)) + 1;
            cols = Math.ceil(width / CELL_WIDTH) + 1;
        }

        drawPalette();

        requestAnimationFrame(tick);
    };

    canvas.addEventListener('pointerup', (e) => {
        clear();
    });

    clear();
    tick();
};

export default run;
