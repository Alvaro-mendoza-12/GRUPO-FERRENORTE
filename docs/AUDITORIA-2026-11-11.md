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

## Tercera iteración: concurrencia y respuestas inciertas
- Los editores bloquean cambios de registro durante el guardado; categorías ignoran respuestas antiguas y no permiten guardar si la carga falló.
- Se evitan envíos simultáneos de categorías y configuración.
- Una inserción solo se considera confirmada cuando devuelve un ID. Ante un resultado de transporte incierto se bloquea el reintento en ese editor y se pide comprobar el catálogo antes de reabrirlo; no se supone que el servidor rechazó la escritura.
- La configuración conserva su ID confirmado, de modo que un segundo guardado actualiza el registro en vez de crear otro.
- El build limpia exclusivamente su carpeta generada `dist/` antes de copiar la lista de activos públicos, evitando que se publiquen restos de una compilación anterior.

Verificación acumulada: 37 pruebas aprobadas, comprobación sintáctica y build. La suite usa Supabase simulado; no certifica transacciones ni permisos en producción. No se añadieron migraciones ni se cambiaron políticas reales.

QA visual adicional: el servidor anunció escucha en 8766, pero tanto una comprobación HTTP independiente como el navegador recibieron conexión rechazada. El acceso al servidor entre superficies sigue pendiente; no se han aprobado capturas de escritorio o móvil. Para un preview Vercel falta conectar la cuenta e identificar proyecto y equipo.

## Cuarta iteración: configuración y accesibilidad
- La configuración solo se puede guardar después de confirmar una colección vacía o una única fila válida. Errores de lectura, datos inválidos o varias filas bloquean el guardado, sin interpretarlos como una configuración nueva.
- Las recargas de configuración no sustituyen el editor durante un guardado ni eliminan la protección de inserciones inciertas.
- Los diálogos de producto/cotización capturan y devuelven el foco, mantienen Tab/Shift+Tab dentro del diálogo y bloquean el desplazamiento del fondo. Solo uno queda abierto; cerrados usan `inert` y `aria-hidden`, con visibilidad CSS del panel de cotización comprobada.
- La consulta directa por WhatsApp incorpora opción seleccionada, cantidad y precio de referencia. La disponibilidad visible corresponde a la variante, no al producto base.
- Los errores al cargar opciones son visibles; respuestas antiguas no reemplazan las opciones del producto actual.

Verificación acumulada: 55 pruebas, sintaxis y build. Incluye una prueba DOM con CSS real para la visibilidad del panel cerrado. Esto no sustituye QA visual en navegador ni pruebas de Supabase real; esos pendientes se mantienen.

## Quinta iteración: integridad y navegación
- Un título de variante vacío bloquea el guardado antes de modificar el producto; ya no equivale a eliminar la variante. Los borrados confirmados se retiran del seguimiento para que un reintento parcial no los repita.
- Las actualizaciones y eliminaciones exigen que Supabase devuelva el registro afectado. Una respuesta sin filas no se anuncia como éxito.
- Las imágenes se validan antes de subirlas: JPEG, PNG, WebP o GIF, hasta 5 MiB, con extensión, MIME y firma coherentes. Se revisan todas las imágenes seleccionadas antes de iniciar el lote; los fallos de variantes preceden al guardado del producto. Esta comprobación del cliente no sustituye validación del servidor, decodificación completa ni antivirus.
- La navegación del pie y la búsqueda con Enter recuperan las secciones principales desde una categoría. Las categorías admiten enlaces directos e historial del navegador.
- Las cotizaciones guardadas se normalizan para que datos locales inválidos no rompan la consulta por WhatsApp.

Verificación acumulada: 92 pruebas locales aprobadas, sintaxis, build y revisión independiente. Se cubren filas no afectadas, guardados parciales, validación de imágenes, navegación e historial. No se modificaron datos ni políticas reales. Siguen pendientes QA visual y verificación autenticada; Vercel requiere conexión y destino confirmado.

## Sexta iteración: carga independiente y consultas
- La carga de personalización ya no bloquea productos, categorías ni enlaces directos. Las acciones de WhatsApp esperan a que termine la lectura del destino; un diálogo abierto actualiza el número cuando llega la configuración. Ante error de lectura se mantiene el contacto predeterminado existente.
- Volver a añadir un artículo guardado actualiza su nombre, imagen, variante y precio de referencia con los datos cargados del catálogo, sin perder cantidades ni combinar variantes distintas.
- Las fichas técnicas incorporan comprobación previa de formato y tamaño antes de subir archivos o guardar el producto. Es una validación básica del cliente, no antivirus ni sustituto del control del servidor.

Pendiente funcional: una cotización restaurada y enviada sin volver a añadir sus artículos conserva los datos de referencia del momento en que se guardó. Revalidar todas las variantes y artículos retirados requiere un flujo explícito; no se eliminan silenciosamente selecciones del cliente. Los importes son referenciales y la consulta no representa un pago ni un pedido confirmado.

Verificación acumulada: 133 pruebas locales aprobadas, sintaxis y build. Fichas permitidas: PDF/DOC/DOCX hasta 10 MiB, firma básica y MIME coherente; DOCX solo verifica contenedor ZIP, no estructura OOXML. Se mantiene pendiente la validación visual/autenticada y el despliegue con destino confirmado.
