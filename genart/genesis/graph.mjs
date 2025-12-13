import { rnd, times } from './utils.js';

const run = (canvas) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const { height, width } = canvas;
    const cx = width / 2;
    const cy = height / 2;

    const N = 20;

    let graph;

    const addNode = (x, y) => {
        const id = graph.nodes.length;

        graph.nodes.push({
            id,
            x: x !== undefined ? x : rnd(width),
            y: y !== undefined ? y : rnd(height),
            vx: 0,
            vy: 0
        });

        return id;
    };

    const addEdge = (a, b) => graph.edges.push([a, b]);

    const removeEdge = (a, b) => {
        graph.edges = graph.edges.filter(([x, y]) => !((x === a && y === b) || (x === b && y === a)));
    };

    const adjacencyMatrix = () => {
        const adj = Array.from({ length: graph.nodes.length }, () => new Set());

        for (const [u, v] of graph.edges) {
            adj[u].add(v);
            adj[v].add(u);
        }

        return adj;
    };

    const findRandomTriangle = () => {
        const m = graph.edges.length;

        if (m === 0) return null;

        const adj = adjacencyMatrix();

        const start = rnd(m);

        for (let k = 0; k < m; k++) {
            const [u0, v0] = graph.edges[(start + k) % m];

            const u = adj[u0].size <= adj[v0].size ? u0 : v0;
            const v = u === u0 ? v0 : u0;

            for (const w of adj[u]) {
                if (w === v) continue;
                if (adj[v].has(w)) {
                    return [u0, v0, w];
                }
            }
        }

        return null;
    };

    const findCrowdedNode = () => {
        const adj = adjacencyMatrix();

        const start = rnd(adj.length);

        for (let k = 0; k < adj.length; k++) {
            const u = (start + k) % adj.length;

            if (adj[u].size >= 4) {
                return u;
            }
        }

        return null;
    };

    const findRandomOpenWedge = () => {
        const m = graph.edges.length;

        if (m === 0) return null;

        const adj = adjacencyMatrix();
        const start = rnd(m);

        for (let k = 0; k < m; k++) {
            const [u0, v0] = graph.edges[(start + k) % m];
            const b = adj[u0].size >= adj[v0].size ? u0 : v0;
            const c = (b === u0) ? v0 : u0;

            for (const a of adj[b]) {
                if (a === c) continue;
                if (!adj[a].has(c)) {
                    return [a, b, c];
                }
            }
        }

        return null;
    };

    const findLonelyPair = () => {
        const m = graph.edges.length;
        if (m === 0) return null;

        const adj = adjacencyMatrix();
        const start = rnd(m);

        for (let k = 0; k < m; k++) {
            const [u, v] = graph.edges[(start + k) % m];

            if (adj[u].size === 1 && adj[v].size === 1) {
                if (adj[u].has(v) && adj[v].has(u)) {
                    return [u, v];
                }
            }
        }

        return null;
    };

    const findNearbyStrangers = () => {
        const n = graph.nodes.length;
        if (n < 2) return null;

        const adj = adjacencyMatrix();
        const start = rnd(n);

        for (let k = 0; k < n; k++) {
            const i = (start + k) % n;
            const ni = graph.nodes[i];

            let bestJ = null;
            let bestDist2 = Infinity;

            for (let j = 0; j < n; j++) {
                if (j === i) continue;
                if (adj[i].has(j)) continue;

                const nj = graph.nodes[j];
                const dx = ni.x - nj.x;
                const dy = ni.y - nj.y;
                const dist2 = dx * dx + dy * dy;

                if (dist2 < bestDist2) {
                    bestDist2 = dist2;
                    bestJ = j;
                }
            }

            if (bestJ !== null) {
                return [i, bestJ];
            }
        }

        return null;
    };


    const init = () => {
        graph = { nodes: [], edges: [] };

        times(N, addNode);

        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                if (i !== j && Math.random() < 0.1) {
                    addEdge(i, j);
                }
            }
        }
    };

    const clear = () => {
        context.fillStyle = 'white';
        context.fillRect(0, 0, width, height);
    };

    const SPRING_K = 0.01;
    const SPRING_L = 50;
    const REPULSION = 2000;
    const DAMPING = 0.7;
    const CENTER_K = 0.001;
    const WALL_K = 0.1;
    const MARGIN = 100;

    const rewriteGraph = () => {
        const rule = rnd(100);

        if (rule < 40) {
            const triangle = findRandomTriangle();

            if (!triangle) return;

            const [a, b, c] = triangle;
            const na = graph.nodes[a];
            const nb = graph.nodes[b];
            const nc = graph.nodes[c];
            const x = (na.x + nb.x + nc.x) / 3;
            const y = (na.y + nb.y + nc.y) / 3;

            const d = addNode(x, y);

            removeEdge(a, b);
            removeEdge(b, c);
            removeEdge(c, a);

            addEdge(a, d);
            addEdge(b, d);
            addEdge(c, d);
        } else if (rule < 50) {
            const u = findCrowdedNode();

            if (u === null) return;

            const adj = adjacencyMatrix();
            const neighbours = Array.from(adj[u]);

            neighbours.forEach((n) => removeEdge(u, n));
        } else if (rule < 60) {
            const wedge = findRandomOpenWedge();

            if (!wedge) return;

            const [a, b, c] = wedge;

            addEdge(a, c);
        } else if (rule < 70) {
            if (graph.nodes.length < 3) return;

            const pair = findLonelyPair();

            if (!pair) return;

            const [u, v] = pair;

            let w;

            do {
                w = rnd(graph.nodes.length);
            } while (w === u || w === v);

            addEdge(u, w);
            addEdge(v, w);
        } else {
            const pair = findNearbyStrangers();

            if (!pair) return;

            const [u, v] = pair;

            addEdge(u, v);
        }
    };

    const moveGraph = () => {
        const { nodes, edges } = graph;
        const forces = nodes.map(() => ({ fx: 0, fy: 0 }));

        for (const e of edges) {
            const a = nodes[e[0]];
            const b = nodes[e[1]];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy) || 0.001;
            const diff = dist - SPRING_L;
            const f = SPRING_K * diff;

            const fx = (dx / dist) * f;
            const fy = (dy / dist) * f;

            forces[a.id].fx += fx; forces[a.id].fy += fy;
            forces[b.id].fx -= fx; forces[b.id].fy -= fy;
        }

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i];
                const b = nodes[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist2 = dx * dx + dy * dy + 0.01;
                const f = REPULSION / dist2;
                const dist = Math.sqrt(dist2);
                const fx = (dx / dist) * f;
                const fy = (dy / dist) * f;

                forces[a.id].fx -= fx; forces[a.id].fy -= fy;
                forces[b.id].fx += fx; forces[b.id].fy += fy;
            }
        }

        for (const n of nodes) {
            const f = forces[n.id];
            const dx = cx - n.x;
            const dy = cy - n.y;

            f.fx += dx * CENTER_K;
            f.fy += dy * CENTER_K;

            if (n.x < MARGIN) {
                f.fx += (MARGIN - n.x) * WALL_K;
            } else if (n.x > width - MARGIN) {
                f.fx -= (n.x - (width - MARGIN)) * WALL_K;
            }

            if (n.y < MARGIN) {
                f.fy += (MARGIN - n.y) * WALL_K;
            } else if (n.y > height - MARGIN) {
                f.fy -= (n.y - (height - MARGIN)) * WALL_K;
            }
        }

        for (const n of nodes) {
            n.vx = (n.vx + forces[n.id].fx) * DAMPING;
            n.vy = (n.vy + forces[n.id].fy) * DAMPING;
            n.x += n.vx;
            n.y += n.vy;
        }
    };

    let step = 0;
    const update = () => {
        step++;
        moveGraph();

        if (step % 10 === 0) {
            rewriteGraph();
        }
    };

    const render = () => {
        const { nodes, edges } = graph;

        context.strokeStyle = 'blue';
        context.fillStyle = 'red';

        edges.forEach(([a, b]) => {
            const na = nodes[a];
            const nb = nodes[b];
            context.beginPath();
            context.moveTo(na.x, na.y);
            context.lineTo(nb.x, nb.y);
            context.stroke();
        });

        nodes.forEach((n) => {
            if (edges.some(([a, b]) => a === n.id || b === n.id)) {
                context.beginPath();
                context.arc(n.x, n.y, 5, 0, Math.PI * 2);
                context.fill();
            }
        });
    };

    const tick = () => {
        clear();
        update();
        render();

        requestAnimationFrame(tick);
    };

    canvas.addEventListener('pointerup', (e) => {
        clear();
        init();
    });

    clear();
    init();
    tick();
};

export default run;
