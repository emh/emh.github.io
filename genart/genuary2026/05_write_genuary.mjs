const canvas = document.getElementById('canvas');

const TOP_LEFT = 0;
const TOP_MIDDLE = 1;
const TOP_RIGHT = 2;
const MIDDLE_LEFT = 3;
const MIDDLE_RIGHT = 5;
const BOTTOM_LEFT = 6;
const BOTTOM_MIDDLE = 7;
const BOTTOM_RIGHT = 8;

const LINE = 0;
const ARC = 1;

const LEFT_SIDE = 0;
const RIGHT_SIDE = 1;
const TOP_SIDE = 2;
const BOTTOM_SIDE = 3;
const FORWARD_DIAGONAL = 4;
const BACKWARD_DIAGONAL = 5;
const VERTICAL_MIDDLE = 6;
const HORIZONTAL_MIDDLE = 7;
const TOP_RIGHT_QUARTER_ARC = 8;
const TOP_LEFT_QUARTER_ARC = 9;
const BOTTOM_RIGHT_QUARTER_ARC = 10;
const BOTTOM_LEFT_QUARTER_ARC = 11;
const LEFT_TEE = 12;
const RIGHT_TEE = 13;
const TOP_TEE = 14;
const BOTTOM_TEE = 15;
const TOP_RIGHT_V_ARROW = 16;
const TOP_RIGHT_H_ARROW = 17;
const TOP_LEFT_V_ARROW = 18;
const TOP_LEFT_H_ARROW = 19;
const BOTTOM_RIGHT_V_ARROW = 20;
const BOTTOM_RIGHT_H_ARROW = 21;
const BOTTOM_LEFT_V_ARROW = 22;
const BOTTOM_LEFT_H_ARROW = 23;
const TOP_RIGHT_CORNER = 24;
const TOP_LEFT_CORNER = 25;
const BOTTOM_RIGHT_CORNER = 26;
const BOTTOM_LEFT_CORNER = 27;
const BOTH_VERTICALS = 28;
const BOTH_HORIZONTALS = 29;
const BLANK = 30;

