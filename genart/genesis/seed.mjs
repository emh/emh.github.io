import { clamp, rnd, times, wrap } from "./utils.js";

const N = 1000;
const P = 100;
const CELL_SIZE = 5;

const SPEED_UP = 0;
const SLOW_DOWN = 1;
const TURN_LEFT = 2;
const TURN_RIGHT = 3;
const ACTIONS = [SPEED_UP, SLOW_DOWN, TURN_LEFT, TURN_RIGHT];
const SLICES = 6;
const R = CELL_SIZE;
const MAXV = 2;
const MAX_ANGULAR_VELOCITY = 5;
const TURN_STEP = 1;

const L = 3 ** SLICES;

const makeWeights = (len) => Array.from({ length: len }, () => (Math.random() * 2 - 1));

const initColorProjection = (len) => ({
    w1: makeWeights(len),
    w2: makeWeights(len),
    w3: makeWeights(len),
});

const projectGenome = (genome, proj) => {
    const { w1, w2, w3 } = proj;
    let v1 = 0, v2 = 0, v3 = 0;

    for (let i = 0; i < genome.length; i++) {
        const v = genome[i]; // 0..ACTION_COUNT-1
        v1 += w1[i] * v;
        v2 += w2[i] * v;
        v3 += w3[i] * v;
    }

    return { v1, v2, v3 };
};

const genomeToColorHSL = (genome, proj) => {
    const { v1, v2, v3 } = projectGenome(genome, proj);

    // Hue from angle in the (v1,v2) plane
    let hue = Math.atan2(v2, v1);              // [-π, π]
    hue = (hue / (2 * Math.PI)) + 0.5;         // [0, 1]

    // Lightness from v3, squashed
    const lNorm = Math.tanh(Math.abs(v3) * 0.1);  // [0, ~1)
    const lightness = 0.35 + 0.25 * lNorm;        // ~[0.35, 0.6]

    const saturation = 0.7;

    return { h: hue, s: saturation, l: lightness };
};

const hslToCss = (h, s, l, a = 1.0) => `hsla(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, ${a})`;

const base3ToInt = (arr) => arr.reduce((acc, d) => acc * 3 + d, 0);

const randomCoeffs = () => {
    const rand = () => rnd(2) - 1;
    return {
        ax: [rand() * 0.4, rand() * 0.3, rand() * 0.2],
        bx: [rand() * 0.4, rand() * 0.3, rand() * 0.2],
        ay: [rand() * 0.4, rand() * 0.3, rand() * 0.2],
        by: [rand() * 0.4, rand() * 0.3, rand() * 0.2],
    };
};

const randomGenome = () => Array.from({ length: 3 ** SLICES }).map(() => ACTIONS[rnd(ACTIONS.length)]);

