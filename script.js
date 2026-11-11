function safeDocumentURL(value) {
    const url = String(value || '').trim();
    return /^https:\/\//i.test(url) ? url : '';
}

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
}

// ===========================
// CARGAR DATOS DESDE SUPABASE
// ===========================

// Variables globales para almacenar los datos
let productos = [];
let categorias = [];
let catalogReady = false;
const DEFAULT_WHATSAPP_NUMBER = '51931137799';
// Carrito y Selección
let socialLinks = {
    whatsapp: `https://wa.me/${DEFAULT_WHATSAPP_NUMBER}`,
    facebook: 'https://facebook.com/grupoferrenorte',
    tiktok: 'https://tiktok.com/@grupoferrenorte',
    instagram: 'https://instagram.com/grupoferrenorte'
};

function normalizarWhatsAppNumber(rawValue) {
    const digits = String(rawValue || '').replace(/\D/g, '');
    if (!digits) return DEFAULT_WHATSAPP_NUMBER;
    if (digits.length === 9) return `51${digits}`;
    return digits;
}

function getWhatsAppNumber() {
    const fromLink = socialLinks.whatsapp.replace(/\D/g, '');
    return normalizarWhatsAppNumber(fromLink);
}

function syncBodyScrollLock() {
    const navOpen = document.getElementById('navMenu')?.classList.contains('active');
    const sidebarOpen = document.getElementById('quoteSidebar')?.classList.contains('active');
    const productOpen = document.getElementById('productDetailModal')?.classList.contains('active');
    document.body.classList.toggle('menu-open', Boolean(navOpen || sidebarOpen || productOpen));
    const navBackdrop = document.getElementById('mobileNavBackdrop');
    if (navBackdrop) navBackdrop.classList.toggle('active', Boolean(navOpen));
}

let quoteCart = [];
try {
    const saved = localStorage.getItem('ferrenorte_quote');
    if (saved) {
        quoteCart = JSON.parse(saved);
        quoteCart = quoteCart.filter(item => item && /^[0-9]+(?:_[0-9]+)?$/.test(String(item.id)) && typeof item.titulo === 'string' && item.titulo.trim()).map(item => ({
            id: String(item.id), originalId: item.originalId,
            titulo: item.titulo, variante: typeof item.variante === 'string' ? item.variante : null,
            imagen: typeof item.imagen === 'string' ? item.imagen : 'img/logo.jpeg',
            precio: Number.isFinite(Number(item.precio)) && Number(item.precio) > 0 ? Number(item.precio) : 0,
            qty: Math.max(1, Math.min(999, Math.floor(Number(item.qty)) || 1))
        }));
    }
} catch (e) {
    console.error("Error parsing cart:", e);
    quoteCart = [];
}
let productReturnFocus = null;
let quoteReturnFocus = null;
let currentModalProduct = null;
let variantRequestId = 0;
let selectedVariant = null; // Variante seleccionada en el modal actual

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

        productos = (data || []).map(p => ({
            id: p.id,
            titulo: p.titulo || 'Producto',
            descripcion: p.descripcion || '',
            imagen: p.imagen_url,
            badge: p.badge || '',
            badgeColor: p.badge_color || 'default',
            categoria_id: p.categoria_id, // Vinculación con categoría
            precio: p.precio || 0,
            stock: p.stock || 0,
            ficha_tecnica: p.ficha_tecnica || ''
        }));

        // El catálogo publicado proviene de Supabase; no insertar productos ficticios.
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