const TILES = [
    { strokes: [{ type: LINE, from: TOP_LEFT, to: BOTTOM_LEFT }] },
    { strokes: [{ type: LINE, from: TOP_RIGHT, to: BOTTOM_RIGHT }] },
    { strokes: [{ type: LINE, from: TOP_LEFT, to: TOP_RIGHT }] },
    { strokes: [{ type: LINE, from: BOTTOM_LEFT, to: BOTTOM_RIGHT }] },
    { strokes: [{ type: LINE, from: TOP_LEFT, to: BOTTOM_RIGHT }] },
    { strokes: [{ type: LINE, from: TOP_RIGHT, to: BOTTOM_LEFT }] },
    { strokes: [{ type: LINE, from: TOP_MIDDLE, to: BOTTOM_MIDDLE }] },
    { strokes: [{ type: LINE, from: MIDDLE_LEFT, to: MIDDLE_RIGHT }] },
    { strokes: [{ type: ARC, center: BOTTOM_LEFT }] },
    { strokes: [{ type: ARC, center: BOTTOM_RIGHT }] },
    { strokes: [{ type: ARC, center: TOP_LEFT }] },
    { strokes: [{ type: ARC, center: TOP_RIGHT }] },
    { strokes: [{ type: LINE, from: TOP_LEFT, to: BOTTOM_LEFT }, { type: LINE, from: MIDDLE_LEFT, to: MIDDLE_RIGHT }] },
    { strokes: [{ type: LINE, from: TOP_RIGHT, to: BOTTOM_RIGHT }, { type: LINE, from: MIDDLE_LEFT, to: MIDDLE_RIGHT }] },
    { strokes: [{ type: LINE, from: TOP_LEFT, to: TOP_RIGHT }, { type: LINE, from: TOP_MIDDLE, to: BOTTOM_MIDDLE }] },
    { strokes: [{ type: LINE, from: BOTTOM_LEFT, to: BOTTOM_RIGHT }, { type: LINE, from: TOP_MIDDLE, to: BOTTOM_MIDDLE }] },
    { strokes: [{ type: LINE, from: BOTTOM_LEFT, to: TOP_RIGHT }, { type: LINE, from: TOP_RIGHT, to: BOTTOM_RIGHT }] },
    { strokes: [{ type: LINE, from: TOP_LEFT, to: TOP_RIGHT }, { type: LINE, from: TOP_RIGHT, to: BOTTOM_LEFT }] },
    { strokes: [{ type: LINE, from: BOTTOM_LEFT, to: TOP_LEFT }, { type: LINE, from: TOP_LEFT, to: BOTTOM_RIGHT }] },
    { strokes: [{ type: LINE, from: TOP_LEFT, to: TOP_RIGHT }, { type: LINE, from: TOP_LEFT, to: BOTTOM_RIGHT }] },
    { strokes: [{ type: LINE, from: TOP_RIGHT, to: BOTTOM_RIGHT }, { type: LINE, from: BOTTOM_RIGHT, to: TOP_LEFT }] },
    { strokes: [{ type: LINE, from: BOTTOM_LEFT, to: BOTTOM_RIGHT }, { type: LINE, from: TOP_LEFT, to: BOTTOM_RIGHT }] },
    { strokes: [{ type: LINE, from: TOP_LEFT, to: BOTTOM_LEFT }, { type: LINE, from: BOTTOM_LEFT, to: TOP_RIGHT }] },
    { strokes: [{ type: LINE, from: BOTTOM_LEFT, to: BOTTOM_RIGHT }, { type: LINE, from: BOTTOM_LEFT, to: TOP_RIGHT }] },
    { strokes: [{ type: LINE, from: TOP_LEFT, to: TOP_RIGHT }, { type: LINE, from: TOP_RIGHT, to: BOTTOM_RIGHT }] },
    { strokes: [{ type: LINE, from: TOP_RIGHT, to: TOP_LEFT }, { type: LINE, from: TOP_LEFT, to: BOTTOM_LEFT }] },
    { strokes: [{ type: LINE, from: BOTTOM_RIGHT, to: BOTTOM_LEFT }, { type: LINE, from: BOTTOM_RIGHT, to: TOP_RIGHT }] },
    { strokes: [{ type: LINE, from: BOTTOM_RIGHT, to: BOTTOM_LEFT }, { type: LINE, from: BOTTOM_LEFT, to: TOP_LEFT }] },
    { strokes: [{ type: LINE, from: TOP_LEFT, to: BOTTOM_LEFT }, { type: LINE, from: TOP_RIGHT, to: BOTTOM_RIGHT }] },
    { strokes: [{ type: LINE, from: TOP_LEFT, to: TOP_RIGHT }, { type: LINE, from: BOTTOM_LEFT, to: BOTTOM_RIGHT }] },
    { strokes: [] },
];

const POSSIBLE_NEIGHBOURS = [];

