// ===========================
// VARIABLES GLOBALES
// ===========================
let currentUser = null;
let currentSection = 'productos';
let currentCategoryFilter = null; // Para filtrar productos por categoría

// ===========================
// AUTENTICACIÓN
// ===========================

// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', async () => {
    showLoading();

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        currentUser = session.user;
        showDashboard();
        await loadCategoriasSelect(); // Cargar categorías para el selector del modal
        await loadProductos();
    } else {
        showLogin();
    }

    hideLoading();
});

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    showLoading();

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        currentUser = data.user;
        showDashboard();
        await loadCategoriasSelect();
        await loadProductos();

    } catch (error) {
        console.error('Login error:', error);
        let msg = error.message;

        if (msg.includes('Email not confirmed')) {
            msg = '⚠️ Tu email no ha sido confirmado. Revisa tu correo o desactiva "Confirm Email" en Supabase > Auth > Providers.';
        } else if (msg.includes('Invalid login credentials')) {
            msg = '❌ Correo o contraseña incorrectos.';
        }

        errorDiv.innerHTML = msg;
        errorDiv.style.display = 'block';
        hideLoading();
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    showLoading();
    await supabaseClient.auth.signOut();
    currentUser = null;
    showLogin();
    hideLoading();
});

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'grid';
    document.getElementById('adminDashboard').style.display = 'grid';
    document.getElementById('adminEmail').textContent = currentUser.email;
}

// Mobile Sidebar Toggle
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.querySelector('.sidebar');
if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}
// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 968 && sidebar.classList.contains('active') &&
        !sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        sidebar.classList.remove('active');
    }
});

// ===========================
// NAVEGACIÓN
// ===========================
document.querySelectorAll('.nav-item[data-section]').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;

        // Si cambia a productos manualmente, quitar filtro
        if (section === 'productos') {
            currentCategoryFilter = null;
        }

        switchSection(section);
    });
});

function switchSection(section) {
    currentSection = section;

    // Actualizar navegación activa
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.classList.remove('active');
    });
    const navItem = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (navItem) navItem.classList.add('active');

    // Actualizar secciones
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(`${section}Section`).classList.add('active');

    // Actualizar título y datos
    const titles = {
        'productos': 'Productos',
        'categorias': 'Categorías'
    };

    if (section === 'productos') {
        if (currentCategoryFilter) {
            // Obtener nombre de la categoría para el título
            // Esto es un poco hacky sin hacer otra consulta, pero funcional
            document.getElementById('sectionTitle').textContent = `Productos de la Categoría (Filtrado)`; // Se actualizará mejor si consultamos
            loadProductos(currentCategoryFilter);
        } else {
            document.getElementById('sectionTitle').textContent = titles[section];
            loadProductos();
        }
    } else if (section === 'categorias') {
        document.getElementById('sectionTitle').textContent = titles[section];
        loadCategorias();
    } else if (section === 'configuracion') {
        document.getElementById('sectionTitle').textContent = 'Configuración General';
        loadConfiguracion();
    }
}

// ===========================
// BOTÓN AGREGAR NUEVO
// ===========================
document.getElementById('addNewBtn').addEventListener('click', () => {
    if (currentSection === 'productos') {
        openProductoModal();
    } else if (currentSection === 'categorias') {
        openCategoriaModal();
    }
});

// ===========================
// UTILIDADES PARA SUBIDA DE IMÁGENES
// ===========================
async function uploadImage(file, folder) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data, error } = await supabaseClient.storage
            .from('productos-imagenes')
            .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (error) throw error;
        const { data: urlData } = supabaseClient.storage
            .from('productos-imagenes')
            .getPublicUrl(fileName);
        return urlData.publicUrl;
    } catch (error) {
        console.error('Error subiendo imagen:', error);
        throw error;
    }
}

