import { clamp, rnd, times } from './utils.js';

const NUM_POINTS = 100;

const REST_LENGTH = 5;
const SPLIT_LENGTH = REST_LENGTH * 1.5;
const SPRING_K = 0.1;
const REPEL_K = 2000;
const REPEL_RADIUS = 10;
const CELL_SIZE = REPEL_RADIUS * 0.75;
const SMOOTH_K = 0.1;
const DT = 0.1;
const MAX_FORCE = 2.0;

const cellKey = (cx, cy) => `${cx},${cy}`;

const generatePoints = (width, height) => {
    return times(NUM_POINTS, () => ({
        x: rnd(width * 0.9, width * 0.1),
        y: rnd(height * 0.9, height * 0.1)
    }));
};

const drawCurve = (context, points) => {
    context.lineWidth = 2;
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

            const color = COLORS[i4 % COLORS.length];

            fill(width, height, data, visited, x, y, color);
        }
    }

    context.putImageData(imageData, 0, 0);
};

const COLORS = [
    { r: 255, g: 0, b: 0 },
    { r: 0, g: 0, b: 255 },
    { r: 255, g: 255, b: 0 }
];

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

const run = (canvas) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    let { height, width } = canvas;

    let points = [];
    let fx = new Float32Array(0);
    let fy = new Float32Array(0);
    let grid = new Map();

    const ensureForceCapacity = (n) => {
        if (fx.length >= n) return;

        const cap = Math.max(n, (fx.length * 2) | 0, 1024);

        fx = new Float32Array(cap);
        fy = new Float32Array(cap);
    };

    const initForces = (n) => {
        ensureForceCapacity(n);

        for (let i = 0; i < n; i++) {
            fx[i] = 0;
            fy[i] = 0;
        }
    };

    const init = () => {
        points = generatePoints(width, height);
    };

    const initGrid = () => {
        grid.clear();

        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const cx = Math.floor(p.x / CELL_SIZE);
            const cy = Math.floor(p.y / CELL_SIZE);
            const key = cellKey(cx, cy);

            let bucket = grid.get(key);

            if (!bucket) {
                bucket = [];
                grid.set(key, bucket);
            }

            bucket.push(i);
        }
    };

    const clear = () => {
        context.fillStyle = 'white';
        context.fillRect(0, 0, width, height);
    };

    const grow = () => {
        let bestI = -1;
        let bestDist = -1;

        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);

            if (d > bestDist) {
                bestDist = d;
                bestI = i;
            }
        }

        if (bestDist > SPLIT_LENGTH) {
            const p1 = points[bestI];
            const p2 = points[(bestI + 1) % points.length];
            
            points.splice(bestI + 1, 0, { 
                x: (p1.x + p2.x) / 2, 
                y: (p1.y + p2.y) / 2
            });
        }
    };

    const relax = () => {
        const n = points.length;

        initForces(n);
        initGrid();

        const r2 = REPEL_RADIUS * REPEL_RADIUS;

        for (let i = 0; i < n; i++) {
            const a = points[i];

            const cx = Math.floor(a.x / CELL_SIZE);
            const cy = Math.floor(a.y / CELL_SIZE);

            for (let ox = -1; ox <= 1; ox++) {
                for (let oy = -1; oy <= 1; oy++) {
                    const bucket = grid.get(cellKey(cx + ox, cy + oy));

                    if (!bucket) continue;

                    for (let k = 0; k < bucket.length; k++) {
                        const j = bucket[k];

                        if (j <= i) continue;
                        if (j === i + 1) continue;
                        if (i === 0 && j === n - 1) continue;

                        const b = points[j];
                        const dx = b.x - a.x;
                        const dy = b.y - a.y;
                        const d2 = dx * dx + dy * dy;

                        if (d2 >= r2 || d2 < 1e-9) continue;

                        let force = -REPEL_K / d2;

                        const af = force < 0 ? -force : force;

                        if (af > MAX_FORCE) force *= MAX_FORCE / af;

                        const invD = 1.0 / Math.sqrt(d2);
                        const fdx = dx * invD * force;
                        const fdy = dy * invD * force;

                        fx[i] += fdx;
                        fy[i] += fdy;
                        fx[j] -= fdx;
                        fy[j] -= fdy;
                    }
                }
            }
        }

        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const a = points[i];
            const b = points[j];

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d2 = dx * dx + dy * dy;
            const d = Math.sqrt(d2) || 1e-6;
            const invD = 1.0 / d;

            const force = clamp(SPRING_K * (d - REST_LENGTH), -MAX_FORCE, MAX_FORCE);

            const fdx = dx * invD * force;
            const fdy = dy * invD * force;

            fx[i] += fdx;
            fy[i] += fdy;
            fx[j] -= fdx;
            fy[j] -= fdy;
        }

        for (let i = 0; i < n; i++) {
            const prev = points[(i - 1 + n) % n];
            const cur = points[i];
            const next = points[(i + 1) % n];

            const fdx = SMOOTH_K * (prev.x + next.x - 2 * cur.x);
            const fdy = SMOOTH_K * (prev.y + next.y - 2 * cur.y);

            fx[i] += fdx;
            fy[i] += fdy;
        }

        for (let i = 0; i < n; i++) {
            points[i].x = clamp(points[i].x + fx[i] * DT, 0, width);
            points[i].y = clamp(points[i].y + fy[i] * DT, 0, height);
        }
    };

    let paused = false;

    const update = () => {
        grow();
        times(10, relax);
    };

    const render = () => {
        drawCurve(context, points);
        if (paused) {
            paint(context);
            drawCurve(context, points);
        }
    };

    const tick = () => {
        if (width !== canvas.width || height !== canvas.height) {
            width = canvas.width;
            height = canvas.height;
        }

        if (!paused) {
            clear();        
            update(); 
            render();
        }

        requestAnimationFrame(tick);
    };

    canvas.addEventListener('pointerup', (e) => {
        paused = !paused;

        if (paused) {
            paint(context);
        } else {
            init();
        }
    });

    init();
    tick();
};

export default run;
