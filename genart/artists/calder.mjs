const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let raf = 0;
let DPR = 1, W = 0, H = 0;
const TAU = Math.PI * 2;
const PALETTE = ["#d84a2b", "#f0c541", "#2f74b5", "#111111", "#e8ecef"];
const LEAF_SHAPES = ["ellipse", "pinched", "blob", "polygon", "petal", "banana"];

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

function polygonArea(points) {
    let sum = 0;

    for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        sum += a.x * b.y - b.x * a.y;
    }

    return Math.abs(sum) * 0.5;
}

function polygonCentroid(points) {
    let crossSum = 0;
    let x = 0;
    let y = 0;

    for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        const cross = a.x * b.y - b.x * a.y;

        crossSum += cross;
        x += (a.x + b.x) * cross;
        y += (a.y + b.y) * cross;
    }

    if (Math.abs(crossSum) < 0.000001) {
        return { x: 0, y: 0 };
    }

    return {
        x: x / (3 * crossSum),
        y: y / (3 * crossSum),
    };
}

function boundingRadius(points) {
    return points.reduce((radius, point) =>
        Math.max(radius, Math.hypot(point.x, point.y))
    , 0);
}

function normalizeShapePoints(points, targetArea) {
    const centroid = polygonCentroid(points);
    const centered = points.map((point) => ({
        x: point.x - centroid.x,
        y: point.y - centroid.y,
    }));
    const area = polygonArea(centered);
    const scale = Math.sqrt(targetArea / Math.max(area, 0.000001));

    return centered.map((point) => ({
        x: point.x * scale,
        y: point.y * scale,
    }));
}

function makeEllipsePoints() {
    const points = [];
    const count = 48;
    const stretch = rand(0.45, 2.35);
    const shear = rand(-0.35, 0.35);

    for (let i = 0; i < count; i++) {
        const t = (i / count) * TAU;
        const x = Math.cos(t) * stretch;
        const y = Math.sin(t) / stretch;

        points.push({ x: x + y * shear, y });
    }

    return points;
}

function makePinchedPoints() {
    const points = [];
    const count = 56;
    const phase = rand(0, TAU);
    const pinch = rand(0.18, 0.42);
    const lobes = randInt(2, 4);

    for (let i = 0; i < count; i++) {
        const t = (i / count) * TAU;
        const p = Math.cos(t - phase);
        const r = 1 + 0.1 * Math.sin(lobes * t + phase) - pinch * p * p;

        points.push({
            x: Math.cos(t) * r,
            y: Math.sin(t) * r,
        });
    }

    return points;
}

function makeBlobPoints() {
    const points = [];
    const count = 44;
    const phaseA = rand(0, TAU);
    const phaseB = rand(0, TAU);

    for (let i = 0; i < count; i++) {
        const t = (i / count) * TAU;
        const r = 1
            + 0.18 * Math.sin(3 * t + phaseA)
            + 0.1 * Math.sin(5 * t + phaseB);

        points.push({
            x: Math.cos(t) * r,
            y: Math.sin(t) * r,
        });
    }

    return points;
}

function makeRoundedPolygonPoints() {
    const sides = randInt(3, 7);
    const anchors = Array.from({ length: sides }, (_, i) => {
        const t = (i / sides) * TAU + rand(-0.08, 0.08);
        const r = rand(0.75, 1.18);

        return {
            x: Math.cos(t) * r,
            y: Math.sin(t) * r,
        };
    });
    const points = [];

    for (let i = 0; i < anchors.length; i++) {
        const p0 = anchors[(i - 1 + anchors.length) % anchors.length];
        const p1 = anchors[i];
        const p2 = anchors[(i + 1) % anchors.length];
        const p3 = anchors[(i + 2) % anchors.length];

        for (let j = 0; j < 8; j++) {
            const t = j / 8;
            const t2 = t * t;
            const t3 = t2 * t;

            points.push({
                x: 0.5 * (
                    2 * p1.x
                    + (-p0.x + p2.x) * t
                    + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2
                    + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
                ),
                y: 0.5 * (
                    2 * p1.y
                    + (-p0.y + p2.y) * t
                    + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2
                    + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
                ),
            });
        }
    }

    return points;
}