async function uploadFile(file, folder) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${folder}/${Date.now()}_ficha.${fileExt}`;
        const { data, error } = await supabaseClient.storage
            .from('productos-imagenes')
            .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (error) throw error;
        const { data: urlData } = supabaseClient.storage
            .from('productos-imagenes')
            .getPublicUrl(fileName);
        return urlData.publicUrl;
    } catch (error) {
        console.error('Error subiendo archivo:', error);
        throw error;
    }
}

function showImagePreview(file, previewContainerId) {
    const container = document.getElementById(previewContainerId);
    container.innerHTML = '';
    const reader = new FileReader();
    reader.onload = function (e) {
        container.innerHTML = `<div class="preview-item"><img src="${e.target.result}" alt="Preview"></div>`;
    };
    reader.readAsDataURL(file);
}

function showMultipleImagePreviews(files, previewContainerId) {
    const container = document.getElementById(previewContainerId);
    container.innerHTML = '';
    Array.from(files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            container.innerHTML += `<div class="preview-item"><img src="${e.target.result}" alt="Preview ${index + 1}"></div>`;
        };
        reader.readAsDataURL(file);
    });
}

// Event listener para preview de imagen de producto
const productoInput = document.getElementById('productoImagen');
productoInput.addEventListener('change', function (e) {
    handleFileSelect(e.target.files[0], 'productoImagenPreview');
});

const fichaInput = document.getElementById('productoFichaFile');
if (fichaInput) {
    fichaInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        const status = document.getElementById('fichaFileStatus');
        if (file) {
            status.textContent = `📄 Seleccionado: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
            status.style.color = '#1e40af';
        } else {
            status.textContent = '';
        }
    });
}

// Event listener para preview de imágenes de categoría
const categoriaInput = document.getElementById('categoriaImagenes');
categoriaInput.addEventListener('change', function (e) {
    handleFilesSelect(e.target.files, 'categoriaImagenesPreview');
});

// Funciones auxiliares para manejo de archivos
function handleFileSelect(file, previewId) {
    if (file) {
        if (file.size > 5 * 1024 * 1024) { alert('Máx 5MB'); return; }
        showImagePreview(file, previewId);
    }
}

function handleFilesSelect(files, previewId) {
    if (files.length > 0) {
        if (files.length !== 4) { alert('Deben ser 4 imágenes'); return; }
        showMultipleImagePreviews(files, previewId);
    }
}

// DRAG & DROP
function setupDragDrop(inputId, isMultiple = false) {
    const input = document.getElementById(inputId);

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        input.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    input.addEventListener('dragover', () => input.classList.add('drag-over'));
    input.addEventListener('dragleave', () => input.classList.remove('drag-over'));

    input.addEventListener('drop', (e) => {
        input.classList.remove('drag-over');
        const dt = e.dataTransfer;
        const files = dt.files;

        if (isMultiple) {
            input.files = files; // Asignar archivos al input
            handleFilesSelect(files, 'categoriaImagenesPreview');
        } else {
            input.files = files;
            handleFileSelect(files[0], 'productoImagenPreview');
        }
    });
}

setupDragDrop('productoImagen', false);
setupDragDrop('categoriaImagenes', true);

// PASTE (Global)
document.addEventListener('paste', (e) => {
    // Verificar si hay archivos en el portapapeles
    if (e.clipboardData.files.length > 0) {
        e.preventDefault();
        const files = e.clipboardData.files;

        // Determinar qué modal está abierto
        if (document.getElementById('productoModal').classList.contains('active')) {
            const input = document.getElementById('productoImagen');
            input.files = files; // Sobrescribe
            handleFileSelect(files[0], 'productoImagenPreview');
        }
        else if (document.getElementById('categoriaModal').classList.contains('active')) {
            const input = document.getElementById('categoriaImagenes');
            // Nota: Para categorías necesitamos 4 imágenes. 
            // Si pegan menos, alertará handleFilesSelect.
            input.files = files;
            handleFilesSelect(files, 'categoriaImagenesPreview');
        }
    }
});

