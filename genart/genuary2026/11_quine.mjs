import * as acorn from "acorn";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const res = await fetch(import.meta.url, { cache: "no-store" });
const src = await res.text();
const ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" });

const PLAYBACK_T = 10_000; // ms
const FN_NONE = 0xffff;
const NONE = 0xffff;

const PROFILE = {
    enabled: true,
    depth: 0,
    data: [],
    firstTickDone: false
};

function instrument(name, fn) {
    return function (...args) {
        if (!PROFILE.enabled) return fn.apply(this, args);

        const depth = PROFILE.depth++;
        const t0 = performance.now();

        try {
            return fn.apply(this, args);
        } finally {
            const t1 = performance.now();

            PROFILE.data.push({ name, dt: t1 - t0, depth, t0, t1 });
            PROFILE.depth--;
        }
    };
}

const candFor = instrument("candFor", (N, aStar) => {
    const cols = Math.ceil(aStar);
    const rows = Math.ceil(N / cols);

    return { rows, cols };
});

const scorer = instrument("scorer", (target, N) => ({ n, m }) => {
    const waste = n * m - N;
    const ratioErr = Math.abs(n / m - target);
    return [waste, ratioErr];
});

const gridFor = instrument("gridFor", (N, w, h) => {
    const r = w / h;
    const nStar = Math.sqrt(N * r);
    const mStar = Math.sqrt(N / r);

    const cand = [
        candFor(N, nStar),
        candFor(N, mStar)
    ];

    const score = scorer(r, N);

    cand.sort((a, b) => {
        const [wa, ra] = score(a);
        const [wb, rb] = score(b);

        return wa !== wb ? wa - wb : ra - rb;
    });

    return cand[0];
});

const SKIP_KEYS = ["type", "start", "end", "loc", "range"];

const isNode = instrument("isNode", (n) => n && typeof n.type === "string" && typeof n.start === "number" && typeof n.end === "number");

const keyToName = instrument("keyToName", (key) => {
    if (!key) return null;
    if (key.type === "Identifier") return key.name;
    if (key.type === "Literal") return String(key.value);
    return null;
});

const memberExprToName = instrument("memberExprToName", (me) => {
    if (!me) return null;
    if (me.type !== "MemberExpression") return null;

    const obj =
        me.object?.type === "Identifier" ? me.object.name :
            me.object?.type === "ThisExpression" ? "this" :
                null;

    if (!obj) return null;

    const prop = me.computed ? keyToName(me.property) : keyToName(me.property);

    if (!prop) return null;

    return `${obj}.${prop}`;
});

const resolveFunctionName = instrument("resolveFunctionName", (node, parent, grandparent) => {
    // FunctionDeclaration: function foo() {}
    if (node.type === "FunctionDeclaration") {
        return node.id?.name ?? null;
    }

    // Named function expression: const x = function y() {}
    if (node.type === "FunctionExpression" && node.id?.name) {
        return node.id.name;
    }

    // 1) instrument("name", fn) pattern
    // fn node is typically parent.arguments[1]
    if (parent?.type === "CallExpression") {
        const callee = parent.callee;
        const isInstrument =
            (callee?.type === "Identifier" && callee.name === "instrument");

        if (isInstrument) {
            const a0 = parent.arguments?.[0];
            if (a0?.type === "Literal" && typeof a0.value === "string") return a0.value;
        }
    }

    // 2) Normal direct cases
    if (parent?.type === "VariableDeclarator" && parent.id?.type === "Identifier") {
        return parent.id.name;
    }

    if (parent?.type === "AssignmentExpression") {
        if (parent.left?.type === "Identifier") return parent.left.name;
        if (parent.left?.type === "MemberExpression") return memberExprToName(parent.left);
    }

    if (parent?.type === "Property") {
        if (parent.key) return keyToName(parent.key);
    }

    if (parent?.type === "MethodDefinition") {
        const method = parent.key ? keyToName(parent.key) : null;
        const cls = parent.__className ?? null;
        return cls && method ? `${cls}.${method}` : method;
    }

    if (parent?.type === "ExportDefaultDeclaration") return "default";

    // 3) Wrapped cases via grandparent:
    // const foo = instrument("foo", fn)
    // fn parent is CallExpression, grandparent is VariableDeclarator / AssignmentExpression / Property
    if (grandparent?.type === "VariableDeclarator" && grandparent.id?.type === "Identifier") {
        return grandparent.id.name;
    }

    if (grandparent?.type === "AssignmentExpression") {
        if (grandparent.left?.type === "Identifier") return grandparent.left.name;
        if (grandparent.left?.type === "MemberExpression") return memberExprToName(grandparent.left);
    }

    if (grandparent?.type === "Property") {
        if (grandparent.key) return keyToName(grandparent.key);
    }

    return null;
});

