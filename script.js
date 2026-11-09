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

    // --- VISIONNEUSE (images + vidéos) ---
    // Plein écran, navigation (flèches / clavier / swipe), zoom (boutons, molette,
    // double-clic, pincement) et lecture des vidéos YouTube sans quitter le site.
    const lb = document.getElementById('lightbox-overlay');
    const stage = document.getElementById('lightbox-media');
    const lbBrand = document.getElementById('lightbox-brand');
    const lbDesc = document.getElementById('lightbox-desc');
    const lbCounter = document.getElementById('lb-counter');
    const lbYt = document.getElementById('lb-yt');
    const lbClose = document.getElementById('lightbox-close');
    const lbPrev = document.getElementById('lb-prev');
    const lbNext = document.getElementById('lb-next');
    const zoomInBtn = document.getElementById('lb-zoom-in');
    const zoomOutBtn = document.getElementById('lb-zoom-out');
    const zoomResetBtn = document.getElementById('lb-zoom-reset');
    const zoomLevel = document.getElementById('lb-zoom-level');

    const Z = { scale: 1, x: 0, y: 0, min: 1, max: 4 };
    let items = [];
    let index = 0;
    let imgEl = null;
    let lastFocus = null;

    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

    function parseRatio(el) {
        const raw = el && el.style.aspectRatio ? el.style.aspectRatio : '16 / 9';
        const [w, h] = raw.split('/').map(s => parseFloat(s));
        return (w && h) ? w / h : 16 / 9;
    }

    function nodeOf(el) {
        return el.closest('.mini-carousel-item, .video-carousel-item') || el.closest('.project-card');
    }

    function toEntry(node) {
        const thumb = node.querySelector('a.video-thumb');
        const cap = node.querySelector('.mini-carousel-caption, .video-carousel-caption');
        let brand = cap && cap.querySelector('strong') ? cap.querySelector('strong').textContent : '';
        const desc = cap && cap.querySelector('span') ? cap.querySelector('span').textContent : '';
        if (!cap) {
            const h3 = node.querySelector('h3');
            brand = h3 ? h3.textContent : '';
        }
        if (thumb) {
            return {
                type: 'video', node, brand, desc,
                id: thumb.dataset.videoId,
                ratio: parseRatio(thumb.closest('.video-embed-wrapper'))
            };
        }
        const img = node.querySelector('.mini-carousel-media img');
        if (img) {
            return { type: 'image', node, brand, desc, src: img.getAttribute('src'), full: img.dataset.full || '', alt: img.alt };
        }
        return null; // placeholder sans image : rien à agrandir
    }

    function collectGroup(node) {
        const track = node.closest('.mini-carousel');
        const nodes = track
            ? [...track.querySelectorAll(':scope > .mini-carousel-item, :scope > .video-carousel-item')]
            : [node];
        return nodes.map(toEntry).filter(Boolean);
    }

    // ----- zoom -----
    function applyZoom() {
        if (!imgEl) return;
        imgEl.style.transform = `translate(${Z.x}px, ${Z.y}px) scale(${Z.scale})`;
        stage.classList.toggle('zoomed', Z.scale > 1.001);
        zoomLevel.textContent = Math.round(Z.scale * 100) + '%';
    }

    function clampPan() {
        if (!imgEl) return;
        const r = stage.getBoundingClientRect();
        const mx = Math.max(0, (imgEl.offsetWidth * Z.scale - r.width) / 2);
        const my = Math.max(0, (imgEl.offsetHeight * Z.scale - r.height) / 2);
        Z.x = clamp(Z.x, -mx, mx);
        Z.y = clamp(Z.y, -my, my);
    }

    // cx, cy : point à conserver fixe, relatif au centre de la scène
    function zoomAt(newScale, cx = 0, cy = 0) {
        newScale = clamp(newScale, Z.min, Z.max);
        const k = newScale / Z.scale;
        Z.x = cx - (cx - Z.x) * k;
        Z.y = cy - (cy - Z.y) * k;
        Z.scale = newScale;
        if (Z.scale <= 1.001) { Z.scale = 1; Z.x = 0; Z.y = 0; }
        clampPan();
        applyZoom();
    }

    function resetZoom() {
        Z.scale = 1; Z.x = 0; Z.y = 0;
        applyZoom();
    }

    function centerOffset(e) {
        const r = stage.getBoundingClientRect();
        return { x: e.clientX - (r.left + r.width / 2), y: e.clientY - (r.top + r.height / 2) };
    }

    // ----- affichage -----
    function render() {
        const it = items[index];
        stage.innerHTML = '';
        imgEl = null;
        resetZoom();
        lb.classList.toggle('is-video', it.type === 'video');
        lb.classList.toggle('single', items.length < 2);
        lbYt.hidden = it.type !== 'video';

        if (it.type === 'image') {
            imgEl = new Image();
            imgEl.className = 'lb-img';
            imgEl.alt = it.alt || it.desc || it.brand;
            imgEl.draggable = false;
            imgEl.src = it.src;
            stage.appendChild(imgEl);
            // Version haute résolution chargée en arrière-plan pour un zoom net
            if (it.full) {
                const hi = new Image();
                hi.onload = () => { if (items[index] === it && imgEl) imgEl.src = it.full; };
                hi.src = it.full;
            }
        } else {
            const box = document.createElement('div');
            box.className = 'lb-video';
            box.style.setProperty('--r', it.ratio);
            const ifr = document.createElement('iframe');
            ifr.src = `https://www.youtube-nocookie.com/embed/${it.id}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;
            ifr.title = `${it.brand} — ${it.desc}`.trim();
            ifr.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen; web-share';
            ifr.allowFullscreen = true;
            ifr.referrerPolicy = 'strict-origin-when-cross-origin';
            box.appendChild(ifr);
            stage.appendChild(box);
            lbYt.href = `https://www.youtube.com/watch?v=${it.id}`;
        }

        lbBrand.textContent = it.brand;
        lbDesc.textContent = it.desc;
        lbCounter.textContent = items.length > 1 ? `${index + 1} / ${items.length}` : '';
    }

    function openViewer(node) {
        const group = collectGroup(node);
        const i = group.findIndex(en => en.node === node);
        if (i < 0) return;
        items = group;
        index = i;
        lastFocus = document.activeElement;
        render();
        lb.classList.add('active');
        document.body.classList.add('lb-open');
        lbClose.focus({ preventScroll: true });
    }

    function closeViewer() {
        if (!lb.classList.contains('active')) return;
        lb.classList.remove('active');
        document.body.classList.remove('lb-open');
        stage.innerHTML = ''; // détruit l'iframe : la vidéo s'arrête
        imgEl = null;
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }

    function go(dir) {
        if (items.length < 2) return;
        index = (index + dir + items.length) % items.length;
        render();
    }

    // Ouverture : clic sur un visuel ou sur une miniature de vidéo
    document.addEventListener('click', (e) => {
        const thumb = e.target.closest('a.video-thumb');
        if (thumb) {
            e.preventDefault();
            openViewer(nodeOf(thumb));
            return;
        }
        const item = e.target.closest('.mini-carousel-item');
        if (item) openViewer(item);
    });

    lbClose.addEventListener('click', closeViewer);
    lbPrev.addEventListener('click', () => go(-1));
    lbNext.addEventListener('click', () => go(1));
    zoomInBtn.addEventListener('click', () => zoomAt(Z.scale * 1.4));
    zoomOutBtn.addEventListener('click', () => zoomAt(Z.scale / 1.4));
    zoomResetBtn.addEventListener('click', resetZoom);

    // Clic sur le fond sombre = fermer (sauf fin de glissement)
    let suppressClick = false;
    lb.addEventListener('click', (e) => {
        if (suppressClick) { suppressClick = false; return; }
        if (e.target === lb || e.target === stage) closeViewer();
    });

    // Molette = zoom vers le curseur
    stage.addEventListener('wheel', (e) => {
        if (!imgEl) return;
        e.preventDefault();
        const o = centerOffset(e);
        zoomAt(Z.scale * (e.deltaY < 0 ? 1.18 : 1 / 1.18), o.x, o.y);
    }, { passive: false });

    // Double-clic : zoom 2.5x / retour
    stage.addEventListener('dblclick', (e) => {
        if (!imgEl || e.target !== imgEl) return;
        if (Z.scale > 1.001) resetZoom();
        else { const o = centerOffset(e); zoomAt(2.5, o.x, o.y); }
    });

    // Glisser pour déplacer (zoomé), pincer pour zoomer, swipe pour changer d'image
    const pts = new Map();
    let dragStart = null;
    let pinchStart = null;

    stage.addEventListener('pointerdown', (e) => {
        if (!imgEl) return;
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        stage.setPointerCapture(e.pointerId);
        if (pts.size === 1) {
            dragStart = { x: e.clientX, y: e.clientY, ox: Z.x, oy: Z.y };
        } else if (pts.size === 2) {
            const [p, q] = [...pts.values()];
            pinchStart = { d: Math.hypot(p.x - q.x, p.y - q.y), s: Z.scale };
            dragStart = null;
        }
    });

    stage.addEventListener('pointermove', (e) => {
        if (!pts.has(e.pointerId)) return;
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size === 2 && pinchStart) {
            const [p, q] = [...pts.values()];
            const d = Math.hypot(p.x - q.x, p.y - q.y);
            const r = stage.getBoundingClientRect();
            zoomAt(pinchStart.s * d / pinchStart.d,
                (p.x + q.x) / 2 - (r.left + r.width / 2),
                (p.y + q.y) / 2 - (r.top + r.height / 2));
            suppressClick = true;
        } else if (dragStart && Z.scale > 1.001) {
            Z.x = dragStart.ox + (e.clientX - dragStart.x);
            Z.y = dragStart.oy + (e.clientY - dragStart.y);
            clampPan();
            applyZoom();
            stage.classList.add('dragging');
            if (Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y) > 5) suppressClick = true;
        }
    });

    function endPointer(e) {
        const had = pts.has(e.pointerId);
        pts.delete(e.pointerId);
        stage.classList.remove('dragging');
        if (had && pts.size === 0 && dragStart && Z.scale <= 1.001) {
            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;
            if (Math.abs(dx) > 60 && Math.abs(dy) < 60) { suppressClick = true; go(dx < 0 ? 1 : -1); }
        }
        if (pts.size < 2) pinchStart = null;
        if (pts.size === 0) dragStart = null;
        else if (pts.size === 1) {
            const p = [...pts.values()][0];
            dragStart = { x: p.x, y: p.y, ox: Z.x, oy: Z.y };
        }
        if (suppressClick) setTimeout(() => { suppressClick = false; }, 0);
    }
    stage.addEventListener('pointerup', endPointer);
    stage.addEventListener('pointercancel', endPointer);

    // Clavier
    document.addEventListener('keydown', (e) => {
        if (!lb.classList.contains('active')) return;
        if (e.key === 'Escape') closeViewer();
        else if (e.key === 'ArrowLeft') go(-1);
        else if (e.key === 'ArrowRight') go(1);
        else if (e.key === '+' || e.key === '=') zoomAt(Z.scale * 1.4);
        else if (e.key === '-' || e.key === '_') zoomAt(Z.scale / 1.4);
        else if (e.key === '0') resetZoom();
    });

    // --- MENÚ MÓVIL ---
    const mobileMenuToggle = document.getElementById('mobile-menu');
    const navbar = document.querySelector('.navbar');

    if (mobileMenuToggle && navbar) {
        const setMenu = (open) => {
            navbar.classList.toggle('open', open);
            mobileMenuToggle.setAttribute('aria-expanded', String(open));
            mobileMenuToggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
        };
        mobileMenuToggle.addEventListener('click', () => setMenu(!navbar.classList.contains('open')));

        // Cierra el menú al hacer clic en un link (útil en móvil)
        navbar.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => setMenu(false));
        });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
    }

    // --- HEADER : fond au défilement, se cache en descendant ---
    const header = document.getElementById('header');
    if (header) {
        let lastY = window.scrollY;
        const onScroll = () => {
            const y = window.scrollY;
            header.classList.toggle('scrolled', y > 24);
            const menuOpen = navbar && navbar.classList.contains('open');
            header.classList.toggle('hidden', y > 400 && y > lastY + 4 && !menuOpen);
            if (y < lastY - 4 || y <= 400) header.classList.remove('hidden');
            lastY = y;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // --- HERO : séquence d'entrée ---
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('is-ready')));

    // Pastille entre les mots : les visuels défilent l'un après l'autre
    document.querySelectorAll('.pill--swap').forEach((pill) => {
        const imgs = [...pill.querySelectorAll('img')];
        if (!imgs.length) return;
        let i = 0;
        imgs[0].classList.add('is-active');
        if (reduceMotion || imgs.length < 2) return;
        setInterval(() => {
            if (document.hidden) return;
            const cur = imgs[i];
            i = (i + 1) % imgs.length;
            imgs.forEach((im) => im.classList.remove('is-leaving'));
            cur.classList.remove('is-active');
            cur.classList.add('is-leaving');
            imgs[i].classList.add('is-active');
        }, 2200);
    });

    // Autocollant : Norita tourne sur elle-même, image par image
    document.querySelectorAll('.sticker--norita').forEach((st) => {
        const frames = [...st.querySelectorAll('img')];
        if (!frames.length) return;
        frames[0].classList.add('is-active');
        if (reduceMotion || frames.length < 2) return;
        const show = (n) => frames.forEach((f, k) => f.classList.toggle('is-active', k === n));
        const spin = () => {
            if (document.hidden) { setTimeout(spin, 1000); return; }
            let k = 0;
            const step = () => {
                k++;
                if (k > frames.length) { show(0); setTimeout(spin, 2200); return; }
                show(k % frames.length);
                setTimeout(step, 170);
            };
            step();
        };
        setTimeout(spin, 2600);
        st.addEventListener('mouseenter', () => { let k = 0; const t = setInterval(() => { show(++k % frames.length); if (k >= frames.length * 2) { clearInterval(t); show(0); } }, 110); });
    });

    // --- TITRES : la partie calligraphiée « s'écrit » à l'apparition ---
    const scripts = document.querySelectorAll('.section-title .t-script, .about-title .t-script, .contact-title .t-script');
    scripts.forEach((el) => el.classList.add('reveal-script'));
    if ('IntersectionObserver' in window && !reduceMotion) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                if (en.isIntersecting) {
                    en.target.querySelectorAll('.reveal-script').forEach((s) => s.classList.add('in-view'));
                    io.unobserve(en.target);
                }
            });
        }, { threshold: 0.5 });
        // On observe le titre parent : le clip-path du texte masqué fausserait la détection
        new Set([...scripts].map((el) => el.parentElement)).forEach((t) => io.observe(t));
    } else {
        scripts.forEach((el) => el.classList.add('in-view'));
    }

    // --- APERÇU DE SITE (iframe 1280x720 mis à l'échelle de sa carte) ---
    document.querySelectorAll('.site-preview').forEach((box) => {
        const baseW = parseFloat(box.dataset.baseWidth) || 1280;
        const fit = () => box.style.setProperty('--preview-scale', (box.clientWidth / baseW).toFixed(4));
        fit();
        if ('ResizeObserver' in window) new ResizeObserver(fit).observe(box);
        else window.addEventListener('resize', fit);
    });
});