// ===========================
// GESTIÓN DE PRODUCTOS
// ===========================

// Cargar categorías para el select del modal de productos
async function loadCategoriasSelect() {
    try {
        const { data, error } = await supabaseClient
            .from('categorias')
            .select('id, titulo')
            .order('titulo');

        if (error) throw error;

        const select = document.getElementById('productoCategoria');
        select.innerHTML = '<option value="">Selecciona una categoría...</option>';
        data.forEach(cat => {
            select.innerHTML += `<option value="${cat.id}">${cat.titulo}</option>`;
        });
    } catch (error) {
        console.error('Error cargando lista de categorías:', error);
    }
}

async function loadProductos(categoriaId = null) {
    showLoading();
    try {
        let query = supabaseClient
            .from('productos')
            .select('*, categorias(titulo)') // Join para obtener nombre de categoría
            .order('orden', { ascending: true });

        if (categoriaId) {
            query = query.eq('categoria_id', categoriaId);

            // Obtener nombre de la categoría para el título
            const { data: cat } = await supabaseClient.from('categorias').select('titulo').eq('id', categoriaId).single();
            if (cat) document.getElementById('sectionTitle').textContent = `Productos: ${cat.titulo}`;
        } else {
            document.getElementById('sectionTitle').textContent = 'Todos los Productos';
        }

        const { data, error } = await query;

        if (error) throw error;

        renderProductosTable(data);
    } catch (error) {
        console.error('Error cargando productos:', error);
        // No mostrar alert si es error de columna no encontrada (usuario no ha corrido SQL)
        if (error.message && error.message.includes('column "categoria_id" does not exist')) {
            alert('⚠️ IMPORTANTE: Debes ejecutar el script "update-schema.sql" en Supabase para habilitar las categorías en productos.');
        } else {
            alert('Error al cargar productos');
        }
    }
    hideLoading();
}