function renderProductos(filtered = null) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    const dataToShow = filtered || productos;

    if (dataToShow.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: var(--gray-600); grid-column: 1/-1; padding: 40px;">No se encontraron productos que coincidan con tu búsqueda.</p>';
        return;
    }

    grid.innerHTML = dataToShow.map(producto => `
        <div class="product-card" onclick="verDetalleProducto(${producto.id})" style="cursor: pointer;">
            <div class="product-image">
                <img src="${escapeHTML(producto.imagen)}" alt="${escapeHTML(producto.titulo)}" loading="lazy">
                ${producto.badge ? `<div class="product-badge ${producto.badgeColor === 'new' ? 'new' : ''}">${escapeHTML(producto.badge)}</div>` : ''}
            </div>
            <div class="product-content" style="padding: 20px;">
                <h3 class="product-title" style="font-size: 15px; min-height: 40px; margin-bottom: 12px;">${escapeHTML(producto.titulo)}</h3>
                
                <div class="product-pricing" style="margin-bottom: 15px;">
                    ${producto.precio > 0
            ? `<div class="price-main" style="font-size: 22px; font-weight: 800; color: var(--primary-blue);">S/ ${parseFloat(producto.precio).toFixed(2)}</div>`
            : `<div class="price-consult" style="font-size: 16px; font-weight: 700; color: var(--gray-500);">PRECIO A CONSULTAR</div>`
        }
                </div>

                <div class="product-card-actions" style="display: flex; gap: 8px;">
                    <button class="btn-add-pill" onclick="event.stopPropagation(); verDetalleProducto(${producto.id})" style="flex: 1; padding: 10px; border: 2px solid var(--primary-orange); color: var(--primary-orange); background: transparent; border-radius: 25px; font-weight: 800; font-size: 13px; transition: all 0.3s;">
                        Ver producto
                    </button>
                </div>
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
            ${categoria.badge ? `<div class="featured-badge">${escapeHTML(categoria.badge)}</div>` : ''}
            <div class="category-header">
                <div class="category-icon">
                    <i class="${escapeHTML(categoria.icon)}"></i>
                </div>
                <h3 class="category-title">${escapeHTML(categoria.titulo)}</h3>
            </div>
            <div class="category-gallery">
                ${categoria.imagenes.map(img => `<img src="${escapeHTML(img)}" alt="Galería ${escapeHTML(categoria.titulo)}" class="gallery-img" loading="lazy">`).join('')}
            </div>
            <p class="category-description">
                ${escapeHTML(categoria.descripcion)}
            </p>
            <button class="category-btn" onclick="event.stopPropagation(); verDetalleCategoria(${categoria.id})">Ver Productos <i class="fas fa-chevron-right"></i></button>
        </div>
    `).join('');
}

// ===========================
// VISTA DETALLE DE CATEGORÍA
// ===========================

function verDetalleCategoria(id, updateHistory = true) {
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

    const stats = document.querySelector('.service-strip, .stats-section');
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
                        <img src="${escapeHTML(p.imagen)}" alt="${escapeHTML(p.titulo)}" loading="lazy">
                        ${p.badge ? `<div class="product-badge ${p.badgeColor === 'new' ? 'new' : ''}">${escapeHTML(p.badge)}</div>` : ''}
                    </div>
                    <div class="product-content">
                        <h3 class="product-title">${escapeHTML(p.titulo)}</h3>
                        ${p.precio > 0 ? `<div style="font-size: 18px; font-weight: 700; color: var(--primary-blue); margin-bottom: 8px;">S/ ${parseFloat(p.precio).toFixed(2)}</div>` : ''}
                        <p class="product-description">${escapeHTML(p.descripcion)}</p>
                        <div class="product-card-footer" style="display: flex; gap: 10px; margin-top: 15px;">
                            <button class="product-link" onclick="event.stopPropagation(); verDetalleProducto(${p.id})">Detalles</button>
                            <button class="btn-quote-small" onclick="event.stopPropagation(); addToQuote(${p.id})" style="background: var(--gray-100); border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; color: var(--primary-blue); font-weight: 700;"><i class="fas fa-plus"></i></button>
                        </div>
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
    if (updateHistory && window.location.hash !== `#categoria/${id}`) window.history.pushState(null, '', `#categoria/${id}`);
    titleEl?.setAttribute('tabindex', '-1');
    titleEl?.focus({ preventScroll: true });
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

    const stats = document.querySelector('.service-strip, .stats-section');
    if (stats) stats.style.display = ''; // Revert to CSS
}

function volverAlInicio() {
    navigateStorefrontSection('categorias');
}

function navigateStorefrontSection(id) {
    const target = document.getElementById(id);
    if (!target) return;
    cerrarModalProducto();
    closeQuoteSidebar();
    mobileNavBackdrop?.click();
    mostrarSeccionesPrincipales();
    if (window.location.hash !== `#${id}`) window.history.pushState(null, '', `#${id}`);
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: 'smooth' });
}

