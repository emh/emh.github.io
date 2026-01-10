const canvas = document.getElementById('canvas');

const HEX_SIZE = 30;
const HEX_HEIGHT = 2 * HEX_SIZE;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;

const SQRT3_2 = Math.sqrt(3) / 2;

const AND = '∧';
const NAND = '⊼';
const OR = '∨';
const NOR = '⊽';
const XOR = '⊕';
const XNOR = '⊙';
const OPS = [AND, NAND, OR, NOR, XOR, XNOR];
const UP_L = 1;
const UP_R = 2;
const LEFT = 4;
const RIGHT = 8;
const DOWN_L = 16;
const DOWN_R = 32;

const K = 3;

const arr = (n) => Array.from({ length: n }, () => null);
const rnd = (n) => Math.floor(Math.random() * n);

const pickOperator = () => OPS[rnd(OPS.length)];
const pickValue = () => rnd(2);

const applyOp = (op, inputs) => {
    switch (op) {
        case AND: return inputs.reduce((a, b) => a & b, 1);
        case NAND: return inputs.reduce((a, b) => ~(a & b) & 1, 1);
        case OR: return inputs.reduce((a, b) => a | b, 0);
        case NOR: return inputs.reduce((a, b) => ~(a | b) & 1, 0);
        case XOR: return inputs.reduce((a, b) => a ^ b, 0);
        case XNOR: return inputs.reduce((a, b) => ~(a ^ b) & 1, 0);
        default: return 0;
    }
};

const pickConnection = (x, y, cols, rows) => {
    const bits = [];

    if (y > 0 && x > 0) bits.push(UP_L);
    if (y > 0 && x < cols - 1) bits.push(UP_R);
    if (x < cols - 1) bits.push(RIGHT);
    if (x > 0) bits.push(LEFT);
    if (y < rows - 1 && x > 0) bits.push(DOWN_L);
    if (y < rows - 1) bits.push(DOWN_R);

    let num = 0;
    for (let i = 0; i < K; i++) {
        const index = rnd(bits.length);
        num |= bits[index];
        bits.splice(index, 1);
    }

    return num;
};

const toPixel = (col, row) => {
    const x = HEX_WIDTH * (col + 0.5 * (row & 1));
    const y = (3 / 4) * HEX_HEIGHT * row;

    return [x, y];
};

const drawHex = (context, row, col, { value, operator }) => {
    const size = HEX_SIZE;

    const [cx, cy] = toPixel(col, row);

    context.fillStyle = value ? 'black' : 'white';
    context.strokeStyle = value ? 'white' : 'black';

    // if (row === 10 && col === 10) {
    //     context.fillStyle = 'red';
    // }

    // if (row === 11 && col === 9) {
    //     context.fillStyle = 'blue';
    // }

    // if (row === 11 && col === 10) {
    //     context.fillStyle = 'green';
    // }

    context.beginPath();
    context.moveTo(cx + 0, cy - size);
    context.lineTo(cx + SQRT3_2 * size, cy - size / 2);
    context.lineTo(cx + SQRT3_2 * size, cy + size / 2);
    context.lineTo(cx + 0, cy + size);
    context.lineTo(cx - SQRT3_2 * size, cy + size / 2);
    context.lineTo(cx - SQRT3_2 * size, cy - size / 2);
    context.closePath();
    context.fill();
    context.stroke();

    context.fillStyle = value ? 'white' : 'black';
    context.font = `${Math.ceil(size * 0.5)}px sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(operator, cx, cy);
};

let raf = null;

const run = () => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const width = canvas.width;
    const height = canvas.height;

    let rows = Math.ceil(height / (HEX_HEIGHT * 0.75)) + 1;
    let cols = Math.ceil(width / HEX_WIDTH) + 1;

    let grid = [];

    const init = () => {
        grid = [];

        for (let row = 0; row < rows; row++) {
            grid[row] = [];

            for (let col = 0; col < cols; col++) {
                grid[row][col] = {
                    value: pickValue() % 2,
                    operator: pickOperator(),
                    inputs: pickConnection(col, row, cols, rows)
                };
            }
        }
    };

    const update = () => {
        const newValues = arr(rows).map(() => arr(cols));

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const op = grid[y][x].operator;
                const con = grid[y][x].inputs;

                const inputs = [];

                if (con & UP_L) inputs.push(grid[y - 1][x - 1].value);
                if (con & UP_R) inputs.push(grid[y - 1][x].value);
                if (con & LEFT) inputs.push(grid[y][x - 1].value);
                if (con & RIGHT) inputs.push(grid[y][x + 1].value);
                if (con & DOWN_L) inputs.push(grid[y + 1][x - 1].value);
                if (con & DOWN_R) inputs.push(grid[y + 1][x].value);

                newValues[y][x] = applyOp(op, inputs);
            }
        }

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                grid[y][x].value = newValues[y][x];
            }
        }
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

    init();

    const STEP = 1000 / 10;
    let lastTs = 0;
    let acc = 0;

    const tick = (ts) => {
        if (!lastTs) lastTs = ts;
        let dt = ts - lastTs;
        lastTs = ts;
        dt = Math.min(dt, 250);
        acc += dt;

        while (acc >= STEP) {
            update();
            acc -= STEP;
        }

        render();

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

canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    run();
}, { passive: false });

resize();