POSSIBLE_NEIGHBOURS[LEFT_SIDE] = [[TOP_LEFT_QUARTER_ARC, TOP_LEFT_V_ARROW, LEFT_SIDE, BLANK], [BOTTOM_SIDE, RIGHT_SIDE, BOTTOM_RIGHT_QUARTER_ARC], [BOTTOM_LEFT_QUARTER_ARC, LEFT_SIDE, TOP_LEFT_CORNER, BLANK], [BLANK]];
POSSIBLE_NEIGHBOURS[RIGHT_SIDE] = [[RIGHT_SIDE, TOP_RIGHT_QUARTER_ARC, BOTTOM_LEFT_QUARTER_ARC, BLANK], [BLANK], [BOTH_VERTICALS, RIGHT_SIDE, BOTTOM_RIGHT_QUARTER_ARC, TOP_RIGHT_CORNER, BLANK], [TOP_LEFT_V_ARROW, LEFT_SIDE, BLANK]];
POSSIBLE_NEIGHBOURS[TOP_SIDE] = [[BLANK], [BLANK], [BLANK], [TOP_LEFT_QUARTER_ARC]];
POSSIBLE_NEIGHBOURS[BOTTOM_SIDE] = [[BLANK, TOP_RIGHT_QUARTER_ARC], [BLANK], [BLANK, BOTTOM_RIGHT_QUARTER_ARC], [LEFT_SIDE, BOTTOM_LEFT_QUARTER_ARC]];
POSSIBLE_NEIGHBOURS[FORWARD_DIAGONAL] = [[BOTTOM_RIGHT_QUARTER_ARC], [BLANK], [BLANK], [TOP_LEFT_CORNER]];
POSSIBLE_NEIGHBOURS[BACKWARD_DIAGONAL] = [[], [], [], []];
POSSIBLE_NEIGHBOURS[VERTICAL_MIDDLE] = [[], [], [], []];
POSSIBLE_NEIGHBOURS[HORIZONTAL_MIDDLE] = [[], [], [], []];
POSSIBLE_NEIGHBOURS[TOP_RIGHT_QUARTER_ARC] = [[BLANK], [BLANK], [BOTTOM_SIDE, RIGHT_SIDE, BOTTOM_RIGHT_QUARTER_ARC], [TOP_LEFT_QUARTER_ARC]];
POSSIBLE_NEIGHBOURS[TOP_LEFT_QUARTER_ARC] = [[BLANK], [TOP_RIGHT_QUARTER_ARC], [LEFT_SIDE, LEFT_TEE], [BLANK]];
POSSIBLE_NEIGHBOURS[BOTTOM_RIGHT_QUARTER_ARC] = [[BOTTOM_SIDE, RIGHT_SIDE, TOP_RIGHT_QUARTER_ARC], [BLANK], [BLANK, FORWARD_DIAGONAL], [BOTTOM_LEFT_QUARTER_ARC, LEFT_SIDE]];
POSSIBLE_NEIGHBOURS[BOTTOM_LEFT_QUARTER_ARC] = [[LEFT_SIDE, LEFT_TEE], [BOTTOM_RIGHT_QUARTER_ARC, BOTTOM_SIDE], [BLANK, RIGHT_SIDE], [BLANK]];
POSSIBLE_NEIGHBOURS[LEFT_TEE] = [[TOP_LEFT_QUARTER_ARC], [BLANK], [BOTTOM_RIGHT_QUARTER_ARC], [BLANK]];
POSSIBLE_NEIGHBOURS[RIGHT_TEE] = [[], [], [], []];
POSSIBLE_NEIGHBOURS[TOP_TEE] = [[], [], [], []];
POSSIBLE_NEIGHBOURS[RIGHT_TEE] = [[], [], [], []];
POSSIBLE_NEIGHBOURS[BOTTOM_TEE] = [[], [], [], []];
POSSIBLE_NEIGHBOURS[TOP_RIGHT_V_ARROW] = [[], [], [], []];
POSSIBLE_NEIGHBOURS[TOP_RIGHT_H_ARROW] = [[], [], [], []];
POSSIBLE_NEIGHBOURS[TOP_LEFT_V_ARROW] = [[BLANK], [RIGHT_SIDE], [LEFT_SIDE], [BLANK]];
POSSIBLE_NEIGHBOURS[TOP_LEFT_H_ARROW] = [[], [], [], []];
POSSIBLE_NEIGHBOURS[BOTTOM_RIGHT_V_ARROW] = [[BOTH_VERTICALS], [BLANK], [BLANK], [LEFT_SIDE]];
POSSIBLE_NEIGHBOURS[BOTTOM_RIGHT_H_ARROW] = [[], [], [], []];
POSSIBLE_NEIGHBOURS[BOTTOM_LEFT_V_ARROW] = [[], [], [], []];
POSSIBLE_NEIGHBOURS[BOTTOM_LEFT_H_ARROW] = [[], [], [], []];
POSSIBLE_NEIGHBOURS[TOP_RIGHT_CORNER] = [[RIGHT_SIDE], [BLANK], [BLANK], [TOP_LEFT_CORNER]];
POSSIBLE_NEIGHBOURS[TOP_LEFT_CORNER] = [[LEFT_SIDE], [TOP_RIGHT_CORNER, FORWARD_DIAGONAL], [BLANK], [BLANK]];
POSSIBLE_NEIGHBOURS[BOTTOM_RIGHT_CORNER] = [[], [], [], []];
POSSIBLE_NEIGHBOURS[BOTTOM_LEFT_CORNER] = [[], [], [], []];
POSSIBLE_NEIGHBOURS[BOTH_VERTICALS] = [[RIGHT_SIDE], [BLANK], [BOTTOM_RIGHT_V_ARROW], [LEFT_SIDE]];
POSSIBLE_NEIGHBOURS[BOTH_HORIZONTALS] = [[], [], [], []];
POSSIBLE_NEIGHBOURS[BLANK] = [[BOTTOM_LEFT_QUARTER_ARC, BOTTOM_RIGHT_QUARTER_ARC, BOTTOM_SIDE, TOP_SIDE, LEFT_SIDE, BOTTOM_RIGHT_V_ARROW, TOP_LEFT_CORNER, TOP_RIGHT_CORNER, FORWARD_DIAGONAL, RIGHT_SIDE, BLANK], [TOP_LEFT_QUARTER_ARC, LEFT_SIDE, BOTTOM_LEFT_QUARTER_ARC, LEFT_TEE, TOP_LEFT_V_ARROW, BOTTOM_LEFT_QUARTER_ARC, TOP_LEFT_CORNER, LEFT_TEE, RIGHT_SIDE], [TOP_LEFT_QUARTER_ARC, TOP_RIGHT_QUARTER_ARC, TOP_SIDE, TOP_LEFT_V_ARROW, RIGHT_SIDE, BOTTOM_SIDE, LEFT_SIDE], [TOP_RIGHT_QUARTER_ARC, BOTTOM_SIDE, BOTTOM_RIGHT_QUARTER_ARC, TOP_SIDE, BLANK, RIGHT_SIDE, BOTH_VERTICALS, BOTTOM_RIGHT_V_ARROW, TOP_RIGHT_CORNER, FORWARD_DIAGONAL]];

