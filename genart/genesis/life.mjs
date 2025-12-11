import { fractalPerlin2D, perlin2D } from "./perlin.mjs";
import { hsvToRgb, rnd } from "./utils.js";

const HEX_SIZE = 10;
const HEX_HEIGHT = 2 * HEX_SIZE;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;

const SQRT3_2 = Math.sqrt(3) / 2;

const NEIGHBORS_EVEN = [[1, 0], [-1, 0], [0, -1], [-1, -1], [0, 1], [-1, 1]];
const NEIGHBORS_ODD = [[1, 0], [-1, 0], [1, -1], [0, -1], [1, 1], [0, 1]];

const getNeighbours = (grid, row, col) => {
    const offsets = (row & 1) ? NEIGHBORS_ODD : NEIGHBORS_EVEN;
    const neighbours = [];

    for (const [dc, dr] of offsets) {
        let nRow = row + dr;
        let nCol = col + dc;

        if (nRow < 0) nRow = grid.length - 1;
        if (nCol < 0) nCol = grid[0].length - 1;
        if (nRow >= grid.length) nRow = 0;
        if (nCol >= grid[0].length) nCol = 0;

        neighbours.push(grid[nRow][nCol]);
    }

    return neighbours;
};

const averageHue = (neighbours) => {
    const hues = neighbours.map((n) => n.h);

    let sumX = 0, sumY = 0;
    for (const h of hues) {
        const angle = h * 2 * Math.PI;
        sumX += Math.cos(angle);
        sumY += Math.sin(angle);
    }
    const angle = Math.atan2(sumY, sumX);
    const h = (angle / (2 * Math.PI) + 1) % 1;

    return h;
};

const lerpHue = (h1, h2, t) => {
    let d = ((h2 - h1 + 1.5) % 1) - 0.5;
    return (h1 + d * t + 1) % 1;
};

const toPixel = (col, row) => {
    const x = HEX_WIDTH * (col + 0.5 * (row & 1));
    const y = (3 / 4) * HEX_HEIGHT * row;

    return [x, y];
};

const drawHex = (context, row, col, cell) => {
    const size = HEX_SIZE * 0.98;
    const [cx, cy] = toPixel(col, row);
    const { h, s, v } = cell;
    const { r, g, b } = hsvToRgb(h, s, v);

    context.fillStyle = `rgb(${r}, ${g}, ${b})`;

    context.beginPath();
    context.moveTo(cx + 0, cy - size);
    context.lineTo(cx + SQRT3_2 * size, cy - size / 2);
    context.lineTo(cx + SQRT3_2 * size, cy + size / 2);
    context.lineTo(cx + 0, cy + size);
    context.lineTo(cx - SQRT3_2 * size, cy + size / 2);
    context.lineTo(cx - SQRT3_2 * size, cy - size / 2);
    context.closePath();
    context.fill();
};

const run = (canvas) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const { height, width } = canvas;

    const rows = Math.ceil(height / (HEX_HEIGHT * 0.75)) + 1;
    const cols = Math.ceil(width / HEX_WIDTH) + 1;

    let grid = [];
    let nextGrid = [];
    let offset = rnd(255);

    const init = () => {
        offset = rnd(255);

        for (let row = 0; row < rows; row++) {
            grid[row] = [];
            nextGrid[row] = [];

            for (let col = 0; col < cols; col++) {
                const h = perlin2D(col * 0.05 + offset, row * 0.05 + offset);
                const v = perlin2D(col * 0.005 + offset, row * 0.005 + offset);
                const n = perlin2D(col * 0.05 + offset, row * 0.05 + offset);
                const angle = n * Math.PI * 2;

                grid[row][col] = { h, s: 1, v, angle };
                nextGrid[row][col] = { ...grid[row][col] };
            }
        }
    };

    const EXTERNAL_WEIGHT = 0.01;
    const NEIGHBOUR_WEIGHT = 0.8;
    let t = 0;

    const update = () => {
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const cell = grid[row][col];
                const neighbours = getNeighbours(grid, row, col);
                const avgNeighborHue = averageHue(neighbours);
                const turbPhase = 90 * Math.sin(cell.angle + t * 0.02);
                
                let newH = cell.h;
                newH = lerpHue(newH, avgNeighborHue, NEIGHBOUR_WEIGHT);
                newH = lerpHue(newH, turbPhase, EXTERNAL_WEIGHT);

                nextGrid[row][col] = { ...cell, h: newH };
            }
        }

        const tmp = grid;
        grid = nextGrid;
        nextGrid = tmp;
        t += 0.001;
    };

    const render = () => {
        context.fillStyle = 'white';
        context.fillRect(0, 0, width, height);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                drawHex(context, row, col, grid[row][col]);
            }
        }
    };

    const tick = () => {
        update();
        render();

        requestAnimationFrame(tick);
    };

    canvas.addEventListener('pointerup', (e) => {
        init();
    });

    init();
    tick();
};

export default run;
