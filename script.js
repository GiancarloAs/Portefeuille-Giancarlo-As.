// --- FILTRO DE PROYECTOS ---
// Funciona de forma genérica: lee data-filter de los botones
// y data-category de las tarjetas, sin importar cuántas categorías haya.
document.addEventListener('DOMContentLoaded', () => {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');

    function applyFilter(filterValue) {
        projectCards.forEach(card => {
            const cardCategories = card.getAttribute('data-category') || '';
            const isFeatured = card.getAttribute('data-featured') === 'true';

            let show;
            if (filterValue === 'all') {
                // En "Tous" solo se muestran las tarjetas marcadas como destacadas
                // (data-featured="true"), una por categoría idealmente.
                show = isFeatured;
            } else {
                show = cardCategories.split(' ').includes(filterValue);
            }

            card.style.display = show ? '' : 'none';
        });
    }

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            applyFilter(button.getAttribute('data-filter'));
        });
    });

    // Aplica el filtro "Tous" al cargar la página
    applyFilter('all');

    // --- MENÚ MÓVIL ---
    const mobileMenuToggle = document.getElementById('mobile-menu');
    const navbar = document.querySelector('.navbar');

    if (mobileMenuToggle && navbar) {
        mobileMenuToggle.addEventListener('click', () => {
            navbar.classList.toggle('open');
        });

        // Cierra el menú al hacer clic en un link (útil en móvil)
        navbar.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navbar.classList.remove('open');
            });
        });
    }
});