function restoreStorefrontRoute() {
    if (!catalogReady) return;
    cerrarModalProducto();
    closeQuoteSidebar();
    const match = window.location.hash.match(/^#categoria\/(\d+)$/);
    if (match) {
        const id = Number(match[1]);
        if (categorias.some(category => category.id == id)) {
            verDetalleCategoria(id, false);
            return;
        }
        window.history.replaceState(null, '', '#categorias');
    }
    mostrarSeccionesPrincipales();
    const target = document.getElementById(window.location.hash.slice(1));
    if (target) {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        target.scrollIntoView({ behavior: 'smooth' });
    }
}

window.addEventListener('hashchange', restoreStorefrontRoute);
document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href^="#"]');
    if (!link || link.target === '_blank') return;
    const id = link.getAttribute('href').slice(1);
    if (!id || !document.getElementById(id)) return;
    event.preventDefault();
    navigateStorefrontSection(id);
});

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
    document.getElementById('modalQty').value = 1;
    if (!producto) return;
    const trigger = document.activeElement;
    closeQuoteSidebar();
    mobileNavBackdrop?.click();
    productReturnFocus = trigger;
    currentModalProduct = producto;
    document.getElementById('modalProductImage').alt = producto.titulo;

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

    // Price & Stock
    const priceEl = document.getElementById('modalProductPrice');
    priceEl.style.fontSize = '';
    if (producto.precio && producto.precio > 0) {
        priceEl.textContent = `S/ ${parseFloat(producto.precio).toFixed(2)}`;
        priceEl.style.display = 'block';
    } else {
        priceEl.textContent = 'A TRATAR';
        priceEl.style.fontSize = '20px';
        priceEl.style.display = 'block';
    }

    const stockEl = document.getElementById('modalProductStock');
    if (producto.stock && producto.stock > 0) {
        stockEl.textContent = `${producto.stock} EN STOCK`;
        stockEl.className = 'badge badge-success';
        stockEl.style.display = 'inline-block';
    } else {
        stockEl.textContent = 'CONSULTAR DISPONIBILIDAD';
        stockEl.className = 'badge badge-info';
        stockEl.style.display = 'inline-block';
    }

    // Ficha Técnica
    const specsContainer = document.getElementById('modalProductSpecsContainer');
    const specsLink = document.getElementById('modalProductSpecsLink');
    if (safeDocumentURL(producto.ficha_tecnica)) {
        specsLink.href = safeDocumentURL(producto.ficha_tecnica);
        specsContainer.style.display = 'block';
    } else {
        specsContainer.style.display = 'none';
    }

    // Reset selection before constructing the consultation link.
    selectedVariant = null;
    updateProductWhatsApp();
    const variantsEl = document.getElementById('modalProductVariants');
    variantsEl.style.display = 'none';

    // Cargar Variantes desde Supabase
    cargarYRenderizarVariantes(producto);

    document.getElementById('productDetailModal').removeAttribute('inert');
    document.getElementById('productDetailModal').setAttribute('aria-hidden', 'false');
    document.getElementById('productDetailModal').classList.add('active');
    syncBodyScrollLock();
    document.querySelector('#productDetailModal .modal-close-btn')?.focus();

    // Configurar botón "Cotizar" en el modal
    const addToQuoteBtn = document.getElementById('addToQuoteBtn');
    if (addToQuoteBtn) {
        addToQuoteBtn.onclick = () => {
            const qty = parseInt(document.getElementById('modalQty').value) || 1;
            addToQuote(producto.id, qty, selectedVariant);
            cerrarModalProducto();
        };
    }
}

async function cargarYRenderizarVariantes(producto) {
    const container = document.getElementById('variantsSelectorContainer');
    const wrapper = document.getElementById('modalProductVariants');
    container.innerHTML = '';
    const requestId = ++variantRequestId;

    try {
        const { data: variants, error } = await supabaseClient
            .from('variantes')
            .select('*')
            .eq('producto_id', producto.id)
            .eq('activo', true);

        if (error) throw error;

        if (requestId !== variantRequestId) return;
        if (variants && variants.length > 0) {
            wrapper.style.display = 'block';
            variants.forEach(v => {
                const btn = document.createElement('button');
                btn.className = 'variant-opt-btn';
                btn.type = 'button';
                btn.setAttribute('aria-pressed', 'false');
                btn.innerText = v.titulo;
                btn.style = 'padding: 8px 16px; border: 2px solid var(--gray-200); border-radius: 8px; background: white; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;';

                btn.onclick = () => seleccionarVariante(v, btn, producto);
                container.appendChild(btn);
            });
        }
    } catch (e) {
        if (requestId !== variantRequestId) return;
        wrapper.style.display = 'block';
        container.textContent = 'No se pudieron cargar las opciones. Consulta las opciones disponibles con un asesor.';
        console.error('Error cargando variantes:', e);
    }
}

