const vec = (x = 0, y = 0) => ({ x, y });
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a, s) => ({ x: a.x * s, y: a.y * s });
const cross = (a, b) => a.x * b.y - a.y * b.x;
const hypot = Math.hypot;

const EPS = 1e-4;
const RAY_FAR = 5000;

const canvas = document.getElementById('canvas');

let raf = null;

const randomCoeffs = () => {
    const rand = () => (Math.random() * 2) - 1;

    return {
        ax: [rand() * 0.4, rand() * 0.3, rand() * 0.2],
        bx: [rand() * 0.4, rand() * 0.3, rand() * 0.2],
        ay: [rand() * 0.4, rand() * 0.3, rand() * 0.2],
        by: [rand() * 0.4, rand() * 0.3, rand() * 0.2],
    };
};

const randomPolygon = (N, cx, cy, rMin, rMax) => {
    const pts = [];

    for (let i = 0; i < N; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = rMin + Math.random() * (rMax - rMin);

        pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }

    const c = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });

    c.x /= pts.length; c.y /= pts.length;

    pts.sort((p1, p2) => Math.atan2(p1.y - c.y, p1.x - c.x) - Math.atan2(p2.y - c.y, p2.x - c.x));

    return pts;
};

const run = () => {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const pad = 20;

    let segments = [];
    let endpoints = [];
    let centerPoly = null;

    const light = { p: vec(0, 0), r: 8 };

    const buildEndpoints = () => {
        const map = new Map();
        const key = (p) => `${Math.round(p.x * 10) / 10},${Math.round(p.y * 10) / 10}`;

        for (const seg of segments) {
            const ka = key(seg.a);
            const kb = key(seg.b);

            if (!map.has(ka)) map.set(ka, seg.a);
            if (!map.has(kb)) map.set(kb, seg.b);
        }

        endpoints = [...map.values()];
    };

    const x0 = pad, y0 = pad, x1 = w - pad, y1 = h - pad;

    segments.push({ a: vec(x0, y0), b: vec(x1, y0) });
    segments.push({ a: vec(x1, y0), b: vec(x1, y1) });
    segments.push({ a: vec(x1, y1), b: vec(x0, y1) });
    segments.push({ a: vec(x0, y1), b: vec(x0, y0) });

    const cx = w / 2;
    const cy = h / 2;
    const minR = Math.min(w, h) * 0.1;
    const maxR = Math.min(w, h) * 0.2;

    centerPoly = randomPolygon(3 + Math.random() * 5 | 0, cx, cy, minR, maxR);

    for (let i = 0; i < centerPoly.length; i++) {
        const a = centerPoly[i];
        const b = centerPoly[(i + 1) % centerPoly.length];

        segments.push({ a: vec(a.x, a.y), b: vec(b.x, b.y) });
    }

    buildEndpoints();

    light.p = vec(x0 + (x1 - x0) * 0.25, y0 + (y1 - y0) * 0.45);

    // ---------- Ray vs segment intersection ----------
    // Ray: P(t) = p + t*r, t >= 0
    // Segment: Q(u) = q + u*s, 0 <= u <= 1  (q=a, s=b-a)
    const raySegIntersect = (p, r, q, s) => {
        const rxs = cross(r, s);

        if (Math.abs(rxs) < 1e-10) return null; // parallel or collinear

        const q_p = sub(q, p);
        const t = cross(q_p, s) / rxs;
        const u = cross(q_p, r) / rxs;

        if (t >= 0 && u >= 0 && u <= 1) return { t, u };

        return null;
    };

    const visibilityPolygon = (origin) => {
        const angles = [];

        for (const p of endpoints) {
            const ang = Math.atan2(p.y - origin.y, p.x - origin.x);

            angles.push(ang - EPS, ang, ang + EPS);
        }

        const hits = [];

        for (const ang of angles) {
            const dir = vec(Math.cos(ang), Math.sin(ang));

            let bestT = Infinity;
            let bestPt = null;

            for (const seg of segments) {
                const q = seg.a;
                const s = sub(seg.b, seg.a);
                const res = raySegIntersect(origin, dir, q, s);

                if (!res) continue;

                if (res.t < bestT) {
                    bestT = res.t;
                    bestPt = add(origin, mul(dir, res.t));
                }
            }

            // Arena walls should guarantee a hit, but keep a fallback anyway
            if (!bestPt) {
                bestPt = add(origin, mul(dir, RAY_FAR));
                bestT = RAY_FAR;
            }

            hits.push({ ang, x: bestPt.x, y: bestPt.y, t: bestT });
        }

        hits.sort((a, b) => a.ang - b.ang);

        const poly = [];

        for (const h of hits) {
            const last = poly[poly.length - 1];

            if (!last || hypot(h.x - last.x, h.y - last.y) > 0.5) poly.push(h);
        }

        return poly;
    };

    const pathFromPoly = (poly) => {
        if (!poly || poly.length < 3) return;

        ctx.beginPath();
        ctx.moveTo(poly[0].x, poly[0].y);

        for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);

        ctx.closePath();
    };

    const render = (poly) => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.lineWidth = 1;
        ctx.fillStyle = 'darkgrey';
        ctx.strokeStyle = 'black';

        ctx.beginPath();
        ctx.moveTo(segments[0].a.x, segments[0].a.y);

        for (let i = 0; i < 4; i++) {
            ctx.lineTo(segments[i].b.x, segments[i].b.y);
        }

        ctx.fill();
        ctx.stroke();

        // center poly
        ctx.save();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.moveTo(centerPoly[0].x, centerPoly[0].y);

        for (let i = 1; i < centerPoly.length; i++) {
            ctx.lineTo(centerPoly[i].x, centerPoly[i].y);
        }

        ctx.closePath();
        ctx.stroke();
        ctx.fill();
        ctx.restore();

        pathFromPoly(poly);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.stroke();

        // draw rays (debug): from light to each polygon vertex (thin)
        // ctx.save();
        // for (const p of poly) {
        //     ctx.beginPath();
        //     ctx.moveTo(light.p.x, light.p.y);
        //     ctx.lineTo(p.x, p.y);
        //     ctx.stroke();
        // }
        // ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(light.p.x, light.p.y, light.r, 0, Math.PI * 2);
        ctx.fillStyle = 'orange';
        ctx.fill();
        ctx.restore();
    };

    const fourier = randomCoeffs();

    const randomFourier = (t) => {
        const T = t * 2 * Math.PI;
        let x = 0, y = 0;

        for (let k = 0; k < 3; k++) {
            const f = k + 1;
            x += fourier.ax[k] * Math.sin(f * T) + fourier.bx[k] * Math.cos(f * T);
            y += fourier.ay[k] * Math.sin(f * T) + fourier.by[k] * Math.cos(f * T);
        }

        return { x, y };
    };

    const update = (dt) => {
        const t = performance.now() / 5000;
        const p = randomFourier(t);

        light.p.x = w / 2 + p.x * w / 2;
        light.p.y = h / 2 + p.y * h / 2;
    };

    let lastTs = 0;

    const tick = (ts) => {
        if (!lastTs) lastTs = ts;
        let dt = ts - lastTs;
        lastTs = ts;
        dt = Math.min(dt, 250);
        
        const poly = visibilityPolygon(light.p);

        update();
        render(poly);

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
