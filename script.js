/ --- FILTRO DE PROYECTOS ---
// Funciona de forma genérica: lee data-filter de los botones
// y data-category de las tarjetas, sin importar cuántas categorías haya.
document.addEventListener('DOMContentLoaded', () => {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Quita "active" de todos los botones y lo pone solo en el clickeado
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const filterValue = button.getAttribute('data-filter');

            projectCards.forEach(card => {
                const cardCategories = card.getAttribute('data-category') || '';

                if (filterValue === 'all' || cardCategories.split(' ').includes(filterValue)) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

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
