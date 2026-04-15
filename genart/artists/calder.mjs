const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let raf = 0;
let DPR = 1, W = 0, H = 0;
const TAU = Math.PI * 2;
const PALETTE = ["#d84a2b", "#f0c541", "#2f74b5", "#111111", "#e8ecef"];

let state = {
    cx: 0,
    cy: 0,
    levels: 0,
    root: null,
};

function rand(min, max) {
    return min + Math.random() * (max - min);
}

function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
}

function randomRadius(min, max) {
    return min + Math.pow(Math.random(), 1.8) * (max - min);
}

function randomAngularVelocity(min, max) {
    return rand(min, max) * (Math.random() < 0.5 ? -1 : 1);
}

function normalizeAngle(angle) {
    return ((angle % TAU) + TAU) % TAU;
}

function sortAngles(angles) {
    return angles
        .map((angle, index) => ({ angle: normalizeAngle(angle), index }))
        .sort((a, b) => a.angle - b.angle);
}

function largestAngleGap(sortedAngles) {
    let maxGap = 0;

    for (let i = 0; i < sortedAngles.length; i++) {
        const current = sortedAngles[i].angle;
        const next = sortedAngles[(i + 1) % sortedAngles.length].angle;
        const gap = normalizeAngle(next - current);
        maxGap = Math.max(maxGap, gap);
    }

    return maxGap;
}

function makeBalancedAngles(count) {
    if (count === 2) {
        const angle = rand(0, TAU);
        return [angle, normalizeAngle(angle + Math.PI)];
    }

    for (let attempt = 0; attempt < 1000; attempt++) {
        const angles = Array.from({ length: count }, () => rand(0, TAU));
        const sortedAngles = sortAngles(angles);

        if (largestAngleGap(sortedAngles) < Math.PI * 0.98) {
            return angles;
        }
    }

    const start = rand(0, TAU);
    return Array.from({ length: count }, (_, i) =>
        normalizeAngle(start + (i / count) * TAU + rand(-0.25, 0.25))
    );
}

function addTripleTorques(torques, angles, indexes) {
    const triple = indexes
        .map((index) => ({ angle: normalizeAngle(angles[index]), index }))
        .sort((a, b) => a.angle - b.angle);
    const ab = normalizeAngle(triple[1].angle - triple[0].angle);
    const bc = normalizeAngle(triple[2].angle - triple[1].angle);
    const ca = normalizeAngle(triple[0].angle + TAU - triple[2].angle);

    if (ab >= Math.PI || bc >= Math.PI || ca >= Math.PI) {
        return;
    }

    const scale = rand(0.65, 1.35);
    torques[triple[0].index] += Math.sin(bc) * scale;
    torques[triple[1].index] += Math.sin(ca) * scale;
    torques[triple[2].index] += Math.sin(ab) * scale;
}

function makeBalancedTorques(angles) {
    const count = angles.length;

    if (count === 2) {
        return [1, 1];
    }

    const torques = Array(count).fill(0);

    for (let a = 0; a < count - 2; a++) {
        for (let b = a + 1; b < count - 1; b++) {
            for (let c = b + 1; c < count; c++) {
                addTripleTorques(torques, angles, [a, b, c]);
            }
        }
    }

    return torques.every((torque) => torque > 0.0001) ? torques : null;
}

function makeMobileAnglesAndTorques(count) {
    for (let attempt = 0; attempt < 100; attempt++) {
        const angles = makeBalancedAngles(count);
        const torques = makeBalancedTorques(angles);

        if (torques) {
            return { angles, torques };
        }
    }

    const start = rand(0, TAU);

    return {
        angles: Array.from({ length: count }, (_, i) =>
            normalizeAngle(start + (i / count) * TAU)
        ),
        torques: Array(count).fill(1),
    };
}

function makeCircle(angle, torque, index, size, colorOffset) {
    const minRadius = Math.max(0.004, size * 0.025);
    const maxRadius = Math.max(minRadius + Math.max(0.004, size * 0.015), size * 0.18);
    const radius = randomRadius(minRadius, maxRadius);
    const area = Math.PI * radius * radius;

    return {
        type: "circle",
        angle,
        radius,
        area,
        weight: area,
        torque,
        rodLength: 0,
        x: 0,
        y: 0,
        color: PALETTE[(colorOffset + index) % PALETTE.length],
    };
}

