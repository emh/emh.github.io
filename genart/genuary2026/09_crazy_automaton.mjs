const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let raf = 0;
let DPR = 1, W = 0, H = 0;

const N = 50;
const EPS = 1e-9;

const A = 3;   // <A die
const B = 6;   // [A,B) stay
const C = 7;  // [B,C) spawn, >=C die

const MAX_SITES = 1000;

let TARGET_DIST = 20;
const FORCE_STRENGTH = 0.25;    // 0..1
const FORCE_DAMP = 0.9;        // 0..1 (higher = smoother)

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

let state = {
    sites: [],

    pts: [],
    tris: [],
    edgeToTris: [],

    neighbourCounts: [],

    vel: []
};

const randomizeSites = () => {
    state.sites = new Array(N).fill(0).map(() => (
        { x: Math.random() * W, y: Math.random() * H }
    ));

    state.pts = [];
    state.tris = [];
    state.edgeToTris = [];
    state.neighbourCounts = [];
    state.vel = [];
};

const init = () => {
    randomizeSites();
};

const clear = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
};

const drawSites = () => {
    ctx.save();
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '12px sans-serif';

    for (let i = 0; i < state.sites.length; i++) {
        const s = state.sites[i];
        const count = state.neighbourCounts[i] || 0;

        ctx.fillText(count, s.x + 6, s.y + 6);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
};

// Liang–Barsky segment clip to rectangle [0,W]x[0,H]
const clipSegment = (x0, y0, x1, y1) => {
    let p = [-(x1 - x0), (x1 - x0), -(y1 - y0), (y1 - y0)];
    let q = [x0 - 0, W - x0, y0 - 0, H - y0];
    let u0 = 0, u1 = 1;

    for (let i = 0; i < 4; i++) {
        const pi = p[i], qi = q[i];

        if (Math.abs(pi) < EPS) {
            if (qi < 0) return null;
        } else {
            const t = qi / pi;

            if (pi < 0) { if (t > u1) return null; if (t > u0) u0 = t; }
            else { if (t < u0) return null; if (t < u1) u1 = t; }
        }
    }

    const nx0 = x0 + u0 * (x1 - x0);
    const ny0 = y0 + u0 * (y1 - y0);
    const nx1 = x0 + u1 * (x1 - x0);
    const ny1 = y0 + u1 * (y1 - y0);

    return [nx0, ny0, nx1, ny1];
};

const drawEdges = () => {
    const { tris, pts } = state;

    ctx.save();
    ctx.strokeStyle = 'black';
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (const [k, adj] of state.edgeToTris) {
        if (adj.length === 2) {
            const ta = tris[adj[0]].cc;
            const tb = tris[adj[1]].cc;

            if (!ta || !tb) continue;

            const seg = clipSegment(ta.x, ta.y, tb.x, tb.y);

            if (!seg) continue;

            ctx.moveTo(seg[0], seg[1]);
            ctx.lineTo(seg[2], seg[3]);
        } else if (adj.length === 1) {
            const ti = tris[adj[0]];
            const cc = ti.cc;

            if (!cc) continue;

            const parts = k.split(',');
            const u = parseInt(parts[0], 10), v = parseInt(parts[1], 10);

            const A = pts[u], B = pts[v];

            const mx = 0.5 * (A.x + B.x);
            const my = 0.5 * (A.y + B.y);

            // edge direction
            const ex = B.x - A.x;
            const ey = B.y - A.y;

            // perpendicular directions
            // choose the one that points away from the triangle interior:
            // compare with vector from midpoint to triangle's third vertex.
            const px0 = -ey, py0 = ex;
            const px1 = ey, py1 = -ex;

            // find triangle's third vertex (not u or v)
            let w = ti.a;
            if (w === u || w === v) w = ti.b;
            if (w === u || w === v) w = ti.c;
            const C = pts[w];

            const vx = C.x - mx;
            const vy = C.y - my;

            // want perpendicular pointing opposite to C from the edge (outside)
            const d0 = px0 * vx + py0 * vy;
            const dirx = (d0 > 0) ? px1 : px0;
            const diry = (d0 > 0) ? py1 : py0;

            // normalize
            const len = Math.hypot(dirx, diry) || 1;
            const dx = dirx / len;
            const dy = diry / len;

            // Make a far endpoint, then clip segment cc -> far
            const FAR = Math.max(W, H) * 4;
            const x1 = cc.x + dx * FAR;
            const y1 = cc.y + dy * FAR;

            const seg = clipSegment(cc.x, cc.y, x1, y1);

            if (!seg) continue;

            ctx.moveTo(seg[0], seg[1]);
            ctx.lineTo(seg[2], seg[3]);
        }

    }

    ctx.stroke();
    ctx.restore();
};

const drawHud = () => {
    ctx.save();
    ctx.fillStyle = "black";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`FPS: ${state.fps.toFixed(1)}`, 8, 8);
    ctx.fillText('Sites: ' + state.sites.length, 8, 24);
    if (state.perf) {
        ctx.fillText(`Triangulation: ${state.perf.triangulationMs.toFixed(2)} ms`, 8, 40);
        ctx.fillText(`CA Step: ${state.perf.caStepMs.toFixed(2)} ms`, 8, 56);
        ctx.fillText(`Force: ${state.perf.forceMs.toFixed(2)} ms`, 8, 72);
    }
    ctx.fillText(`Births: ${state.births}`, 8, 88);
    ctx.fillText(`Deaths: ${state.deaths}`, 8, 104);

    ctx.restore();
};

