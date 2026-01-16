const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let raf = 0;
let DPR = 1, W = 0, H = 0;

let STEPS = 200;

let state = {
    waves: [
        { amp: 0.15, freq: 0.75, phase: 0, speed: 0.1 },
        { amp: 0.1, freq: 1, phase: 0.25, speed: -0.2 },
        { amp: 0.15, freq: 1.5, phase: 0.5, speed: 0.3 }
    ],
    whipSharpness: 2,
    whipStrength: 0.75
};

const envelope = (t) =>
    (1.0 - state.whipStrength) + state.whipStrength * Math.pow(t, state.whipSharpness);

const waves = (t, timeSec) => {
    let s = 0;
    for (const wv of state.waves) {
        s += wv.amp * Math.sin(
            2 * Math.PI * (wv.freq * t - wv.speed * timeSec + wv.phase)
        );
    }
    return s;
};

const waveOffsetAt = (t, timeSec, span) =>
    span * (envelope(t) * waves(t, timeSec));

function clear() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

const MIN_SIZE = 2;
const MAX_SIZE = 256;
const SUBDIV_K = 0.75;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

function lerpRGB(a, b, t) {
    return [
        Math.round(lerp(a[0], b[0], t)),
        Math.round(lerp(a[1], b[1], t)),
        Math.round(lerp(a[2], b[2], t))
    ];
}

const rgbStr = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

const BELOW_PALETTE = [[0, 102, 204], [0, 26, 51]]
const ABOVE_PALETTE = [[207, 236, 247], [28, 150, 197]];

const isBelow = (x, y) => {
    const portrait = H > W;
    const step = portrait ? 
        clamp(Math.floor(y / H * STEPS), 0, state.points.length - 1) : 
        clamp(Math.floor(x / W * STEPS), 0, state.points.length - 1);

    if (H > W) {
        const xCurve = state.points[step];

        return x > xCurve.x;
    } else {
        const yCurve = state.points[step];

        return y > yCurve.y;
    }
};

function fillFor(x, y, size) {
    const below = isBelow(x, y);
    const t = Math.log2(size) / Math.log2(MAX_SIZE);

    const palette = below ? BELOW_PALETTE : ABOVE_PALETTE;

    return rgbStr(lerpRGB(palette[0], palette[1], t));
}

function dist2PointSeg(px, py, ax, ay, bx, by) {
    const abx = bx - ax, aby = by - ay;
    const apx = px - ax, apy = py - ay;
    const ab2 = abx * abx + aby * aby;

    let t = ab2 > 1e-12 ? (apx * abx + apy * aby) / ab2 : 0;

    t = Math.max(0, Math.min(1, t));

    const cx = ax + t * abx, cy = ay + t * aby;
    const dx = px - cx, dy = py - cy;

    return dx * dx + dy * dy;
}

function dist2PointPolyline(px, py, pts) {
    let best = Infinity;

    for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const d2 = dist2PointSeg(px, py, a.x, a.y, b.x, b.y);

        if (d2 < best) best = d2;
    }

    return best;
}

function drawSquare(x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.fillStyle = fillFor(x + size * 0.5, y + size * 0.5, size);
    ctx.strokeRect(x, y, size, size);
    ctx.fillRect(x, y, size, size);
    ctx.restore();
}

function subdivide(x, y, size) {
    const cx = x + size * 0.5;
    const cy = y + size * 0.5;

    const d2 = dist2PointPolyline(cx, cy, state.points);

    const thresh = SUBDIV_K * size;
    const shouldSplit = (size > MIN_SIZE) && (d2 < thresh * thresh);

    if (shouldSplit) {
        const h = size / 2;

        subdivide(x, y, h);
        subdivide(x + h, y, h);
        subdivide(x, y + h, h);
        subdivide(x + h, y + h, h);
    } else {
        drawSquare(x, y, size);
    }
}

function drawQuadtree() {
    for (let y = 0; y < H; y += MAX_SIZE) {
        for (let x = 0; x < W; x += MAX_SIZE) {
            subdivide(x, y, MAX_SIZE);
        }
    }
}

function render() {
    //drawCurve();
    drawQuadtree();
}

function update(timeMs) {
    state.points = [];

    const portrait = H > W;
    const span = portrait ? W : H;
    const timeSec = timeMs * 0.001;

    for (let i = 0; i <= STEPS; i++) {
        const t = i / STEPS;
        const o = waveOffsetAt(t, timeSec, span);

        const x = portrait ? (W * 0.5 + o) : (t * W);
        const y = portrait ? (t * H) : (H * 0.5 + o);

        state.points.push({ x, y });
    }
}

function tick(t) {
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
}

window.addEventListener("resize", resize, { passive: true });

resize();
if (raf) cancelAnimationFrame(raf);
raf = requestAnimationFrame(tick);

function saveCanvasPNG(canvas) {
  canvas.toBlob((blob) => {
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    // filename with timestamp
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.download = `canvas-${stamp}.png`;

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }, "image/png");
}

// Hotkey: "P" (no modifiers) saves PNG
window.addEventListener("keydown", (e) => {
  // ignore if user is typing in an input/textarea
  const t = e.target;
  const typing =
    t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
  if (typing) return;

  if (e.key.toLowerCase() === "p") {
    e.preventDefault();
    saveCanvasPNG(canvas);
  }
});
