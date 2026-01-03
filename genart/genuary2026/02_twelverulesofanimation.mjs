const canvas = document.getElementById('canvas');

const STICK_TIME = 250;
const IMPACT_TIME = 125;
const RETURN_TIME = 500;
const MOVE_TIME = 1000;
const CYCLE = MOVE_TIME + RETURN_TIME;
const ELONGATE_MAX = 1.5;
const V0 = 0.20;
const BLOB_R = 5;
const CELL_SIZE = 10 * BLOB_R;
const PUSH_MAX = 3;

const rndInt = (n) => (Math.random() * n) | 0;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const easePos = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const easeVel = (t) => 0.5 * Math.PI * Math.sin(Math.PI * t); // >= 0
const easeOutBack = (t, s = 1.8) => {
    t = clamp01(t);
    const u = t - 1;
    return 1 + u * u * ((s + 1) * u + s);
};
const times = (n, fn) => Array.from({ length: n }, fn);

const neighbors4 = (x, y) => ([
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 }
]);

let raf = null;

const run = () => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;

    const rows = Math.floor(height / CELL_SIZE);
    const cols = Math.floor(width / CELL_SIZE);

    const MOVERS = Math.floor((rows * cols) / 20);

    const hues = [];

    for (let i = 0; i < rows; i++) {
        hues[i] = [];

        for (let j = 0; j < cols; j++) {
            hues[i][j] = rndInt(360);
        }
    }

    const pickNeighbor = (p) => {
        const cands = neighbors4(p.x, p.y).filter(q =>
            q.x >= 0 && q.x < cols && q.y >= 0 && q.y < rows
        );
        return cands[rndInt(cands.length)];
    };

    const ox = (width - (cols * CELL_SIZE)) / 2;
    const oy = (height - (rows * CELL_SIZE)) / 2;

    const cellCenter = (col, row) => ({
        x: col * CELL_SIZE + CELL_SIZE / 2,
        y: row * CELL_SIZE + CELL_SIZE / 2
    });

    const drawBlob = (x, y, r, ang, sx = 1, sy = 1, h) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.scale(sx, sy);
        ctx.fillStyle = `hsl(${h}, 80%, 60%)`;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };

    let t0 = performance.now();
    let movers = [];

    const resetMovers = () => {
        movers = [];

        for (let i = 0; i < MOVERS; i++) {
            const col = rndInt(cols);
            const row = rndInt(rows);

            movers.push({
                home: { x: col, y: row },
                target: pickNeighbor({ x: col, y: row }),
                releaseHome: null,
                releaseTarget: null
            });
        }
    };

    resetMovers();

    const tick = (ts) => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.translate(ox, oy);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                let isMover = false;

                for (const mover of movers) {
                    if ((col === mover.home.x && row === mover.home.y) || (col === mover.target.x && row === mover.target.y)) {
                        isMover = true;
                        break;
                    }
                }

                if (isMover) continue;

                const { x, y } = cellCenter(col, row);

                drawBlob(x, y, BLOB_R, 0, 1, 1, hues[row][col]);
            }
        }

        const dt = ts - t0;

        const tMove = clamp01(dt / MOVE_TIME);
        const eMove = easePos(tMove);

        for (const mover of movers) {
            const { home, target } = mover;

            const a = cellCenter(home.x, home.y);
            const b = cellCenter(target.x, target.y);

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;

            const mx = a.x + (b.x - a.x) * eMove;
            const my = a.y + (b.y - a.y) * eMove;

            let ax, ay;

            if (dt < STICK_TIME) {
                ax = mx;
                ay = my;
                mover.releaseHome = { x: mx, y: my };
            } else {
                if (!mover.releaseHome) mover.releaseHome = { x: mx, y: my };

                const tr = clamp01((dt - STICK_TIME) / RETURN_TIME);
                const r = easeOutBack(tr);

                ax = mover.releaseHome.x + (a.x - mover.releaseHome.x) * r;
                ay = mover.releaseHome.y + (a.y - mover.releaseHome.y) * r;
            }

            let bx = b.x, by = b.y;

            const impactStart = MOVE_TIME - IMPACT_TIME;

            if (dt >= impactStart && dt <= MOVE_TIME) {
                const ti = clamp01((dt - impactStart) / IMPACT_TIME);
                const ei = easePos(ti);

                const pushDist = PUSH_MAX * ei;

                bx = b.x + ux * pushDist;
                by = b.y + uy * pushDist;

                mover.releaseTarget = { x: bx, y: by };
            } else if (dt > MOVE_TIME) {
                if (!mover.releaseTarget) mover.releaseTarget = { x: b.x, y: b.y };

                const tr = clamp01((dt - MOVE_TIME) / RETURN_TIME);
                const r = easeOutBack(tr);

                bx = mover.releaseTarget.x + (b.x - mover.releaseTarget.x) * r;
                by = mover.releaseTarget.y + (b.y - mover.releaseTarget.y) * r;
            } else {
                mover.releaseTarget = null;
            }

            drawBlob(ax, ay, BLOB_R, 0, 1, 1, hues[home.y][home.x]);
            drawBlob(bx, by, BLOB_R, 0, 1, 1, hues[target.y][target.x]);

            const v = easeVel(tMove) / (0.5 * Math.PI);
            const vv = clamp01((v - V0) / (1 - V0));
            const s = vv * vv;

            const stretch = 1 + (ELONGATE_MAX - 1) * s;

            const sx = ux === 0 ? 1 / Math.sqrt(stretch) : stretch;
            const sy = uy === 0 ? 1 / Math.sqrt(stretch) : stretch;

            drawBlob(mx, my, BLOB_R, 0, sx, sy, hues[home.y][home.x]);
        }

        if (dt >= CYCLE) {
            t0 = ts;

            for (const mover of movers) {
                const { home, target } = mover;
                hues[target.y][target.x] = hues[home.y][home.x];
            }

            resetMovers();
        }

        raf = requestAnimationFrame(tick);
    };

    if (raf) cancelAnimationFrame(raf);

    raf = requestAnimationFrame(tick);
};

const resize = () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width);
    canvas.height = Math.floor(rect.height);

    run();
};

window.addEventListener('resize', resize);
resize();