const render = () => {
    //drawSites();
    drawEdges();
    // drawHud();
};

// Big triangle covering the viewport
const makeSuperTriangle = (pts) => {
    const margin = Math.max(W, H) * 10;
    const cx = W * 0.5, cy = H * 0.5;
    const p0 = { x: cx, y: cy - margin };
    const p1 = { x: cx - margin, y: cy + margin };
    const p2 = { x: cx + margin, y: cy + margin };
    const i0 = pts.push(p0) - 1;
    const i1 = pts.push(p1) - 1;
    const i2 = pts.push(p2) - 1;

    return { i0, i1, i2 };
};

// Returns {x,y,r2} for circumcenter of triangle ABC.
const circumcenter = (ax, ay, bx, by, cx, cy) => {
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));

    if (Math.abs(d) < EPS) return null;

    const a2 = ax * ax + ay * ay;
    const b2 = bx * bx + by * by;
    const c2 = cx * cx + cy * cy;

    const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d;
    const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
    const dx = ux - ax, dy = uy - ay;

    return { x: ux, y: uy, r2: dx * dx + dy * dy };
};

const pointInCircumcircle = (px, py, tri, pts) => {
    const cc = tri.cc;
    if (!cc) {
        console.warn("Degenerate triangle encountered in circumcircle test", tri);
        return false;
    }

    const dx = px - cc.x, dy = py - cc.y;

    return (dx * dx + dy * dy) <= cc.r2 + EPS;
};

const edgeKey = (u, v) => u < v ? (u + "," + v) : (v + "," + u);

const orient = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

const buildDelaunay = (points) => {
    const pts = points.slice();
    const st = makeSuperTriangle(pts);

    let tris = [{
        a: st.i0, b: st.i1, c: st.i2,
        cc: circumcenter(pts[st.i0].x, pts[st.i0].y, pts[st.i1].x, pts[st.i1].y, pts[st.i2].x, pts[st.i2].y)
    }];

    for (let pi = 0; pi < points.length; pi++) {
        const p = pts[pi];
        const bad = [];

        for (let t of tris) {
            if (pointInCircumcircle(p.x, p.y, t, pts)) bad.push(t);
        }

        const edgeCount = new Map();

        for (let t of bad) {
            const e0 = [t.a, t.b], e1 = [t.b, t.c], e2 = [t.c, t.a];

            for (const [u, v] of [e0, e1, e2]) {
                const k = edgeKey(u, v);
                const prev = edgeCount.get(k);

                if (!prev) edgeCount.set(k, { u: Math.min(u, v), v: Math.max(u, v), n: 1 });
                else prev.n++;
            }
        }

        const boundary = [];

        for (const e of edgeCount.values()) {
            if (e.n === 1) boundary.push([e.u, e.v]);
        }

        if (bad.length) {
            const badSet = new Set(bad.map(t => t));

            tris = tris.filter(t => !badSet.has(t));
        }

        for (const [u, v] of boundary) {
            const a = u, b = v, c = pi;
            const A = pts[a], B = pts[b], C = pts[c];
            let ta = a, tb = b, tc = c;

            if (orient(A.x, A.y, B.x, B.y, C.x, C.y) < 0) { tb = a; ta = b; }

            const cc = circumcenter(pts[ta].x, pts[ta].y, pts[tb].x, pts[tb].y, pts[tc].x, pts[tc].y);

            if (!cc) {
                console.warn("Degenerate triangle encountered during Delaunay construction", ta, tb, tc);
                continue;
            }

            tris.push({ a: ta, b: tb, c: tc, cc });
        }
    }

    // Remove triangles containing super triangle vertices
    const kill = new Set([st.i0, st.i1, st.i2]);
    tris = tris.filter(t => !kill.has(t.a) && !kill.has(t.b) && !kill.has(t.c));

    return { pts, tris };
};

