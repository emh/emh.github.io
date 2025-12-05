document.querySelectorAll('nav ul li').forEach((li) => {
    const link = li.querySelector('a');

    if (!link) return;

    console.log(window.location.pathname, link.getAttribute('href'));

    if (window.location.pathname.endsWith(link.getAttribute('href'))) {
        li.classList.add('active');
    }
});
