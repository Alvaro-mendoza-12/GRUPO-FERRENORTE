# 📚 GUÍA DE CONFIGURACIÓN - SUPABASE PARA GRUPO FERRENORTE

## 🎯 Objetivo
Esta guía te ayudará a configurar la base de datos en Supabase para que tu página web cargue productos y categorías automáticamente.

---

## 📋 PASO 1: Ejecutar el Script SQL en Supabase

### 1.1 Acceder a Supabase
1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto: `oohwmogmxtpouzyguikt`

### 1.2 Abrir el SQL Editor
1. En el menú lateral izquierdo, haz clic en **"SQL Editor"**
2. Haz clic en el botón **"+ New Query"** (Nueva Consulta)

### 1.3 Copiar y Ejecutar el Script
1. Abre el archivo `supabase-setup.sql` (está en la carpeta del proyecto)
2. Copia TODO el contenido del archivo
3. Pégalo en el editor SQL de Supabase
4. Haz clic en el botón **"Run"** (Ejecutar) en la esquina inferior derecha

### 1.4 Verificar que todo funcionó
Deberías ver un mensaje como: ✅ **"Success. No rows returned"**

Esto significa que:
- ✅ Se crearon las tablas: `productos`, `categorias`, `categoria_imagenes`
- ✅ Se configuró la seguridad (RLS)
- ✅ Se insertaron tus productos y categorías actuales

---

## 📋 PASO 2: Verificar que los Datos están en la Base de Datos

### 2.1 Ver la tabla de Productos
1. En el menú lateral, haz clic en **"Table Editor"**
2. Selecciona la tabla **"productos"**
3. Deberías ver 6 productos listados (Herramientas Profesionales, Cajas de Herramientas, etc.)

### 2.2 Ver la tabla de Categorías
1. Selecciona la tabla **"categorias"**
2. Deberías ver 3 categorías (Productos Ferreteros, Muebles para Implementación Comercial, etc.)

### 2.3 Ver las imágenes de categorías
1. Selecciona la tabla **"categoria_imagenes"**
2. Deberías ver 12 imágenes (4 por cada categoría)

---

## 📋 PASO 3: Probar la Página Web

### 3.1 Abrir la página en el navegador
1. Abre el archivo `index.html` en tu navegador
2. La página debería cargar normalmente
3. Los productos y categorías ahora se cargan desde Supabase

### 3.2 Verificar en la Consola del Navegador
1. Presiona `F12` para abrir las herramientas de desarrollo
2. Ve a la pestaña **"Console"** (Consola)
3. NO deberías ver errores relacionados con Supabase
4. Si ves algún error, cópialo y envíamelo

---

## 📋 PASO 4: Crear el Panel de Administración (Próximo paso)

Una vez que hayas completado los pasos anteriores y la página cargue correctamente, te crearé el panel de administración donde tu cliente podrá:

- ✅ Agregar nuevos productos
- ✅ Editar productos existentes
- ✅ Eliminar productos
- ✅ Agregar/editar/eliminar categorías
- ✅ Subir imágenes

---

## ❓ Solución de Problemas Comunes

### Problema 1: "No se pudieron cargar los productos"
**Solución:**
1. Verifica que ejecutaste el script SQL correctamente
2. Ve a `Table Editor > productos` y confirma que hay datos
3. Revisa la consola del navegador (F12) para ver el error específico

### Problema 2: La página está en blanco
**Solución:**
1. Abre la consola del navegador (F12)
2. Busca mensajes de error
3. Verifica que los archivos `supabase-config.js` y `script.js` estén en la misma carpeta que `index.html`

### Problema 3: Error de CORS
**Solución:**
1. Ve a Supabase Dashboard > Settings > API
2. En "API Settings", verifica que tu dominio esté permitido
3. Para desarrollo local, no deberías tener problemas de CORS

---

## 📧 Necesitas Ayuda?

Si encuentras algún problema:
1. Toma una captura de pantalla del error
2. Copia el mensaje de error de la consola
3. Envíame la información para ayudarte

---

## ✅ Checklist de Verificación

Marca cada item cuando lo completes:

- [ ] Ejecuté el script SQL en Supabase
- [ ] Vi el mensaje "Success" en el SQL Editor
- [ ] Verifiqué que hay 6 productos en la tabla `productos`
- [ ] Verifiqué que hay 3 categorías en la tabla `categorias`
- [ ] Abrí `index.html` en el navegador
- [ ] Los productos se cargan correctamente
- [ ] Las categorías se cargan correctamente
- [ ] No hay errores en la consola del navegador

---

¡Cuando hayas completado estos pasos, estarás listo para el Panel de Administración! 🚀