const collectFunctionRanges = instrument("collectFunctionRanges", (ast) => {
    const map = new Map();
    const seen = new Set();

    const push = (name, node) => {
        if (!name) return;
        if (!map.has(name)) map.set(name, []);
        map.get(name).push({ start: node.start, end: node.end, kind: node.type });
    };

    const walk = (node, parent, grandparent, className) => {
        if (!node || typeof node !== "object") return;

        if (Array.isArray(node)) {
            for (const el of node) walk(el, parent, grandparent, className);
            return;
        }

        if (!isNode(node)) return;
        if (seen.has(node)) return;
        seen.add(node);

        let nextClassName = className;

        if (node.type === "ClassDeclaration" || node.type === "ClassExpression") {
            nextClassName = node.id?.name ?? className;
        }

        if (node.type === "MethodDefinition") {
            node.__className = nextClassName ?? null;
        }

        if (
            node.type === "FunctionDeclaration" ||
            node.type === "FunctionExpression" ||
            node.type === "ArrowFunctionExpression"
        ) {
            const name = resolveFunctionName(node, parent, grandparent);
            push(name, node);
        }

        for (const k of Object.keys(node)) {
            if (SKIP_KEYS.includes(k)) continue;
            walk(node[k], node, parent, nextClassName);
        }
    };

    walk(ast, null, null, null);
    return map;
});

const collectNodes = instrument("collectNodes", (ast) => {
    const nodes = [];
    const seen = new Set();

    const collect = (node) => {
        if (!node || typeof node !== "object") return;

        if (Array.isArray(node)) {
            for (const el of node) collect(el);

            return;
        }

        if (seen.has(node)) return;

        seen.add(node);

        if (isNode(node)) {
            nodes.push({ type: node.type, start: node.start, end: node.end });
        }

        for (const k of Object.keys(node)) {
            if (SKIP_KEYS.includes(k)) continue;

            collect(node[k]);
        }
    };

    collect(ast);

    return nodes;
});

const buildTypeIndexMap = instrument("buildTypeIndexMap", (ast, sourceLength) => {
    const nodes = collectNodes(ast);

    const types = [...new Set(nodes.map(n => n.type))];
    const typeIndex = new Map(types.map((t, i) => [t, i]));

    nodes.sort((a, b) => (a.start - b.start) || (b.end - a.end));

    const typeAt = new Uint16Array(sourceLength).fill(NONE);

    const stack = [];
    let p = 0;

    for (let i = 0; i < sourceLength; i++) {
        while (stack.length && stack[stack.length - 1].end <= i) stack.pop();

        while (p < nodes.length && nodes[p].start === i) {
            const n = nodes[p++];
            const end = Math.min(sourceLength, Math.max(i, n.end));

            stack.push({ end, idx: typeIndex.get(n.type) });
        }

        if (stack.length) typeAt[i] = stack[stack.length - 1].idx;
    }

    const fnRanges = collectFunctionRanges(ast);

    return { types, typeAt, fnRanges };
});

const buildFnIndexMap = instrument("buildFnIndexMap", (fnRanges, sourceLength) => {
    // Flatten Map<string, Array<{start,end,kind}>> into intervals
    const fnNames = [...fnRanges.keys()];
    const fnIndex = new Map(fnNames.map((n, i) => [n, i]));

    const intervals = [];
    for (const [name, ranges] of fnRanges.entries()) {
        const idx = fnIndex.get(name);
        for (const r of ranges) {
            intervals.push({
                start: r.start,
                end: r.end,
                idx
            });
        }
    }

    intervals.sort((a, b) => (a.start - b.start) || (b.end - a.end));

    const fnAt = new Uint16Array(sourceLength).fill(FN_NONE);

    const stack = [];
    let p = 0;

    for (let i = 0; i < sourceLength; i++) {
        while (stack.length && stack[stack.length - 1].end <= i) stack.pop();

        while (p < intervals.length && intervals[p].start === i) {
            const it = intervals[p++];
            const end = Math.min(sourceLength, Math.max(i, it.end));
            stack.push({ end, idx: it.idx });
        }

        if (stack.length) fnAt[i] = stack[stack.length - 1].idx;
    }

    return { fnNames, fnAt };
});

const buildPlayback = instrument("buildPlayback", (profileData) => {
    if (!profileData.length) return { timeline: [], total: 0 };

    const minT0 = Math.min(...profileData.map(e => e.t0));
    const maxT1 = Math.max(...profileData.map(e => e.t1));
    const total = Math.max(0, maxT1 - minT0);

    // timeline in real-time order (by start)
    const timeline = profileData
        .map(e => ({
            name: e.name,
            depth: e.depth,
            t0: e.t0 - minT0,
            t1: e.t1 - minT0,
            dt: e.t1 - e.t0
        }))
        .sort((a, b) => (a.t0 - b.t0) || (b.depth - a.depth)); // deeper first on ties

    return { timeline, total };
});

