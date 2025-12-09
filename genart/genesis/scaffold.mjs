const colors = [
    'red',
    'blue',
    'yellow'
];

const rnd = (n, m = 0) => Math.floor(Math.random() * (n - m) + m);

const randColor = () => colors[rnd(colors.length)];

let height = 0;
let width = 0;
let paused = false;

const run = (canvas) => {
    const context = canvas.getContext('2d');
    let rects = [];

    console.log(canvas.height);

    const update = () => {
        if (width !== canvas.width || height !== canvas.height) {
            width = canvas.width;
            height = canvas.height;

            rects = [];
        }

        if (rects.length === 0) {
            rects.push({ x0: 0, y0: 0, x1: canvas.width, y1: canvas.height, color: randColor() });

            return;
        }

        let rectToSplit = null;
        let n = 100;
        let i = null;

        while (rectToSplit === null) {
            i = rnd(rects.length);
            rectToSplit = rects[i];

            if (rectToSplit.x1 - rectToSplit.x0 < 20 || rectToSplit.y1 - rectToSplit.y0 < 20) {
                rectToSplit = null;
            }

            if (--n <= 0) return;
        }

        const splitHorizontally = rectToSplit.x1 - rectToSplit.x0 < rectToSplit.y1 - rectToSplit.y0;
        const newRects = [];
        
        if (splitHorizontally) {
            const splitY = rectToSplit.y0 + (rnd(20, 80) / 100 * (rectToSplit.y1 - rectToSplit.y0));
            newRects.push({ x0: rectToSplit.x0, y0: rectToSplit.y0, x1: rectToSplit.x1, y1: splitY, color: rectToSplit.color });
            newRects.push({ x0: rectToSplit.x0, y0: splitY, x1: rectToSplit.x1, y1: rectToSplit.y1, color: randColor() });
        } else {
            const splitX = rectToSplit.x0 + (rnd(20, 80) / 100 * (rectToSplit.x1 - rectToSplit.x0));
            newRects.push({ x0: rectToSplit.x0, y0: rectToSplit.y0, x1: splitX, y1: rectToSplit.y1, color: rectToSplit.color });
            newRects.push({ x0: splitX, y0: rectToSplit.y0, x1: rectToSplit.x1, y1: rectToSplit.y1, color: randColor() });
        }

        rects.splice(i, 1, ...newRects);
    };

    const render = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);

        rects.forEach((rect) => {
            context.fillStyle = rect.color;
            context.fillRect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
            context.strokeStyle = 'black';
            context.lineWidth = 2;
            context.strokeRect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
        });
    };

    const tick = (e) => {
        if (paused) return;

        update();
        render();
    };

    canvas.addEventListener('pointerup', () => {
        paused = !paused;
    });

    setInterval(tick, 1000);
};

export default run;
