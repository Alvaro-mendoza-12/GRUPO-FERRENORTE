// ===========================
// CARGAR DATOS DESDE SUPABASE
// ===========================

// Variables globales para almacenar los datos
let productos = [];
let categorias = [];

const REPRESENTATIVE_PRODUCTS = {
    1: [ // Productos Ferreteros
        { title: "Herramientas Profesionales", desc: "Amplia variedad de herramientas manuales para todo tipo de trabajo.", img: "img/PRODUCTOS FERRETEROS/heramientas.jpeg" },
        { title: "Equipos de Protección (EPP)", desc: "Seguridad industrial garantizada para tu equipo de trabajo.", img: "img/PRODUCTOS FERRETEROS/EPP .jpeg" },
        { title: "Discos de Corte", desc: "Discos abrasivos de alto rendimiento y durabilidad.", img: "img/PRODUCTOS FERRETEROS/discos de cortes.jpeg" },
        { title: "Cajas de Herramientas", desc: "Organización eficiente para transportar tus herramientas.", img: "img/PRODUCTOS FERRETEROS/caja de herramientas.jpeg" }
    ],
    2: [ // Muebles para Implementación Comercial
        { title: "Exhibidores Especializados", desc: "Muebles diseñados para destacar tus productos.", img: "img/MUEBLES PARA IMPLEMENTACION  COMERCIAL/estante para herramientas.jpeg" },
        { title: "Góndolas Comerciales", desc: "Optimiza el espacio de tu tienda y mejora la exhibición.", img: "img/MUEBLES PARA IMPLEMENTACION  COMERCIAL/estante para herramientas 2.jpeg" },
        { title: "Muebles a Medida", desc: "Diseños personalizados adaptados a tu espacio.", img: "img/MUEBLES PARA IMPLEMENTACION  COMERCIAL/estante para herramientas 3.jpeg" },
        { title: "Estantería Metálica", desc: "Soluciones de almacenamiento robustas y versátiles.", img: "img/MUEBLES PARA IMPLEMENTACION  COMERCIAL/estantería metálica.jpeg" }
    ],
    3: [ // Accesorios de Implementación
        { title: "Cestos de Mano", desc: "Canastillas ligeras y resistentes para compras rápidas.", img: "img/ACCESORIOS  DE IMPLEMENTACION/cesto de mano.jpeg" },
        { title: "Canastas con Ruedas", desc: "Mayor capacidad de carga con facilidad de movimiento.", img: "img/ACCESORIOS  DE IMPLEMENTACION/canasta con ruedas.jpeg" },
        { title: "Carritos de Compras", desc: "Carritos metálicos duraderos para autoservicio.", img: "img/ACCESORIOS  DE IMPLEMENTACION/carrito de compras.jpeg" },
        { title: "Ganchos y Portaprecios", desc: "Accesorios esenciales para la organización en estantes.", img: "img/ACCESORIOS  DE IMPLEMENTACION/Gancho doble con portaprecio.jpeg" }
    ]
};

// Función para cargar productos desde Supabase
async function cargarProductos() {
    try {
        const { data, error } = await supabaseClient
            .from('productos')
            .select('*')
            .eq('activo', true)
            .order('orden', { ascending: true });

        if (error) throw error;

        productos = data.map(p => ({
            id: p.id,
            titulo: p.titulo,
            descripcion: p.descripcion,
            imagen: p.imagen_url,
            badge: p.badge || '',
            badgeColor: p.badge_color || 'default',
            categoria_id: p.categoria_id // Vinculación con categoría
        }));

        incorporarProductosRepresentativos(); // Asegurar que los productos fijos estén presentes
        renderProductos();
    } catch (error) {
        console.error('Error cargando productos:', error);
        // Mostrar mensaje amigable al usuario
        const grid = document.getElementById('productsGrid');
        if (grid) {
            grid.innerHTML = '<p style="text-align: center; color: var(--gray-600);">No se pudieron cargar los productos. Por favor, intenta más tarde.</p>';
        }
    }
}

