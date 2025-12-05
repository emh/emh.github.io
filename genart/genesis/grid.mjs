const moveToFront = (dialog) => {
    const dialogs = document.querySelectorAll('dialog');
    let maxZ = 0;

    dialogs.forEach((d) => {
        const z = parseInt(window.getComputedStyle(d).zIndex) || 0;
        
        if (z > maxZ) {
            maxZ = z;
        }
        
        d.dataset.active = false;
    });

    dialog.style.zIndex = maxZ + 1;
    dialog.dataset.active = true;
}

const createDialog = (theme) => {
    const clone = document.getElementById('dialog-template').content.cloneNode(true);
    const dialog = clone.querySelector('dialog');
    const iframe = dialog.querySelector('iframe');

    dialog.querySelector('.title').textContent = theme;
    iframe.src = `viewer.html#${theme}`;
    dialog.querySelector('.close').addEventListener('click', () => {
        dialog.close();
        dialog.remove();
    });

    const header = dialog.querySelector('header');

    let offsetX = 0;
    let offsetY = 0;

    const handleMouseMove = (e) => {
        dialog.style.left = `${e.clientX - offsetX}px`;
        dialog.style.top = `${e.clientY - offsetY}px`;
    };

    const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        iframe.style.pointerEvents = 'auto';
    };

    header.addEventListener('mousedown', (e) => {
        e.preventDefault();
        moveToFront(dialog);

        const rect = dialog.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        iframe.style.pointerEvents = 'none';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp, { once: true });
    });

    document.body.appendChild(clone);
    moveToFront(dialog);

    return dialog;
};

document.querySelector('main').addEventListener('click', (event) => {
    const day = event.target.closest('.day');

    if (!day) return;

    const theme = day.querySelector('.theme')?.textContent.trim();

    if (!theme) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    if (width < 600 || height < 600) {
        window.open(`viewer.html#${theme}`, '_blank');
        return;
    }

    const dialog = createDialog(theme);

    dialog.show();
});