const ANGLES = [];

ANGLES[TOP_LEFT] = [0, Math.PI / 2];
ANGLES[TOP_RIGHT] = [Math.PI / 2, Math.PI];
ANGLES[BOTTOM_RIGHT] = [Math.PI, 3 * Math.PI / 2];
ANGLES[BOTTOM_LEFT] = [3 * Math.PI / 2, 0];

const POINTS = (x, y, size) => [
    [x, y],
    [x + size / 2, y],
    [x + size, y],
    [x, y + size / 2],
    [x + size / 2, y + size / 2],
    [x + size, y + size / 2],
    [x, y + size],
    [x + size / 2, y + size],
    [x + size, y + size]
];

const G = [[TOP_LEFT_QUARTER_ARC, TOP_RIGHT_QUARTER_ARC], [LEFT_SIDE, BOTTOM_SIDE], [BOTTOM_LEFT_QUARTER_ARC, BOTTOM_RIGHT_QUARTER_ARC]];
const E = [[TOP_LEFT_QUARTER_ARC, TOP_SIDE], [LEFT_TEE, BLANK], [BOTTOM_LEFT_QUARTER_ARC, BOTTOM_SIDE]];
const N = [[TOP_LEFT_V_ARROW, RIGHT_SIDE], [LEFT_SIDE, BOTH_VERTICALS], [LEFT_SIDE, BOTTOM_RIGHT_V_ARROW]];
const U = [[LEFT_SIDE, RIGHT_SIDE], [LEFT_SIDE, RIGHT_SIDE], [BOTTOM_LEFT_QUARTER_ARC, BOTTOM_RIGHT_QUARTER_ARC]];
const A = [[TOP_LEFT_QUARTER_ARC, TOP_RIGHT_QUARTER_ARC], [LEFT_SIDE, RIGHT_SIDE], [TOP_LEFT_CORNER, TOP_RIGHT_CORNER]];
const R = [[TOP_LEFT_QUARTER_ARC, TOP_RIGHT_QUARTER_ARC], [LEFT_SIDE, BOTTOM_RIGHT_QUARTER_ARC], [TOP_LEFT_CORNER, FORWARD_DIAGONAL]];
const Y = [[LEFT_SIDE, RIGHT_SIDE], [BOTTOM_LEFT_QUARTER_ARC, BOTTOM_RIGHT_QUARTER_ARC], [RIGHT_SIDE, BLANK]];

const GENUARY = [G, E, N, U, A, R, Y];

const GRID_ROWS = 5;
const GRID_COLS = 22;
const CELL_SIZE = 50;

const getGenuaryTileAt = (row, col) => {
    if (row === 0 || row === GRID_ROWS - 1 || col === 0 || col === GRID_COLS - 1) return BLANK;

    const letterIndex = Math.floor((col - 1) / 3);
    const letterCol = (col - 1) % 3;

    if (letterCol === 2) return BLANK;

    return GENUARY[letterIndex][row - 1][letterCol];
};

let raf = null;

