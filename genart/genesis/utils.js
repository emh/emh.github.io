export const rnd = (n, m = 0) => Math.floor(Math.random() * (n - m) + m);
export const times = (n, fn) => Array.from({ length: n }, fn);