function calculateRodScale(items, rawLengths, size) {
    const padding = Math.max(0.002, size * 0.006);
    const minRodLength = Math.max(0.005, size * 0.05);
    const maxReach = size * 0.48;
    const maxRawLength = Math.max(...rawLengths);
    let minScale = 0;
    let maxScale = Infinity;

    for (let i = 0; i < items.length; i++) {
        const minLength = Math.max(minRodLength, items[i].radius + padding);
        const maxLength = maxReach - items[i].radius;

        if (rawLengths[i] <= 0 || maxLength <= 0) {
            return null;
        }

        minScale = Math.max(minScale, minLength / rawLengths[i]);
        maxScale = Math.min(maxScale, maxLength / rawLengths[i]);
    }

    for (let i = 0; i < items.length - 1; i++) {
        for (let j = i + 1; j < items.length; j++) {
            const ax = Math.cos(items[i].angle) * rawLengths[i];
            const ay = Math.sin(items[i].angle) * rawLengths[i];
            const bx = Math.cos(items[j].angle) * rawLengths[j];
            const by = Math.sin(items[j].angle) * rawLengths[j];
            const rawSeparation = Math.hypot(ax - bx, ay - by);

            if (rawSeparation <= 0.000001) {
                return null;
            }

            minScale = Math.max(
                minScale,
                (items[i].radius + items[j].radius + padding) / rawSeparation
            );
        }
    }

    if (maxScale <= 0 || minScale > maxScale) {
        return null;
    }

    return Math.max(minScale, Math.min((size * 0.34) / maxRawLength, maxScale));
}

function placeItems(items, rodScale) {
    for (const item of items) {
        item.rodLength = (item.torque / item.weight) * rodScale;
        item.x = Math.cos(item.angle) * item.rodLength;
        item.y = Math.sin(item.angle) * item.rodLength;
    }
}

function makeFallbackCircleEndpoints(count, size, colorOffset) {
    const radius = Math.max(0.004, size * 0.025);
    const start = rand(0, TAU);
    const items = Array.from({ length: count }, (_, i) => {
        const angle = normalizeAngle(start + (i / count) * TAU);
        const area = Math.PI * radius * radius;

        return {
            type: "circle",
            angle,
            radius,
            area,
            weight: area,
            torque: 1,
            rodLength: 0,
            x: 0,
            y: 0,
            color: PALETTE[(colorOffset + i) % PALETTE.length],
        };
    });
    const rawLengths = items.map((item) => item.torque / item.weight);
    const rodScale = calculateRodScale(items, rawLengths, size);

    if (rodScale !== null) {
        placeItems(items, rodScale);
    } else {
        const rodLength = size * 0.3;

        for (const item of items) {
            item.rodLength = rodLength;
            item.x = Math.cos(item.angle) * rodLength;
            item.y = Math.sin(item.angle) * rodLength;
        }
    }

    return items;
}

function sumWeights(items) {
    return items.reduce((total, item) => total + item.weight, 0);
}

function endpointRadius(item) {
    return item.type === "circle"
        ? item.radius
        : Math.max(0.5, item.size * 0.018);
}

function mobileRadius(items) {
    return items.reduce((radius, item) =>
        Math.max(radius, Math.hypot(item.x, item.y) + endpointRadius(item))
    , 0);
}

function balanceFor(items) {
    return items.reduce((sum, item) => {
        sum.x += item.weight * item.x;
        sum.y += item.weight * item.y;
        return sum;
    }, { x: 0, y: 0 });
}

function mobileDepth(item) {
    if (item.type === "circle") {
        return 0;
    }

    return 1 + Math.max(...item.children.map(mobileDepth));
}

function mobileAngularVelocity(size) {
    const minSpeed = Math.max(0.0008, Math.min(0.006, 0.75 / Math.max(120, size)));
    const maxSpeed = Math.min(0.014, minSpeed * 2.4);

    return randomAngularVelocity(minSpeed, maxSpeed);
}

function branchChance(levels) {
    return levels > 3 ? 0.4 : 0.32;
}

function makeEndpoint(levels, size, childSize, index, colorOffset, forceDepth) {
    if (levels > 1 && (forceDepth || Math.random() < branchChance(levels))) {
        return makeMobileNode(levels - 1, childSize, colorOffset + index * 3, forceDepth);
    }

    return makeCircle(0, 0, index, levels === 1 ? size : childSize, colorOffset);
}