// Función para cargar categorías desde Supabase
async function cargarCategorias() {
    try {
        const { data: categoriasData, error: errorCategorias } = await supabaseClient
            .from('categorias')
            .select('*')
            .eq('activo', true)
            .order('orden', { ascending: true });

        if (errorCategorias) throw errorCategorias;

        // Para cada categoría, cargar sus imágenes
        categorias = await Promise.all(categoriasData.map(async (cat) => {
            const { data: imagenes, error: errorImagenes } = await supabaseClient
                .from('categoria_imagenes')
                .select('imagen_url')
                .eq('categoria_id', cat.id)
                .order('orden', { ascending: true });

            if (errorImagenes) throw errorImagenes;

            return {
                id: cat.id, // NECESARIO PARA FILTRAR
                titulo: cat.titulo,
                icon: cat.icon,
                descripcion: cat.descripcion,
                imagenes: imagenes.map(img => img.imagen_url),
                badge: cat.badge || ''
            };
        }));

        renderCategorias();
    } catch (error) {
        console.error('Error cargando categorías:', error);
        // Mostrar mensaje amigable al usuario
        const grid = document.getElementById('categoriesGrid');
        if (grid) {
            grid.innerHTML = '<p style="text-align: center; color: var(--gray-600);">No se pudieron cargar las categorías. Por favor, intenta más tarde.</p>';
        }
    }
}



function incorporarProductosRepresentativos() {
    let nextId = 1000; // ID base para evitar colisiones con IDs reales

    Object.keys(REPRESENTATIVE_PRODUCTS).forEach(catIdStr => {
        const catId = parseInt(catIdStr);
        const items = REPRESENTATIVE_PRODUCTS[catId];

        items.forEach(item => {
            // Verificar si ya existe un producto con esa imagen para no duplicar
            const existe = productos.some(p => p.imagen === item.img);

            if (!existe) {
                productos.push({
                    id: nextId++,
                    titulo: item.title,
                    descripcion: item.desc,
                    imagen: item.img,
                    badge: '',
                    badgeColor: 'default',
                    categoria_id: catId
                });
            } else {
                // Si existe, asegurarnos de que tenga la categoría correcta si le falta
                // Esto ayuda si la BD no tiene la columna categoria_id poblada correctamente
                const prod = productos.find(p => p.imagen === item.img);
                if (prod && !prod.categoria_id) {
                    prod.categoria_id = catId;
                }
            }
        });
    });
}

// ===========================
// RENDERIZADO DE CONTENIDO
// ===========================

function renderProductos() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (productos.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: var(--gray-600);">No hay productos disponibles en este momento.</p>';
        return;
    }

    grid.innerHTML = productos.map(producto => `
        <div class="product-card" onclick="verDetalleProducto(${producto.id})" style="cursor: pointer;">
            <div class="product-image">
                <img src="${producto.imagen}" alt="${producto.titulo}" loading="lazy">
                ${producto.badge ? `<div class="product-badge ${producto.badgeColor === 'new' ? 'new' : ''}">${producto.badge}</div>` : ''}
            </div>
            <div class="product-content">
                <h3 class="product-title">${producto.titulo}</h3>
                <p class="product-description">${producto.descripcion}</p>
                <button class="product-link" onclick="verDetalleProducto(${producto.id})">Consultar <i class="fas fa-arrow-right"></i></button>
            </div>
        </div>
    `).join('');
}

function renderCategorias() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;

    if (categorias.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: var(--gray-600);">No hay categorías disponibles en este momento.</p>';
        return;
    }

    grid.innerHTML = categorias.map((categoria, index) => `
        <div class="category-card ${categoria.inicialmenteActiva ? 'active' : ''}" onclick="verDetalleCategoria(${categoria.id})" style="cursor: pointer;">
            ${categoria.badge ? `<div class="featured-badge">${categoria.badge}</div>` : ''}
            <div class="category-header">
                <div class="category-icon">
                    <i class="${categoria.icon}"></i>
                </div>
                <h3 class="category-title">${categoria.titulo}</h3>
            </div>
            <div class="category-gallery">
                ${categoria.imagenes.map(img => `<img src="${img}" alt="Galería ${categoria.titulo}" class="gallery-img" loading="lazy">`).join('')}
            </div>
            <p class="category-description">
                ${categoria.descripcion}
            </p>
            <button class="category-btn" onclick="event.stopPropagation(); verDetalleCategoria(${categoria.id})">Ver Productos <i class="fas fa-chevron-right"></i></button>
        </div>
    `).join('');
}