// Build neighbor adjacency (Voronoi neighbors == Delaunay edge neighbors)
const buildNeighborsFromEdges = (edgeToTris, numSites) => {
    const neigh = new Array(numSites);

    for (let i = 0; i < numSites; i++) neigh[i] = new Set();

    for (const [k, triIdxs] of edgeToTris) {
        // optional: only count interior Voronoi edges (shared by 2 tris)
        if (triIdxs.length !== 2) continue;

        const [su, sv] = k.split(',').map(Number);

        // su/sv are indices into pts (which includes the supertriangle points at the end),
        // but only 0..numSites-1 correspond to your real sites.
        if (su < numSites && sv < numSites) {
            neigh[su].add(sv);
            neigh[sv].add(su);
        }
    }

    const counts = neigh.map(s => s.size);

    return { neigh, counts };
};

const recalculateTriangulation = () => {
    const { pts, tris } = buildDelaunay(state.sites);

    state.pts = pts;
    state.tris = tris;

    const edgeToTris = new Map(); // key -> [triIndexA, triIndexB?]

    for (let i = 0; i < tris.length; i++) {
        const t = tris[i];
        const edges = [[t.a, t.b], [t.b, t.c], [t.c, t.a]];

        for (const [u, v] of edges) {
            const k = edgeKey(u, v);
            let arr = edgeToTris.get(k);
            if (!arr) { arr = []; edgeToTris.set(k, arr); }

            arr.push(i);
        }
    }

    const { neigh, counts } = buildNeighborsFromEdges(edgeToTris, state.sites.length);

    state.neighbours = neigh;
    state.neighbourCounts = counts;

    state.edgeToTris = [...edgeToTris]
};

const spawnBetweenSiteAndFurthestNeighbour = (i) => {
    const si = state.sites[i];
    const neigh = state.neighbours?.[i];

    if (!neigh || neigh.size === 0) {
        console.warn("Trying to spawn but no neighbours for site", i);
        return null;
    }

    let fj = -1;
    let bestD2 = -1;

    for (const j of neigh) {
        const sj = state.sites[j];
        const dx = sj.x - si.x;
        const dy = sj.y - si.y;
        const d2 = dx * dx + dy * dy;

        if (d2 > bestD2) { bestD2 = d2; fj = j; }
    }

    if (fj < 0) {
        console.warn("Failed to find furthest neighbour for site", i);
        return null;
    }

    const sj = state.sites[fj];

    let x = 0.5 * (si.x + sj.x);
    let y = 0.5 * (si.y + sj.y);

    const jx = (Math.random() - 0.5) * 2;
    const jy = (Math.random() - 0.5) * 2;

    x += jx; y += jy;

    x = clamp(x, 0, W);
    y = clamp(y, 0, H);

    return { x, y };
};

const stepCA = () => {
    const next = [];
    const spawns = [];

    for (let i = 0; i < state.sites.length; i++) {
        const n = state.neighbourCounts[i] || 0;

        if (n < A) continue;
        if (n >= C) continue;

        next.push(state.sites[i]);

        if (n >= B) {
            const child = spawnBetweenSiteAndFurthestNeighbour(i);

            if (child) spawns.push(child);
        }
    }

    state.births = spawns.length;
    state.deaths = state.sites.length - next.length;

    state.sites = next.concat(spawns).slice(0, MAX_SITES);
};

