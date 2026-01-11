const canvas = document.getElementById('canvas');

const TILEH = 20;
const TILEW = 40;

const UNIT = 10;
const MAX_FLOORS = 20;

const cellToScreen = (i, j, ox, oy) => {
    return {
        x: ox + (i - j) * (TILEW * 0.5),
        y: oy + (i + j) * (TILEH * 0.5),
    };
};

const computeNToCover = (W, H) => {
    const pad = 1.05; // safety margin against rounding
    const halfW = (W * 0.5) * pad;
    const halfH = (H * 0.5) * pad;

    let N = Math.ceil(Math.max(W / TILEW, H / TILEH)) + 2;

    for (; ;) {
        const a = (N * TILEW) * 0.5;
        const b = (N * TILEH) * 0.5;
        if ((halfW / a + halfH / b) <= 1) return N;
        N++;
    }
};

const computeOrigin = (W, H, N) => {
    const xmin = -(N - 1) * TILEW * 0.5 - TILEW * 0.5;
    const xmax = +(N - 1) * TILEW * 0.5 + TILEW * 0.5;

    const ymin = 0 - TILEH * 0.5;
    const ymax = (2 * (N - 1)) * TILEH * 0.5 + TILEH * 0.5;

    const spanX = xmax - xmin;
    const spanY = ymax - ymin;

    const ox = (W - spanX) * 0.5 - xmin;
    const oy = (H - spanY) * 0.5 - ymin;

    return { ox, oy };
};

let raf = null;

const run = () => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const drawBlock = (cx, cy, floors) => {
        const h = floors * UNIT;

        // bottom diamond corners
        const bTop = { x: cx, y: cy - TILEH * 0.5 };
        const bRight = { x: cx + TILEW * 0.5, y: cy };
        const bBottom = { x: cx, y: cy + TILEH * 0.5 };
        const bLeft = { x: cx - TILEW * 0.5, y: cy };

        // top diamond corners (shifted up)
        const tTop = { x: bTop.x, y: bTop.y - h };
        const tRight = { x: bRight.x, y: bRight.y - h };
        const tBottom = { x: bBottom.x, y: bBottom.y - h };
        const tLeft = { x: bLeft.x, y: bLeft.y - h };

        // faces (same convention as earlier)
        const rightFace = [tRight, tBottom, bBottom, bRight];
        const leftFace = [tBottom, tLeft, bLeft, bBottom];
        const topFace = [tTop, tRight, tBottom, tLeft];

        const poly = (pts) => {
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
            ctx.closePath();
        };

        // simple B/W shading
        ctx.fillStyle = "#e6e6e6"; poly(leftFace); ctx.fill();
        ctx.fillStyle = "#bdbdbd"; poly(rightFace); ctx.fill();
        ctx.fillStyle = "#ffffff"; poly(topFace); ctx.fill();

        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        poly(leftFace); ctx.stroke();
        poly(rightFace); ctx.stroke();
        poly(topFace); ctx.stroke();
    };

    const drawGrid = (ox, oy, N) => {
        for (let s = 0; s <= 2 * (N - 1); s++) {
            for (let i = 0; i < N; i++) {
                const j = s - i;

                if (j < 0 || j >= N) continue;

                const { x, y } = cellToScreen(i, j, ox, oy);

                const floors = heights[i][j].current;
                drawBlock(x, y, floors);
            }
        }
    };


    let heights = null;

    const init = (N) => {
        heights = Array.from({ length: N }, (_, i) =>
            Array.from({ length: N }, (_, j) => ({
                current: 0,
                max: 1 + Math.floor(Math.random() * MAX_FLOORS),
            }))
        );
    };

    const GROWTH_RATE = 0.5;

    const update = (N) => {
        let done = true;

        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                const h = heights[i][j];

                if (h.current >= h.max) continue;

                if (Math.random() < GROWTH_RATE) {
                    h.current += 1;
                    done = false;
                }
            }
        }

        if (done) init(N);
    };

    const tick = (ts) => {
        const rect = canvas.getBoundingClientRect();
        const W = rect.width;
        const H = rect.height;

        const dpr = Math.max(1, window.devicePixelRatio || 1);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        ctx.clearRect(0, 0, W, H);

        const N = computeNToCover(W, H);
        const { ox, oy } = computeOrigin(W, H, N);

        if (!heights) init(N);

        update(N);

        drawGrid(ox, oy, N);

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