const activeCallsAt = instrument("activeCallsAt", (timeline, tProfile) => {
    const active = [];
    let maxDepth = -1;

    for (let i = 0; i < timeline.length; i++) {
        const e = timeline[i];
        if (tProfile >= e.t0 && tProfile < e.t1) {
            active.push(e);
            if (e.depth > maxDepth) maxDepth = e.depth;
        }
    }

    return { active, maxDepth };
});

let raf = 0;
let DPR = 1, W = 0, H = 0;

let state = {
    types: [],
    typeAt: [],
    rows: 0,
    cols: 0,
    ox: 0,
    oy: 0,
    playback: null,
    scale: 1,
    playbackStart: 0,
    activeFnIdx: FN_NONE,
    activeFnDepth: new Map(),   // fnName -> depth
    activeMaxDepth: -1
};

const init = instrument("init", () => {
    const { types, typeAt, fnRanges } = buildTypeIndexMap(ast, ast.end);

    state.types = types;
    state.typeAt = typeAt;

    const { fnNames, fnAt } = buildFnIndexMap(fnRanges, ast.end);

    console.log(fnNames, fnAt);

    state.fnNames = fnNames;
    state.fnAt = fnAt;

    console.log(fnNames);

    state.fnNameToIndex = new Map(fnNames.map((n, i) => [n, i]));
});

const clear = instrument("clear", () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
});

const clamp01 = (x) => Math.max(0, Math.min(1, x));

const renderBox = instrument("renderBox", (x, y, w, h, idx) => {
    const { types, fnAt, typeAt, fnNames, activeFnDepth, activeMaxDepth } = state;

    const typeIdx = typeAt[idx];
    if (typeIdx === NONE) return;

    const hue = (typeIdx / types.length) * 360;

    let sat = 10;
    let alp = 0.5;

    if (fnAt && fnNames && activeMaxDepth >= 0) {
        const fni = fnAt[idx];

        if (fni !== FN_NONE) {
            const fnName = fnNames[fni];
            const d = activeFnDepth.get(fnName);

            if (d !== undefined) {
                const wDepth = clamp01(1 - (activeMaxDepth - d) / 6);

                sat = 15 + 65 * Math.pow(wDepth, 1.5);
                alp = 0.20 + 0.80 * Math.pow(wDepth, 2.0);
            }
        }
    }

    ctx.fillStyle = `hsla(${hue}, ${sat}%, 60%, ${alp})`;
    ctx.fillRect(x, y, w + 1, h + 1);
});

const render = instrument("render", () => {
    const { typeAt, rows, cols } = state;

    const cellW = W / cols;
    const cellH = H / rows;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = col * cellW;
            const y = row * cellH;
            const idx = row * cols + col;

            if (idx >= typeAt.length) continue;

            renderBox(x, y, cellW, cellH, idx)
        }
    }
});

const update = instrument("update", (t) => {
    state.cx = W * 0.5 + (Math.sin(t * 0.001) * 0.25 * W);
    state.cy = H * 0.5 + (Math.cos(t * 0.001) * 0.25 * H);
    state.radius = Math.min(W, H) * 0.1 + (Math.sin(t * 0.002) * 0.05 * Math.min(W, H));
});

const tick = instrument("tick", () => {
    const now = performance.now();

    if (!PROFILE.firstTickDone) {
        clear();
        update(now);
        render();

        PROFILE.firstTickDone = true;
        PROFILE.enabled = false;

        state.playback = buildPlayback(PROFILE.data);
        state.scale = state.playback.total > 0 ? (PLAYBACK_T / state.playback.total) : 1;
        state.playbackStart = performance.now()

        raf = requestAnimationFrame(tick);
        return;
    }

    const pb = state.playback;
    if (pb && pb.timeline.length && pb.total > 0) {
        const tReal = (now - state.playbackStart) % PLAYBACK_T;
        const tProfile = (tReal / PLAYBACK_T) * pb.total;

        const { active, maxDepth } = activeCallsAt(pb.timeline, tProfile);

        const m = new Map();

        for (const e of active) {
            const prev = m.get(e.name);

            if (prev === undefined || e.depth > prev) m.set(e.name, e.depth);
        }

        state.activeFnDepth = m;
        state.activeMaxDepth = maxDepth;
    } else {
        state.activeFnDepth = new Map();
        state.activeMaxDepth = -1;
    }

    clear();
    update(now);
    render();

    raf = requestAnimationFrame(tick);
});

const resize = instrument("resize", () => {
    const rect = canvas.getBoundingClientRect();

    DPR = Math.max(1, window.devicePixelRatio || 1);
    W = rect.width;
    H = rect.height;

    canvas.width = Math.max(1, Math.floor(W * DPR));
    canvas.height = Math.max(1, Math.floor(H * DPR));

    const { rows, cols } = gridFor(ast.end, W, H);

    state.cols = cols;
    state.rows = rows;
});

const main = instrument("main", () => {
    window.addEventListener("resize", resize, { passive: true });

    resize();
    init();

    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
});

main();