function seleccionarVariante(variante, btn, productoBase) {
    // Deseleccionar otros
    document.querySelectorAll('.variant-opt-btn').forEach(b => {
        b.setAttribute('aria-pressed', 'false');
        b.style.borderColor = 'var(--gray-200)';
        b.style.color = 'var(--gray-700)';
    });

    // Seleccionar este
    btn.style.borderColor = 'var(--primary-blue)';
    btn.style.color = 'var(--primary-blue)';
    selectedVariant = variante;
    btn.setAttribute('aria-pressed', 'true');
    const stockEl = document.getElementById('modalProductStock');
    stockEl.textContent = variante.stock > 0 ? `${variante.stock} EN STOCK` : 'CONSULTAR DISPONIBILIDAD';
    stockEl.className = variante.stock > 0 ? 'badge badge-success' : 'badge badge-info';
    document.getElementById('modalProductImage').alt = `${productoBase.titulo} - ${variante.titulo}`;
    updateProductWhatsApp();

    // Actualizar Imagen si existe
    if (variante.imagen_url) {
        document.getElementById('modalProductImage').src = variante.imagen_url;
    } else {
        document.getElementById('modalProductImage').src = productoBase.imagen;
    }

    // Actualizar Precio si es > 0
    const priceEl = document.getElementById('modalProductPrice');
    const precioAMostrar = variante.precio > 0 ? variante.precio : productoBase.precio;

    if (precioAMostrar > 0) {
        priceEl.textContent = `S/ ${parseFloat(precioAMostrar).toFixed(2)}`;
    } else {
        priceEl.textContent = 'A TRATAR';
    }
}

function changeModalQty(val) {
    const input = document.getElementById('modalQty');
    let current = parseInt(input.value) || 1;
    current += val;
    if (current < 1) current = 1;
    input.value = Math.min(999, current);
    updateProductWhatsApp();
}

function updateProductWhatsApp() {
    if (!currentModalProduct) return;
    const quantity = Math.max(1, Math.min(999, Number(document.getElementById('modalQty').value) || 1));
    const price = selectedVariant?.precio > 0 ? selectedVariant.precio : currentModalProduct.precio;
    let message = `Hola, estoy interesado en el producto: *${currentModalProduct.titulo}*`;
    if (selectedVariant) message += `\nOpción: ${selectedVariant.titulo}`;
    message += `\nCantidad: ${quantity}`;
    if (price > 0) message += `\nPrecio de referencia: S/ ${Number(price).toFixed(2)}`;
    document.getElementById('modalWhatsAppBtn').href = `https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(message)}`;
}

function cerrarModalProducto() {
    const modal = document.getElementById('productDetailModal');
    if (!modal.classList.contains('active')) return;
    variantRequestId++;
    modal.classList.remove('active');
    currentModalProduct = null;
    syncBodyScrollLock();
    const trigger = productReturnFocus?.isConnected && productReturnFocus.tabIndex >= 0 ? productReturnFocus : document.getElementById('cartToggleBtn');
    trigger?.focus();
    modal.setAttribute('inert', '');
    modal.setAttribute('aria-hidden', 'true');
}

// Cerrar modal al hacer click fuera
window.onclick = function (event) {
    const modal = document.getElementById('productDetailModal');
    const sidebar = document.getElementById('quoteSidebar');

    if (event.target == modal) {
        cerrarModalProducto();
    }

    // Si se hace click fuera del sidebar y éste está activo, cerrarlo (opcional)
    if (sidebar && sidebar.classList.contains('active') && !sidebar.contains(event.target) && !event.target.closest('#cartToggleBtn') && !event.target.closest('.remove-item-btn') && !event.target.closest('.btn-quote-small') && !event.target.closest('#addToQuoteBtn')) {
        // Solo cerrar si el click no es en botones que interactúan con el carrito
        // closeQuoteSidebar(); // Desactivado por ahora para evitar cierres accidentales
    }
}

