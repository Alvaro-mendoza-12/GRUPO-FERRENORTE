# ⚡ CONFIGURACIÓN RÁPIDA DE SUPA BASE STORAGE

## 📋 Tienes que ejecutar esto AHORA antes de usar el panel admin

### ✅ PASO 1: Ejecutar Script SQL de Storage (2 minutos)

1. Ve a **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecciona tu proyecto: `oohwmogmxtpouzyguikt`
3. Ve a **SQL Editor** (menú lateral izquierdo)
4. Haz clic en **"+ New Query"**
5. Copia **TODO** el contenido de `supabase-storage-setup.sql`
6. Pégalo en el editor
7. Haz clic en **"Run"** (o presiona Ctrl + Enter)

### ✅ PASO 2: Verificar que el Bucket se Creó

1. En Supabase Dashboard, ve a **"Storage"** (menú lateral)
2. Deberías ver un bucket llamado: **`productos-imagenes`**
3. El bucket debe tener un ícono de **candado abierto** (público)

---

## 🎉 ¡LISTO!

Ahora puedes usar el panel admin y las imágenes se subirán automáticamente a Supabase Storage.

---

## 🖼️ CÓMO FUNCIONA AHORA

### Antes (❌ Complicado):
- Tenías que subir la imagen manualmente a una carpeta
- Tenías que copiar la ruta
- Tenías que pegar la ruta en un input de texto
- ❌ Error si la ruta estaba mal

### Ahora (✅ Fácil):
1. Haz clic en "Seleccionar archivo"
2. Elige la imagen de tu computadora
3. ¡Listo! Se sube automáticamente a Supabase

---

## 📝 ESPECIFICACIONES

- **Tamaño máximo por imagen:** 5MB
- **Formatos permitidos:** JPG, PNG, WEBP
- **Productos:** 1 imagen
- **Categorías:** 4 imágenes (exactamente)
- **Storage gratuito:** 1GB en el plan free de Supabase

---

## ❓ Si algo no funciona:

### Error: "Failed to create bucket"
- Ve a Storage en Supabase
- Si ya existe el bucket `productos-imagenes`, está bien
- El error es porque ya se creó antes

### Error al subir imagen
1. Verifica que ejecutaste `supabase-storage-setup.sql`
2. Verifica que el bucket `productos-imagenes` existe
3. Verifica que el bucket es **público**
4. Revisa la consola del navegador (F12) para más detalles

---

## 🚀 PRÓXIMO PASO

Ya puedes usar `admin.html` y:
1. Hacer clic en "Agregar Producto"
2. Completar el formulario
3. Hacer clic en "Seleccionar archivo" para la imagen
4. Guardar

**Las imágenes se suben automáticamente a Supabase** y se muestran en la página web. ✨

---

**¡Disfruta tu panel de administración con subida de imágenes automática!** 🎨