function makePetalPoints() {
    const points = [];
    const count = 72;
    const lobes = randInt(3, 5);
    const phase = rand(0, TAU);
    const wobble = rand(0.04, 0.12);

    for (let i = 0; i < count; i++) {
        const t = (i / count) * TAU;
        const r = 1
            + 0.22 * Math.sin(lobes * t + phase)
            + wobble * Math.sin((lobes + 2) * t - phase);

        points.push({
            x: Math.cos(t) * r,
            y: Math.sin(t) * r,
        });
    }

    return points;
}

function makeBananaPoints() {
    const top = [];
    const bottom = [];
    const count = 28;

    for (let i = 0; i < count; i++) {
        const u = i / (count - 1);
        const t = -1.18 + u * 2.36;
        const center = {
            x: Math.sin(t) * 1.12,
            y: -Math.cos(t) * 0.55,
        };
        const tangent = {
            x: Math.cos(t) * 1.12,
            y: Math.sin(t) * 0.55,
        };
        const len = Math.hypot(tangent.x, tangent.y) || 1;
        const normal = {
            x: -tangent.y / len,
            y: tangent.x / len,
        };
        const taper = Math.sin(u * Math.PI);
        const width = 0.08 + 0.28 * taper;

        top.push({
            x: center.x + normal.x * width,
            y: center.y + normal.y * width,
        });
        bottom.push({
            x: center.x - normal.x * width * 0.58,
            y: center.y - normal.y * width * 0.58,
        });
    }

    return top.concat(bottom.reverse());
}

function makeBaseShapePoints(kind) {
    if (kind === "ellipse") return makeEllipsePoints();
    if (kind === "pinched") return makePinchedPoints();
    if (kind === "blob") return makeBlobPoints();
    if (kind === "polygon") return makeRoundedPolygonPoints();
    if (kind === "petal") return makePetalPoints();
    return makeBananaPoints();
}

function sampleClosedPoints(points, count) {
    return Array.from({ length: count }, (_, i) => {
        const position = (i / count) * points.length;
        const index = Math.floor(position);
        const nextIndex = (index + 1) % points.length;
        const t = position - index;
        const a = points[index];
        const b = points[nextIndex];

        return {
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
        };
    });
}

function lerpPoints(a, b, t) {
    return a.map((point, i) => ({
        x: point.x + (b[i].x - point.x) * t,
        y: point.y + (b[i].y - point.y) * t,
    }));
}

function hexToRgb(hex) {
    const value = Number.parseInt(hex.slice(1), 16);

    return {
        r: (value >> 16) & 255,
        g: (value >> 8) & 255,
        b: value & 255,
    };
}

function mixColor(a, b, t) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    const r = Math.round(ca.r + (cb.r - ca.r) * t);
    const g = Math.round(ca.g + (cb.g - ca.g) * t);
    const blue = Math.round(ca.b + (cb.b - ca.b) * t);

    return `rgb(${r}, ${g}, ${blue})`;
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

