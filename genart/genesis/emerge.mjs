const neighborRadius = 50;
const maxSpeed = 60;
const maxForce = 60;
const wSep = 1.0;
const wAlign = 1.2;
const wCoh = 1.0;
const dt = 0.1;

const len = (a) => Math.hypot(a.x, a.y);

const norm = (a) => {
    const l = len(a) || 1e-9;
    return { x: a.x / l, y: a.y / l };
};

const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a, s) => ({ x: a.x * s, y: a.y * s });

const limit = (a, max) => {
    const l = len(a);

    if (l <= max) return a;

    return mul(a, max / (l || 1e-9));
};

const steerTowards = (vCurrent, vDesired, maxForce) => limit(sub(vDesired, vCurrent), maxForce);

const run = (canvas) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    let { width, height } = canvas;

    const N = width * height * 0.00025;

    let boids = [];

    const findNeighbours = (boid, boids, neighbourRadius) => {
        const r2 = neighbourRadius * neighbourRadius;
        const neighbours = [];

        for (let j = 0; j < boids.length; j++) {
            const other = boids[j];

            if (other.id === boid.id) continue;

            const dx = other.x - boid.x;
            const dy = other.y - boid.y;

            if (dx * dx + dy * dy < r2) neighbours.push(other);
        }

        return neighbours;
    };

    const separation = (boid, neighbors, maxSpeed, maxForce) => {
        let sum = { x: 0, y: 0 };
        let count = 0;

        if (neighbors.length === 0) return sum;

        for (const neighbour of neighbors) {
            const dx = boid.x - neighbour.x;
            const dy = boid.y - neighbour.y;
            const d = Math.hypot(dx, dy) || 1e-9;

            sum.x += dx / (d * d);
            sum.y += dy / (d * d);
            count++;
        }

        const desiredDir = norm(sum);
        const vDesired = mul(desiredDir, maxSpeed);

        return steerTowards({ x: boid.vx, y: boid.vy }, vDesired, maxForce);
    };

    const alignment = (boid, neighbours, maxSpeed, maxForce) => {
        let sumV = { x: 0, y: 0 };
        let count = 0;

        if (neighbours.length === 0) return { x: 0, y: 0 };

        for (const neighbour of neighbours) {
            sumV.x += neighbour.vx;
            sumV.y += neighbour.vy;
            count++;
        }

        const avgV = mul(sumV, 1 / count);
        const vDesired = mul(norm(avgV), maxSpeed);

        return steerTowards({ x: boid.vx, y: boid.vy }, vDesired, maxForce);
    };

    const cohesion = (boid, neighbours, maxSpeed, maxForce) => {
        let sumP = { x: 0, y: 0 };
        let count = 0;

        if (neighbours.length === 0) return { x: 0, y: 0 };

        for (const neighbour of neighbours) {
            sumP.x += neighbour.x;
            sumP.y += neighbour.y;
            count++;
        }

        const center = mul(sumP, 1 / count);
        const toCenter = sub(center, { x: boid.x, y: boid.y });
        const vDesired = mul(norm(toCenter), maxSpeed);

        return steerTowards({ x: boid.vx, y: boid.vy }, vDesired, maxForce);
    };

    const init = () => {
        boids = [];

        for (let i = 0; i < N; i++) {
            boids.push({
                id: i,
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * maxSpeed,
                vy: (Math.random() - 0.5) * maxSpeed
            });
        }
    };

    const update = () => {
        const acc = boids.map(() => ({ x: 0, y: 0 }));

        for (let i = 0; i < boids.length; i++) {
            const boid = boids[i];
            const neighbours = findNeighbours(boid, boids, neighborRadius);
            const sep = separation(boid, neighbours, maxSpeed, maxForce);
            const ali = alignment(boid, neighbours, maxSpeed, maxForce);
            const coh = cohesion(boid, neighbours, maxSpeed, maxForce);

            const a = limit(
                add(add(mul(sep, wSep), mul(ali, wAlign)), mul(coh, wCoh)),
                maxForce
            );

            acc[i] = a;
        }

        for (let i = 0; i < boids.length; i++) {
            const boid = boids[i];

            boid.vx += acc[i].x * dt;
            boid.vy += acc[i].y * dt;

            const v = limit({ x: boid.vx, y: boid.vy }, maxSpeed);

            boid.vx = v.x;
            boid.vy = v.y;

            boid.x += boid.vx * dt;
            boid.y += boid.vy * dt;

            if (boid.x < 0) boid.x += width;
            if (boid.x >= width) boid.x -= width;
            if (boid.y < 0) boid.y += height;
            if (boid.y >= height) boid.y -= height;
        }
    };

    const clear = (a = 0.1) => {
        if (width !== canvas.width || height !== canvas.height) {
            width = canvas.width;
            height = canvas.height;
            boids = [];
            init();
        }

        context.fillStyle = `rgba(255, 255, 255, ${a})`;
        context.fillRect(0, 0, width, height);
    }

    const render = () => {
        context.fillStyle = 'rgba(0, 0, 0, 1)';

        for (const boid of boids) {

            context.beginPath();
            context.arc(boid.x, boid.y, 2, 0, Math.PI * 2);
            context.fill();

            const neighbours = findNeighbours(boid, boids, neighborRadius);

            context.strokeStyle = 'rgba(0, 0, 0, 0.5)';

            for (const neighbor of neighbours) {
                context.beginPath();
                context.moveTo(boid.x, boid.y);
                context.lineTo(neighbor.x, neighbor.y);
                context.stroke();
            }
        }
    };

    const tick = () => {
        clear();
        update();
        render();

        requestAnimationFrame(tick);
    };


    canvas.addEventListener('pointerup', () => {
        init();
        clear(1.0);
    });

    init();
    tick();
};

export default run;
