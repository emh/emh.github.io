import { rnd, times } from "./utils.js";

const PATTERNS = [
    [
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0]
    ],
    [
        [0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 1, 1, 0, 0],
        [0, 0, 1, 0, 0, 0, 1, 0],
        [1, 1, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 1, 0, 0]
    ],
    [
        [1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0, 0, 0]
    ],
    [
        [0, 0, 0, 1, 0, 0, 0, 1],
        [0, 0, 1, 0, 0, 0, 1, 0],
        [0, 1, 0, 0, 0, 1, 0, 0],
        [1, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 1],
        [0, 0, 1, 0, 0, 0, 1, 0],
        [0, 1, 0, 0, 0, 1, 0, 0],
        [1, 0, 0, 0, 1, 0, 0, 0]
    ],
    [
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0, 1, 0, 0],
        [0, 0, 1, 0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0, 1, 0, 1],
        [0, 0, 1, 0, 1, 0, 1, 0],
        [0, 0, 0, 1, 0, 1, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0]
    ],
    [
        [1, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0]
    ],
    [
        [1, 0, 0, 0, 1, 0, 0, 0],
        [1, 0, 0, 0, 1, 0, 0, 0],
        [1, 0, 0, 0, 1, 0, 0, 0],
        [1, 0, 0, 0, 1, 0, 0, 0],
        [1, 0, 0, 0, 1, 0, 0, 0],
        [1, 0, 0, 0, 1, 0, 0, 0],
        [1, 0, 0, 0, 1, 0, 0, 0],
        [1, 0, 0, 0, 1, 0, 0, 0]
    ],
    [
        [0, 1, 0, 1, 0, 1, 0, 1],
        [1, 0, 1, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 1, 0, 1, 0, 1],
        [0, 0, 0, 0, 1, 0, 1, 0],
        [0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0]
    ],
    [
        [1, 1, 1, 1, 1, 0, 0, 0],
        [0, 1, 1, 1, 0, 1, 0, 0],
        [0, 0, 1, 0, 0, 0, 1, 0],
        [0, 1, 0, 0, 0, 1, 1, 1],
        [1, 0, 0, 0, 1, 1, 1, 1],
        [0, 0, 0, 1, 0, 1, 1, 1],
        [0, 0, 1, 0, 0, 0, 1, 0],
        [0, 1, 1, 1, 0, 0, 0, 1]
    ],
    [
        [1, 0, 1, 1, 0, 0, 0, 1],
        [0, 0, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 1],
        [0, 0, 0, 1, 1, 0, 1, 1],
        [1, 1, 0, 1, 1, 0, 0, 0],
        [1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 0, 0],
        [1, 0, 0, 0, 1, 1, 0, 1]
    ],
    [
        [1, 0, 0, 0, 0, 0, 1, 0],
        [0, 1, 0, 0, 0, 1, 0, 0],
        [0, 0, 1, 1, 1, 0, 0, 1],
        [0, 1, 0, 0, 0, 1, 0, 0],
        [1, 0, 0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 1]
    ],
    [
        [0, 0, 0, 0, 0, 0, 1, 1],
        [1, 0, 0, 0, 0, 1, 0, 0],
        [0, 1, 0, 0, 1, 0, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 1]
    ]
];

const LEFT = 0;
const TOP = 1;
const RIGHT = 2;
const BOTTOM = 3;

const NUM_LINES = 6;

const pickEdge = () => rnd(4);
const getOppositeEdge = (edge) => (edge + 2) % 4;
const pickPosition = (edge, width, height) => {
    switch (edge) {
        case LEFT:
            return { x: 0, y: rnd(height) };
        case TOP:
            return { x: rnd(width), y: 0 };
        case RIGHT:
            return { x: width - 1, y: rnd(height) };
        case BOTTOM:
            return { x: rnd(width), y: height - 1 };
    }
};
const pickPositions = (width, height) => {
    const edge = pickEdge();
    let edge2 = getOppositeEdge(edge);

    return [
        pickPosition(edge, width, height),
        pickPosition(edge2, width, height)
    ];
};
const pickPattern = () => PATTERNS[rnd(PATTERNS.length)];

const generateLines = (width, height) =>
    times(NUM_LINES, () => pickPositions(canvas.width, canvas.height));

const drawLines = (context, lines) => {
    context.lineWidth = 5;
    context.strokeStyle = "black";

    lines.forEach(([p1, p2]) => {
        context.strokeStyle = 'black';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(p1.x, p1.y);
        context.lineTo(p2.x, p2.y);
        context.stroke();
    });
};

const toRGB = (arr) => ({ r: arr[0], g: arr[1], b: arr[2] });
const lum = ({ r, g, b }) => 0.3 * r + 0.59 * g + 0.11 * b;
const isLine = (data, i4) => lum(toRGB(data.slice(i4, i4 + 4))) < 40;

const inPattern = (x, y, pattern) => {
    const px = x % pattern[0].length;
    const py = y % pattern.length;

    return pattern[py][px] === 1;
};

function fill(W, H, data, visited, startX, startY, pattern) {
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

        if (inPattern(x, y, pattern)) {
            data[i4] = 0;
            data[i4 + 1] = 0;
            data[i4 + 2] = 0;
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

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;

            if (visited[idx]) continue;

            const i4 = idx * 4;

            if (isLine(data, i4)) continue;

            const pattern = pickPattern();

            fill(width, height, data, visited, x, y, pattern);
        }
    }

    context.putImageData(imageData, 0, 0);
};

const run = (canvas) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });

    const tick = () => {
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);

        const lines = generateLines(canvas.width, canvas.height);
        drawLines(context, lines);
        paint(context);
        drawLines(context, lines);
    };

    canvas.addEventListener('pointerup', tick);

    tick();
};

export default run;