// ===========================
// VISTA DETALLE DE CATEGORÍA
// ===========================

function verDetalleCategoria(id) {
    console.log("Abriendo categoría:", id);

    // 1. Buscar la categoría
    const categoria = categorias.find(c => c.id == id);
    if (!categoria) {
        console.error("Categoría no encontrada para ID:", id);
        return;
    }

    // 2. Ocultar secciones principales con seguridad
    const idsToHide = ['hero', 'categorias', 'productos'];
    idsToHide.forEach(idSection => {
        const el = document.getElementById(idSection);
        if (el) el.style.display = 'none';
    });

    const stats = document.querySelector('.stats-section');
    if (stats) stats.style.display = 'none';

    // 3. Configurar y mostrar vista detalle
    const detailView = document.getElementById('categoryDetailView');
    if (!detailView) {
        console.error("Elemento #categoryDetailView no encontrado");
        return;
    }

    // Actualizar textos
    const titleEl = document.getElementById('categoryDetailTitle');
    const descEl = document.getElementById('categoryDetailDesc');
    if (titleEl) titleEl.textContent = categoria.titulo;
    if (descEl) descEl.textContent = categoria.descripcion;

    // Filtrar y renderizar productos
    const productosFiltrados = productos.filter(p => p.categoria_id == id);
    const grid = document.getElementById('categoryProductsGrid');
    const noProductsMsg = document.getElementById('categoryNoProducts');

    if (grid) {
        if (productosFiltrados.length > 0) {
            grid.innerHTML = productosFiltrados.map(p => `
                <div class="product-card" onclick="verDetalleProducto(${p.id})" style="cursor: pointer;">
                    <div class="product-image">
                        <img src="${p.imagen}" alt="${p.titulo}" loading="lazy">
                        ${p.badge ? `<div class="product-badge ${p.badgeColor === 'new' ? 'new' : ''}">${p.badge}</div>` : ''}
                    </div>
                    <div class="product-content">
                        <h3 class="product-title">${p.titulo}</h3>
                        <p class="product-description">${p.descripcion}</p>
                        <button class="product-link">Consultar <i class="fas fa-arrow-right"></i></button>
                    </div>
                </div>
            `).join('');
            if (noProductsMsg) noProductsMsg.style.display = 'none';
        } else {
            grid.innerHTML = '';
            if (noProductsMsg) noProductsMsg.style.display = 'block';
        }
    }

    // Mostrar sección y subir scroll
    detailView.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function mostrarSeccionesPrincipales() {
    // 1. Ocultar vista detalle
    const detailView = document.getElementById('categoryDetailView');
    if (detailView) detailView.style.display = 'none';

    // 2. Restaurar secciones principales
    const idsToShow = ['hero', 'categorias', 'productos'];
    idsToShow.forEach(idSection => {
        const el = document.getElementById(idSection);
        if (el) el.style.display = ''; // Revert to CSS
    });

    const stats = document.querySelector('.stats-section');
    if (stats) stats.style.display = ''; // Revert to CSS
}

function volverAlInicio() {
    mostrarSeccionesPrincipales();

    // Scroll a la sección de categorías
    const cats = document.getElementById('categorias');
    if (cats) cats.scrollIntoView({ behavior: 'smooth' });
}


// Función para manejar la selección de categorías (click)
function seleccionarCategoria(elemento) {
    // Quitar clase active de todas las tarjetas
    document.querySelectorAll('.category-card').forEach(card => {
        card.classList.remove('active');
    });
    // Añadir clase active a la tarjeta clickeada
    elemento.classList.add('active');
}

// ===========================
// VISTA DETALLE DE PRODUCTO (MODAL)
// ===========================
function verDetalleProducto(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;

    document.getElementById('modalProductImage').src = producto.imagen;
    document.getElementById('modalProductTitle').innerText = producto.titulo;
    document.getElementById('modalProductDescription').innerText = producto.descripcion;

    // Badge
    const badge = document.getElementById('modalProductBadge');
    if (producto.badge) {
        badge.innerText = producto.badge;
        // Asumiendo que el color está en badgeColor por convención
        badge.className = 'product-detail-badge';
        if (producto.badgeColor === 'new') badge.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        else badge.style.background = 'var(--primary-orange)';
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }

    // WhatsApp Link
    const msg = `Hola, estoy interesado en el producto: *${producto.titulo}*`;
    const whatsappBtn = document.getElementById('modalWhatsAppBtn');
    whatsappBtn.href = `https://wa.me/51904068052?text=${encodeURIComponent(msg)}`;

    document.getElementById('productDetailModal').classList.add('active');
}

function cerrarModalProducto() {
    document.getElementById('productDetailModal').classList.remove('active');
}

// Cerrar modal al hacer click fuera
window.onclick = function (event) {
    const modal = document.getElementById('productDetailModal');
    if (event.target == modal) {
        cerrarModalProducto();
    }
}

// Inicializar renderizado
document.addEventListener('DOMContentLoaded', () => {
    // Cargar datos desde Supabase
    cargarProductos();
    cargarCategorias();
});

// ===========================
// MOBILE MENU TOGGLE
// ===========================
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navMenu = document.getElementById('navMenu');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        mobileMenuToggle.classList.toggle('active');
    });
}

