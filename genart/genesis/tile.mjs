import { rnd } from "./utils.js";

const TILES = [
    [['L1', 'T1'], ['T2', 'R1'], ['R2', 'B2'], ['B1', 'L2']],
    [['T1', 'T2'], ['R1', 'R2'], ['B1', 'B2'], ['L1', 'L2']],

    [['T1', 'R2'], ['T2', 'R1'], ['B2', 'L1'], ['B1', 'L2']],
    [['T1', 'L1'], ['T2', 'L2'], ['B2', 'R2'], ['B1', 'R1']],

    [['T1', 'T2'], ['R1', 'R2'], ['B1', 'L2'], ['B2', 'L1']],
    [['R1', 'R2'], ['B1', 'B2'], ['T2', 'L2'], ['T1', 'L1']],
    [['B1', 'B2'], ['L1', 'L2'], ['T1', 'R2'], ['T2', 'R1']],
    [['T1', 'T2'], ['L1', 'L2'], ['B2', 'R2'], ['B1', 'R1']],

    [['T1', 'B1'], ['T2', 'B2'], ['L1', 'L2'], ['R1', 'R2']],
    [['L1', 'R1'], ['L2', 'R2'], ['T1', 'T2'], ['B1', 'B2']],

    [['T1', 'B1'], ['R2', 'B2'], ['L1', 'L2'], ['R1', 'T2']],
    [['L1', 'R1'], ['L2', 'B1'], ['T1', 'T2'], ['B2', 'R2']],
    [['T2', 'B2'], ['B1', 'L2'], ['R1', 'R2'], ['L1', 'T1']],
    [['L2', 'R2'], ['L1', 'T1'], ['T2', 'R1'], ['B1', 'B2']]
];

