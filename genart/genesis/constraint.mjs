import { rnd } from './utils.js';

const BORDER = 0.02;
const POINT_REGION = 0.25;
const MAX_TRIES = 250;
const MIN_SHAPE_GAP = 10;
const N = 20;

const triadic = (hue) => [
    hue,
    (hue + 120) % 360,
    (hue + 240) % 360
];

const getBezierPoint = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    return {
        x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
        y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
    };
};

const rotRectPoly = (cx, cy, w, h, ang) => {
    const hw = w / 2, hh = h / 2;
    const c = Math.cos(ang), s = Math.sin(ang);
    const pts = [
        { x: -hw, y: -hh },
        { x: hw, y: -hh },
        { x: hw, y: hh },
        { x: -hw, y: hh },
    ].map(p => ({
        x: cx + p.x * c - p.y * s,
        y: cy + p.x * s + p.y * c
    }));
    return pts;
};

const distToRectEdge = (x, y, vx, vy, L, T, R, B) => {
    let tx = Infinity;
    let ty = Infinity;

    if (vx > 0) tx = (R - x) / vx;
    else if (vx < 0) tx = (L - x) / vx;

    if (vy > 0) ty = (B - y) / vy;
    else if (vy < 0) ty = (T - y) / vy;

    return Math.min(tx, ty);
};

const edgeDistances = (pos, ang, L, T, R, B) => {
    const x = pos.x, y = pos.y;

    const dx = Math.cos(ang), dy = Math.sin(ang);
    const nx = -Math.sin(ang), ny = Math.cos(ang);

    const alongF = distToRectEdge(x, y, dx, dy, L, T, R, B);
    const alongB = distToRectEdge(x, y, -dx, -dy, L, T, R, B);

    const perpF = distToRectEdge(x, y, nx, ny, L, T, R, B);
    const perpB = distToRectEdge(x, y, -nx, -ny, L, T, R, B);

    return { alongF, alongB, perpF, perpB };
};


