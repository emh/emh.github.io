document.querySelectorAll('nav ul li').forEach((li) => {
    const link = li.querySelector('a');

    if (!link) return;

    if (window.location.pathname.endsWith(link.getAttribute('href'))) {
        li.classList.add('active');
    }
});