// ===========================
// LÓGICA DE COTIZACIÓN (CARRITO)
// ===========================

function addToQuote(id, qty = 1, variant = null) {
    qty = Math.max(1, Math.min(999, Math.floor(Number(qty)) || 1));
    const producto = productos.find(p => p.id == id);
    if (!producto) return;

    // Generar un ID único para la combinación producto-variante
    const cartItemId = variant ? `${id}_${variant.id}` : `${id}`;

    const existing = quoteCart.find(item => item.id == cartItemId);
    if (existing) {
        existing.qty = Math.min(999, existing.qty + qty);
    } else {
        quoteCart.push({
            id: cartItemId,
            originalId: id,
            titulo: producto.titulo,
            variante: variant ? variant.titulo : null,
            imagen: variant && variant.imagen_url ? variant.imagen_url : producto.imagen,
            precio: variant && variant.precio > 0 ? variant.precio : producto.precio,
            qty: qty
        });
    }

    saveQuote();
    renderQuoteItems();
    updateCartCount();
    openQuoteSidebar();
}

function changeCartQty(id, val) {
    const item = quoteCart.find(i => i.id == id);
    if (item) {
        item.qty = Math.min(999, item.qty + val);
        if (item.qty < 1) {
            removeFromQuote(id);
        } else {
            saveQuote();
            renderQuoteItems();
            updateTotalItems();
            updateCartCount();
        }
    }
}

function updateTotalItems() {
    let total = 0;
    quoteCart.forEach(item => total += item.qty);
    document.getElementById('quoteTotalCount').textContent = total;
}

function removeFromQuote(id) {
    quoteCart = quoteCart.filter(item => item.id != id);
    saveQuote();
    renderQuoteItems();
    updateCartCount();
}

function saveQuote() {
    try { localStorage.setItem('ferrenorte_quote', JSON.stringify(quoteCart)); }
    catch (error) { console.warn('La cotización se conservará solo durante esta visita.'); }
}

function updateCartCount() {
    const counts = document.querySelectorAll('.cart-count');
    counts.forEach(c => c.textContent = quoteCart.reduce((total, item) => total + item.qty, 0));
}