const run = (canvas) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const { height, width } = canvas;

    context.strokeStyle = 'red';
    context.lineWidth = 1;

    const TILE_SIZE = 40;

    const cols = Math.ceil(width / TILE_SIZE);
    const rows = Math.ceil(height / TILE_SIZE);

    const drawTile = (tile, x, y) => {
        // context.strokeStyle = 'grey';
        // context.beginPath();
        // context.rect(x + 0.5, y + 0.5, TILE_SIZE, TILE_SIZE);
        // context.stroke();

        const s = TILE_SIZE;

        const t = 1 / 3;
        const x1 = x + s * t;
        const x2 = x + s * (1 - t);
        const y1 = y + s * t;
        const y2 = y + s * (1 - t);

        const pts = {
            T1: { x: x1, y: y },
            T2: { x: x2, y: y },
            R1: { x: x + s, y: y1 },
            R2: { x: x + s, y: y2 },
            B2: { x: x2, y: y + s },
            B1: { x: x1, y: y + s },
            L2: { x: x, y: y2 },
            L1: { x: x, y: y1 },
        };

        const isLine = (pk1, pk2) => (pk1.startsWith('L') && pk2.startsWith('R')) || (pk1.startsWith('R') && pk2.startsWith('L')) || (pk1.startsWith('T') && pk2.startsWith('B')) || (pk1.startsWith('B') && pk2.startsWith('T'));
        const isHalfCircle = (pk1, pk2) => (pk1.startsWith('T') && pk2.startsWith('T')) || (pk1.startsWith('B') && pk2.startsWith('B')) || (pk1.startsWith('L') && pk2.startsWith('L')) || (pk1.startsWith('R') && pk2.startsWith('R'));
        const isSmallQuarterCircle = (pk1, pk2) => 
            (pk1 === 'L1' && pk2 === 'T1') || 
            (pk1 === 'T1' && pk2 === 'L1') ||
            (pk1 === 'T2' && pk2 === 'R1') || 
            (pk1 === 'R1' && pk2 === 'T2') ||
            (pk1 === 'R2' && pk2 === 'B2') || 
            (pk1 === 'B2' && pk2 === 'R2') ||
            (pk1 === 'L2' && pk2 === 'B1') || 
            (pk1 === 'B1' && pk2 === 'L2');
        const isBigQuarterCircle = (pk1, pk2) => 
            (pk1 === 'L1' && pk2 === 'B2') || 
            (pk1 === 'B2' && pk2 === 'L1') ||
            (pk1 === 'T1' && pk2 === 'R2') || 
            (pk1 === 'R2' && pk2 === 'T1') ||
            (pk1 === 'T2' && pk2 === 'L2') || 
            (pk1 === 'L2' && pk2 === 'T2') ||
            (pk1 === 'R1' && pk2 === 'B1') || 
            (pk1 === 'B1' && pk2 === 'R1');

        const drawCurve = (pk1, pk2) => {
            const p1 = pts[pk1];
            const p2 = pts[pk2];    

            context.beginPath();
            
            if (isLine(pk1, pk2)) {
                context.moveTo(p1.x, p1.y);
                context.lineTo(p2.x, p2.y);
            } else if (isHalfCircle(pk1, pk2)) {
                const cx = (p1.x + p2.x) / 2;
                const cy = (p1.y + p2.y) / 2;

                context.arc(
                    cx, 
                    cy, 
                    TILE_SIZE / 6, 
                    pk1.startsWith('T') || pk1.startsWith('B') ? 0 : Math.PI / 2, 
                    pk1.startsWith('T') || pk1.startsWith('B') ? Math.PI : Math.PI * 3 / 2,
                    pk1.startsWith('L') || pk1.startsWith('B')
                );
            } else if (isSmallQuarterCircle(pk1, pk2)) {
                const cx = pk1 === 'L1' || pk2 === 'L1' || pk1 === 'L2' || pk2 === 'L2' ? x : x + s;
                const cy = pk1 === 'T1' || pk2 === 'T1' || pk1 === 'T2' || pk2 === 'T2' ? y : y + s;

                context.arc(
                    cx, 
                    cy, 
                    TILE_SIZE / 3, 
                    (pk1 === 'L1' && pk2 === 'T1') || (pk1 === 'R1' && pk2 === 'T2') ? Math.PI / 2 :
                    (pk1 === 'B2' && pk2 === 'R2') || (pk1 === 'T2' && pk2 === 'R1') ? Math.PI :
                    (pk1 === 'B1' && pk2 === 'L2') || (pk1 === 'T1' && pk2 === 'L1') ? 0 :
                    (pk1 === 'L2' && pk2 === 'B1') || (pk1 === 'R2' && pk2 === 'B2') ? Math.PI * 3 / 2 :
                    0,
                    (pk1 === 'T1' && pk2 === 'L1') || (pk1 === 'T2' && pk2 === 'R1') ? Math.PI / 2 :
                    (pk1 === 'R1' && pk2 === 'T2') || (pk1 === 'R2' && pk2 === 'B2') ? Math.PI :
                    (pk1 === 'L1' && pk2 === 'T1') || (pk1 === 'L2' && pk2 === 'B1') ? 0 :
                    (pk1 === 'B1' && pk2 === 'L2') || (pk1 === 'B2' && pk2 === 'R2') ? Math.PI * 3 / 2 :
                    0,
                    (pk1 === 'L1' && pk2 === 'T1') || (pk1 === 'T2' && pk2 === 'R1') || (pk1 === 'R2' && pk2 === 'B2') || (pk1 === 'B1' && pk2 === 'L2')
                );
            } else if (isBigQuarterCircle(pk1, pk2)) {
                const cx = pk1 === 'L1' || pk2 === 'L1' || pk1 === 'L2' || pk2 === 'L2' ? x : x + s;
                const cy = pk1 === 'T1' || pk2 === 'T1' || pk1 === 'T2' || pk2 === 'T2' ? y : y + s;

                context.arc(
                    cx, 
                    cy, 
                    TILE_SIZE / (3/2), 
                    (pk1 === 'L2' && pk2 === 'T2') || (pk1 === 'R2' && pk2 === 'T1') ? Math.PI / 2 :
                    (pk1 === 'T1' && pk2 === 'R2') || (pk1 === 'B1' && pk2 === 'R1') ? Math.PI :
                    (pk1 === 'B2' && pk2 === 'L1') || (pk1 === 'T2' && pk2 === 'L2') ? 0 :
                    (pk1 === 'L1' && pk2 === 'B2') || (pk1 === 'R1' && pk2 === 'B1') ? Math.PI * 3 / 2 :
                    0,
                    (pk1 === 'T2' && pk2 === 'L2') || (pk1 === 'T1' && pk2 === 'R2') ? Math.PI / 2 :
                    (pk1 === 'R2' && pk2 === 'T1') || (pk1 === 'R1' && pk2 === 'B1') ? Math.PI :
                    (pk1 === 'L1' && pk2 === 'B2') || (pk1 === 'L2' && pk2 === 'T2') ? 0 :
                    (pk1 === 'B2' && pk2 === 'L1') || (pk1 === 'B1' && pk2 === 'R1') ? Math.PI * 3 / 2 :
                    0,
                    (pk1 === 'T1' && pk2 === 'R2') || (pk1 === 'R1' && pk2 === 'B1') || (pk1 === 'B2' && pk2 === 'L1') || (pk1 === 'L2' && pk2 === 'T2')
                );
            } else {
                console.warn('Unknown curve type:', pk1, pk2);
            };

            context.stroke();
        };
        
    
        tile.forEach((curve) => {
            context.lineWidth = 17;
            context.strokeStyle = 'black';
            drawCurve(curve[0], curve[1])

            context.lineWidth = 15;
            context.strokeStyle = 'blue';
            drawCurve(curve[0], curve[1])

            context.lineWidth = 10;
            context.strokeStyle = 'yellow';
            drawCurve(curve[0], curve[1])

            context.lineWidth = 5;
            context.strokeStyle = 'red';
            drawCurve(curve[0], curve[1])
        });
    };

    let grid;

    const update = () => {
        grid = [];

        for (let row = 0; row < rows; row++) {
            grid[row] = [];

            for (let col = 0; col < cols; col++) {
                const tile = TILES[rnd(TILES.length)];

                grid[row][col] = tile;
            }
        }
    };

    const render = () => {
        context.clearRect(0, 0, width, height);
        context.strokeStyle = 'black';
        context.lineWidth = 2;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * TILE_SIZE;
                const y = row * TILE_SIZE;
                const tile = grid[row][col];

                if (tile) drawTile(tile, x, y);
            }
        }
    };

    const tick = () => {
        update();
        render();

        // requestAnimationFrame(tick);
    };

    canvas.addEventListener('pointerup', (e) => {
        tick();
    });

    tick();
};

export default run;
