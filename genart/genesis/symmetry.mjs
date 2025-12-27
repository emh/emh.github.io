import { rnd, times } from "./utils.js";

const COLORS = [
    { r: 255, g: 0, b: 0 },
    { r: 0, g: 0, b: 255 },
    { r: 255, g: 255, b: 0 },
    { r: 0, g: 255, b: 0 },
    { r: 255, g: 0, b: 255 },
    { r: 0, g: 255, b: 255 }
];

const randColor = () => COLORS[rnd(COLORS.length)];

const TAU = Math.PI * 2;

const polarToXY = (cx, cy, r, t) => [cx + r * Math.cos(t), cy + r * Math.sin(t)];

const drawLinePolar = (context, cx, cy, r0, t0, r1, t1) => {
    const [x0, y0] = polarToXY(cx, cy, r0, t0);
    const [x1, y1] = polarToXY(cx, cy, r1, t1);

    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.stroke();
};

const drawCubicPolar = (context, cx, cy, r0, t0, r1, t1, r2, t2, r3, t3) => {
    const [x0, y0] = polarToXY(cx, cy, r0, t0);
    const [x1, y1] = polarToXY(cx, cy, r1, t1);
    const [x2, y2] = polarToXY(cx, cy, r2, t2);
    const [x3, y3] = polarToXY(cx, cy, r3, t3);

    context.beginPath();
    context.moveTo(x0, y0);
    context.bezierCurveTo(x1, y1, x2, y2, x3, y3);
    context.stroke();
};

const reflectLocalTheta = (dTheta, tLocal) => dTheta - tLocal;

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

            const color = randColor();

            fill(width, height, data, visited, x, y, color);
        }
    }

    context.putImageData(imageData, 0, 0);
};

const run = (canvas) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    let { height, width } = canvas;

    let wedges = 6;
    let layers = 4;

    let cx, cy;
    let radius;

    let config = [];

    const raddii = (layer) => [
        ((layer - 1) / layers) * radius,
        (layer / layers) * radius
    ];

    const init = () => {
        layers = 4 + rnd(2);
        wedges = 5 + rnd(4);

        cx = width / 2;
        cy = height / 2;
        radius = Math.min(width, height) * 0.45;

        config = times(layers, (_, j) => {
            const [rInner, rOuter] = raddii(j + 1);

            const type = rnd(2) === 0 ? 'line' : 'curve';

            if (type === 'line') {
                return {
                    type,
                    rs: rnd(rOuter, rInner),
                    re: rnd(rOuter, rInner)
                };
            } else {
                const rMid = rInner + (rOuter - rInner) * 0.5;

                return {
                    type,
                    rs: rnd(rOuter, rInner),
                    re: rnd(rOuter, rInner),
                    rMid
                };
            }
        });
    };

    const drawWedge = (fn) => {
        const dTheta = TAU / wedges;

        for (let k = 0; k < wedges; k++) {
            const rot = k * dTheta;

            fn(rot);
        }
    }

    const drawLine = (rs, re) => {
        const dTheta = TAU / wedges;
        const spineTheta = 0;
        const midTheta = dTheta * 0.5;

        drawWedge((rot) => {
            drawLinePolar(
                context,
                cx,
                cy,
                rs,
                rot + spineTheta,
                re,
                rot + midTheta
            );

            drawLinePolar(
                context,
                cx,
                cy,
                rs,
                rot + dTheta - spineTheta,
                re,
                rot + dTheta - midTheta
            );
        });
    };

    const drawCurve = (rs, re, rMid) => {
        const dTheta = TAU / wedges;
        const spineTheta = 0;
        const midTheta = dTheta * 0.5;

        drawWedge((rot) => {
            drawCubicPolar(
                context, cx, cy,
                rs, rot + spineTheta,
                rMid, rot + spineTheta,
                rMid, rot + midTheta,
                re, rot + midTheta
            );

            drawCubicPolar(
                context, cx, cy,
                rs, rot + reflectLocalTheta(dTheta, spineTheta),
                rMid, rot + reflectLocalTheta(dTheta, spineTheta),
                rMid, rot + reflectLocalTheta(dTheta, midTheta),
                re, rot + reflectLocalTheta(dTheta, midTheta)
            );
        });
    };

    const draw = () => {
        context.lineWidth = 2;
        context.strokeStyle = "black";
        context.lineCap = "round";
        context.lineJoin = "round";

        config.forEach(({ type, rs, re, rMid }) => {
            if (type === 'line') drawLine(rs, re);
            else drawCurve(rs, re, rMid);
        });
    };

    const drawGrid = () => {
        for (let i = 0; i < wedges; i++) {
            const angle = (i / wedges) * 2 * Math.PI;

            context.beginPath();
            context.moveTo(cx, cy);
            context.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
            context.stroke();
        }

        for (let j = 1; j <= layers; j++) {
            const r = (j / layers) * radius;

            context.beginPath();
            context.arc(cx, cy, r, 0, 2 * Math.PI);
            context.stroke();
        }

    };

    const render = () => {
        context.fillStyle = "white";
        context.fillRect(0, 0, width, height);

        draw();
        paint(context);
        draw();
    };

    const tick = () => {
        if (width !== canvas.width || height !== canvas.height) {
            width = canvas.width;
            height = canvas.height;
        }

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