function makeMobileEndpoints(count, levels, size, colorOffset, forceDepth) {
    const childSize = size * Math.max(0.3, 0.52 - count * 0.035);

    for (let sizeAttempt = 0; sizeAttempt < 5; sizeAttempt++) {
        const shrink = 1 - sizeAttempt * 0.14;
        const forcedIndex = forceDepth && levels > 1 ? randInt(0, count - 1) : -1;
        const items = Array.from({ length: count }, (_, i) =>
            makeEndpoint(
                levels,
                size,
                childSize * shrink * rand(0.82, 1.08),
                i,
                colorOffset,
                i === forcedIndex
            )
        );

        for (let attempt = 0; attempt < 80; attempt++) {
            const { angles, torques } = makeMobileAnglesAndTorques(count);

            for (let i = 0; i < items.length; i++) {
                items[i].angle = angles[i];
                items[i].torque = torques[i];
            }

            const rawLengths = items.map((item) => item.torque / item.weight);
            const rodScale = calculateRodScale(items, rawLengths, size);

            if (rodScale !== null) {
                placeItems(items, rodScale);
                return items;
            }
        }
    }

    for (let fallbackAttempt = 0; fallbackAttempt < 6; fallbackAttempt++) {
        const start = rand(0, TAU);
        const forcedIndex = forceDepth && levels > 1 ? randInt(0, count - 1) : -1;
        const shrink = 0.52 * Math.pow(0.72, fallbackAttempt);
        const items = Array.from({ length: count }, (_, i) => {
            const item = makeEndpoint(
                levels,
                size,
                childSize * shrink,
                i,
                colorOffset,
                i === forcedIndex
            );

            item.angle = normalizeAngle(start + (i / count) * TAU);
            item.torque = 1;
            return item;
        });
        const rawLengths = items.map((item) => item.torque / item.weight);
        const rodScale = calculateRodScale(items, rawLengths, size);

        if (rodScale !== null) {
            placeItems(items, rodScale);
            return items;
        }
    }

    return makeFallbackCircleEndpoints(count, size, colorOffset);
}

function makeMobileNode(levels, size, colorOffset = 0, forceDepth = false) {
    const count = randInt(2, 5);
    const children = makeMobileEndpoints(count, levels, size, colorOffset, forceDepth);

    return {
        type: "mobile",
        levels,
        size,
        rotation: 0,
        angularVelocity: mobileAngularVelocity(size),
        children,
        weight: sumWeights(children),
        radius: mobileRadius(children),
        balance: balanceFor(children),
        angle: 0,
        torque: 0,
        rodLength: 0,
        x: 0,
        y: 0,
    };
}

function init() {
    state.cx = W * 0.5;
    state.cy = H * 0.5;

    const size = Math.min(W, H);
    const levels = randInt(2, 5);

    for (let attempt = 0; attempt < 20; attempt++) {
        state.root = makeMobileNode(levels, size, 0, true);

        if (mobileDepth(state.root) === levels) {
            break;
        }
    }

    state.levels = levels;
}

function clear() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

function renderCircle(circle) {
    ctx.fillStyle = circle.color;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, TAU);
    ctx.fill();
    ctx.stroke();
}

function renderMobile(mobile, isRoot = false) {
    ctx.save();

    if (isRoot) {
        ctx.translate(state.cx, state.cy);
    } else {
        ctx.translate(mobile.x, mobile.y);
    }

    ctx.rotate(mobile.rotation);

    ctx.lineCap = "round";
    ctx.strokeStyle = "black";
    ctx.lineWidth = Math.max(0.7, Math.min(3, mobile.size * 0.014));

    for (const child of mobile.children) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(child.x, child.y);
        ctx.stroke();
    }

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(1.2, Math.min(4, mobile.size * 0.018)), 0, TAU);
    ctx.fill();

    ctx.strokeStyle = "black";

    for (const child of mobile.children) {
        if (child.type === "mobile") {
            renderMobile(child);
        } else {
            renderCircle(child);
        }
    }

    ctx.restore();
}

function render() {
    if (state.root) {
        renderMobile(state.root, true);
    }
}

function updateMobile(mobile) {
    mobile.rotation += mobile.angularVelocity;

    for (const child of mobile.children) {
        if (child.type === "mobile") {
            updateMobile(child);
        }
    }
}

function update(t) {
    if (state.root) {
        updateMobile(state.root);
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

    init();
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
