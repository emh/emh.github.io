import { perlin2D } from "./perlin.mjs";

const run = (canvas) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    let { height, width } = canvas;

    let sentence = "X";
    let iterations = 6;

    const rules = {
        X: "F+[[X]-X]-F[-FX]+X",
        F: "FF"
    };

    let angleDeg = Math.random() * 17.5 + 10;

    const rewrite = (s) => s.split('').map((c) => rules[c] || c).join('');

    const update = () => {
        sentence = rewrite(sentence);
    };

    const render = () => {
        context.fillStyle = 'white';
        context.fillRect(0, 0, width, height);

        context.strokeStyle = 'rgb(0, 128, 0)';
        context.lineWidth = 1;

        const step = height * 0.0025;
        const angleStep = angleDeg * Math.PI / 180;
        const stack = [];

        let x = width / 2;
        let y = height;
        let angle = -Math.PI / 2 + (Math.random() * 0.25 - 0.125);
        let thickness = 8;
        let stepIndex = 0;

        for (const ch of sentence) {
            switch (ch) {
                case "F": {
                    context.beginPath();
                    context.lineWidth = thickness;
                    context.strokeStyle = `rgb(0, ${192 - Math.floor(thickness * 4)}, 0)`;
                    context.moveTo(x, y);

                    const nx = x + Math.cos(angle) * (step);
                    const ny = y + Math.sin(angle) * (step);

                    context.lineTo(nx, ny);
                    context.stroke();

                    x = nx;
                    y = ny;
                    thickness *= 0.99;

                    break;
                }
                case "+": {
                    const n = perlin2D(stepIndex * 0.01, 0);
                    const jitter = n * (Math.PI / 180) * 5;
                    angle += angleStep + jitter;
                    stepIndex += 1;

                    break;
                }
                case "-": {
                    const n = perlin2D(stepIndex * 0.01, 0);
                    const jitter = n * (Math.PI / 180) * 5;
                    angle -= angleStep + jitter;
                    stepIndex += 1;

                    break;
                }
                case "[": {
                    stack.push({ x, y, angle, thickness });

                    break;
                }
                case "]": {
                    const state = stack.pop();

                    if (state) {
                        x = state.x;
                        y = state.y;
                        angle = state.angle;
                        thickness = state.thickness;
                    }

                    break;
                }
            }
        }
    };

    const tick = () => {
        if (width !== canvas.width || height !== canvas.height) {
            width = canvas.width;
            height = canvas.height;
        }

        update();
        render();

        if (iterations > 0) {
            iterations -= 1;

            requestAnimationFrame(tick);
        }
    };

    canvas.addEventListener('pointerup', (e) => {
        sentence = "X";
        iterations = 6;
        angleDeg = Math.random() * 17.5 + 10;

        tick();
    });

    tick();
};

export default run;
