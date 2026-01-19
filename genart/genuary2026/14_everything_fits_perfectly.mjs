const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let raf = 0;
let DPR = 1, W = 0, H = 0;

let state = {
    cellSize: 64,
    initialRadius: 1,
    speed: 1,
    grid: [],
    rows: 0,
    cols: 0,
    circles: [],
    done: false
};

function init() {
    state.cellSize = Math.min(W, H) / 10;
    state.rows = Math.ceil(H / state.cellSize);
    state.cols = Math.ceil(W / state.cellSize);
    state.grid = Array.from({ length: state.rows }, () => Array(state.cols).fill([]));
}

function clear() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

function render() {
    state.circles.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,0,0,1)`;
        ctx.fill();
    });
}

function gridIndex(cx, cy) {
    const x = Math.max(0, Math.min(state.cols - 1, (cx / state.cellSize) | 0));
    const y = Math.max(0, Math.min(state.rows - 1, (cy / state.cellSize) | 0));

    return { x, y };
}

function neighborsNear(x, y) {
    const { x: gx, y: gy } = gridIndex(x, y);
    const out = [];

    for (let yy = gy - 1; yy <= gy + 1; yy++) {
        if (yy < 0 || yy >= state.rows) continue;

        for (let xx = gx - 1; xx <= gx + 1; xx++) {
            if (xx < 0 || xx >= state.cols) continue;

            const bucket = state.grid[yy][xx];

            for (let k = 0; k < bucket.length; k++) out.push(bucket[k]);
        }
    }

    return out;
}

const randRange = (a, b) => a + Math.random() * (b - a);
const N = 10;

function spawnCircles() {
    let attempts = 0;
    let spawned = 0;

    while (spawned < N && attempts < N * 200) {
        attempts++;

        const x = randRange(state.initialRadius, W - state.initialRadius);
        const y = randRange(state.initialRadius, H - state.initialRadius);
        const idxs = neighborsNear(x, y);

        let ok = true;

        for (let i = 0; i < idxs.length; i++) {
            const c = state.circles[idxs[i]];
            const dx = x - c.x, dy = y - c.y;
            const rr = state.initialRadius + c.r;

            if (dx * dx + dy * dy < rr * rr) {
                ok = false;
                break;
            }
        }

        if (!ok) continue;

        state.circles.push({ x, y, r: state.initialRadius, alive: true });
        spawned++;

        const { x: gx, y: gy } = gridIndex(x, y);

        state.grid[gy][gx].push(state.circles.length - 1);
    }

    return spawned;
}

function canGrow(i, dr) {
    const c = state.circles[i];
    const newR = c.r + dr;

    if (newR > state.cellSize) return false;

    const idxs = neighborsNear(c.x, c.y);

    for (let t = 0; t < idxs.length; t++) {
        const j = idxs[t];

        if (j === i) continue;

        const o = state.circles[j];
        const dx = c.x - o.x, dy = c.y - o.y;
        const rr = newR + o.r;

        if (dx * dx + dy * dy < rr * rr) return false;
    }

    return true;
}

function growTick(dt) {
    const dr = state.speed * dt;
    let grown = 0;

    for (let i = 0; i < state.circles.length; i++) {
        const c = state.circles[i];

        if (!c.alive) continue;

        if (canGrow(i, dr)) {
            c.r += dr;
            grown++;
        } else {
            c.alive = false;
        }
    }

    return grown;
}

function update(dt) {
    const spawned = spawnCircles();
    const grown = growTick(dt);

    console.log(`Spawned: ${spawned}, Grown: ${grown}, Total: ${state.circles.length}`);

    if (spawned === 0 && grown === 0) state.done = true;
}

let last = performance.now();

function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    
    last = now;

    clear();
    update(dt);
    render();

    if (!state.done) raf = requestAnimationFrame(tick);
}

function resize() {
    const rect = canvas.getBoundingClientRect();

    DPR = Math.max(1, window.devicePixelRatio || 1);
    W = rect.width;
    H = rect.height;

    canvas.width = Math.max(1, Math.floor(W * DPR));
    canvas.height = Math.max(1, Math.floor(H * DPR));
}

window.addEventListener("resize", resize, { passive: true });

resize();
init();

if (raf) cancelAnimationFrame(raf);
raf = requestAnimationFrame(tick);