function makeLeafShape(angle, torque, index, size, colorOffset, forcedKind = null) {
    const minRadius = Math.max(0.004, size * 0.025);
    const maxRadius = Math.max(minRadius + Math.max(0.004, size * 0.015), size * 0.18);
    const targetRadius = randomRadius(minRadius, maxRadius);
    const area = Math.PI * targetRadius * targetRadius;
    const shape = forcedKind || LEAF_SHAPES[randInt(0, LEAF_SHAPES.length - 1)];
    const points = normalizeShapePoints(makeBaseShapePoints(shape), area);

    return {
        type: "shape",
        shape,
        angle,
        radius: boundingRadius(points),
        targetRadius,
        area,
        weight: area,
        torque,
        rodLength: 0,
        x: 0,
        y: 0,
        rotation: rand(0, TAU),
        points,
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

function makeFallbackShapeEndpoints(count, size, colorOffset) {
    const targetRadius = Math.max(0.004, size * 0.025);
    const start = rand(0, TAU);
    const items = Array.from({ length: count }, (_, i) => {
        const angle = normalizeAngle(start + (i / count) * TAU);
        const area = Math.PI * targetRadius * targetRadius;
        const points = normalizeShapePoints(makeBaseShapePoints("ellipse"), area);

        return {
            type: "shape",
            shape: "ellipse",
            angle,
            radius: boundingRadius(points),
            targetRadius,
            area,
            weight: area,
            torque: 1,
            rodLength: 0,
            x: 0,
            y: 0,
            rotation: rand(0, TAU),
            points,
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
    return item.type === "mobile"
        ? Math.max(0.5, item.size * 0.018)
        : item.radius;
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
    if (item.type === "shape") {
        return 0;
    }

    if (item.type === "spine") {
        return 1;
    }

    return 1 + Math.max(...item.children.map(mobileDepth));
}

function mobileAngularVelocity(size) {
    const minSpeed = Math.max(0.0008, Math.min(0.006, 0.75 / Math.max(120, size)));
    const maxSpeed = Math.min(0.014, minSpeed * 2.4);

    return randomAngularVelocity(minSpeed, maxSpeed);
}

function chooseDistinctShapeKinds() {
    const left = LEAF_SHAPES[randInt(0, LEAF_SHAPES.length - 1)];
    let right = left;

    while (right === left) {
        right = LEAF_SHAPES[randInt(0, LEAF_SHAPES.length - 1)];
    }

    return { left, right };
}

function makeSpineShape(index, count, leftPoints, rightPoints, ends) {
    const t = count === 1 ? 0 : index / (count - 1);
    const targetRadius = ends.leftRadius + (ends.rightRadius - ends.leftRadius) * t;
    const area = Math.PI * targetRadius * targetRadius;
    const points = normalizeShapePoints(lerpPoints(leftPoints, rightPoints, t), area);

    return {
        type: "shape",
        shape: "spine-morph",
        morphT: t,
        angle: 0,
        radius: boundingRadius(points),
        targetRadius,
        area,
        weight: area,
        torque: 0,
        rodLength: 0,
        x: 0,
        y: 0,
        rotation: rand(-0.3, 0.3),
        points,
        color: mixColor(ends.leftColor, ends.rightColor, t),
    };
}

function spineCurveY(t, curveDepth) {
    return 4 * curveDepth * t * (1 - t);
}

function spineRadius(shapes, rodPoints) {
    const rodRadius = rodPoints.reduce((radius, point) =>
        Math.max(radius, Math.hypot(point.x, point.y))
    , 0);

    return shapes.reduce((radius, shape) =>
        Math.max(radius, Math.hypot(shape.x, shape.y) + shape.radius)
    , rodRadius);
}

function makeSpineNode(size, colorOffset = 0) {
    const count = randInt(3, 7);
    const length = size * rand(0.5, 0.9);
    const spacing = count === 1 ? 0 : length / (count - 1);
    const curveDepth = length * rand(0.015, 0.045) * (Math.random() < 0.5 ? -1 : 1);
    const { left, right } = chooseDistinctShapeKinds();
    const pointCount = 72;
    const leftPoints = sampleClosedPoints(normalizeShapePoints(makeBaseShapePoints(left), 1), pointCount);
    const rightPoints = sampleClosedPoints(normalizeShapePoints(makeBaseShapePoints(right), 1), pointCount);
    const minRadius = Math.max(0.004, size * 0.035);
    const maxRadius = Math.max(minRadius + Math.max(0.004, size * 0.012), size * 0.13);
    const leftColor = PALETTE[colorOffset % PALETTE.length];
    const rightColor = PALETTE[(colorOffset + randInt(1, PALETTE.length - 1)) % PALETTE.length];
    const ends = {
        leftRadius: randomRadius(minRadius, maxRadius),
        rightRadius: randomRadius(minRadius, maxRadius),
        leftColor,
        rightColor,
    };
    const shapes = Array.from({ length: count }, (_, i) =>
        makeSpineShape(i, count, leftPoints, rightPoints, ends)
    );

    for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i];
        const t = count === 1 ? 0 : i / (count - 1);
        const slope = (4 * curveDepth * (1 - 2 * t)) / length;

        shape.x = i * spacing;
        shape.y = spineCurveY(t, curveDepth);
        shape.rotation = Math.atan(slope) + rand(-0.18, 0.18);
    }

    const weight = sumWeights(shapes);
    const balanceX = shapes.reduce((sum, shape) =>
        sum + shape.weight * shape.x
    , 0) / weight;
    const balanceT = length === 0 ? 0 : balanceX / length;
    const balanceY = spineCurveY(balanceT, curveDepth);

    for (const shape of shapes) {
        shape.x -= balanceX;
        shape.y -= balanceY;
    }

    const rodStart = {
        x: -balanceX,
        y: -balanceY,
    };
    const rodControl = {
        x: length * 0.5 - balanceX,
        y: curveDepth * 2 - balanceY,
    };
    const rodEnd = {
        x: length - balanceX,
        y: -balanceY,
    };

    return {
        type: "spine",
        levels: 1,
        size,
        rotation: 0,
        angularVelocity: mobileAngularVelocity(size),
        children: shapes,
        weight,
        radius: spineRadius(shapes, [rodStart, rodControl, rodEnd]),
        balance: {
            x: shapes.reduce((sum, shape) => sum + shape.weight * shape.x, 0),
            y: shapes.reduce((sum, shape) => sum + shape.weight * shape.y, 0),
        },
        rodStart,
        rodControl,
        rodEnd,
        leftShape: left,
        rightShape: right,
        angle: 0,
        torque: 0,
        rodLength: 0,
        x: 0,
        y: 0,
    };
}

function branchChance(levels) {
    return levels > 3 ? 0.4 : 0.32;
}

function makeEndpoint(levels, size, childSize, index, colorOffset, forceDepth) {
    if (levels > 1 && (forceDepth || Math.random() < branchChance(levels))) {
        return makeMobileNode(levels - 1, childSize, colorOffset + index * 3, forceDepth);
    }

    return makeLeafShape(0, 0, index, levels === 1 ? size : childSize, colorOffset);
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

    return makeFallbackShapeEndpoints(count, size, colorOffset);
}

function shouldMakeSpine(levels, forceDepth) {
    if (forceDepth && levels > 1) {
        return false;
    }

    return Math.random() < (levels === 1 ? 0.5 : 0.34);
}

function makeMobileNode(levels, size, colorOffset = 0, forceDepth = false) {
    if (shouldMakeSpine(levels, forceDepth)) {
        return makeSpineNode(size, colorOffset);
    }

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

function renderShape(shape) {
    ctx.save();
    ctx.translate(shape.x, shape.y);
    ctx.rotate(shape.rotation);
    ctx.fillStyle = shape.color;
    ctx.beginPath();

    for (let i = 0; i < shape.points.length; i++) {
        const point = shape.points[i];

        if (i === 0) {
            ctx.moveTo(point.x, point.y);
        } else {
            ctx.lineTo(point.x, point.y);
        }
    }

    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function renderSubmobile(node, isRoot = false) {
    if (node.type === "spine") {
        renderSpine(node, isRoot);
    } else {
        renderMobile(node, isRoot);
    }
}

function renderSpine(spine, isRoot = false) {
    ctx.save();

    if (isRoot) {
        ctx.translate(state.cx, state.cy);
    } else {
        ctx.translate(spine.x, spine.y);
    }

    ctx.rotate(spine.rotation);
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";
    ctx.lineWidth = Math.max(0.7, Math.min(3, spine.size * 0.014));

    ctx.beginPath();
    ctx.moveTo(spine.rodStart.x, spine.rodStart.y);
    ctx.quadraticCurveTo(
        spine.rodControl.x,
        spine.rodControl.y,
        spine.rodEnd.x,
        spine.rodEnd.y
    );
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(1.2, Math.min(4, spine.size * 0.018)), 0, TAU);
    ctx.fill();

    ctx.strokeStyle = "black";

    for (const shape of spine.children) {
        renderShape(shape);
    }

    ctx.restore();
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
        if (child.type === "mobile" || child.type === "spine") {
            renderSubmobile(child);
        } else {
            renderShape(child);
        }
    }

    ctx.restore();
}

function render() {
    if (state.root) {
        renderSubmobile(state.root, true);
    }
}

function updateSubmobile(node) {
    node.rotation += node.angularVelocity;

    for (const child of node.children) {
        if (child.type === "mobile" || child.type === "spine") {
            updateSubmobile(child);
        }
    }
}

function update(t) {
    if (state.root) {
        updateSubmobile(state.root);
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
canvas.addEventListener("click", init);

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
