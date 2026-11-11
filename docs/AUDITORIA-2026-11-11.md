# Auditoría de GRUPO FERRENORTE

## Alcance
Base: `actualizacion`, commit `106032a`. Cambios en rama independiente `dot/ferrenorte-storefront`; no se modifica main, Supabase, políticas, credenciales ni datos. Se conserva catálogo y solicitud de cotización por WhatsApp, sin añadir cobros.

## Implementado
- Escaparate comercial con fotografías existentes, colores sobrios, jerarquía de productos y guía de compra en tres pasos.
- Diseño adaptable, enlace para saltar al catálogo y etiquetas accesibles de búsqueda y cantidad.
- Búsqueda filtra catálogo y el botón lleva a resultados, cerrando el menú móvil.
- Cotización con cantidades enteras entre 1 y 999, contador de unidades y tolerancia a almacenamiento bloqueado.
- Cantidad reiniciada al cambiar producto y protección frente a respuestas tardías de variantes.
- Escape de contenido dinámico en el catálogo/categorías/cotización y enlaces de fichas técnicas limitados a HTTPS.
- Eliminada la inserción automática de productos de ejemplo en el catálogo publicado. Eliminadas cifras comerciales no verificadas.
- Build estático con lista explícita de archivos para excluir SQL, pruebas y documentación del despliegue.

## Hallazgos que requieren revisión antes de producción
1. **Alta: autorización administrativa demasiado amplia en SQL.** Las políticas en `supabase-setup.sql`, `update-schema-v2.sql`, `update-schema-v3.sql` y `supabase-storage-setup.sql` equiparan `authenticated` con administrador. Si otros usuarios pueden registrarse o autenticarse, podrían modificar contenido. No se verificó la política actualmente desplegada. Corregir exige confirmar administradores autorizados y aprobar cambio de seguridad. No se ejecutó SQL.
2. **Panel admin: endurecimiento local, validación real pendiente.** Se escapó contenido de tablas, variantes y vistas previas; los botones ya no interpolan títulos en JavaScript. Se prueban errores de sesión, guardado y borrado con respuestas simuladas. No se probó login, CRUD ni Storage contra Supabase real, ni se modificaron datos para ensayar.
3. **Datos y fotografías.** Las imágenes originales incluyen marcas y algunas señales de terceros. Revisar derechos y sustituir por material propio cuando corresponda. La disponibilidad y los precios se deben confirmar con el negocio.
4. **Despliegue pendiente.** No se encontró proyecto/equipo Vercel vinculado, CLI autenticada ni URL de destino confirmada. `vercel.json` prepara el build, pero no prueba un despliegue.

## Verificación
Ejecutar `npm ci`, `npm run check` y `npm run build`.
Las pruebas DOM usan respuestas Supabase simuladas; comprueban navegación, búsqueda, persistencia de cotización, cantidades, contenido no confiable y estados vacíos. No son validación de la base de datos real ni de la entrega de mensajes por WhatsApp.

Se intentó QA visual local con Chromium. El entorno impidió arrancarlo por `socket() failed: Operation not permitted`, incluso en ejecución escalada. Pendientes capturas y revisión real a 390, 768, 1024 y 1440 px, foco/teclado, Back/Forward, variantes y errores de red. No declarar listo para producción sin estas revisiones.

## Despliegue Vercel
Identificar primero equipo y proyecto correcto. Importar esta rama o desplegar preview con el proyecto confirmado, framework Other, build `npm run build`, output `dist`. Verificar preview y Supabase antes de promover. No añadir service-role keys al frontend ni ejecutar migraciones automáticamente.

## Segunda iteración: panel administrativo
- El editor nuevo elimina variantes residuales; descarta respuestas de productos anteriores.
- Las variantes conservan su ID y estado activo. Se actualizan/insertan antes de retirar únicamente filas conocidas que el usuario quitó. Los IDs confirmados se recuerdan incluso después de un fallo parcial.
- Las imágenes de categoría conservan sus registros al cambiar texto; al reemplazarlas se actualizan por fila, sin borrar primero toda la galería.
- Los errores devueltos por Supabase ya no se confunden con éxito en categorías y configuración.
- La comprobación de sesión y cierre de sesión recuperan la interfaz ante errores; el indicador de carga contempla operaciones simultáneas.
- El guardado de productos evita envíos simultáneos y conserva el nuevo ID confirmado para reintentar variantes sin insertar otra ficha.

**Límite importante:** estas operaciones de varias filas no son una transacción. Un fallo puede dejar cambios parciales; la interfaz conserva el editor y muestra el error. Si se pierde la respuesta de una inserción ya aceptada por el servidor, conviene recargar y comprobar antes de reintentar. Una solución atómica/idempotente necesita una operación transaccional del backend y revisión específica, no cambios automáticos de políticas.

Verificación local acumulada: 29 pruebas DOM/unitarias, sintaxis y build. Todas usan datos simulados y no sustituyen pruebas visuales o autenticadas.