const run = (canvas) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    let { height, width } = canvas;

    let points = [];
    let frameWidth, frameHeight;
    let offsetX, offsetY;
    let bezierS = 0;
    let gridAngle = 0;
    let shapes = [];

    const init = () => {
        frameWidth = width * (1 - BORDER * 2);
        frameHeight = height * (1 - BORDER * 2);
        offsetX = width * BORDER;
        offsetY = height * BORDER;

        points = [
            { x: (2 * offsetX) + rnd(frameWidth * POINT_REGION), y: (2 * offsetY) + rnd(frameHeight * POINT_REGION) },
            { x: frameWidth - rnd(frameWidth * POINT_REGION), y: frameHeight - rnd(frameHeight * POINT_REGION) },
            { x: frameWidth - rnd(frameWidth * POINT_REGION), y: (2 * offsetY) + rnd(frameHeight * POINT_REGION) },
            { x: (2 * offsetX) + rnd(frameWidth * POINT_REGION), y: frameHeight - rnd(frameHeight * POINT_REGION) }
        ];

        bezierS = rnd(4);
        gridAngle = rnd(360) * Math.PI / 180;
        shapes = [];
    };

    const getBezierControlPoints = () => {
        const p0 = points[bezierS];
        const p1 = points[(bezierS + 1) % 4];
        const p2 = points[(bezierS + 2) % 4];
        const p3 = points[(bezierS + 3) % 4];
        return { p0, p1, p2, p3 };
    };

    const clear = (a = 100) => {
        context.fillStyle = `rgba(255, 255, 255, ${a})`;
        context.fillRect(0, 0, width, height);
    };

    const drawBezierGuide = () => {
        context.strokeStyle = 'rgba(0,0,255,0.25)';
        context.fillStyle = 'rgba(0,0,255,0.3)';
        const { p0, p1, p2, p3 } = getBezierControlPoints();

        for (let i = 0; i < points.length; i++) {
            const point = points[i];

            context.beginPath();
            context.moveTo(point.x, point.y);
            context.arc(point.x, point.y, 3, 0, Math.PI * 2);
            context.fill();
        }

        context.beginPath();
        context.moveTo(p0.x, p0.y);
        context.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        context.stroke();

        context.setLineDash([3, 3]);

        context.beginPath();
        context.moveTo(p0.x, p0.y);
        context.lineTo(p1.x, p1.y);
        context.lineTo(p2.x, p2.y);
        context.lineTo(p3.x, p3.y);
        context.stroke();
    };

    const drawOrientationGrid = () => {
        context.strokeStyle = 'rgba(0,255,0,0.5)';
        context.save();
        context.setLineDash([5, 10]);
        context.translate(width / 2, height / 2);
        context.rotate(gridAngle);
        context.translate(-width / 2, -height / 2);

        const step = Math.min(width, height) / 10;

        for (let x = -width; x <= 2 * width; x += step) {
            context.beginPath();
            context.moveTo(x, -height);
            context.lineTo(x, 2 * height);
            context.stroke();
        }

        for (let y = -height; y <= 2 * height; y += step) {
            context.beginPath();
            context.moveTo(-width, y);
            context.lineTo(2 * width, y);
            context.stroke();
        }

        context.restore();
    };

    const drawLayout = () => {
        context.save();
        context.fillStyle = 'lightgray';
        context.strokeStyle = 'lightgray';

        drawBezierGuide();
        drawOrientationGrid();

        context.restore();
    };

    const rectInsideFrame = (poly) => {
        const minX = offsetX, maxX = offsetX + frameWidth;
        const minY = offsetY, maxY = offsetY + frameHeight;

        for (const p of poly) {
            if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) return false;
        }

        return true;
    };

    const circleInsideFrame = (cx, cy, r, L, T, R, B, gap = 0) => {
        const m = r + gap;

        return (cx - m >= L && cx + m <= R && cy - m >= T && cy + m <= B);
    };

    const circleCircleTooClose = (c1, c2, gap = 0) => {
        const dx = c2.cx - c1.cx;
        const dy = c2.cy - c1.cy;
        const rr = c1.r + c2.r + gap;

        return (dx * dx + dy * dy) < (rr * rr);
    };

    const circleRectTooClose = (circle, rect, gap = 0) => {
        const { cx, cy, r } = circle;
        const { cx: rx, cy: ry, w, h, ang } = rect;

        // move into rect-centered coords
        const px = cx - rx;
        const py = cy - ry;

        // rotate by -ang
        const c = Math.cos(ang);
        const s = Math.sin(ang);
        const lx = px * c + py * s;
        const ly = -px * s + py * c;

        const hw = w / 2;
        const hh = h / 2;

        // closest point on (axis-aligned) rect in local space
        const qx = Math.max(-hw, Math.min(hw, lx));
        const qy = Math.max(-hh, Math.min(hh, ly));

        const dx = lx - qx;
        const dy = ly - qy;

        const rr = r + gap;

        return (dx * dx + dy * dy) < (rr * rr);
    };

    const axesForPoly = (poly) => {
        const axes = [];
        for (let i = 0; i < poly.length; i++) {
            const a = poly[i];
            const b = poly[(i + 1) % poly.length];
            const ex = b.x - a.x;
            const ey = b.y - a.y;
            // perpendicular (normal)
            const nx = -ey;
            const ny = ex;
            const len = Math.hypot(nx, ny) || 1;
            axes.push({ x: nx / len, y: ny / len });
        }
        return axes;
    };

    const project = (poly, axis) => {
        let lo = Infinity, hi = -Infinity;
        for (const p of poly) {
            const d = p.x * axis.x + p.y * axis.y;
            if (d < lo) lo = d;
            if (d > hi) hi = d;
        }
        return { lo, hi };
    };

    const rectRectTooClose = (a, b, gap = 0) => {
        const axes = [...axesForPoly(a), ...axesForPoly(b)];
        for (const axis of axes) {
            const pa = project(a, axis);
            const pb = project(b, axis);

            if (pa.hi + gap <= pb.lo || pb.hi + gap <= pa.lo) return false;
        }
        return true;
    };

    const overlapsAny = (candidate, gap = 0) => {
        for (const s of shapes) {
            if (candidate.type === 'rect' && s.type === 'rect') {
                if (rectRectTooClose(candidate.poly, s.poly, gap)) return true;
            } else if (candidate.type === 'circle' && s.type === 'circle') {
                if (circleCircleTooClose(candidate, s, gap)) return true;
            } else if (candidate.type === 'circle' && s.type === 'rect') {
                if (circleRectTooClose(candidate, s, gap)) return true;
            } else if (candidate.type === 'rect' && s.type === 'circle') {
                if (circleRectTooClose(s, candidate, gap)) return true; // swap
            }
        }
        return false;
    };

    const generateCircle = (t, pos, L, T, R, B) => {
        const sizeK = 0.25 + 0.75 * Math.abs(2 * t - 1);

        const maxR = sizeK * 0.75 * Math.min(pos.x - L, R - pos.x, pos.y - T, B - pos.y);
        if (maxR <= 2) return false;

        const r = rnd(maxR, Math.max(2, maxR * 0.15));

        const circle = { type: 'circle', cx: pos.x, cy: pos.y, r };

        if (!circleInsideFrame(circle.cx, circle.cy, circle.r, L, T, R, B, MIN_SHAPE_GAP)) return false;
        if (overlapsAny(circle, MIN_SHAPE_GAP)) return false;

        return circle;
    };

    const generateRect = (t, pos, L, T, R, B) => {
        const wEnd = Math.abs(2 * t - 1);
        const sizeK = Math.min(1.0, 0.25 + 0.75 * (wEnd * wEnd));
        const ang = gridAngle + (Math.random() < 0.5 ? 0 : Math.PI / 2);
        const { alongF, alongB, perpF, perpB } = edgeDistances(pos, ang, L, T, R, B);

        const alongMax = Math.min(alongF, alongB) * 0.95;
        const perpMax = Math.min(perpF, perpB) * 0.60;

        // w is along `ang`, h is perpendicular to `ang`
        const w = rnd(alongMax * sizeK * 0.9, alongMax * sizeK * 0.3);
        const h = rnd(perpMax * sizeK * 0.5, perpMax * sizeK * 0.1);

        const poly = rotRectPoly(pos.x, pos.y, w, h, ang);

        const rect = { type: 'rect', cx: pos.x, cy: pos.y, w, h, ang, poly };

        if (!rectInsideFrame(poly)) return null;
        if (overlapsAny(rect, MIN_SHAPE_GAP)) return null;

        return rect;
    };

    const drawRect = ({ cx, cy, w, h, ang }) => {
        context.save();
        context.translate(cx, cy);
        context.rotate(ang);
        context.beginPath();
        context.rect(-w / 2, -h / 2, w, h);
        context.fill();
        context.restore();
    };

    const drawCircle = ({ cx, cy, r }) => {
        context.save();
        context.beginPath();
        context.arc(cx, cy, r, 0, Math.PI * 2);
        context.lineWidth = 2;
        context.fill();
        context.restore();
    };

    const generateShapes = () => {
        const { p0, p1, p2, p3 } = getBezierControlPoints();

        const L = offsetX;
        const T = offsetY;
        const R = offsetX + frameWidth;
        const B = offsetY + frameHeight;

        for (let i = 0; i < N; i++) {
            let shape = null;

            for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
                const t = Math.random();
                const pos = getBezierPoint(p0, p1, p2, p3, t);
                const wantCircle = Math.random() < 0.33;

                shape = wantCircle
                    ? generateCircle(t, pos, L, T, R, B, MIN_SHAPE_GAP)
                    : generateRect(t, pos, L, T, R, B, MIN_SHAPE_GAP);

                if (shape) break;
            }

            if (shape) shapes.push(shape);
            else break;
        }
    };

    const drawShapes = () => {
        const base = rnd(360);
        const palette = triadic(base);

        for (const s of shapes) {
            const hue = palette[rnd(palette.length)];

            context.fillStyle = `hsl(${hue}, 80%, 60%)`;

            if (s.type === 'circle') {
                drawCircle(s);
            } else if (s.type === 'rect') {
                drawRect(s);
            }
        }
    };

    const render = () => {
        drawLayout();
        generateShapes();
        drawShapes();
    };

    const tick = () => {
        if (width !== canvas.width || height !== canvas.height) {
            width = canvas.width;
            height = canvas.height;

            init();
        }

        clear();
        render();
    };

    canvas.addEventListener('pointerup', (e) => {
        init();
        tick();
    });

    init();
    tick();
};

export default run;