// Close menu when clicking on a link
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        mostrarSeccionesPrincipales();
        const navMenu = document.getElementById('navMenu');
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        if (navMenu) navMenu.classList.remove('active');
        if (mobileMenuToggle) mobileMenuToggle.classList.remove('active');
    });
});

// ===========================
// HEADER SCROLL EFFECT
// ===========================
const header = document.getElementById('header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
});

// ===========================
// SMOOTH SCROLL & ACTIVE NAV
// ===========================
const sections = document.querySelectorAll('section[id]');

function setActiveNav() {
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');
        const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);

        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            navLinks.forEach(link => link.classList.remove('active'));
            if (navLink) {
                navLink.classList.add('active');
            }
        }
    });
}

window.addEventListener('scroll', setActiveNav);

// ===========================
// COUNTER ANIMATION
// ===========================
const statNumbers = document.querySelectorAll('.stat-number');
let hasAnimated = false;

function animateCounters() {
    const statsSection = document.querySelector('.stats-section');
    if (!statsSection) return;

    const statsSectionTop = statsSection.offsetTop;
    const statsSectionHeight = statsSection.offsetHeight;
    const scrollY = window.pageYOffset;

    if (scrollY > statsSectionTop - window.innerHeight / 2 &&
        scrollY < statsSectionTop + statsSectionHeight &&
        !hasAnimated) {

        hasAnimated = true;

        statNumbers.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-target'));
            const duration = 2000; // 2 seconds
            const increment = target / (duration / 16); // 60fps
            let current = 0;

            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    stat.textContent = Math.floor(current) + '+';
                    requestAnimationFrame(updateCounter);
                } else {
                    stat.textContent = target + '+';
                }
            };

            updateCounter();
        });
    }
}

window.addEventListener('scroll', animateCounters);

// ===========================
// SCROLL TO TOP BUTTON
// ===========================
const scrollTopBtn = document.getElementById('scrollTop');

if (scrollTopBtn) {
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }
    });

    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ===========================
// FORM HANDLING
// ===========================
const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get form data
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            subject: document.getElementById('subject').value,
            message: document.getElementById('message').value
        };

        // Create WhatsApp message
        const whatsappMessage = `
    *Nuevo Contacto desde la Web*

    *Nombre:* ${formData.name}
    *Email:* ${formData.email}
    *Teléfono:* ${formData.phone}
    *Asunto:* ${formData.subject}

    *Mensaje:*
    ${formData.message}
        `.trim();

        // Encode message for WhatsApp URL
        const encodedMessage = encodeURIComponent(whatsappMessage);

        // Replace with actual WhatsApp number (format: country code + number, no spaces or symbols)
        const whatsappNumber = '51904068052'; // Example: Peru number

        // Open WhatsApp
        window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');

        // Show success message
        alert('¡Gracias por contactarnos! Te redirigiremos a WhatsApp para completar tu consulta.');

        // Reset form
        contactForm.reset();
    });
}

