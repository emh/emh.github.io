import { get, set } from './html.mjs';
import { compareWords, emptyBoard, emptyRow } from './utils.js';

const STATES = {
    WELCOME: 'welcome',
    PLAYING: 'playing',
    FINISHED: 'finished',
    HISTORY: 'history'
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

const todaysPair = (puzzleNumber) => pairs[puzzleNumber];

const formatElapsedTime = (numSeconds) => {
    const minutes = Math.floor(numSeconds / 60);
    const seconds = numSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const getShareText = () => [
    `Anagramish #${state.puzzleNumber} in ${formatElapsedTime(state.numSeconds)}`,
    ...state.board.map((row) => row.map((c) => state.pair[0].includes(c) ? '🟦' : state.pair[1].includes(c) ? '🟧' : '⬜').join(''))
].join('\n');

const copyShareText = async () => {
    try {
        await navigator.clipboard.writeText(getShareText());
        renderMessage('The share was copied.');
    } catch {
        renderMessage('Unable to copy share.');
    }
};

const getSavedPuzzleNumber = (date, game) => {
    if (Number.isInteger(game?.puzzleNumber)) {
        return game.puzzleNumber;
    }

    const puzzleNumber = calcIndex(new Date(date), pairs.length);

    return Number.isFinite(puzzleNumber) ? puzzleNumber : 1;
};

const formatHistoryEntry = (date, game) => {
    const puzzleNumber = getSavedPuzzleNumber(date, game);
    const start = (game?.pair?.[0] ?? '').toUpperCase();
    const end = (game?.pair?.[1] ?? '').toUpperCase();
    const time = formatElapsedTime(game?.numSeconds ?? 0);
    const words = Array.isArray(game?.words) ? game.words.length : 0;
    const mistakes = Number.isFinite(game?.mistakes) ? game.mistakes : 0;

    return {
        top: `${date} #${puzzleNumber} ${start} ${end}`,
        bottom: `${time} ${words} words ${mistakes} mistakes`
    };
};

export const getHistory = () => JSON.parse(localStorage.getItem('history')) ?? {};

export const putHistory = (history) => localStorage.setItem('history', JSON.stringify(history));

const loadGame = () => {
    if (state.isPractice) {
        return JSON.parse(localStorage.getItem('practice'));
    }

    return getHistory()[key()];
};

const initTodaysGame = () => {
    const puzzleNumber = calcIndex(new Date(key()), pairs.length);
    const pair = todaysPair(puzzleNumber);

    return {
        pair,
        puzzleNumber,
        state: STATES.PLAYING,
        numSeconds: 0,
        words: [],
        mistakes: 0
    };
};

const initPracticeGame = () => ({
    pair: randomPair(),
    state: STATES.PLAYING,
    numSeconds: 0,
    words: [],
    mistakes: 0
});

const hydrateGameState = (game, isPractice) => {
    state.puzzleNumber = game.puzzleNumber ?? (isPractice ? state.puzzleNumber : 1);
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
    state.state = game.state === STATES.FINISHED ? STATES.FINISHED : STATES.PLAYING;
    state.numSeconds = game.numSeconds;
    state.mistakes = game.mistakes;

    renderKeyboard();
    if (state.state === STATES.PLAYING) startClock();
    render();
};

const startGame = (isPractice) => {
    stopClock();

    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }

    state.isPractice = isPractice;

    let game = loadGame();

    if (!game) {
        game = isPractice ? initPracticeGame() : initTodaysGame();
        saveGame(game);
    }

    hydrateGameState(game, isPractice);
};

const saveGame = (game) => {
    if (state.isPractice) {
        localStorage.setItem('practice', JSON.stringify(game));
        return;
    }

    const history = getHistory();

    history[key()] = game;

    putHistory(history);
};

const updateSavedGame = () => {
    const game = loadGame();

    game.pair = state.pair;
    game.puzzleNumber = state.puzzleNumber;
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

    state.timer = setInterval(fn, 1000);
};

const stopClock = () => {
    if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
    }
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
    if (state.state !== STATES.PLAYING || state.position === null) {
        return;
    }

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

    get('main').addEventListener('click', (e) => {
        if (!(e.target instanceof Element)) {
            return;
        }

        const cell = e.target.closest('.cell');

        if (!cell) {
            return;
        }

        const letter = cell.textContent.trim().toLowerCase();

        if (letter.length === 1 && letter >= 'a' && letter <= 'z') {
            handleKey(letter);
        }
    });

    document.addEventListener('keydown', (e) => handleKey(e.key));
};

