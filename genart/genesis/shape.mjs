import { rnd, times } from './utils.js';

const NUM_POINTS = 10;

const COLORS = [
    { r: 255, g: 0, b: 0 },
    { r: 0, g: 0, b: 255 },
    { r: 255, g: 255, b: 0 }
];

const randColor = () => COLORS[rnd(COLORS.length)];

const generatePoints = (width, height) => {
    return times(NUM_POINTS, () => ({
        x: rnd(width * 0.9, width * 0.1),
        y: rnd(height * 0.9, height * 0.1)
    }));
};

const drawCurve = (context, points) => {
    context.lineWidth = 4;
    context.strokeStyle = "black";
    context.lineCap = "round";
    context.lineJoin = "round";

    context.beginPath();
    context.moveTo(points[0].x, points[0].y);

    const tension = 0.2;
    const n = points.length;

    for (let i = 0; i < n; i++) {
        const p0 = points[(i - 1 + n) % n];
        const p1 = points[i];
        const p2 = points[(i + 1) % n];
        const p3 = points[(i + 2) % n];

        const c1x = p1.x + (p2.x - p0.x) * tension;
        const c1y = p1.y + (p2.y - p0.y) * tension;
        const c2x = p2.x - (p3.x - p1.x) * tension;
        const c2y = p2.y - (p3.y - p1.y) * tension;

        context.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
    }

    context.closePath();
    context.stroke();
};

const toRGB = (arr) => ({ r: arr[0], g: arr[1], b: arr[2] });
const lum = ({ r, g, b }) => 0.3 * r + 0.59 * g + 0.11 * b;
const isLine = (data, i4) => lum(toRGB(data.slice(i4, i4 + 4))) < 40;

function fill(W, H, data, visited, startX, startY, color) {
    const stack = [];
    const width = W;
    const height = H;
    const idx0 = startY * width + startX;
    stack.push(idx0);

    while (stack.length > 0) {
        const idx = stack.pop();
        if (visited[idx]) continue;
        const x = idx % width;
        const y = (idx / width) | 0;

        const i4 = idx * 4;
        if (isLine(data, i4)) continue;

        visited[idx] = 1;

        if (color) {
            data[i4] = color.r;
            data[i4 + 1] = color.g;
            data[i4 + 2] = color.b;
            data[i4 + 3] = 255;
        }

        if (x > 0) stack.push(idx - 1);
        if (x < width - 1) stack.push(idx + 1);
        if (y > 0) stack.push(idx - width);
        if (y < height - 1) stack.push(idx + width);
    }
}

const paint = (context) => {
    const { width, height } = context.canvas;

    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    const visited = new Uint8Array(width * height);

    for (let x = 0; x < width; x++) {
        let idxTop = 0 * width + x;
        let idxBot = (height - 1) * width + x;

        if (!visited[idxTop]) fill(width, height, data, visited, x, 0, null);
        if (!visited[idxBot]) fill(width, height, data, visited, x, height - 1, null);
    }
    for (let y = 0; y < height; y++) {
        let idxLeft = y * width + 0;
        let idxRight = y * width + (width - 1);

        if (!visited[idxLeft]) fill(width, height, data, visited, 0, y, null);
        if (!visited[idxRight]) fill(width, height, data, visited, width - 1, y, null);
    }

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;

            if (visited[idx]) continue;

            const i4 = idx * 4;

            if (isLine(data, i4)) continue;

            const color = randColor();

            fill(width, height, data, visited, x, y, color);
        }
    }

    context.putImageData(imageData, 0, 0);
};

const run = (canvas) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });

    const tick = () => {
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);

        const points = generatePoints(canvas.width, canvas.height);

        drawCurve(context, points);
        paint(context);
    };

    canvas.addEventListener('pointerup', tick);

    tick();
};

export default run;
