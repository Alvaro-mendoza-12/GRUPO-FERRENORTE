# 📱 GUÍA DE USO - PANEL DE ADMINISTRACIÓN

## 🎯 ¿Qué es el Panel de Administración?

El Panel de Administración te permite gestionar toda la información de tu página web sin necesidad de tocar código. Puedes agregar, editar y eliminar productos y categorías de forma visual y sencilla.

---

## 🔐 PASO 1: Crear tu Cuenta de Administrador

### 1.1 Ir a Supabase
1. Ve a https://supabase.com/dashboard
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto: `oohwmogmxtpouzyguikt`

### 1.2 Crear el Usuario Administrador
1. En el menú lateral, haz clic en **"Authentication"** (Autenticación)
2. Haz clic en **"Add User"** (Agregar Usuario)
3. Selecciona **"Create new user"**
4. Ingresa:
   - **Email:** Tu correo (ej: `admin@grupoferrenorte.com`)
   - **Password:** Una contraseña segura (¡guárdala bien!)
5. Haz clic en **"Create User"**

✅ **¡Listo!** Ya tienes tu cuenta de administrador.

---

## 🚀 PASO 2: Acceder al Panel de Administración

### 2.1 Abrir el Panel
1. Abre tu navegador
2. Ve a: `tudominio.com/admin.html` (o abre el archivo `admin.html` localmente)

### 2.2 Iniciar Sesión
1. Ingresa el email que creaste en Supabase
2. Ingresa tu contraseña
3. Haz clic en **"Iniciar Sesión"**

✅ Verás el panel de administración con las secciones de Productos y Categorías.

---

## 📦 GESTIÓN DE PRODUCTOS

### ✅ Agregar un Nuevo Producto

1. Ve a la pestaña **"Productos"** (en el menú lateral)
2. Haz clic en el botón **"+ Agregar Nuevo"**
3. Completa el formulario:

   **Campos del Formulario:**
   - **Título:** Nombre del producto (ej: "Herramientas Profesionales")
   - **Descripción:** Descripción breve del producto
   - **Imagen del Producto:** Haz clic en el botón para **subir una imagen** desde tu computadora.
   - **Badge (Opcional):** Etiqueta destacada (ej: "Popular", "Nuevo")
   - **Color del Badge:** Elige entre Naranja/Azul o Verde
   - **Orden:** Número que determina la posición (1 aparece primero, 2 segundo, etc.)
   - **Estado:** Activo (visible) o Inactivo (oculto)

4. Haz clic en **"Guardar"**

✅ La imagen se sube automáticamente y el producto aparece en tu web.

### ✏️ Editar un Producto Existente

1. Ve a la tabla de productos
2. Ubica el producto que quieres editar
3. Haz clic en el botón **"Editar"** (icono de lápiz)
4. Modifica los campos que necesites. **Si no seleccionas una nueva imagen, se mantiene la anterior.**
5. Haz clic en **"Guardar"**

✅ Los cambios se reflejan inmediatamente en la página web.

### 🗑️ Eliminar un Producto

1. Ubica el producto en la tabla
2. Haz clic en el botón **"Eliminar"** (icono de basura)
3. Confirma que deseas eliminarlo

⚠️ **Importante:** Esta acción no se puede deshacer.

---

## 🏷️ GESTIÓN DE CATEGORÍAS

### ✅ Agregar una Nueva Categoría

1. Ve a la pestaña **"Categorías"** (en el menú lateral)
2. Haz clic en **"+ Agregar Nuevo"**
3. Completa el formulario:

   **Campos del Formulario:**
   - **Título:** Nombre de la categoría (ej: "Productos Ferreteros")
   - **Icono Font Awesome:** Código del icono (ej: `fas fa-hammer`)
     - Encuentra iconos en: https://fontawesome.com/icons
   - **Descripción:** Descripción completa de la categoría
   - **Imágenes de la Categoría:** Haz clic y selecciona **EXACTAMENTE 4 IMÁGENES** desde tu computadora (puedes seleccionarlas todas juntas manteniendo presionada la tecla Ctrl).
   - **Badge (Opcional):** Etiqueta (ej: "Especialidad")
   - **Orden:** Posición en la página
   - **Estado:** Activo o Inactivo

4. Haz clic en **"Guardar"**

✅ Las imágenes se suben automáticamente y la categoría aparece en tu web.

### ✏️ Editar una Categoría

1. Ve a la tabla de categorías
2. Haz clic en **"Editar"** en la categoría deseada
3. Modifica los campos necesarios
4. Haz clic en **"Guardar"**

### 🗑️ Eliminar una Categoría

1. Ubica la categoría en la tabla
2. Haz clic en **"Eliminar"**
3. Confirma la acción

⚠️ **Importante:** Esto también eliminará todas las imágenes asociadas a la categoría.

---



## 💡 CONSEJOS Y BUENAS PRÁCTICAS

### 📊 Orden de Visualización
- Usa números consecutivos: 1, 2, 3, 4...
- Número **menor** = aparece **primero**
- Número **mayor** = aparece **después**

### 🎨 Badges (Etiquetas)
- Usa badges para destacar productos especiales
- Ejemplos: "Popular", "Nuevo", "Recomendado", "Oferta"
- Déjalos vacíos si no quieres mostrar ninguna etiqueta

### 🖼️ Imágenes
- Usa imágenes de buena calidad
- Tamaño recomendado: 800x800 píxeles
- Formatos: JPG, PNG, WEBP

### ⚙️ Estado Activo/Inactivo
- **Activo:** El elemento es visible en la página web
- **Inactivo:** El elemento está oculto pero no eliminado
- Útil para ocultar temporalmente productos sin perderlos

---

## ❓ PREGUNTAS FRECUENTES

### ❓ ¿Los cambios son inmediatos?
✅ Sí, los cambios se reflejan al **recargar la página web** (Ctrl + F5)

### ❓ ¿Puedo deshacer una eliminación?
❌ No, las eliminaciones son permanentes. Ten cuidado al eliminar.

### ❓ ¿Cuántos productos puedo tener?
✅ Ilimitados (dentro del plan gratuito de Supabase: 500MB de base de datos)

### ❓ ¿Puedo tener múltiples administradores?
✅ Sí, crea más usuarios en Supabase > Authentication > Add User

### ❓ ¿Qué hago si olvidé mi contraseña?
1. Ve a Supabase Dashboard > Authentication
2. Busca tu usuario
3. Haz clic en los 3 puntos > "Send password recovery"
4. Revisa tu correo para restablecer la contraseña

---

## 🔒 SEGURIDAD

### Buenas Prácticas:
- ✅ Usa una contraseña fuerte (mínimo 8 caracteres)
- ✅ No compartas tus credenciales
- ✅ Cierra sesión cuando termines
- ✅ No uses la misma contraseña que otros servicios

---

## 🆘 ¿NECESITAS AYUDA?

Si tienes problemas:
1. Revisa que hayas iniciado sesión correctamente
2. Verifica tu conexión a internet
3. Abre la consola del navegador (F12) para ver errores
4. Toma una captura de pantalla del error
5. Contacta a tu desarrollador

---

## ✅ CHECKLIST RÁPIDA

- [ ] Creé mi cuenta de administrador en Supabase
- [ ] Pue do iniciar sesión en el panel
- [ ] Agregué un producto de prueba
- [ ] Edité un producto existente
- [ ] Agregué una categoría de prueba
- [ ] Los cambios se reflejan en la página web

---

¡Felicidades! Ya sabes cómo administrar tu página web de forma profesional. 🎉
