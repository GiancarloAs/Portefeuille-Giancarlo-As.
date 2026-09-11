// --- FILTRO DE PROYECTOS ---
// Funciona de forma genérica: lee data-filter de los botones
// y data-category de las tarjetas, sin importar cuántas categorías haya.
document.addEventListener('DOMContentLoaded', () => {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');
    const groupTitles = document.querySelectorAll('.group-title');

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

        // Los títulos de sección (Noraves / Wayruro / Mayu) solo tienen sentido
        // cuando se navega específicamente por "Motion Design".
        groupTitles.forEach(title => {
            const titleCategory = title.getAttribute('data-category') || '';
            title.style.display = (filterValue === titleCategory) ? '' : 'none';
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

    // --- MEJORAS DE CARRUSEL: flechas + degradado indicador (responsive) ---
    // Se arma por JS para no repetir el mismo markup en cada tarjeta del HTML.
    document.querySelectorAll('.mini-carousel').forEach(track => {
        const wrapper = document.createElement('div');
        wrapper.className = 'mini-carousel-wrapper';
        track.parentNode.insertBefore(wrapper, track);
        wrapper.appendChild(track);

        const fadeLeft = document.createElement('div');
        fadeLeft.className = 'mini-carousel-fade fade-left';
        const fadeRight = document.createElement('div');
        fadeRight.className = 'mini-carousel-fade fade-right';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'carousel-arrow arrow-prev';
        prevBtn.type = 'button';
        prevBtn.setAttribute('aria-label', 'Précédent');
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';

        const nextBtn = document.createElement('button');
        nextBtn.className = 'carousel-arrow arrow-next';
        nextBtn.type = 'button';
        nextBtn.setAttribute('aria-label', 'Suivant');
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';

        wrapper.append(fadeLeft, fadeRight, prevBtn, nextBtn);

        function updateEdges() {
            const maxScroll = track.scrollWidth - track.clientWidth;
            wrapper.classList.toggle('at-start', track.scrollLeft <= 4);
            wrapper.classList.toggle('at-end', track.scrollLeft >= maxScroll - 4);
        }

        // Avanza aproximadamente el ancho de una imagen + separación
        function scrollByCard(direction) {
            const item = track.querySelector('.mini-carousel-item, .video-carousel-item');
            const step = item ? item.getBoundingClientRect().width + 15 : 220;
            track.scrollBy({ left: direction * step, behavior: 'smooth' });
        }

        prevBtn.addEventListener('click', () => scrollByCard(-1));
        nextBtn.addEventListener('click', () => scrollByCard(1));
        track.addEventListener('scroll', updateEdges);
        window.addEventListener('resize', updateEdges);

        updateEdges();
    });

    // --- LIGHTBOX (ver imagen en grande al hacer click) ---
    const lightboxOverlay = document.getElementById('lightbox-overlay');
    const lightboxMedia = document.getElementById('lightbox-media');
    const lightboxBrand = document.getElementById('lightbox-brand');
    const lightboxDesc = document.getElementById('lightbox-desc');
    const lightboxClose = document.getElementById('lightbox-close');

    function openLightbox(item) {
        const mediaEl = item.querySelector('.mini-carousel-media');
        const brandEl = item.querySelector('.mini-carousel-caption strong');
        const descEl = item.querySelector('.mini-carousel-caption span');

        lightboxMedia.innerHTML = mediaEl ? mediaEl.innerHTML : '';
        lightboxBrand.textContent = brandEl ? brandEl.textContent : '';
        lightboxDesc.textContent = descEl ? descEl.textContent : '';
        lightboxOverlay.classList.add('active');
    }

    function closeLightbox() {
        lightboxOverlay.classList.remove('active');
    }

    document.querySelectorAll('.mini-carousel-item').forEach(item => {
        item.addEventListener('click', () => openLightbox(item));
    });

    lightboxClose.addEventListener('click', closeLightbox);

    // Cierra al hacer click fuera de la caja (en el fondo oscuro)
    lightboxOverlay.addEventListener('click', (e) => {
        if (e.target === lightboxOverlay) closeLightbox();
    });

    // Cierra con la tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
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
