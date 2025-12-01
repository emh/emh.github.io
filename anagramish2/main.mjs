import { get, set } from './html.mjs';
import { compareWords, emptyBoard, emptyRow } from './utils.js';

const STATES = {
    WELCOME: 'welcome',
    PLAYING: 'playing',
    FINISHED: 'finished'
};

const state = {
    puzzleNumber: 1,
    pair: [[], []],
    isPractice: false,
    mistakes: 0,
    board: emptyBoard(),
    position: { x: 0, y: 1 },
    state: STATES.WELCOME,
    numSeconds: 0
};

const rnd = (n) => Math.floor(Math.random() * n);

const dictionary = await fetch('./dictionary.txt').then((r) => r.text()).then((text) => text.split('\n'));
const pairs = await fetch('./pairs.txt').then((r) => r.text()).then((text) => text.split('\n').map((line) => line.split(',')));

const key = () => {
    const d = new Date(); // local time

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const calcIndex = (seed, n) => {
    const f = Math.PI - 3; // need a number > 0 and < 1
    const s = seed.valueOf() / 1000;
    const r = (s * f) - Math.floor(s * f);
    const i = Math.floor(n * r);

    return i;
};

const randomPair = () => pairs[rnd(pairs.length)];

const todaysPair = () => pairs[calcIndex(new Date(key()), pairs.length)];

export const getHistory = () => JSON.parse(localStorage.getItem('history')) ?? {};

export const putHistory = (history) => localStorage.setItem('history', JSON.stringify(history));

const loadGame = () => getHistory()[key()];

const initTodaysGame = () => {
    const pair = todaysPair();

    return {
        pair,
        numSeconds: 0,
        words: [],
        mistakes: 0
    };
};

const saveGame = (game) => {
    const history = getHistory();

    history[key()] = game;

    putHistory(history);
};

const updateSavedGame = () => {
    if (state.isPractice) {
        return;
    }

    const game = loadGame();

    game.pair = state.pair;
    game.numSeconds = state.numSeconds;
    game.state = state.state;

    state.board.slice(1, -1).forEach((row, i) => {
        if (state.position === null || i < state.position.y - 1) {
            game.words[i] = row.join('');
        }
    });

    game.mistakes = state.mistakes;

    saveGame(game);
};

const startClock = () => {
    const fn = () => {
        state.numSeconds += 1;

        updateSavedGame();
    };

    fn();

    state.timer = setInterval(fn, 1000);
};

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

        if (key === 'Backspace' || key === 'Enter') {
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
    } else if (key >= 'a' && key <= 'z' && state.position.x <= 4) {
        const { x, y } = state.position;

        state.board[y][x] = key;
        state.position.x += 1;
    } else if (key === 'Enter' && state.position.x === 5) {
        const { y } = state.position;

        if (!dictionary.includes(state.board[y].join(''))) {
            renderMessage(`${state.board[y].join('')} is not in our dictionary`);
            state.mistakes += 1;
            state.board.splice(state.position.y, 1, emptyRow());
            state.position.x = 0;
        } else if (compareWords(state.board[y], state.board[y - 1]) !== 4) {
            renderMessage(`${state.board[y].join('')} can only differ by one letter from ${state.board[y - 1].join('')}`);
            state.mistakes += 1;
            state.board.splice(state.position.y, 1, emptyRow());
            state.position.x = 0;
        } else if (y === state.board.length - 2 && compareWords(state.board[y], state.board[y + 1]) === 4) {
            state.position = null;
            state.state = STATES.FINISHED;
        } else {
            state.position.x = 0;
            state.position.y += 1;

            if (state.position.y > state.board.length - 2) {
                state.board.splice(state.board.length - 1, 0, emptyRow());
            }
        }

        updateSavedGame();
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

    if (state === STATES.PLAYING) {
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
        let game = loadGame();

        if (!game) {
            game = initTodaysGame();
            saveGame(game);
        }

        state.pair = game.pair;
        state.board = resetBoard(state.pair);

        let i = game.words.length - 3;

        if (game.state === STATES.FINISHED) i--;

        while (i > 0) {
            state.board.splice(state.board.length - 1, 0, emptyRow());
            i -= 1;
        }

        game.words.forEach((word, i) => {
            state.board[i + 1] = word.split('');
        });

        state.position = { x: 0, y: game.words.length + 1 };
        state.state = game.state;
        state.isPractice = false;
        state.numSeconds = game.numSeconds;
        state.mistakes = game.mistakes;

        renderKeyboard();
        if (state.state === STATES.PLAYING) startClock();
        render();
    });

    get('#practice').addEventListener('click', () => {
        state.pair = randomPair();
        state.board = resetBoard(state.pair);
        state.position = { x: 0, y: 1 };
        state.state = STATES.PLAYING;
        state.isPractice = true;
        renderKeyboard();
        render();
    });
};

const renderFinish = (app) => {
    killKeyboard();

    if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
    }

    const template = get('#finish-template');
    app.innerHTML = '';
    app.appendChild(template.content.cloneNode(true));

    get('#time').textContent = state.numSeconds;
    get('#mistakes').textContent = state.mistakes;
    get('#words').textContent = state.board.length - 2;

    const boardEl = renderBoard(state.board);

    get('#board-container').appendChild(boardEl);

    get('#practice').addEventListener('click', () => {
        state.pair = randomPair();
        state.board = resetBoard(state.pair);
        state.position = { x: 0, y: 1 };
        state.state = STATES.PLAYING;
        state.isPractice = true;
        renderKeyboard();
        render();
    });

    if (!state.isPractice) {
        get('#share').addEventListener('click', () => {
            const share = [
                `Anagramish #${state.puzzleNumber}`,
                ...state.board.map((row) => row.map((c) => state.pair[0].includes(c) ? '🟦' : state.pair[1].includes(c) ? '🟧' : '⬜').join(''))
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
    } else {
        get('#share').style.display = 'none';
    }
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
