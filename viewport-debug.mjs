// Opt-in, local-only diagnostics: no measurements are sent anywhere.
const probe = document.createElement('div');
probe.style.cssText = 'position:absolute;top:0;left:0;width:0;height:100dvh;visibility:hidden;pointer-events:none';
document.body.append(probe);

const round = value => Math.round(value * 100) / 100;
const bounds = element => {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { top: round(rect.top), height: round(rect.height), bottom: round(rect.bottom) };
};
const samples = [];

function measure(reason) {
    const viewport = window.visualViewport;
    const frame = document.getElementById('artwork');
    let canvas = document.getElementById('canvas');
    try {
        canvas ??= frame?.contentDocument?.querySelector('canvas');
    } catch { /* A navigating frame may not have a readable document yet. */ }
    return {
        reason,
        time: round(performance.now()),
        innerHeight: window.innerHeight,
        clientHeight: document.documentElement.clientHeight,
        scrollHeight: document.documentElement.scrollHeight,
        scrollY: round(window.scrollY),
        dynamicHeight: round(probe.getBoundingClientRect().height),
        visualViewport: viewport ? {
            height: round(viewport.height),
            offsetTop: round(viewport.offsetTop),
            scale: round(viewport.scale),
        } : null,
        gallery: bounds(document.querySelector('.gallery')),
        frame: bounds(frame),
        canvas: bounds(canvas),
    };
}

const panel = document.createElement('section');
panel.setAttribute('aria-label', 'Viewport diagnostics');
panel.style.cssText = 'position:fixed;z-index:100;top:50%;left:16px;transform:translateY(-50%);width:calc(100% - 32px);max-width:350px;padding:14px;background:white;color:black;border:1px solid black;font:14px/1.4 system-ui';
const instructions = document.createElement('p');
instructions.style.margin = '0 0 10px';
instructions.textContent = 'While the gap is visible, tap “Record gap”. Then pinch in and out and tap “Copy report”.';
const record = document.createElement('button');
record.textContent = 'Record gap';
const copy = document.createElement('button');
copy.textContent = 'Copy report';
for (const button of [record, copy]) {
    button.style.cssText = 'display:inline-block;width:auto;height:40px;padding:8px;border:1px solid black;margin-right:8px;color:black;background:white';
}
const output = document.createElement('textarea');
output.readOnly = true;
output.setAttribute('aria-label', 'Viewport report');
output.style.cssText = 'display:block;width:100%;height:120px;margin-top:10px;font:16px monospace';

function report() {
    return JSON.stringify({
        build: 'direct-canvas-2',
        browser: navigator.userAgent,
        piece: location.hash,
        screen: { width: screen.width, height: screen.height, dpr: devicePixelRatio },
        samples,
        current: measure('current'),
    }, null, 2);
}

record.addEventListener('click', () => {
    samples.push(measure('gap visible'));
    output.value = report();
    record.textContent = 'Gap recorded';
});
copy.addEventListener('click', async () => {
    output.value = report();
    try {
        await navigator.clipboard.writeText(output.value);
        copy.textContent = 'Copied';
    } catch {
        output.focus();
        output.select();
        copy.textContent = 'Select and copy below';
    }
});
samples.push(measure('diagnostics loaded'));
output.value = report();
panel.append(instructions, record, copy, output);
for (const event of ['pointerdown', 'pointerup', 'click']) {
    panel.addEventListener(event, event => event.stopPropagation());
}
document.body.append(panel);