const syncVel = () => {
    const n = state.sites.length;

    if (!state.vel) state.vel = [];

    while (state.vel.length < n) state.vel.push({ x: 0, y: 0 });

    if (state.vel.length > n) state.vel.length = n;
};

const applyLocalRepulsion = () => {
    const n = state.sites.length;
    if (n === 0) return;

    const cell = TARGET_DIST;              // grid size ~ interaction radius
    const inv = 1 / cell;
    const buckets = new Map();

    const key = (cx, cy) => (cx << 16) ^ cy;

    for (let i = 0; i < n; i++) {
        const s = state.sites[i];
        const cx = (s.x * inv) | 0;
        const cy = (s.y * inv) | 0;
        const k = key(cx, cy);
        let b = buckets.get(k);
        if (!b) { b = []; buckets.set(k, b); }
        b.push(i);
    }

    const minD = TARGET_DIST;
    const minD2 = minD * minD;

    for (let i = 0; i < n; i++) {
        const si = state.sites[i];
        const cxi = (si.x * inv) | 0;
        const cyi = (si.y * inv) | 0;

        for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
                const b = buckets.get(key(cxi + ox, cyi + oy));
                if (!b) continue;

                for (const j of b) {
                    if (j <= i) continue;

                    const sj = state.sites[j];
                    let dx = si.x - sj.x;
                    let dy = si.y - sj.y;
                    let d2 = dx * dx + dy * dy;

                    if (d2 < EPS) {
                        dx = (Math.random() - 0.5) * 1e-3;
                        dy = (Math.random() - 0.5) * 1e-3;
                        d2 = dx * dx + dy * dy;
                    }

                    if (d2 >= minD2) continue;

                    const d = Math.sqrt(d2);
                    const nx = dx / d, ny = dy / d;
                    const overlap = (minD - d) / minD;
                    const f = FORCE_STRENGTH * overlap;

                    state.vel[i].x += nx * f;
                    state.vel[i].y += ny * f;
                    state.vel[j].x -= nx * f;
                    state.vel[j].y -= ny * f;
                }
            }
        }
    }

    for (let i = 0; i < n; i++) {
        const s = state.sites[i];
        const v = state.vel[i];
        v.x *= FORCE_DAMP;
        v.y *= FORCE_DAMP;
        s.x = clamp(s.x + v.x, 0, W);
        s.y = clamp(s.y + v.y, 0, H);
    }
};

const update = () => {
    if (state.pts.length === 0) recalculateTriangulation();

    const t0 = performance.now();
    stepCA();
    const t1 = performance.now();
    syncVel();
    applyLocalRepulsion();
    const t2 = performance.now();
    recalculateTriangulation();
    const t3 = performance.now();

    state.perf = {
        caStepMs: t1 - t0,
        forceMs: t2 - t1,
        triangulationMs: t3 - t2,
    };
};

let SIM_FPS = 10;
let lastTs = 0;
let acc = 0;

const tick = (ts) => {
    const dt = ts - lastTs;
    state.fps = dt > 0 ? 1000 / dt : 0;
    lastTs = ts;

    acc += dt;
    const stepMs = 1000 / SIM_FPS;

    if (acc >= stepMs) {
        acc = Math.min(acc, stepMs * 2);

        clear();
        update();

        if (state.sites.length < 10) init();

        render();

        acc -= stepMs;
    }

    raf = requestAnimationFrame(tick);
};

function resize() {
    const rect = canvas.getBoundingClientRect();

    DPR = Math.max(1, window.devicePixelRatio || 1);
    W = rect.width;
    H = rect.height;
    TARGET_DIST = Math.floor(Math.min(W, H) * 0.1);

    canvas.width = Math.max(1, Math.floor(W * DPR));
    canvas.height = Math.max(1, Math.floor(H * DPR));
}

window.addEventListener("resize", resize, { passive: true });

window.addEventListener("click", (e) => {
    init();
}, { passive: false });

resize();
init();

if (raf) cancelAnimationFrame(raf);
raf = requestAnimationFrame(tick);
