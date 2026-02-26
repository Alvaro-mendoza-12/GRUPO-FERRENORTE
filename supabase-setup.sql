-- ===========================
-- SCRIPT SQL PARA SUPABASE
-- ===========================
-- Copiar y ejecutar este código en el SQL Editor de Supabase
-- Dashboard de Supabase > SQL Editor > New Query > Pegar este código > Run

-- ===========================
-- TABLA DE PRODUCTOS
-- ===========================
CREATE TABLE IF NOT EXISTS productos (
    id BIGSERIAL PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    imagen_url TEXT NOT NULL,
    badge TEXT DEFAULT '',
    badge_color TEXT DEFAULT 'default', -- 'default' o 'new'
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ===========================
-- TABLA DE CATEGORÍAS
-- ===========================
CREATE TABLE IF NOT EXISTS categorias (
    id BIGSERIAL PRIMARY KEY,
    titulo TEXT NOT NULL,
    icon TEXT NOT NULL, -- Font Awesome class, ej: 'fas fa-hammer'
    descripcion TEXT NOT NULL,
    badge TEXT DEFAULT '',
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ===========================
-- TABLA DE IMÁGENES DE CATEGORÍAS
-- ===========================
CREATE TABLE IF NOT EXISTS categoria_imagenes (
    id BIGSERIAL PRIMARY KEY,
    categoria_id BIGINT NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
    imagen_url TEXT NOT NULL,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ===========================
-- ÍNDICES PARA MEJOR RENDIMIENTO
-- ===========================
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_productos_orden ON productos(orden);
CREATE INDEX IF NOT EXISTS idx_categorias_activo ON categorias(activo);
CREATE INDEX IF NOT EXISTS idx_categorias_orden ON categorias(orden);
CREATE INDEX IF NOT EXISTS idx_categoria_imagenes_categoria_id ON categoria_imagenes(categoria_id);

-- ===========================
-- POLÍTICAS DE SEGURIDAD (RLS - Row Level Security)
-- ===========================

-- Habilitar Row Level Security
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE categoria_imagenes ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública para TODOS los usuarios (sin autenticación)
CREATE POLICY "Permitir lectura pública de productos"
    ON productos FOR SELECT
    USING (activo = true);

CREATE POLICY "Permitir lectura pública de categorías"
    ON categorias FOR SELECT
    USING (activo = true);

CREATE POLICY "Permitir lectura pública de imágenes de categorías"
    ON categoria_imagenes FOR SELECT
    USING (true);

-- Permitir operaciones completas solo para usuarios autenticados (ADMIN)
CREATE POLICY "Admin puede hacer todo en productos"
    ON productos FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admin puede hacer todo en categorías"
    ON categorias FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admin puede hacer todo en imágenes de categorías"
    ON categoria_imagenes FOR ALL
    USING (auth.role() = 'authenticated');

-- ===========================
-- FUNCIÓN PARA ACTUALIZAR TIMESTAMP
-- ===========================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar automáticamente updated_at
CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON categorias
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================
-- INSERTAR DATOS INICIALES
-- ===========================

-- Insertar productos actuales
INSERT INTO productos (titulo, descripcion, imagen_url, badge, badge_color, orden) VALUES
('Herramientas Profesionales', 'Amplia gama de herramientas de alta calidad para todo tipo de trabajo', 'img/PRODUCTOS FERRETEROS/heramientas.jpeg', 'Popular', 'default', 1),
('Cajas de Herramientas', 'Organizadores profesionales para mantener tus herramientas en orden', 'img/PRODUCTOS FERRETEROS/caja de herramientas.jpeg', 'Nuevo', 'new', 2),
('Equipos de Protección Personal', 'Seguridad garantizada con los mejores EPP del mercado', 'img/PRODUCTOS FERRETEROS/EPP .jpeg', 'Recomendado', 'default', 3),
('Estantes para Herramientas', 'Exhibidores profesionales para optimizar tu espacio comercial', 'img/MUEBLES PARA IMPLEMENTACION  COMERCIAL/estante para herramientas 2.jpeg', 'Top', 'default', 4),
('Discos y Herramientas de Corte', 'Discos de alta durabilidad para trabajos exigentes', 'img/PRODUCTOS FERRETEROS/discos de cortes.jpeg', '', '', 5),
('Exhibidores de Marca', 'Muebles especializados para exhibición de marcas reconocidas', 'img/MUEBLES PARA IMPLEMENTACION  COMERCIAL/estante para herramientas 3.jpeg', '', '', 6);

-- Insertar categorías actuales
INSERT INTO categorias (titulo, icon, descripcion, badge, orden) VALUES
('Productos Ferreteros', 'fas fa-hammer', 'Herramientas profesionales, EPP, materiales eléctricos, discos de corte y todo lo necesario para trabajos de construcción y mantenimiento.', '', 1),
('Muebles para Implementación Comercial', 'fas fa-store', 'Estanterías metálicas, exhibidores especializados, muebles tipo cascada, casilleros y soluciones completas para equipar tu local comercial.', 'Especialidad', 2),
('Accesorios de Implementación', 'fas fa-puzzle-piece', 'Ganchos para panel, portaprecios, tiras de datos, cestos de mano, canastas con ruedas, carritos de compras y todos los complementos para tu tienda.', '', 3);

-- Insertar imágenes de categorías
INSERT INTO categoria_imagenes (categoria_id, imagen_url, orden) VALUES
-- Productos Ferreteros (id: 1)
(1, 'img/PRODUCTOS FERRETEROS/heramientas.jpeg', 1),
(1, 'img/PRODUCTOS FERRETEROS/EPP .jpeg', 2),
(1, 'img/PRODUCTOS FERRETEROS/discos de cortes.jpeg', 3),
(1, 'img/PRODUCTOS FERRETEROS/caja de herramientas.jpeg', 4),
-- Muebles para Implementación Comercial (id: 2)
(2, 'img/MUEBLES PARA IMPLEMENTACION  COMERCIAL/estante para herramientas.jpeg', 1),
(2, 'img/MUEBLES PARA IMPLEMENTACION  COMERCIAL/estante para herramientas 2.jpeg', 2),
(2, 'img/MUEBLES PARA IMPLEMENTACION  COMERCIAL/estante para herramientas 3.jpeg', 3),
(2, 'img/MUEBLES PARA IMPLEMENTACION  COMERCIAL/estantería metálica.jpeg', 4),
-- Accesorios de Implementación (id: 3)
(3, 'img/ACCESORIOS  DE IMPLEMENTACION/cesto de mano.jpeg', 1),
(3, 'img/ACCESORIOS  DE IMPLEMENTACION/canasta con ruedas.jpeg', 2),
(3, 'img/ACCESORIOS  DE IMPLEMENTACION/carrito de compras.jpeg', 3),
(3, 'img/ACCESORIOS  DE IMPLEMENTACION/Gancho doble con portaprecio.jpeg', 4);

-- ===========================
-- CONFIGURAR STORAGE PARA IMÁGENES (opcional)
-- ===========================
-- Si quieres subir imágenes directamente a Supabase en lugar de usar carpetas locales,
-- ve a: Storage > Create a new bucket > Nombre: "productos-imagenes" > Public bucket: ON