function renderQuoteItems() {
    const list = document.getElementById('quoteItemsList');
    if (!list) return;

    if (quoteCart.length === 0) {
        list.innerHTML = `
            <div class="empty-cart-msg">
                <i class="fas fa-clipboard-list"></i>
                <p>Tu lista está vacía</p>
            </div>
        `;
        document.getElementById('quoteTotalCount').textContent = "0";
        return;
    }

    list.innerHTML = quoteCart.map(item => `
        <div class="quote-item">
            <img src="${escapeHTML(item.imagen)}" alt="${escapeHTML(item.titulo)}" class="quote-item-img">
            <div class="quote-item-info">
                <div class="quote-item-title">${escapeHTML(item.titulo)}</div>
                ${item.variante ? `<div style="font-size: 11px; color: var(--gray-500); margin-top: -3px; margin-bottom: 5px;">Opción: ${escapeHTML(item.variante)}</div>` : ''}
                <div class="quote-item-price">${item.precio > 0 ? 'S/ ' + parseFloat(item.precio).toFixed(2) : 'Consultar precio'}</div>
                <div class="quote-item-controls">
                    <div class="qty-control">
                        <button onclick="changeCartQty('${item.id}', -1)">-</button>
                        <input type="text" class="quote-item-qty-input" value="${item.qty}" readonly>
                        <button onclick="changeCartQty('${item.id}', 1)">+</button>
                    </div>
                </div>
            </div>
            <button class="remove-item-btn" onclick="removeFromQuote('${item.id}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');

    updateTotalItems();
}

function openQuoteSidebar() {
    const trigger = document.activeElement;
    cerrarModalProducto();
    mobileNavBackdrop?.click();
    quoteReturnFocus = trigger;
    // Cerrar buscadores abiertos
    document.querySelectorAll('.search-results-dropdown').forEach(d => d.classList.remove('active'));

    const sidebar = document.getElementById('quoteSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');

    if (!sidebar) return;
    sidebar.removeAttribute('inert');
    sidebar.setAttribute('aria-hidden', 'false');
    sidebar.classList.add('active');
    if (backdrop) backdrop.classList.add('active');
    syncBodyScrollLock();

    renderQuoteItems();
    document.getElementById('closeQuoteSidebar')?.focus();
}

function closeQuoteSidebar() {
    const sidebar = document.getElementById('quoteSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (!sidebar?.classList.contains('active')) return;

    if (sidebar) {
        sidebar.classList.remove('active');
    }
    if (backdrop) {
        backdrop.classList.remove('active');
    }
    syncBodyScrollLock();
    const hiddenProduct = quoteReturnFocus?.closest('#productDetailModal') && !document.getElementById('productDetailModal').classList.contains('active');
    const trigger = quoteReturnFocus?.isConnected && quoteReturnFocus.tabIndex >= 0 && !hiddenProduct ? quoteReturnFocus : document.getElementById('cartToggleBtn');
    trigger?.focus();
    sidebar.setAttribute('inert', '');
    sidebar.setAttribute('aria-hidden', 'true');
}

// Búsqueda de productos
function initSearch() {
    const inputs = document.querySelectorAll('.searchInput');
    const dropdowns = [
        document.getElementById('searchResultsDropdown'),
        document.getElementById('searchResultsDropdownMobile')
    ];

    document.querySelectorAll('.searchBtn').forEach(button => button.addEventListener('click', () => {
        navigateStorefrontSection('productos');
        document.querySelectorAll('.search-results-dropdown').forEach(el => el.classList.remove('active'));
    }));
    inputs.forEach(input => {
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                input.closest('.search-wrapper').querySelector('.searchBtn').click();
            }
        });
        input.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            renderProductos(productos.filter(p => p.titulo.toLowerCase().includes(term) || p.descripcion.toLowerCase().includes(term)));

            // Sincronizar el otro input
            inputs.forEach(other => { if (other !== input) other.value = e.target.value; });

            if (term === "") {
                dropdowns.forEach(d => { if (d) d.classList.remove('active'); });
                return;
            }

            const filtered = productos.filter(p =>
                p.titulo.toLowerCase().includes(term) ||
                p.descripcion.toLowerCase().includes(term)
            ).slice(0, 8); // Máximo 8 resultados en el dropdown

            renderSearchDropdown(filtered);
        });

        // Ocultar al perder foco (con delay para permitir clicks)
        input.addEventListener('blur', () => {
            setTimeout(() => {
                dropdowns.forEach(d => { if (d) d.classList.remove('active'); });
            }, 200);
        });
    });
}

function renderSearchDropdown(results) {
    const dropdowns = [
        document.getElementById('searchResultsDropdown'),
        document.getElementById('searchResultsDropdownMobile')
    ];

    dropdowns.forEach(dropdown => {
        if (!dropdown) return;

        if (results.length === 0) {
            dropdown.innerHTML = '<div style="padding: 15px; text-align: center; color: var(--gray-400); font-size: 13px;">No se encontraron productos</div>';
        } else {
            dropdown.innerHTML = results.map(p => `
                <div class="search-result-item" onclick="verDetalleProducto(${p.id})">
                    <img src="${escapeHTML(p.imagen)}" alt="${escapeHTML(p.titulo)}">
                    <div class="search-result-info">
                        <div class="search-result-title">${escapeHTML(p.title || p.titulo)}</div>
                        <div class="search-result-price">${p.precio > 0 ? 'S/ ' + parseFloat(p.precio).toFixed(2) : 'A Tratar'}</div>
                    </div>
                </div>
            `).join('');
        }
        dropdown.classList.add('active');
    });
}

// Georreferenciación para envío
function getUserLocation() {
    const status = document.getElementById('locationStatus');
    const btn = document.getElementById('getLocationBtn');

    if (!navigator.geolocation) {
        status.textContent = "Geolocalización no soportada por tu navegador";
        return;
    }

    status.textContent = "Obteniendo ubicación...";
    btn.disabled = true;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
            document.getElementById('userCoords').value = googleMapsUrl;
            status.textContent = "✅ Ubicación obtenida correctamente";
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-check"></i> Ubicación Lista';
        },
        () => {
            status.textContent = "❌ Error al obtener ubicación";
            btn.disabled = false;
        }
    );
}

// Generar WhatsApp de Cotización Profesional
function generateWhatsAppQuote() {
    if (quoteCart.length === 0) {
        alert("Agrega productos a tu lista antes de generar la cotización.");
        return;
    }

    let message = `📦 *COTIZACIÓN PROFESIONAL - ${document.title}*\n\n`;
    message += "Hola, un gusto saludarles. 👋\nHe seleccionado los siguientes productos en su catálogo web y deseo solicitar una cotización formal:\n\n";

    quoteCart.forEach((item, index) => {
        let titleLine = `🔹 *${item.titulo.toUpperCase()}*`;
        if (item.variante) titleLine += ` (${item.variante})`;
        message += `${titleLine}\n   Cantidad: ${item.qty} ${item.qty > 1 ? 'unidades' : 'unidad'}\n`;
    });

    const manualAddress = document.getElementById('manualAddress').value.trim();
    const locationUrl = document.getElementById('userCoords').value;

    if (manualAddress || locationUrl) {
        message += `\n📍 *LOGÍSTICA Y ENTREGA:* \n`;
        if (manualAddress) message += `   - Dirección: ${manualAddress}\n`;
        if (locationUrl) message += `   - Ubicación Mapa (GPS): ${locationUrl}\n`;
    }

    message += "\n*Quedo a la espera de sus precios y formas de pago. ¡Gracias!*";

    const waNumber = getWhatsAppNumber();
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// Configurar Event Listeners adicionales
function initCartEvents() {
    // Escuchar en todos los posibles botones con la clase o el ID
    const cartButtons = document.querySelectorAll('#cartToggleBtn, .cart-toggle-btn');
    cartButtons.forEach(btn => {
        btn.onclick = (e) => {
            console.log("Click en Cotizar - Fail-safe ON");
            e.preventDefault();
            e.stopPropagation();
            openQuoteSidebar();
        };
    });

    const closeButtons = document.querySelectorAll('#closeQuoteSidebar, .close-btn');
    closeButtons.forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            closeQuoteSidebar();
        };
    });

    const backdrop = document.getElementById('sidebarBackdrop');
    if (backdrop) {
        backdrop.onclick = (e) => {
            e.preventDefault();
            closeQuoteSidebar();
        };
    }

    const sendBtn = document.getElementById('sendQuoteBtn');
    if (sendBtn) sendBtn.onclick = generateWhatsAppQuote;

    const locBtn = document.getElementById('getLocationBtn');
    if (locBtn) locBtn.onclick = getUserLocation;
}

// Inicializar renderizado
// Redundant listener removed - Consolidated at the end of the file

// ===========================
// MOBILE MENU TOGGLE
// ===========================
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navMenu = document.getElementById('navMenu');
const mobileNavBackdrop = document.getElementById('mobileNavBackdrop');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        mobileMenuToggle.classList.toggle('active');
        const isOpen = navMenu.classList.contains('active');
        mobileMenuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        syncBodyScrollLock();
    });
}

if (mobileNavBackdrop) {
    mobileNavBackdrop.addEventListener('click', () => {
        if (!navMenu || !mobileMenuToggle) return;
        navMenu.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        syncBodyScrollLock();
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
        if (mobileMenuToggle) {
            mobileMenuToggle.classList.remove('active');
            mobileMenuToggle.setAttribute('aria-expanded', 'false');
        }
        syncBodyScrollLock();
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
    const statsSection = document.querySelector('.service-strip, .stats-section');
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
        const whatsappNumber = getWhatsAppNumber();

        // Open WhatsApp
        window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');

        // Show success message
        alert('¡Gracias por contactarnos! Te redirigiremos a WhatsApp para completar tu consulta.');

        // Reset form
        // Mantener el mensaje hasta que el cliente complete el envío en WhatsApp.
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
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        syncBodyScrollLock();
    }
});

// ===========================
// FLOATING CARDS RANDOM MOVEMENT
// ===========================
const floatingCards = document.querySelectorAll('.floating-card');

floatingCards.forEach((card, index) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setInterval(() => {
        const randomX = (Math.random() - 0.5) * 20;
        const randomY = (Math.random() - 0.5) * 20;

        card.style.transform = `translate(${randomX}px, ${randomY}px)`;
    }, 3000 + (index * 1000));
});

// ===========================
// SOCIAL LINKS CONFIGURATION
// ===========================
// Social links moved to the top for resilience

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
// ===========================
// SITE CONFIGURATION
// ===========================
async function cargarConfiguracionSitio() {
    try {
        const { data, error } = await supabaseClient
            .from('configuracion')
            .select('*')
            .single();

        if (error) {
            // Si no existe tabla o fila, ignorar silenciosamente (usar valores default HTML)
            return;
        }
        if (!data) return;

        // 1. Logo
        if (data.logo_url) {
            const logo = document.getElementById('siteLogo');
            if (logo) logo.src = data.logo_url;

            // Favicon
            const favicon = document.getElementById('favicon');
            if (favicon) favicon.href = data.logo_url;
        }

        // 2. Textos
        if (data.nombre_sitio) {
            document.title = data.nombre_sitio;
            const brandMain = document.getElementById('siteBrandMain');
            const brandSub = document.getElementById('siteBrandSub');
            // Simple split logic if user puts "Main Sub"
            // For now just set brandMain if custom name
            if (brandMain) brandMain.textContent = data.nombre_sitio;
            if (brandSub) brandSub.textContent = ''; // Clear sub or put slogan?
        }

        if (data.descripcion_sitio) {
            const heroDesc = document.getElementById('heroDescription');
            if (heroDesc) heroDesc.textContent = data.descripcion_sitio;
            // Meta description?
            document.querySelector('meta[name="description"]')?.setAttribute('content', data.descripcion_sitio);
        }

        // 3. WhatsApp
        if (data.contacto_whatsapp) {
            const waNumber = normalizarWhatsAppNumber(data.contacto_whatsapp);
            // Update global socialLinks
            socialLinks.whatsapp = `https://wa.me/${waNumber}`;

            // Update all buttons
            document.querySelectorAll('.social-icon.whatsapp, .footer-social-link.whatsapp, .whatsapp-float').forEach(link => {
                link.href = socialLinks.whatsapp;
            });
        }

    } catch (e) { console.error('Error loading config:', e); }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Loaded - Starting initialization...");
    document.body.classList.add('loaded');

    // Inicialización de UI inmediata (no esperar a la base de datos)
    try { initCartEvents(); } catch (e) { console.error("Error initCartEvents:", e); }
    try { initSearch(); } catch (e) { console.error("Error initSearch:", e); }
    try { renderQuoteItems(); } catch (e) { console.error("Error renderQuoteItems:", e); }
    try { updateCartCount(); } catch (e) { console.error("Error updateCartCount:", e); }

    // Cargar datos asíncronos
    try {
        await cargarConfiguracionSitio();
        await Promise.all([
            cargarProductos(),
            cargarCategorias()
        ]);
    } catch (e) {
        console.error("Error loading data:", e);
    }
    catalogReady = true;
    restoreStorefrontRoute();

    setTimeout(() => {
        try { initializeAnimations(); } catch (e) { }
        try { initializeLazyLoading(); } catch (e) { }
        try { setActiveNav(); } catch (e) { }
    }, 100);
});

// Keyboard dismissal works for all overlays, including repeated openings.
document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    cerrarModalProducto();
    closeQuoteSidebar();
    mobileNavBackdrop?.click();
});

// Keep keyboard focus within the active dialog, including Shift+Tab wrapping.
document.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const overlay = document.querySelector('#quoteSidebar.active') || document.querySelector('#productDetailModal.active');
    if (!overlay) return;
    const candidates = [...overlay.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')].filter(element => {
        if (element.disabled || element.tabIndex < 0) return false;
        for (let parent = element; parent && parent !== overlay; parent = parent.parentElement) {
            const style = getComputedStyle(parent);
            if (parent.hidden || style.display === 'none' || style.visibility === 'hidden') return false;
        }
        return true;
    });
    const first = candidates[0];
    const last = candidates[candidates.length - 1];
    if (!first) return;
    if (!overlay.contains(document.activeElement) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault(); first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
    }
});
