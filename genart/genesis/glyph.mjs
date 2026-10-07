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
    const ctx = canvas.getContext('2d');
    let scaleX = 1, scaleY = 1;

    const drawGlyph = (x, y) => {
        // Draw opaque border strips on physical pixel boundaries. A one-CSS-pixel
        // border stays sharp on Retina displays and at fractional display scales.
        const left = Math.round((x + MARGIN) * scaleX);
        const top = Math.round((y + MARGIN) * scaleY);
        const right = Math.round((x + CELL_WIDTH - MARGIN) * scaleX);
        const bottom = Math.round((y + CELL_HEIGHT - MARGIN) * scaleY);
        const borderX = Math.max(1, Math.round(scaleX));
        const borderY = Math.max(1, Math.round(scaleY));

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#808080';
        ctx.fillRect(left, top, right - left, borderY);
        ctx.fillRect(left, bottom - borderY, right - left, borderY);
        ctx.fillRect(left, top, borderX, bottom - top);
        ctx.fillRect(right - borderX, top, borderX, bottom - top);

        ctx.setTransform(scaleX, 0, 0, scaleY, x * scaleX, y * scaleY);
        ctx.fillStyle = 'black';
        const n = rnd(4, 2);

        for (let i = 0; i < n; i++) {
            drawStroke(ctx, POINTS[rnd(POINTS.length)], POINTS[rnd(POINTS.length)], POINTS[rnd(POINTS.length)]);
        }

        ctx.restore();
    };

    const render = () => {
        const { width, height } = canvas.getBoundingClientRect();
        if (!width || !height) return;
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        canvas.width = Math.max(1, Math.round(width * dpr));
        canvas.height = Math.max(1, Math.round(height * dpr));
        scaleX = canvas.width / width;
        scaleY = canvas.height / height;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const rows = Math.floor(height / CELL_HEIGHT);
        const cols = Math.floor(width / CELL_WIDTH);
        const ox = (width - cols * CELL_WIDTH) / 2;
        const oy = (height - rows * CELL_HEIGHT) / 2;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                drawGlyph(ox + c * CELL_WIDTH, oy + r * CELL_HEIGHT);
            }
        }
    };

    canvas.addEventListener('pointerup', render);
    window.addEventListener('resize', render);
    render();
};

export default run;