const run = () => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const drawTile = (x, y, size, tile, highlighted) => {
        const points = POINTS(x, y, size);

        ctx.strokeStyle = 'grey';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, size, size);

        ctx.strokeStyle = highlighted ? 'blue' : 'green';
        ctx.lineWidth = highlighted ? 3 : 2;
        ctx.beginPath();

        tile.strokes.forEach(stroke => {
            if (stroke.type === LINE) {
                const [fromX, fromY] = points[stroke.from];
                const [toX, toY] = points[stroke.to];

                ctx.moveTo(fromX, fromY);
                ctx.lineTo(toX, toY);
            } else if (stroke.type === ARC) {
                const [midX, midY] = points[stroke.center];
                const [startAngle, endAngle] = ANGLES[stroke.center];

                ctx.arc(midX, midY, size, startAngle, endAngle);
            }
        });

        ctx.stroke();
    };

    let grid = null;
    let gx = 0, gy = 0; // top left corner of "genuary"

    const isDone = () => {
        let allOnes = true;

        for (let row = gy; row < gy + GRID_ROWS; row++) {
            for (let col = gx; col < gx + GRID_COLS; col++) {
                const cell = grid[row][col];

                if (!cell) {
                    console.warn('no cell at', row, col, grid, gx, gy);
                }

                if (cell.probability < 1) {
                    allOnes = false;
                    break;
                }
            }
        }

        return allOnes;
    };

    const init = (rows, cols) => {
        grid = [];

        gx = Math.floor(Math.random() * (cols - GRID_COLS));
        gy = Math.floor(Math.random() * (rows - GRID_ROWS));

        for (let r = 0; r < rows; r++) {
            grid[r] = [];

            for (let c = 0; c < cols; c++) {
                let tileIndex = BLANK;
                let inWord = false;

                if (r >= gy && r < gy + GRID_ROWS && c >= gx && c < gx + GRID_COLS) {
                    tileIndex = getGenuaryTileAt(r - gy, c - gx);
                    inWord = true;
                }

                grid[r][c] = {
                    tileIndex,
                    probability: 0,
                    inWord
                };
            }
        }
    };

    const update = () => {
        for (let row = gy; row < gy + GRID_ROWS; row++) {
            for (let col = gx; col < gx + GRID_COLS; col++) {
                const cell = grid[row][col];
                const probabilityStep = Math.random() * 0.01;

                if (cell.probability < 1) {
                    cell.probability += probabilityStep;

                    if (cell.probability > 1) cell.probability = 1;
                }
            }
        }
    };

    const render = (ox, oy, w, h, rows, cols, size) => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, w, h);
        ctx.translate(ox, oy);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const { tileIndex, probability, inWord } = grid[r][c];
                const tile = inWord && Math.random() < probability ? TILES[tileIndex] : TILES[Math.random() * TILES.length | 0];
                const collapsed = inWord && tile === TILES[tileIndex];

                drawTile(c * size, r * size, size, tile, collapsed);
            }
        }
    };

    const STEP = 1000 / 30;
    const HOLD_MS = 2000;
    let lastTs = 0;
    let acc = 0;
    let holding = false;
    let holdLeft = 0;

    const tick = (ts) => {
        if (!lastTs) lastTs = ts;
        let dt = ts - lastTs;
        lastTs = ts;

        dt = Math.min(dt, 250);
        acc += dt;

        const size = Math.min(Math.floor(canvas.width / (GRID_COLS + 1)), CELL_SIZE);

        const w = canvas.width;
        const h = canvas.height;

        const rows = Math.floor(h / size) - 1;
        const cols = Math.floor(w / size) - 1;

        const ox = (w - (cols * size)) / 2;
        const oy = (h - (rows * size)) / 2;

        if (!grid) init(rows, cols);

        if (!holding && isDone()) {
            holding = true;
            holdLeft = HOLD_MS;
        }

        if (holding) {
            holdLeft -= dt;

            if (holdLeft <= 0) {
                holding = false;
                holdLeft = 0;
                init(rows, cols);
                acc = 0;
            }
        } else {
            while (acc >= STEP) {
                update();
                acc -= STEP;
            }
        }

        render(ox, oy, w, h, rows, cols, size);

        raf = requestAnimationFrame(tick);
    };

    if (raf) cancelAnimationFrame(raf);

    raf = requestAnimationFrame(tick);
};

const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    run();
};

window.addEventListener('resize', resize);

resize();
