import { get, set } from './html.mjs';
import { compareWords, emptyBoard, emptyRow } from './utils.js';

const state = {
    pair: [[], []],
    board: emptyBoard(),
    position: { x: 0, y: 1 },
    isPlaying: false,
    isPractice: false
};

const rnd = (n) => Math.floor(Math.random() * n);

const dictionary = await fetch('./dictionary.txt').then((r) => r.text()).then((text) => text.split('\n'));
const pairs = await fetch('./pairs.txt').then((r) => r.text()).then((text) => text.split('\n').map((line) => line.split(',')));

const randomPair = () => pairs[rnd(pairs.length)];

const resetBoard = (pair) => {
    const board = emptyBoard();
    board[0] = pair[0].split('');
    board[5] = pair[1].split('');
    return board;
};

const renderMessage = (message) => {
    const el = get('#message');

    el.textContent = message;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(el._timer);

    el._timer = setTimeout(() => el.classList.remove('show'), 3000);
};

const colorKeyboard = () => {
    get('.key').forEach((el) => {
        const key = el.dataset.key;

        if (key === 'Backspace') {
            el.classList.add('special');
        } else if (state.pair[0].includes(key)) {
            el.classList.add('start');
        } else if (state.pair[1].includes(key)) {
            el.classList.add('end');
        } else {
            el.classList.add('misc');
        }
    });
};

const handleKey = (key) => {
    if (key === 'Backspace') {
        if (state.position.x > 0) {
            state.board[state.position.y][state.position.x - 1] = null;
            state.position.x -= 1;
        }
    } else if (key >= 'a' && key <= 'z') {
        const { x, y } = state.position;

        state.board[y][x] = key;

        if (state.position.x === 4 && !dictionary.includes(state.board[y].join(''))) {
            renderMessage(`${state.board[y].join('')} is not in our dictionary`);
            state.board.splice(state.position.y, 1, emptyRow());
            state.position.x = 0;
        } else if (state.position.x === 4 && compareWords(state.board[y], state.board[y - 1]) !== 4) {
            renderMessage(`${state.board[y].join('')} can only differ by one letter from ${state.board[y - 1].join('')}`);
            state.board.splice(state.position.y, 1, emptyRow());
            state.position.x = 0;
        } else if (state.position.x === 4 && y === state.board.length - 2 && compareWords(state.board[y], state.board[y + 1]) === 4) {
            renderMessage('You win!');

            state.position = null;

            setTimeout(() => {
                state.isPlaying = false;
                render();
            }, 2000);
        } else {
            state.position.x += 1;

            if (state.position.x >= 5) {
                state.position.x = 0;
                state.position.y += 1;
            }

            if (state.position.y > state.board.length - 2) {
                state.board.splice(state.board.length - 1, 0, emptyRow());
            }
        }
    }

    render();
};

const setupHandlers = () => {
    get('.key').forEach((el) => el.addEventListener('click', (e) => handleKey(state, e.target.dataset.key)));

    document.addEventListener('keydown', (e) => handleKey(e.key));
};

const renderKeyboard = () => {
    const footer = get('footer');
    footer.innerHTML = '';

    if (!state.isPlaying) {
        return;
    }

    const template = get('#keyboard-template');
    footer.appendChild(template.content.cloneNode(true));
    footer.classList.add('visible');

    colorKeyboard();

    get('#back').style.display = 'inline-block';
};

const killKeyboard = () => {
    get('footer').innerHTML = '';
    get('footer').classList.remove('visible');
    get('#back').style.display = 'none';
};

const renderWelcome = (app) => {
    killKeyboard();

    const template = get('#welcome-template');
    app.innerHTML = '';
    app.appendChild(template.content.cloneNode(true));

    get('#play').addEventListener('click', () => {
        state.pair = randomPair();
        state.board = resetBoard(state.pair);
        state.position = { x: 0, y: 1 };
        state.isPlaying = true;
        state.isPractice = false;
        renderKeyboard();
        render();
    });

    get('#practice').addEventListener('click', () => {
        state.pair = randomPair();
        state.board = resetBoard(state.pair);
        state.position = { x: 0, y: 1 };
        state.isPlaying = true;
        state.isPractice = true;
        renderKeyboard();
        render();
    });
};

const render = () => {
    const app = get('main');

    if (!state.isPlaying) {
        renderWelcome(app);
        return;
    }

    const getPositionClass = (y, x) => state.position?.x === x && state.position?.y === y ? 'current' : '';
    const getCharClass = (char) => char === null ? 'normal' : state.pair[0].includes(char) ? 'start' : state.pair[1].includes(char) ? 'end' : 'misc';

    const renderCell = (char, y, x) => set(`div.${[getPositionClass(y, x), getCharClass(char), 'cell'].join('.')}`, {}, char);
    const renderRow = (chars, y) => chars.map((c, x) => renderCell(c, y, x));
    const renderBoard = (board) => set('div.board', {}, ...board.flatMap((row, y) => renderRow(row, y)));

    app.innerHTML = '';

    const boardEl = renderBoard(state.board);

    app.appendChild(boardEl);

    app.scrollTo(0, app.scrollHeight);
};

get('#back').addEventListener('click', () => {
    state.isPlaying = false;
    killKeyboard();
    render();
});

setupHandlers();

render();
