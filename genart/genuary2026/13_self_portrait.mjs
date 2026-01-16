const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let raf = 0;
let DPR = 1, W = 0, H = 0;

let state = {
    stream: null
};

function clear() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

function render() {
}

function update(t) {
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

async function startCamera() {
    if (state.stream) return;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
        });

        state.stream = stream;
        video.srcObject = stream;
        video.style.display = 'block';

        const isFront = stream.getVideoTracks()[0].getSettings().facingMode === "user";

        video.style.transform = isFront ? "none" : "scaleX(-1)";

        await video.play();
    } catch (e) {
        console.error(e);
        alert('Camera permission or availability failed.');
    }
}

window.addEventListener("resize", resize, { passive: true });

resize();
// if (raf) cancelAnimationFrame(raf);
// raf = requestAnimationFrame(tick);

await startCamera();
