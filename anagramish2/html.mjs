const parse = (spec) => {
    const [prefix, ...classes] = spec.split('.');
    const [name, id] = prefix.split('#');

    return [name, id, classes];
};

export const set = (spec, params = {}, ...children) => {
    const [name, id, classes] = parse(spec);

    const el = document.createElement(name);

    if (id) el.id = id;
    if (classes) classes.filter((c) => c.trim() !== '').forEach((c) => el.classList.add(c));

    Object.keys(params).forEach((k) => {
        el[k] = params[k];
    });

    el.append(...children.filter((c) => c));

    return el;
};

export const get = (spec) => {
    const els = document.querySelectorAll(spec);

    return els.length === 1 ? els[0] : els;
};