const run = (canvas) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;
    const cx = width / 2;
    const cy = height / 2;

    const cols = Math.floor(width / CELL_SIZE);
    const rows = Math.floor(height / CELL_SIZE);

    const colorProj = initColorProjection(L);

    let foodGrid;
    let agentGrid;
    let population;

    const resetFoodGrid = () => {
        foodGrid = Array.from({ length: rows }, () => Array(cols).fill(0));
        const radius = Math.min(width, height) * 0.5;

        const fourier = randomCoeffs();

        const randomFourier = (t) => {
            const T = t * 2 * Math.PI;
            let x = 0, y = 0;

            for (let k = 0; k < 3; k++) {
                const f = k + 1;
                x += fourier.ax[k] * Math.sin(f * T) + fourier.bx[k] * Math.cos(f * T);
                y += fourier.ay[k] * Math.sin(f * T) + fourier.by[k] * Math.cos(f * T);
            }

            return { x, y };
        };

        for (let i = 0; i <= N; i++) {
            const t = i / N;
            const { x, y } = randomFourier(t);
            const px = cx + x * radius;
            const py = cy + y * radius;

            const col = Math.floor(px / CELL_SIZE);
            const row = Math.floor(py / CELL_SIZE);

            if (col >= 0 && col < cols && row >= 0 && row < rows) {
                foodGrid[row][col] = 1;
            }
        }
    };

    const initAgent = (genome) => {
        const r = Math.random() * (Math.min(width, height) * 0.25);
        const x = cx + r * Math.cos(Math.random() * 2 * Math.PI);
        const y = cy + r * Math.sin(Math.random() * 2 * Math.PI);
        const v = Math.random();
        const a = Math.random() * 360;
        const av = rnd(MAX_ANGULAR_VELOCITY) - (MAX_ANGULAR_VELOCITY / 2);
        const g = genome ?? randomGenome();
        const c = genomeToColorHSL(g, colorProj);

        return {
            x, y, v, a, av, color: c, genome: g, trail: [], food: []
        };
    }

    const init = () => {
        resetFoodGrid();

        agentGrid = Array.from({ length: rows }, () => Array(cols).fill(0));

        population = [];

        times(P, () => {
            const agent = initAgent();

            const row = Math.floor(agent.y / CELL_SIZE);
            const col = Math.floor(agent.x / CELL_SIZE);

            agentGrid[row][col] = 1;

            population.push(agent);
        });
    };

    const tournamentSelect = (k = 5) => {
        let best = null;
        for (let i = 0; i < k; i++) {
            const cand = population[rnd(population.length)];

            if (!best || fitness(cand) < fitness(best)) best = cand;
        }
        return best;
    };

    const crossover = (g1, g2, split = rnd(g1.length)) => [...g1.slice(0, split), ...g2.slice(split)];

    const mutate = (g) => g.map((gene) => (rnd(100) < 5 ? ACTIONS[rnd(ACTIONS.length)] : gene));

    const coverage = (trail) => {
        const covered = new Set();

        for (const p of trail.slice(-100)) {
            const row = clamp(Math.floor(p.y / CELL_SIZE), 0, rows - 1);
            const col = clamp(Math.floor(p.x / CELL_SIZE), 0, cols - 1);

            covered.add(`${row},${col}`);
        }

        return covered.size;
    };

    const fitness = (agent) => {
        return agent.food.length + coverage(agent.trail);
    };

    const resetPopulation = () => {
        population.sort((a, b) => fitness(b) - fitness(a));

        const elite = population.slice(0, Math.ceil(population.length / 5));

        const newPopulation = [...elite.map((a) => initAgent(a.genome))];

        while (newPopulation.length < P) {
            const a = rnd(10) < 8 ? elite[rnd(elite.length)] : tournamentSelect();
            const b = rnd(10) < 8 ? elite[rnd(elite.length)] : tournamentSelect();
            let cg = crossover(a.genome, b.genome);

            cg = mutate(cg);

            const c = initAgent(cg);

            newPopulation.push(c);
        }

        population = newPopulation;
    };

    const senseEnvironment = (x, y, a) => {
        let environment = [];

        for (let i = 0; i < SLICES; i++) {
            const angle = (a + i * (360 / SLICES)) % 360;
            const rad = angle * (Math.PI / 180);
            const ex = x + (R * Math.cos(rad));
            const ey = y + (R * Math.sin(rad));
            const row = wrap(Math.floor(ey / CELL_SIZE), 0, rows);
            const col = wrap(Math.floor(ex / CELL_SIZE), 0, cols);

            if (agentGrid[row][col] === 1) {
                environment.push(2);
            } else if (foodGrid[row][col] === 1) {
                environment.push(1);
            } else {
                environment.push(0);
            }
        }

        return base3ToInt(environment);
    };

    const update = () => {
        agentGrid = Array.from({ length: rows }, () => Array(cols).fill(0));

        for (const agent of population) {
            agent.trail.push({ x: agent.x, y: agent.y });

            const e = senseEnvironment(agent.x, agent.y, agent.a);
            const action = agent.genome[e];

            switch (action) {
                case SPEED_UP:
                    agent.v = Math.min(agent.v * 1.1, MAXV);
                    break;
                case SLOW_DOWN:
                    agent.v *= 0.9;
                    break;
                case TURN_LEFT: {
                    agent.av = clamp(agent.av - TURN_STEP, -MAX_ANGULAR_VELOCITY, MAX_ANGULAR_VELOCITY);
                    break;
                }
                case TURN_RIGHT: {
                    agent.av = clamp(agent.av + TURN_STEP, -MAX_ANGULAR_VELOCITY, MAX_ANGULAR_VELOCITY);
                    break;
                }
            }

            const vx = agent.v * Math.cos(agent.a * (Math.PI / 180));
            const vy = agent.v * Math.sin(agent.a * (Math.PI / 180));

            agent.x += vx;
            agent.y += vy;
            agent.a += agent.av;

            if (agent.x < 0) agent.x = width - 1 - CELL_SIZE;
            if (agent.x >= width - 1) agent.x = CELL_SIZE;
            if (agent.y < 0) agent.y = height - 1 - CELL_SIZE;
            if (agent.y >= height - 1) agent.y = CELL_SIZE;

            const row = clamp(Math.floor(agent.y / CELL_SIZE), 0, rows - 1);
            const col = clamp(Math.floor(agent.x / CELL_SIZE), 0, cols - 1);

            if (foodGrid[row][col] === 1 && agent.food.includes(`${row},${col}`) === false) {
                agent.food.push(`${row},${col}`);
            }

            agentGrid[row][col] = 1;
        }
    };

    const clear = () => {
        context.fillStyle = 'white';
        context.fillRect(0, 0, width, height);
    }

    const render = () => {
        context.beginPath();
        context.fillStyle = 'green';

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (foodGrid[row][col] === 1) {
                    const x = col * CELL_SIZE + CELL_SIZE / 2;
                    const y = row * CELL_SIZE + CELL_SIZE / 2;

                    context.beginPath();
                    context.arc(x, y, CELL_SIZE * 0.4, 0, Math.PI * 2);
                    context.fill();
                }
            }
        }

        for (const agent of population) {
            context.beginPath();
            context.fillStyle = hslToCss(agent.color.h, agent.color.s, agent.color.l);
            context.arc(agent.x, agent.y, CELL_SIZE / 2, 0, Math.PI * 2);
            context.fill();

            for (let i = 1; i < 200; i++) {
                const p1 = agent.trail[agent.trail.length - i];
                const p2 = agent.trail[agent.trail.length - i - 1];

                if (!p1 || !p2) break;

                if (Math.abs(p1.x - p2.x) > width / 2 || Math.abs(p1.y - p2.y) > height / 2) continue;

                context.beginPath();
                context.strokeStyle = hslToCss(agent.color.h, agent.color.s, agent.color.l, 1 - i / 200);
                context.moveTo(p1.x, p1.y);
                context.lineTo(p2.x, p2.y);
                context.stroke();
            }
        }
    };

    let step = 1;
    let gen = 1;

    const nextGen = () => {
        console.log(`Generation ${gen++}, high score: ${Math.max(...population.map(a => fitness(a)))}`);
        step = 1;

        resetFoodGrid();
        resetPopulation();
    };

    let frozen = false;

    const tick = () => {
        clear();
        times(frozen ? 5 : 100, update);

        if (!frozen && (step % 100 === 0)) {
            nextGen();
        };

        render();

        step++;
        requestAnimationFrame(tick);
    };


    canvas.addEventListener('pointerup', () => {
        frozen = !frozen;
    });

    init();
    tick();
};

export default run;
