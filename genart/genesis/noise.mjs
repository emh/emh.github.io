import { perlin2D, fractalPerlin2D } from "./perlin.mjs";
import { hsvToRgb } from "./utils.js";

let paused = false;
const speed = 0.0005; // how fast time moves

const run = (canvas) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });

    let startTime = performance.now();

    const tick = (now) => {
        if (!paused) {
            const t = (now - startTime) * speed;
    
            context.fillStyle = 'white';
            context.fillRect(0, 0, canvas.width, canvas.height);
    
            const tx = fractalPerlin2D(t * 0.2, 0) * 10;
            const ty = fractalPerlin2D(0, t * 0.2) * 10;
    
            for (let y = 0; y < canvas.height; y += 10 ) {
                for (let x = 0; x < canvas.width; x += 10) {
                    const ox = fractalPerlin2D(t * 0.2, x) * 10;
                    const oy = fractalPerlin2D(y, t * 0.2) * 10;
    
                    const h = fractalPerlin2D(x * 0.01 + tx, y * 0.01 + ty);
                    const v = fractalPerlin2D(x * 0.03 + tx, y * 0.03 + ty);
                    const { r, g, b } = hsvToRgb(h, 0.7, v);
                    const s = Math.floor(fractalPerlin2D(x * 0.01 + ox, y * 0.01 + oy) * 10) + 5;
    
                    context.fillStyle = `rgb(${r}, ${g}, ${b})`;
                    context.beginPath();
                    context.arc(x, y, s/2, 0, Math.PI * 2);
                    context.fill();
                }
            };
        }

        requestAnimationFrame(tick);
    };

    canvas.addEventListener('pointerup', () => {
        paused = !paused;
    });

    requestAnimationFrame(tick);
};

export default run;