const renderKeyboard = () => {
    const footer = get('footer');
    footer.innerHTML = '';

    if (state.state !== STATES.PLAYING) {
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
    stopClock();
    killKeyboard();

    const template = get('#welcome-template');
    app.innerHTML = '';
    app.appendChild(template.content.cloneNode(true));

    get('#play').addEventListener('click', () => {
        startGame(false);
    });

    get('#practice').addEventListener('click', () => {
        startGame(true);
    });

    get('#history').addEventListener('click', () => {
        state.state = STATES.HISTORY;
        render();
    });
};

const renderFinish = (app) => {
    killKeyboard();
    stopClock();

    const template = get('#finish-template');
    app.innerHTML = '';
    app.appendChild(template.content.cloneNode(true));

    get('#time').textContent = formatElapsedTime(state.numSeconds);
    get('#mistakes').textContent = state.mistakes;
    get('#words').textContent = state.board.length - 2;
    get('#puzzle-number').textContent = `#${state.puzzleNumber}`;

    const boardEl = renderBoard(state.board);

    get('#board-container').appendChild(boardEl);

    get('#practice').addEventListener('click', () => {
        startGame(true);
    });

    get('#history').addEventListener('click', () => {
        state.state = STATES.HISTORY;
        render();
    });

    if (!state.isPractice) {
        get('#copy').addEventListener('click', () => {
            copyShareText();
        });

        get('#share').addEventListener('click', () => {
            const data = {
                text: getShareText()
            };

            if (navigator.canShare && navigator.canShare(data)) {
                navigator.share(data).catch(() => {});
            } else {
                copyShareText();
            }
        });
    } else {
        get('#share').style.display = 'none';
        get('#copy').style.display = 'none';
        get('#puzzle-number').style.display = 'none';
    }
};

const renderHistory = (app) => {
    stopClock();
    killKeyboard();

    const template = get('#history-template');
    app.innerHTML = '';
    app.appendChild(template.content.cloneNode(true));

    const history = getHistory();
    const entries = Object.entries(history)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, game]) => formatHistoryEntry(date, game));

    const list = get('#history-list');

    if (entries.length === 0) {
        list.textContent = 'No games yet.';
        return;
    }

    entries.forEach((entry) => {
        list.appendChild(
            set(
                'div.history-entry',
                {},
                set('span.history-top', {}, entry.top),
                set('span.history-bottom', {}, entry.bottom)
            )
        );
    });
};

const getPositionClass = (y, x) => state.position?.x === x && state.position?.y === y ? 'current' : '';
const getCharClass = (char) => char === null ? 'normal' : state.pair[0].includes(char) ? 'start' : state.pair[1].includes(char) ? 'end' : 'misc';

const renderCell = (char, y, x) => set(`div.${[getPositionClass(y, x), getCharClass(char), 'cell'].join('.')}`, {}, char);
const renderRow = (chars, y) => chars.map((c, x) => renderCell(c, y, x));
const renderBoard = (board) => set('div.board', {}, ...board.flatMap((row, y) => renderRow(row, y)));

const renderHeaderButtons = () => {
    get('#back').style.display = state.state === STATES.WELCOME ? 'none' : 'inline-block';
    get('#reset').style.display = state.isPractice && state.state === STATES.PLAYING ? 'inline-block' : 'none';
};

const render = () => {
    const app = get('main');
    renderHeaderButtons();

    if (state.state === STATES.WELCOME) {
        renderWelcome(app);
        return;
    } else if (state.state === STATES.FINISHED) {
        renderFinish(app);
        return;
    } else if (state.state === STATES.HISTORY) {
        renderHistory(app);
        return;
    }

    app.innerHTML = '';

    const boardEl = renderBoard(state.board);

    app.appendChild(boardEl);

    app.scrollTo(0, app.scrollHeight);
};

get('#back').addEventListener('click', () => {
    stopClock();
    state.state = STATES.WELCOME;
    render();
});

get('#reset').addEventListener('click', () => {
    if (!state.isPractice) {
        return;
    }

    localStorage.removeItem('practice');
    startGame(true);
});

setupHandlers();

render();
