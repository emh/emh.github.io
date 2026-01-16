const video = document.getElementById("video");
const sourceCanvas = document.createElement("canvas");
const sourceCtx = sourceCanvas.getContext("2d");
const workCanvas = document.createElement("canvas");
const workCtx = workCanvas.getContext("2d", { willReadFrequently: true });
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

let DPR = 1, W = 0, H = 0;

const STAMP_SIZE = 16;
const STAMP_ALPHA = 0.10;
const MAX_ITERS = 150000;
const ITERS_PER_FRAME = 100;
const SAMPLE_STEP = 2;

let sourceData = null;
let workImg = null;
let workData = null;
let running = false;
let iter = 0;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

let PALETTE = makeRandomPalette();

function makeRandomPalette() {
    const out = [
        [0, 0, 0],
        [255, 255, 255],
    ];

    const base = Math.random() * 360;
    const step = 137.50776405003785; // golden angle

    const sat = randRange(65, 95);     // %
    const light = randRange(45, 65);   // %
    const jitterH = 12;                // degrees
    const jitterSL = 8;                // %

    for (let i = 0; i < 6; i++) {
        const h = (base + i * step + randRange(-jitterH, jitterH) + 360) % 360;
        const s = clamp(sat + randRange(-jitterSL, jitterSL), 40, 100);
        const l = clamp(light + randRange(-jitterSL, jitterSL), 25, 80);

        out.push(hslToRgb255(h, s, l));
    }

    return out;
}

function randRange(a, b) {
    return a + Math.random() * (b - a);
}

// h in [0,360), s,l in [0,100]
function hslToRgb255(h, s, l) {
    s /= 100; l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hh = h / 60;
    const x = c * (1 - Math.abs((hh % 2) - 1));
    let r = 0, g = 0, b = 0;

    if (0 <= hh && hh < 1) { r = c; g = x; b = 0; }
    else if (1 <= hh && hh < 2) { r = x; g = c; b = 0; }
    else if (2 <= hh && hh < 3) { r = 0; g = c; b = x; }
    else if (3 <= hh && hh < 4) { r = 0; g = x; b = c; }
    else if (4 <= hh && hh < 5) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    const m = l - c / 2;

    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255),
    ];
}

function initWorkBuffer() {
    workCanvas.width = W;
    workCanvas.height = H;
    workCtx.setTransform(1, 0, 0, 1, 0, 0);
    workCtx.imageSmoothingEnabled = false;

    workCtx.clearRect(0, 0, W, H);
    workCtx.fillStyle = "rgb(255,255,255)";
    workCtx.fillRect(0, 0, W, H);

    workImg = workCtx.getImageData(0, 0, W, H);
    workData = workImg.data;

    iter = 0;
}

function render() {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(workCanvas, 0, 0);
    ctx.restore();
}

function regionErrorIfColor(x0, y0, w, h, rgb) {
    const [sr, sg, sb] = rgb;
    const a = STAMP_ALPHA;

    let err = 0;

    const x1 = x0 + w;
    const y1 = y0 + h;

    for (let y = y0; y < y1; y += SAMPLE_STEP) {
        const row = y * W;
        for (let x = x0; x < x1; x += SAMPLE_STEP) {
            const i = (row + x) * 4;

            const srcR = sourceData[i];
            const srcG = sourceData[i + 1];
            const srcB = sourceData[i + 2];

            const curR = workData[i];
            const curG = workData[i + 1];
            const curB = workData[i + 2];

            const nxtR = curR + a * (sr - curR);
            const nxtG = curG + a * (sg - curG);
            const nxtB = curB + a * (sb - curB);

            const dR = srcR - nxtR;
            const dG = srcG - nxtG;
            const dB = srcB - nxtB;

            err += dR * dR + dG * dG + dB * dB;
        }
    }

    return err;
}

function applyStamp(x0, y0, w, h, rgb) {
    const [sr, sg, sb] = rgb;
    const a = STAMP_ALPHA;

    const x1 = x0 + w;
    const y1 = y0 + h;

    for (let y = y0; y < y1; y++) {
        const row = y * W;

        for (let x = x0; x < x1; x++) {
            const i = (row + x) * 4;

            workData[i] = workData[i] + a * (sr - workData[i]);
            workData[i + 1] = workData[i + 1] + a * (sg - workData[i + 1]);
            workData[i + 2] = workData[i + 2] + a * (sb - workData[i + 2]);
        }
    }
}

function stepOnce() {
    const w = STAMP_SIZE;
    const h = STAMP_SIZE;
    const x0 = (Math.random() * (W - w)) | 0;
    const y0 = (Math.random() * (H - h)) | 0;

    let best = 0;
    let bestErr = Infinity;

    for (let p = 0; p < PALETTE.length; p++) {
        const e = regionErrorIfColor(x0, y0, w, h, PALETTE[p]);

        if (e < bestErr) {
            bestErr = e;
            best = p;
        }
    }

    applyStamp(x0, y0, w, h, PALETTE[best]);
}

function loop() {
    if (!running) return;

    const target = Math.min(MAX_ITERS, iter + ITERS_PER_FRAME);

    while (iter < target) {
        stepOnce();
        iter++;
    }

    workCtx.putImageData(workImg, 0, 0);

    render();

    if (iter >= MAX_ITERS) {
        running = false;
        return;
    }

    requestAnimationFrame(loop);
}

function resize() {
    DPR = Math.max(1, window.devicePixelRatio || 1);
    W = Math.floor(window.innerWidth);
    H = Math.floor(window.innerHeight);

    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.imageSmoothingEnabled = false;

    sourceCanvas.width = W;
    sourceCanvas.height = H;
    sourceCtx.imageSmoothingEnabled = true;

    workCanvas.width = W;
    workCanvas.height = H;
    workCtx.imageSmoothingEnabled = false;
}

window.addEventListener('pointerdown', () => {
    captureFrame();
    stopCamera();

    canvas.style.display = 'block';

    initWorkBuffer();
    running = true;

    loop();
}, { once: true });

let stream = null;

async function startCamera() {
    if (stream) return;

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
        });

        video.srcObject = stream;
        video.style.display = 'block';
        video.style.transform = "scaleX(-1)";

        await video.play();
    } catch (e) {
        console.error(e);
        alert('Camera permission or availability failed.');
    }
}

function stopCamera() {
    if (!stream) return;

    for (const t of stream.getTracks()) t.stop();

    stream = null;
    video.srcObject = null;
    video.style.display = 'none';
}

function captureFrame() {
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const scale = Math.max(sourceCanvas.width / vw, sourceCanvas.height / vh);
    const srcW = sourceCanvas.width / scale;
    const srcH = sourceCanvas.height / scale;
    const srcX = (vw - srcW) / 2;
    const srcY = (vh - srcH) / 2;

    sourceCtx.save();
    sourceCtx.setTransform(1, 0, 0, 1, 0, 0);
    sourceCtx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);

    sourceCtx.translate(sourceCanvas.width, 0);
    sourceCtx.scale(-1, 1);

    sourceCtx.drawImage(
        video,
        srcX, srcY, srcW, srcH,
        0, 0, sourceCanvas.width, sourceCanvas.height
    );

    const img = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

    sourceData = img.data;

    sourceCtx.restore();
}

resize();

await startCamera();
