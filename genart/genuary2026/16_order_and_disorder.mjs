const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let raf = 0;
let DPR = 1, W = 0, H = 0;

let state = {
    cellSize: 16,
    grid: [],
    k: 4,
    t: 2,
    cols: 0,
    rows: 0
};

const CONFIGS = [
    { k: 4, t: 2 },
    { k: 3, t: 3 },
    { k: 5, t: 3 },
];

function init() {
    const { k, t } = CONFIGS[Math.floor(Math.random() * CONFIGS.length)];

    state.k = k;
    state.t = t;

    console.log(`k=${state.k}, t=${state.t}`);

    for (let r = 0; r < state.rows; r++) {
        state.grid[r] = [];
        for (let c = 0; c < state.cols; c++) {
            state.grid[r][c] = Math.floor(Math.random() * state.k);
        }
    }
}

function clear() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(DPR, 0, 0, DPR, state.ox * DPR, state.oy * DPR);
}

function render() {
    for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
            const v = state.grid[r][c];
            const gray = Math.floor(192 * v / (state.k - 1));

            ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
            ctx.beginPath();
            ctx.roundRect(
                c * state.cellSize + 1,
                r * state.cellSize + 1,
                state.cellSize - 2,
                state.cellSize - 2,
                4
            );
            ctx.fill();
        }
    }
}

function update(t) {
    const newGrid = Array.from({ length: state.rows }, () => Array(state.cols).fill(0));

    for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
            let count = 0;

            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;

                    const nr = (r + dr + state.rows) % state.rows;
                    const nc = (c + dc + state.cols) % state.cols;

                    if (state.grid[nr][nc] === (state.grid[r][c] + 1) % state.k) count++;
                }
            }

            newGrid[r][c] = (count >= state.t) ? (state.grid[r][c] + 1) % state.k : state.grid[r][c];
        }
    }

    state.grid = newGrid;
}

function tick() {
    const t = performance.now();

    clear();
    update(t);
    render();

    raf = requestAnimationFrame(tick);
}

function resize() {
    const rect = canvas.getBoundingClientRect();

    DPR = Math.max(1, window.devicePixelRatio || 1);
    W = rect.width;
    H = rect.height;

    canvas.width = Math.max(1, Math.floor(W * DPR));
    canvas.height = Math.max(1, Math.floor(H * DPR));

    state.cols = Math.floor(W / state.cellSize);
    state.rows = Math.floor(H / state.cellSize);

    state.ox = (W - state.cols * state.cellSize) / 2;
    state.oy = (H - state.rows * state.cellSize) / 2;

    init();
}

window.addEventListener("resize", resize, { passive: true });
window.addEventListener("pointerdown", resize, { passive: true });

resize();

if (raf) cancelAnimationFrame(raf);
raf = requestAnimationFrame(tick);

