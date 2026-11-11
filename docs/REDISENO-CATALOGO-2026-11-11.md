# Rediseño comercial de Ferrenorte

## Motivo y criterio

El usuario rechazó el diseño anterior, especialmente los colores. Este rediseño prioriza una tienda reconocible: búsqueda, categorías reales, fotografías y cotización. No basta recolorear la landing anterior. Se mantiene el logo RO&MY existente, pero su azul/amarillo no determina toda la interfaz.

## Referencias observadas

- Promart, https://www.promart.pe/herramientas/ : vista de escritorio comprobada visualmente; fondo blanco, accesos fotográficos a subcategorías, filtros compactos y cinco tarjetas por fila en el ancho observado. El producto recibe el espacio principal.
- Sodimac Perú, https://www.sodimac.com.pe/sodimac-pe : cabecera clara y buscador ancho, categorías y campañas de productos. Vista parcial por superposiciones de ubicación, asesor y cookies.
- PROMAS, https://www.promas.pe/categoria/ferreteria/ : buscador protagonista, filtros, productos sobre blanco y nombres específicos. Diferencia cotización comercial de información de despacho.
- Amazon rechazó la sesión del navegador. No se presenta como inspección visual completada.
- No se verificó la versión móvil de estos comercios. Los criterios móviles del rediseño son decisiones de implementación que deben probarse.

Se toman patrones de organización, no marcas, textos, promociones, fotografías ni promesas de esos negocios. La investigación no demuestra una mejora de conversión; esa afirmación requeriría medición real.

## Dirección elegida

Se descartó repetir grandes bloques azul/naranja y otra landing decorativa. También se evita copiar la densidad de un marketplace con promociones y filtros para campos que nuestro catálogo no tiene. La propuesta es un catálogo de suministros sobrio, adaptado a cotización por WhatsApp:

- Blanco cálido y tarjetas blancas, tipografía carbón, divisores suaves.
- Verde pino solo como acento funcional; sin degradados ni grandes superficies de color.
- Cabecera comercial con búsqueda amplia y permanente en móvil, cotización visible y navegación secundaria.
- Franja editorial corta con fotografía real existente, sin insignias genéricas ni estadísticas inventadas.
- Tarjetas homogéneas con fotografía, nombre, precio de referencia cuando existe y acción de cotización. Las categorías y productos siguen viniendo de la base publicada.
- Datos de contacto y explicación del proceso, sin inventar garantías, envíos, pagos, stock, reseñas o promociones.
- Conservación de todos los controles de integridad: revalidación de cotización, estados pendientes/error, cantidades, variantes y foco de diálogos.

## Validación y límites

Ejecutar sintaxis, tests DOM y build antes del commit. Revisar estructura a 320, 390, 768 y 1440 px en navegador real cuando exista una ruta autorizada; comprobar búsqueda visible, ausencia de desbordamiento, tipografía, imágenes, categorías, diálogo y cotización.

La ruta inicial entre herramientas de comandos y navegador falló por contextos de red separados. Se confirmó después una ruta HTTP local autorizada desde terminal nativo y navegador del mismo entorno, ligada exclusivamente a loopback. No se modificó seguridad ni se utilizó file://, cuyo esquema fue rechazado. Las herramientas de desarrollo del navegador están bloqueadas y no se reintentarán. Se preparó una vista local con datos simulados, claramente rotulada, para probar catálogo y cotización sin depender de Supabase real. Esta vista no forma parte del build ni se publica. Las capturas anteriores del repositorio no representan este rediseño; el informe final debe distinguir ancho real de viewport, arnés de iframe y emulación móvil, si se emplean.

El trabajo se entrega en GitHub. Vercel fue retirado del alcance. No integrar este cambio visual en `borrador-principal` ni `main` sin la revisión correspondiente y dirección del responsable de integración.

## Resultado de la revisión

- 173 pruebas locales, sintaxis y build aprobados. El build excluye explícitamente el fixture y las capturas de QA.
- Navegador real Chromium: escritorio de 1180 px y marcos de 390/768 px; estos marcos prueban media queries, no un dispositivo móvil físico ni emulación táctil.
- Probados búsqueda, selección de variante, cantidad, cotización interceptada sin envío, categorías y cierre con Escape. No se probó geolocalización ni backend autenticado.
- Corregidos durante QA: tarjetas que dependían de scroll para aparecer, imágenes verticales que estiraban las filas, contraste de campos y tamaño táctil de controles.
- En la comprobación final de escritorio, las tarjetas midieron 210×376 px y las imágenes 208×208 px de forma uniforme. A 390 px las tarjetas midieron 164×314 px; no hubo desbordamiento horizontal.
- Evidencia visual generada localmente con rótulo de datos simulados y entregable por separado; no se incorpora el fixture al catálogo real.

Queda pendiente validar con datos publicados reales y, si se requiere certificación, con dispositivos/tecnologías de asistencia reales. La mejora de apariencia no se presenta como una garantía de ventas.

## Refinamiento con referencia aportada por el usuario

El usuario aportó https://leytech-ochre.vercel.app/ y pidió mejorar tamaños y jerarquía tanto en tienda como en administración. Se inspeccionaron esa página y `/catalogo` en navegador real, sin acceder a su administración ni copiar marca, catálogo, pagos o promociones.

Cambios aplicados a Ferrenorte:

- Categorías reales antes del catálogo, en accesos compactos con icono/descripción, sin repetir galerías de fotos.
- Tres columnas de producto en escritorio medio; cuatro solo desde 1440 px, dos hasta 800 px. Nombres/precios y textos de lectura con mayor presencia.
- Guía de cotización después de los productos para no retrasar el catálogo en móvil.
- Controles flotantes ocultos en móvil, donde contacto y cotización siguen accesibles por la navegación.
- Panel integrado alineado con la misma identidad: login sobrio, navegación independiente, enlace permanente a la tienda, tablas desplazables y formularios legibles. No se añaden estadísticas ficticias ni nuevas facultades administrativas.

La tienda se verificó de nuevo en navegador real: categorías y vuelta, búsqueda, variante, cantidad, cotización interceptada y Escape. Tres columnas a 1180 px y dos en marcos de 390/768 px, sin desbordamiento horizontal. No se desplegó ni se validó el backend real. La comprobación pública del proyecto Supabase desde este entorno devolvió error 503 de conexión upstream: requiere verificación independiente antes de afirmar operación productiva.

Administración verificada en navegador real con sesión/datos simulados y escrituras desactivadas: escritorio y marcos de 390/768 px, tablas desplazables sin ensanchar el documento, menú móvil, login, formularios y cierre/foco de diálogos. Se corrigió el título de edición de categorías y se oculta la acción de alta en Configuración. Suite final: 201 pruebas aprobadas. Las capturas llevan rótulos de prueba; los fixtures quedan fuera del build y de Git.

La inspección adicional a 320 px detectó un recorte de 3 px en el botón de añadir dentro de una categoría. Se apilan los dos controles hasta 360 px para conservar el objetivo táctil de 44 px. La regresión automatizada eleva la suite a 202 pruebas aprobadas.
