import { get, set } from './html.mjs';
import { compareWords, emptyBoard, emptyRow } from './utils.js';

const STATES = {
    WELCOME: 'welcome',
    PLAYING: 'playing',
    PRACTICE: 'practice',
    FINISHED: 'finished'
};

const state = {
    puzzleNumber: 1,
    pair: [[], []],
    mistakes: 0,
    board: emptyBoard(),
    position: { x: 0, y: 1 },
    state: STATES.WELCOME,
    startedAt: null,
    endedAt: null
};

const isPlaying = () => state.state === STATES.PLAYING || state.state === STATES.PRACTICE;

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
            state.mistakes += 1;
            state.board.splice(state.position.y, 1, emptyRow());
            state.position.x = 0;
        } else if (state.position.x === 4 && compareWords(state.board[y], state.board[y - 1]) !== 4) {
            renderMessage(`${state.board[y].join('')} can only differ by one letter from ${state.board[y - 1].join('')}`);
            state.mistakes += 1;
            state.board.splice(state.position.y, 1, emptyRow());
            state.position.x = 0;
        } else if (state.position.x === 4 && y === state.board.length - 2) { //} && compareWords(state.board[y], state.board[y + 1]) === 4) {
            state.position = null;
            state.finishedAt = Date.now();
            state.state = STATES.FINISHED;
            render();
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
    get('footer').addEventListener('click', (e) => {
        if (e.target.dataset.key) handleKey(e.target.dataset.key);
    });

    document.addEventListener('keydown', (e) => handleKey(e.key));
};

const renderKeyboard = () => {
    const footer = get('footer');
    footer.innerHTML = '';

    if (!isPlaying()) {
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
        state.state = STATES.PLAYING;
        state.startedAt = Date.now();
        renderKeyboard();
        render();
    });

    get('#practice').addEventListener('click', () => {
        state.pair = randomPair();
        state.board = resetBoard(state.pair);
        state.position = { x: 0, y: 1 };
        state.state = STATES.PRACTICE;
        state.startedAt = Date.now();
        renderKeyboard();
        render();
    });
};

const renderFinish = (app) => {
    killKeyboard();

    const template = get('#finish-template');
    app.innerHTML = '';
    app.appendChild(template.content.cloneNode(true));

    get('#time').textContent = Math.floor((state.finishedAt - state.startedAt) / 1000);
    get('#mistakes').textContent = state.mistakes;
    get('#words').textContent = state.board.length - 2;

    const boardEl = renderBoard(state.board);

    get('#board-container').appendChild(boardEl);


    get('#share').addEventListener('click', () => {
        const share = [
            `Anagramish #${state.puzzleNumber}`,
            ...state.board.map((row) => row.map((c) => state.pair[0].includes(c) ? '🟨' : state.pair[1].includes(c) ? '🟧' : '🟦').join(''))
        ];

        const data = {
            text: share.join('\n')
        };

        if (navigator.canShare && navigator.canShare(data)) {
            navigator.share(data);
        } else {
            renderMessage('Share copied to clipboard');

            navigator.clipboard.writeText(data.text);
        }
    });
};

const getPositionClass = (y, x) => state.position?.x === x && state.position?.y === y ? 'current' : '';
const getCharClass = (char) => char === null ? 'normal' : state.pair[0].includes(char) ? 'start' : state.pair[1].includes(char) ? 'end' : 'misc';

const renderCell = (char, y, x) => set(`div.${[getPositionClass(y, x), getCharClass(char), 'cell'].join('.')}`, {}, char);
const renderRow = (chars, y) => chars.map((c, x) => renderCell(c, y, x));
const renderBoard = (board) => set('div.board', {}, ...board.flatMap((row, y) => renderRow(row, y)));

const render = () => {
    const app = get('main');

    if (state.state === STATES.WELCOME) {
        get('#back').style.display = 'none';
        renderWelcome(app);
        return;
    } else if (state.state === STATES.FINISHED) {
        get('#back').style.display = 'inline-block';
        renderFinish(app);
        return;
    }

    app.innerHTML = '';

    const boardEl = renderBoard(state.board);

    app.appendChild(boardEl);

    app.scrollTo(0, app.scrollHeight);
};

get('#back').addEventListener('click', () => {
    state.state = STATES.WELCOME;
    render();
});

setupHandlers();

render();
