const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let raf = 0;
let DPR = 1, W = 0, H = 0;

let state = {
    points: [],
    angles: { xw: 0, yz: 0, xz: 0, yw: 0, zw: 0 },
    lastT: 0,
    noise: {
        speed: 0.0001,   // how fast noise evolves
        drift: 5,       // how strongly omega wanders
        base: 0.0001,    // baseline angular velocity
        oct: 8
    }
};

const vertices = [];

for (let i = 0; i < 16; i++) {
    const x = (i & 1) ? 1 : -1;
    const y = (i & 2) ? 1 : -1;
    const z = (i & 4) ? 1 : -1;
    const w = (i & 8) ? 1 : -1;

    vertices.push({ x, y, z, w });
}

const edges = [];

for (let a = 0; a < 16; a++) {
    for (let b = a + 1; b < 16; b++) {
        const va = vertices[a], vb = vertices[b];

        let diff = 0;

        if (va.x !== vb.x) diff++;
        if (va.y !== vb.y) diff++;
        if (va.z !== vb.z) diff++;
        if (va.w !== vb.w) diff++;

        if (diff === 1) edges.push([a, b]);
    }
}

function clear() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

function render() {
    ctx.save();
    ctx.strokeStyle = `black`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    for (const [i, j] of edges) {
        const p = state.points[i], q = state.points[j];

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
    }

    ctx.restore();
}

function rotatePlane(v, aKey, bKey, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const a = v[aKey], b = v[bKey];

    return { ...v, [aKey]: a * c - b * s, [bKey]: a * s + b * c };
}

function project4to3(v, d) {
    const s = d / (d - v.w);

    return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function project3to2(v, d) {
    const s = d / (d - v.z);

    return { x: v.x * s, y: v.y * s };
}

function hash1(n) {
    const x = Math.sin(n * 127.1) * 43758.5453123;

    return x - Math.floor(x);
}

function smoothstep(t) {
    return t * t * (3 - 2 * t);
}

function noise1(x) {
    const i = Math.floor(x);
    const f = x - i;
    const a = hash1(i);
    const b = hash1(i + 1);
    const u = smoothstep(f);

    return a + (b - a) * u; // [0,1]
}

function fbm1(x, octaves = 4) {
    let sum = 0, amp = 0.5, freq = 1.0, norm = 0;

    for (let o = 0; o < octaves; o++) {
        sum += amp * noise1(x * freq);
        norm += amp;
        amp *= 0.5;
        freq *= 2.0;
    }

    return sum / norm; // [0,1]
}

function update(t) {
    const cx = W * 0.5, cy = H * 0.5;
    const scale = Math.min(W, H) * 0.10;

    if (!state.lastT) state.lastT = t;

    let dt = (t - state.lastT) / 1000;
    state.lastT = t;

    dt = Math.max(0, Math.min(dt, 0.05));

    const ns = state.noise.speed;
    const base = state.noise.base;
    const drift = state.noise.drift;
    const oct = state.noise.oct;

    const omegaXW = base + drift * (fbm1(10 + t * ns, oct) - 0.5) * base * 4;
    const omegaYZ = base + drift * (fbm1(20 + t * ns, oct) - 0.5) * base * 4;
    const omegaXZ = base + drift * (fbm1(30 + t * ns, oct) - 0.5) * base * 4;
    const omegaYW = base + drift * (fbm1(40 + t * ns, oct) - 0.5) * base * 4;
    const omegaZW = base + drift * (fbm1(50 + t * ns, oct) - 0.5) * base * 4;

    state.angles.xw += omegaXW * (dt * 1000);
    state.angles.yz += omegaYZ * (dt * 1000);
    state.angles.xz += omegaXZ * (dt * 1000);
    state.angles.yw += omegaYW * (dt * 1000);
    state.angles.zw += omegaZW * (dt * 1000);

    const d4 = 3 + (fbm1(100 + t * ns, oct) - 0.5) * 0.4;
    const d3 = 3 + (fbm1(200 + t * ns, oct) - 0.5) * 0.4;

    for (let i = 0; i < vertices.length; i++) {
        let p = { ...vertices[i] };

        p = rotatePlane(p, 'x', 'w', state.angles.xw);
        p = rotatePlane(p, 'y', 'z', state.angles.yz);
        p = rotatePlane(p, 'x', 'z', state.angles.xz);
        p = rotatePlane(p, 'y', 'w', state.angles.yw);
        p = rotatePlane(p, 'z', 'w', state.angles.zw);

        const p3 = project4to3(p, d4);
        const p2 = project3to2(p3, d3);

        state.points[i] = { x: cx + p2.x * scale, y: cy + p2.y * scale };
    }
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
}

window.addEventListener("resize", resize, { passive: true });

resize();
if (raf) cancelAnimationFrame(raf);
raf = requestAnimationFrame(tick);

