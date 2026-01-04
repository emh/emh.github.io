import { rnd } from './utils.js';

const CELL_HEIGHT = 50;
const CELL_WIDTH = 40;
const MARGIN = 5;

const POINTS = [
    // corners
    { x: MARGIN * 2, y: MARGIN * 2 },
    { x: CELL_WIDTH - MARGIN * 2, y: MARGIN * 2 },
    { x: MARGIN * 2, y: CELL_HEIGHT - MARGIN * 2 },
    { x: CELL_WIDTH - MARGIN * 2, y: CELL_HEIGHT - MARGIN * 2 },
    // middle vertical
    { x: CELL_WIDTH / 2, y: MARGIN * 2 },
    { x: CELL_WIDTH / 2, y: CELL_HEIGHT - MARGIN * 2 },
    // middle horizontal
    { x: MARGIN * 2, y: CELL_HEIGHT / 2 },
    { x: CELL_WIDTH - MARGIN * 2, y: CELL_HEIGHT / 2 },
    // center
    { x: CELL_WIDTH / 2, y: CELL_HEIGHT / 2 }
];

const drawStroke = (ctx, startPoint, midPoint, endPoint) => {
    ctx.beginPath();

    const t = rnd(4, 2) * (Math.random() < 0.5 ? -1 : 1);

    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.quadraticCurveTo(midPoint.x, midPoint.y, endPoint.x, endPoint.y);
    ctx.quadraticCurveTo(midPoint.x, midPoint.y, startPoint.x + t, startPoint.y + t);
    ctx.closePath();
    ctx.fill();
}

const run = (canvas) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let { height, width } = canvas;

    const rows = Math.floor(height / CELL_HEIGHT);
    const cols = Math.floor(width / CELL_WIDTH);

    const ox = (width - (cols * CELL_WIDTH)) / 2;
    const oy = (height - (rows * CELL_HEIGHT)) / 2;

    const init = () => {
    };

    const clear = (a = 100) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
        ctx.fillRect(0, 0, width, height);
    };

    const drawGlyph = (x, y) => {
        ctx.save();
        ctx.strokeStyle = 'black';
        ctx.globalAlpha = 0.5;

        ctx.strokeRect(x + MARGIN, y + MARGIN, CELL_WIDTH - 2 * MARGIN, CELL_HEIGHT - 2 * MARGIN);

        ctx.globalAlpha = 1;
        ctx.fillStyle = 'black';

        ctx.translate(x, y);

        const n = rnd(4, 2);

        for (let i = 0; i < n; i++) {
            drawStroke(ctx, POINTS[rnd(POINTS.length)], POINTS[rnd(POINTS.length)], POINTS[rnd(POINTS.length)]);
        }

        ctx.restore();
    };

    const render = () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.translate(ox, oy);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = c * CELL_WIDTH;
                const y = r * CELL_HEIGHT;

                drawGlyph(x, y);
            }
        }
    };

    const tick = () => {
        if (width !== canvas.width || height !== canvas.height) {
            width = canvas.width;
            height = canvas.height;

            init();
        }

        clear();
        render();
    };

    canvas.addEventListener('pointerup', (e) => {
        init();
        tick();
    });

    init();
    tick();
};

export default run;
