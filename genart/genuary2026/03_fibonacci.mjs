const canvas = document.getElementById('canvas');
const trail = document.createElement('canvas');

const ctx = canvas.getContext('2d', { willReadFrequently: true });
const trailCtx = trail.getContext('2d', { willReadFrequently: true });

let raf = null;
let lastTip = null;

const RADII = [89, 55, 34, 21, 13, 8, 5, 3, 2, 1, 1];
const TOTAL_RADIUS = RADII.reduce((a, b) => a + b, 0);

const run = () => {
    const fadeTrail = (alpha = 0) => {
        trailCtx.save();
        trailCtx.globalAlpha = alpha;
        trailCtx.setTransform(1, 0, 0, 1, 0, 0);
        trailCtx.fillStyle = 'white';
        trailCtx.fillRect(0, 0, trail.width, trail.height);
        trailCtx.restore();
    };
    
    const { width, height } = canvas;

    trail.width = width;
    trail.height = height;

    const cx = width / 2;
    const cy = height / 2;

    const R_FACTOR = Math.min(cx, cy) / (2 * TOTAL_RADIUS);

    const tick = (ts) => {
        const t = ts * 0.002;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, width, height);

        let centers = [{ x: cx, y: cy }];
        let orbitAngles = [0];
        let spinAngles = [0];

        orbitAngles[1] = t;

        for (let i = 1; i < RADII.length; i++) {
            const R = RADII[i - 1] * R_FACTOR;
            const r = RADII[i] * R_FACTOR;

            const parent = centers[i - 1];
            const theta = orbitAngles[i] ?? t;

            const d = R + r;

            const x = parent.x + d * Math.cos(theta);
            const y = parent.y + d * Math.sin(theta);

            centers[i] = { x, y };

            const ratio = (R + r) / r;
            const phi = -1 * ratio * theta;

            spinAngles[i] = phi;

            if (i + 1 < RADII.length) {
                orbitAngles[i + 1] = theta + 0.7 * phi;
            }
        }

        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;

        for (let i = 0; i < RADII.length; i++) {
            const c = centers[i];
            const rad = RADII[i] * R_FACTOR;

            ctx.beginPath();
            ctx.arc(c.x, c.y, rad, 0, Math.PI * 2);
            ctx.stroke();
        }

        const tip = centers[centers.length - 1];

        fadeTrail();

        if (lastTip) {
            trailCtx.save();
            trailCtx.globalAlpha = 1;
            trailCtx.strokeStyle = 'black';
            trailCtx.lineWidth = 1;
            trailCtx.beginPath();
            trailCtx.moveTo(lastTip.x, lastTip.y);
            trailCtx.lineTo(tip.x, tip.y);
            trailCtx.stroke();
            trailCtx.restore();
        }
        lastTip = tip;

        ctx.globalAlpha = 1;
        ctx.drawImage(trail, 0, 0);

        raf = requestAnimationFrame(tick);
    };

    if (raf) cancelAnimationFrame(raf);

    raf = requestAnimationFrame(tick);
};

const resize = () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width);
    canvas.height = Math.floor(rect.height);
trail.width = canvas.width;
trail.height = canvas.height;
lastTip = null;
trailCtx.fillStyle = 'white';
trailCtx.fillRect(0, 0, trail.width, trail.height);

    run();
};

window.addEventListener('resize', resize);
resize();
