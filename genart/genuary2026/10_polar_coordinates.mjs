const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let raf = 0;
let DPR = 1, W = 0, H = 0;

const MAX_LENGTH = 200_000;
const MAX_STEPS = 10;

const ROTATE_SECONDS = 3;   // duration of the 360 spin

let mode = "SIM";             // "SIM" | "ROTATE"
let rotateT = 0;              // ms elapsed in rotate mode
let freezeSentence = "X";     // sentence to render while rotating

const rules = [
    {
        X: "F[OFX]B[IBX]",
        F: "Ff",
        B: "Bb"
    },
    {
        X: "F[[OFFXI][IBXO]]",
        F: "Ff"
    },
    {
        X: "FX",
        F: "FOFI"
    },
    {
        Y: "Y[IFFF][OFFF]FY",
        X: "XFY[OX][IX]"
    }
];

let state = {
    cx: 0,
    cy: 0,
    sentence: 'X',
    levels: 10,
    slices: 128,
    radius: 0,
    ruleIndex: 0,
    steps: 0
};

const rewrite = (s) => s.split('').map((c) => rules[state.ruleIndex][c] || c).join('');

const init = () => {
    state.cx = W * 0.5;
    state.cy = H * 0.5;
    state.radius = Math.min(W, H) * 0.45;
};

const clear = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
};

const drawGrid = () => {
    const x = Math.round(state.cx) + 0.5;
    const y = Math.round(state.cy) + 0.5;
    const r = state.radius;

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;

    for (let i = 0; i < state.levels; i++) {
        ctx.beginPath();
        ctx.arc(x, y, r * (i + 1) / state.levels, 0, Math.PI * 2);
        ctx.stroke();
    }

    for (let i = 0; i < state.slices; i++) {
        const angle = (i / state.slices) * Math.PI * 2;
        const x1 = x + (r / state.levels) * Math.cos(angle);
        const y1 = y + (r / state.levels) * Math.sin(angle);
        const x2 = x + r * Math.cos(angle);
        const y2 = y + r * Math.sin(angle);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    ctx.restore();
};

const drawLine = (sentence = state.sentence) => {
    ctx.save();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;

    const stack = [];

    let angle = 0;
    const radiusStep = state.radius / state.levels;
    const angleStep = (Math.PI * 2) / state.slices;

    let radius = radiusStep;
    let penDown = false;

    const pos = () => ({
        x: state.cx + radius * Math.cos(angle),
        y: state.cy + radius * Math.sin(angle),
    });

    const ensureAt = (x, y) => {
        if (!penDown) {
            ctx.moveTo(x, y);
            penDown = true;
        }
    };

    const lineTo = (x, y) => {
        if (!penDown) {
            ctx.moveTo(x, y);
            penDown = true;
        } else {
            ctx.lineTo(x, y);
        }
    };

    ctx.beginPath();

    for (const ch of sentence) {
        switch (ch) {
            case 'F': {
                const p = pos();
                ensureAt(p.x, p.y);
                ctx.arc(state.cx, state.cy, radius, angle, angle + angleStep);
                angle += angleStep;
                break;
            }

            case 'B': {
                const p = pos();
                ensureAt(p.x, p.y);
                ctx.arc(state.cx, state.cy, radius, angle, angle - angleStep, true);
                angle -= angleStep;
                break;
            }
            case 'f':
                angle += angleStep;
                penDown = false;
                break;

            case 'b':
                angle -= angleStep;
                penDown = false;
                break;
            case 'O': {
                const p1 = pos();
                ensureAt(p1.x, p1.y);

                radius = Math.min(state.radius, radius + radiusStep);

                const p2 = pos();
                lineTo(p2.x, p2.y);
                break;
            }

            case 'I': {
                const p1 = pos();
                ensureAt(p1.x, p1.y);

                radius = Math.max(radiusStep, radius - radiusStep);

                const p2 = pos();
                lineTo(p2.x, p2.y);
                break;
            }

            case 'o':
                radius = Math.min(state.radius, radius + radiusStep);
                penDown = false;
                break;

            case 'i':
                radius = Math.max(radiusStep, radius - radiusStep);
                penDown = false;
                break;

            case '[':
                stack.push({ angle, radius });
                break;

            case ']': {
                const s = stack.pop();
                if (s) {
                    angle = s.angle;
                    radius = s.radius;
                    penDown = false;
                }
                break;
            }
        }
    }

    ctx.stroke();
    ctx.restore();
};

const drawHud = () => {
    const dy = 10;
    const x = 5;
    let y = 10;

    const n = Math.floor(W / 10);

    const drawText = (text) => {
        ctx.fillText(text, x, y);

        y += dy;
    };

    ctx.save();
    ctx.fillStyle = 'black';
    ctx.font = '10px sans-serif';

    for (let i = 0; i < state.sentence.length; i += n) {
        drawText(state.sentence.slice(i, i + n));
    }

    ctx.restore();
};

const render = () => {
    const angle = (mode === "ROTATE")
        ? (rotateT / (ROTATE_SECONDS * 1000)) * Math.PI * 2
        : 0;

    ctx.save();
    ctx.translate(state.cx, state.cy);
    ctx.rotate(angle);
    ctx.translate(-state.cx, -state.cy);

    drawGrid();
    drawLine(mode === "ROTATE" ? freezeSentence : state.sentence);
    // drawHud();

    ctx.restore();
};

const update = (dt) => {
    if (mode === "ROTATE") {
        rotateT += dt;

        if (rotateT >= ROTATE_SECONDS * 1000) {
            mode = "SIM";
            rotateT = 0;

            state.sentence = 'X';
            state.ruleIndex = (state.ruleIndex + 1) % rules.length;
            state.steps = 0;
        }

        return;
    }

    if (state.sentence.length >= MAX_LENGTH || state.steps >= MAX_STEPS) {
        mode = "ROTATE";
        rotateT = 0;
        freezeSentence = state.sentence;

        return;
    }

    state.sentence = rewrite(state.sentence);
    state.steps += 1;
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

    if (mode === "ROTATE") {
        clear();
        update(dt);
        render();
    } else if (acc >= stepMs) {
        acc = Math.min(acc, stepMs * 2);

        clear();
        update(stepMs);
        render();

        acc -= stepMs;
    }

    raf = requestAnimationFrame(tick);
};

const resize = () => {
    const rect = canvas.getBoundingClientRect();

    DPR = Math.max(1, window.devicePixelRatio || 1);
    W = rect.width;
    H = rect.height;

    canvas.width = Math.max(1, Math.floor(W * DPR));
    canvas.height = Math.max(1, Math.floor(H * DPR));

    init();
};

window.addEventListener("resize", resize, { passive: true });

resize();
if (raf) cancelAnimationFrame(raf);
raf = requestAnimationFrame(tick);