// ===========================
// INTERSECTION OBSERVER FOR ANIMATIONS
// ===========================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

// Función para observar elementos con animación
function initializeAnimations() {
    const fadeInElements = document.querySelectorAll('.product-card, .category-card, .stat-card, .feature-item');

    const fadeInObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
                fadeInObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    fadeInElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        fadeInObserver.observe(element);
    });
}

// ===========================
// HERO PARALLAX EFFECT
// ===========================
const heroBackground = document.querySelector('.hero-background');

window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const parallaxSpeed = 0.5;

    if (heroBackground && scrolled < window.innerHeight) {
        heroBackground.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
    }
});

// ===========================
// DYNAMIC YEAR IN FOOTER
// ===========================
const currentYear = new Date().getFullYear();
const footerYear = document.querySelector('.footer-bottom p');
if (footerYear) {
    footerYear.innerHTML = footerYear.innerHTML.replace('2026', currentYear);
}

// ===========================
// LAZY LOADING IMAGES
// ===========================
function initializeLazyLoading() {
    const images = document.querySelectorAll('img[src]');

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => {
        imageObserver.observe(img);
    });
}

// ===========================
// PREVENT CLOSING MENU ON CLICK OUTSIDE (Mobile)
// ===========================
document.addEventListener('click', (e) => {
    if (navMenu && mobileMenuToggle &&
        !navMenu.contains(e.target) &&
        !mobileMenuToggle.contains(e.target) &&
        navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
    }
});

// ===========================
// FLOATING CARDS RANDOM MOVEMENT
// ===========================
const floatingCards = document.querySelectorAll('.floating-card');

floatingCards.forEach((card, index) => {
    setInterval(() => {
        const randomX = (Math.random() - 0.5) * 20;
        const randomY = (Math.random() - 0.5) * 20;

        card.style.transform = `translate(${randomX}px, ${randomY}px)`;
    }, 3000 + (index * 1000));
});

// ===========================
// SOCIAL LINKS CONFIGURATION
// ===========================
// Update these with actual social media links
const socialLinks = {
    whatsapp: 'https://wa.me/51904068052', // Replace with actual number
    facebook: 'https://facebook.com/grupoferrenorte',
    tiktok: 'https://tiktok.com/@grupoferrenorte',
    instagram: 'https://instagram.com/grupoferrenorte'
};

// Apply links to all social icons
document.querySelectorAll('.social-icon.whatsapp, .footer-social-link.whatsapp, .whatsapp-float').forEach(link => {
    link.href = socialLinks.whatsapp;
});

document.querySelectorAll('.social-icon.facebook, .footer-social-link.facebook').forEach(link => {
    link.href = socialLinks.facebook;
});

document.querySelectorAll('.social-icon.tiktok, .footer-social-link.tiktok').forEach(link => {
    link.href = socialLinks.tiktok;
});

document.querySelectorAll('.social-icon.instagram, .footer-social-link.instagram').forEach(link => {
    link.href = socialLinks.instagram;
});

// ===========================
// CONSOLE MESSAGE
// ===========================
console.log('%c✨ GRUPO FERRENORTE RO&MY E.I.R.L', 'color: #f59e0b; font-size: 20px; font-weight: bold;');
console.log('%cWebsite desarrollado con pasión 💙', 'color: #1e3a8a; font-size: 14px;');

// ===========================
// PERFORMANCE OPTIMIZATION
// ===========================
// Debounce function for scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply debounce to scroll-heavy functions
window.addEventListener('scroll', debounce(() => {
    setActiveNav();
}, 50));

// ===========================
// INITIALIZATION
// ===========================
document.addEventListener('DOMContentLoaded', async () => {
    document.body.classList.add('loaded');

    await Promise.all([
        cargarProductos(),
        cargarCategorias()
    ]);

    setTimeout(() => {
        initializeAnimations();
        initializeLazyLoading();
        setActiveNav();
    }, 100);
});