function renderProductosTable(productos) {
    const tbody = document.getElementById('productosTableBody');

    if (productos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: var(--gray-600);">No hay productos registrados (en esta vista)</td></tr>';
        return;
    }

    tbody.innerHTML = productos.map(p => `
        <tr>
            <td><img src="${p.imagen_url}" alt="${p.titulo}" class="table-image"></td>
            <td><strong>${p.titulo}</strong></td>
            <td>S/ ${p.precio ? parseFloat(p.precio).toFixed(2) : '0.00'}</td>
            <td>${p.stock || 0}</td>
            <td>${p.descripcion.substring(0, 50)}...</td>
            <td>${p.badge ? `<span class="badge badge-info">${p.badge}</span>` : '-'}</td>
            <td>${p.orden}</td>
            <td>${p.activo ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-danger">Inactivo</span>'}</td>
            <td>
                <div class="action-buttons">
                    <button onclick="editProducto(${p.id})" class="btn btn-secondary btn-icon" title="Editar"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteProducto(${p.id}, '${p.titulo}')" class="btn btn-danger btn-icon" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openProductoModal(productoId = null) {
    const modal = document.getElementById('productoModal');
    const form = document.getElementById('productoForm');

    form.reset();
    document.getElementById('productoId').value = '';
    document.getElementById('productoImagenUrl').value = '';
    document.getElementById('productoImagenPreview').innerHTML = '';
    document.getElementById('fichaFileStatus').textContent = '';
    document.getElementById('productoModalTitle').textContent = 'Agregar Producto';

    // Si estamos filtrando por categoría, pre-seleccionar esa categoría
    if (currentCategoryFilter) {
        const select = document.getElementById('productoCategoria');
        if (select) select.value = currentCategoryFilter;
    }

    if (productoId) {
        loadProductoData(productoId);
    }

    modal.classList.add('active');
}

function closeProductoModal() {
    document.getElementById('productoModal').classList.remove('active');
}

async function loadProductoData(id) {
    showLoading();
    try {
        const { data, error } = await supabaseClient
            .from('productos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        document.getElementById('productoId').value = data.id;
        document.getElementById('productoTitulo').value = data.titulo;
        document.getElementById('productoDescripcion').value = data.descripcion;
        document.getElementById('productoImagenUrl').value = data.imagen_url;
        document.getElementById('productoBadge').value = data.badge || '';
        document.getElementById('productoBadgeColor').value = data.badge_color || 'default';
        document.getElementById('productoOrden').value = data.orden;
        document.getElementById('productoActivo').value = data.activo.toString();

        // Nuevos campos
        document.getElementById('productoPrecio').value = data.precio || '';
        document.getElementById('productoStock').value = data.stock || '';
        document.getElementById('productoFicha').value = data.ficha_tecnica || '';

        // Cargar categoría
        const select = document.getElementById('productoCategoria');
        if (select && data.categoria_id) select.value = data.categoria_id;

        const previewContainer = document.getElementById('productoImagenPreview');
        previewContainer.innerHTML = `<div class="preview-item"><img src="${data.imagen_url}" alt="${data.titulo}"></div>`;

        // Cargar variantes
        await loadProductoVariantes(id);

        document.getElementById('productoModalTitle').textContent = 'Editar Producto';
    } catch (error) {
        console.error('Error cargando producto:', error);
        alert('Error al cargar producto');
    }
    hideLoading();
}

async function loadProductoVariantes(productoId) {
    const container = document.getElementById('variantsContainer');
    container.innerHTML = '';
    try {
        const { data, error } = await supabaseClient
            .from('variantes')
            .select('*')
            .eq('producto_id', productoId)
            .order('id', { ascending: true });

        if (error) throw error;
        data.forEach(v => addVariantRow(v));
    } catch (error) {
        console.error('Error cargando variantes:', error);
    }
}

function addVariantRow(data = {}) {
    const container = document.getElementById('variantsContainer');
    const row = document.createElement('div');
    row.className = 'variant-row';
    row.setAttribute('data-id', data.id || '');
    row.style = 'display: grid; grid-template-columns: 1fr 90px 140px 40px; gap: 10px; align-items: center; background: white; padding: 12px; border-radius: 10px; border: 1px solid var(--gray-200); box-shadow: 0 2px 4px rgba(0,0,0,0.02);';

    const rowId = 'file_' + Math.random().toString(36).substring(7);

    row.innerHTML = `
        <input type="text" class="variant-titulo" placeholder="Ej: Color Azul" value="${data.titulo || ''}" style="width: 100%; border: 1px solid var(--gray-300); padding: 8px; border-radius: 6px; font-size: 13px;">
        <input type="number" class="variant-precio" step="0.01" placeholder="S/ 0.00" value="${data.precio || ''}" style="width: 100%; border: 1px solid var(--gray-300); padding: 8px; border-radius: 6px; font-size: 13px;">
        
        <div class="variant-upload-box" style="display: flex; align-items: center; gap: 8px;">
            <div class="variant-preview-wrapper" style="width: 35px; height: 35px; border-radius: 6px; overflow: hidden; background: #f1f5f9; border: 1px solid var(--gray-200);">
                <img class="variant-preview-img" src="${data.imagen_url || 'img/placeholder.png'}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <input type="file" id="${rowId}" class="variant-file-input" accept="image/*" style="display: none;">
            <button type="button" class="btn-icon" onclick="document.getElementById('${rowId}').click()" style="background: var(--gray-100); border: none; padding: 6px; border-radius: 6px; cursor: pointer; color: var(--gray-600);">
                <i class="fas fa-camera"></i>
            </button>
            <input type="hidden" class="variant-img-url" value="${data.imagen_url || ''}">
        </div>

        <button type="button" onclick="this.parentElement.remove()" style="background: #fee2e2; color: #ef4444; border: none; padding: 8px; border-radius: 6px; cursor: pointer; transition: all 0.2s;">
            <i class="fas fa-trash"></i>
        </button>
    `;

    // Listener para previsualización inmediata
    const fileInput = row.querySelector('.variant-file-input');
    const previewImg = row.querySelector('.variant-preview-img');

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => { previewImg.src = event.target.result; };
            reader.readAsDataURL(file);
        }
    });

    container.appendChild(row);
}

async function editProducto(id) { openProductoModal(id); }

async function deleteProducto(id, titulo) {
    if (!confirm(`¿Eliminar "${titulo}"?`)) return;
    showLoading();
    try {
        const { error } = await supabaseClient.from('productos').delete().eq('id', id);
        if (error) throw error;
        alert('Producto eliminado');
        await loadProductos(currentCategoryFilter);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar');
    }
    hideLoading();
}

document.getElementById('productoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('productoId').value;
    const imagenFile = document.getElementById('productoImagen').files[0];
    let imagenUrl = document.getElementById('productoImagenUrl').value;

    if (!imagenFile && !imagenUrl) { alert('Imagen requerida'); return; }

    showLoading();
    try {
        if (imagenFile) imagenUrl = await uploadImage(imagenFile, 'productos');

        const fichaFile = document.getElementById('productoFichaFile').files[0];
        let fichaUrl = document.getElementById('productoFicha').value;

        if (fichaFile) {
            fichaUrl = await uploadFile(fichaFile, 'fichas');
        }

        const producto = {
            titulo: document.getElementById('productoTitulo').value,
            descripcion: document.getElementById('productoDescripcion').value,
            imagen_url: imagenUrl,
            categoria_id: document.getElementById('productoCategoria').value || null,
            badge: document.getElementById('productoBadge').value,
            badge_color: document.getElementById('productoBadgeColor').value,
            orden: parseInt(document.getElementById('productoOrden').value),
            activo: document.getElementById('productoActivo').value === 'true',
            precio: parseFloat(document.getElementById('productoPrecio').value) || 0,
            stock: parseInt(document.getElementById('productoStock').value) || 0,
            ficha_tecnica: fichaUrl
        };

        if (id) {
            const { data: updatedProd, error: updateError } = await supabaseClient.from('productos').update(producto).eq('id', id).select().single();
            if (updateError) throw updateError;
            await saveVariantes(id);
        } else {
            const { data: newProd, error: insertError } = await supabaseClient.from('productos').insert([producto]).select().single();
            if (insertError) throw insertError;
            await saveVariantes(newProd.id);
        }

        closeProductoModal();
        await loadProductos(currentCategoryFilter);
    } catch (error) {
        console.error('Error guardando:', error);
        alert('Error: ' + error.message);
    }
    hideLoading();
});

async function saveVariantes(productoId) {
    const rows = document.querySelectorAll('.variant-row');
    const variantes = [];

    for (const row of rows) {
        const titulo = row.querySelector('.variant-titulo').value.trim();
        const fileInput = row.querySelector('.variant-file-input');
        let imgUrl = row.querySelector('.variant-img-url').value;

        if (titulo) {
            // Si hay un archivo nuevo, subirlo primero
            if (fileInput.files.length > 0) {
                try {
                    imgUrl = await uploadImage(fileInput.files[0], 'variantes');
                } catch (e) {
                    console.error('Error subiendo imagen de variante:', e);
                }
            }

            variantes.push({
                producto_id: productoId,
                titulo: titulo,
                precio: parseFloat(row.querySelector('.variant-precio').value) || 0,
                imagen_url: imgUrl,
                activo: true
            });
        }
    }

    // Limpiar y guardar
    await supabaseClient.from('variantes').delete().eq('producto_id', productoId);
    if (variantes.length > 0) {
        const { error } = await supabaseClient.from('variantes').insert(variantes);
        if (error) console.error('Error insertando variantes:', error);
    }
}

// ===========================
// GESTIÓN DE CATEGORÍAS
// ===========================

async function loadCategorias() {
    showLoading();
    try {
        const { data, error } = await supabaseClient
            .from('categorias')
            .select('*, categoria_imagenes(count)')
            .order('orden', { ascending: true });
        if (error) throw error;
        renderCategoriasTable(data);
    } catch (error) { console.error(error); alert('Error al cargar categorías'); }
    hideLoading();
}

// Función para ver productos de una categoría específica
async function verProductosDeCategoria(id) {
    currentCategoryFilter = id;
    switchSection('productos');
}

function renderCategoriasTable(categorias) {
    const tbody = document.getElementById('categoriasTableBody');
    if (categorias.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8">No hay categorías</td></tr>';
        return;
    }

    tbody.innerHTML = categorias.map(c => `
        <tr>
            <td><i class="${c.icon}" style="font-size: 24px; color: var(--primary-blue);"></i></td>
            <td><strong>${c.titulo}</strong></td>
            <td>${c.descripcion.substring(0, 50)}...</td>
            <td>${c.categoria_imagenes?.[0]?.count || 0} imgs</td>
            <td>${c.badge || '-'}</td>
            <td>${c.orden}</td>
            <td>${c.activo ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-danger">Inactivo</span>'}</td>
            <td>
                <div class="action-buttons">
                    <button onclick="verProductosDeCategoria(${c.id})" class="btn btn-primary btn-icon" title="Ver Productos" style="background-color: var(--primary-orange);">
                        <i class="fas fa-eye"></i> Productos
                    </button>
                    <button onclick="editCategoria(${c.id})" class="btn btn-secondary btn-icon" title="Editar"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteCategoria(${c.id}, '${c.titulo}')" class="btn btn-danger btn-icon" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openCategoriaModal(categoriaId = null) {
    const modal = document.getElementById('categoriaModal');
    const form = document.getElementById('categoriaForm');
    form.reset();
    document.getElementById('categoriaId').value = '';
    document.getElementById('categoriaImagenesUrls').value = '';
    document.getElementById('categoriaImagenesPreview').innerHTML = '';
    document.getElementById('categoriaModalTitle').textContent = 'Agregar Categoría';
    if (categoriaId) loadCategoriaData(categoriaId);
    modal.classList.add('active');
}

function closeCategoriaModal() { document.getElementById('categoriaModal').classList.remove('active'); }

async function loadCategoriaData(id) {
    showLoading();
    try {
        const { data } = await supabaseClient.from('categorias').select('*').eq('id', id).single();
        const { data: imgs } = await supabaseClient.from('categoria_imagenes').select('imagen_url').eq('categoria_id', id).order('orden');

        document.getElementById('categoriaId').value = data.id;
        document.getElementById('categoriaTitulo').value = data.titulo;
        document.getElementById('categoriaIcon').value = data.icon;
        document.getElementById('categoriaDescripcion').value = data.descripcion;
        document.getElementById('categoriaBadge').value = data.badge || '';
        document.getElementById('categoriaOrden').value = data.orden;
        document.getElementById('categoriaActivo').value = data.activo.toString();
        document.getElementById('categoriaImagenesUrls').value = imgs.map(i => i.imagen_url).join('||');

        const preview = document.getElementById('categoriaImagenesPreview');
        preview.innerHTML = imgs.map(i => `<div class="preview-item"><img src="${i.imagen_url}"></div>`).join('');

    } catch (e) { console.error(e); }
    hideLoading();
}

async function editCategoria(id) { openCategoriaModal(id); }

async function deleteCategoria(id, title) {
    if (!confirm(`¿Eliminar categoría "${title}"?`)) return;
    showLoading();
    try {
        await supabaseClient.from('categorias').delete().eq('id', id);
        alert('Categoría eliminada');
        await loadCategorias();
    } catch (e) { console.error(e); alert('Error al eliminar'); }
    hideLoading();
}

document.getElementById('categoriaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('categoriaId').value;
    const cat = {
        titulo: document.getElementById('categoriaTitulo').value,
        icon: document.getElementById('categoriaIcon').value,
        descripcion: document.getElementById('categoriaDescripcion').value,
        badge: document.getElementById('categoriaBadge').value,
        orden: parseInt(document.getElementById('categoriaOrden').value),
        activo: document.getElementById('categoriaActivo').value === 'true'
    };
    const files = document.getElementById('categoriaImagenes').files;
    const existing = document.getElementById('categoriaImagenesUrls').value;

    if (files.length === 0 && !existing) { alert('Sube 4 imágenes'); return; }
    if (files.length > 0 && files.length !== 4) { alert('Deben ser 4 imágenes'); return; }

    showLoading();
    try {
        let urls = [];
        if (files.length > 0) {
            for (let i = 0; i < files.length; i++) urls.push(await uploadImage(files[i], 'categorias'));
        } else {
            urls = existing.split('||');
        }

        let catId = id;
        if (id) {
            await supabaseClient.from('categorias').update(cat).eq('id', id);
            await supabaseClient.from('categoria_imagenes').delete().eq('categoria_id', id);
        } else {
            const { data } = await supabaseClient.from('categorias').insert([cat]).select().single();
            catId = data.id;
        }

        const imgData = urls.map((url, i) => ({ categoria_id: catId, imagen_url: url, orden: i + 1 }));
        await supabaseClient.from('categoria_imagenes').insert(imgData);

        closeCategoriaModal();
        alert('Categoría guardada');
        await loadCategorias();
        // Recargar el select de categorías también por si cambió algo
        await loadCategoriasSelect();
    } catch (e) { console.error(e); alert('Error: ' + e.message); }
    hideLoading();
});

// Utilities
function showLoading() { document.getElementById('loadingOverlay').style.display = 'flex'; }
function hideLoading() { document.getElementById('loadingOverlay').style.display = 'none'; }
window.onclick = function (e) {
    if (e.target.id == 'productoModal') closeProductoModal();
    if (e.target.id == 'categoriaModal') closeCategoriaModal();
}

// ===========================
// CONFIGURACIÓN
// ===========================
async function loadConfiguracion() {
    showLoading();
    try {
        const { data, error } = await supabaseClient.from('configuracion').select('*').single();
        if (error) throw error;

        if (data) {
            document.getElementById('configId').value = data.id;
            document.getElementById('configNombre').value = data.nombre_sitio || '';
            document.getElementById('configDescripcion').value = data.descripcion_sitio || '';
            document.getElementById('configWhatsapp').value = data.contacto_whatsapp || '';
            document.getElementById('configLogoUrl').value = data.logo_url || '';

            if (data.logo_url) {
                document.getElementById('configLogoPreview').innerHTML = `<div class="preview-item"><img src="${data.logo_url}" alt="Logo"></div>`;
            }
        }
    } catch (error) {
        console.error('Error loading config:', error);
        // If empty, it's fine, we'll create one
    }
    hideLoading();
}

document.getElementById('configForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();
    try {
        const id = document.getElementById('configId').value;
        const logoFile = document.getElementById('configLogo').files[0];
        let logoUrl = document.getElementById('configLogoUrl').value;

        if (logoFile) {
            logoUrl = await uploadImage(logoFile, 'logos');
        }

        const config = {
            nombre_sitio: document.getElementById('configNombre').value,
            descripcion_sitio: document.getElementById('configDescripcion').value,
            contacto_whatsapp: document.getElementById('configWhatsapp').value,
            logo_url: logoUrl
        };

        if (id) {
            await supabaseClient.from('configuracion').update(config).eq('id', id);
        } else {
            await supabaseClient.from('configuracion').insert([config]);
        }

        alert('Configuración guardada correctamente.');

    } catch (error) {
        console.error('Error saving config:', error);
        alert('Error al guardar configuración.');
    }
    hideLoading();
});

// Logo Preview
document.getElementById('configLogo').addEventListener('change', function (e) {
    handleFileSelect(e.target.files[0], 'configLogoPreview');
});
