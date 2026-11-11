# Comparación de paneles e integración de Ferrenorte

## Decisión recomendada

Mantener el panel integrado en `admin.html` y llevar cambios revisados a `borrador-principal`. No sustituirlo por el repositorio administrativo separado: actualmente no aporta funciones de negocio nuevas y se perderían capacidades y protecciones ya probadas. Separar el alojamiento del panel tampoco sustituye autorización real en Supabase.

## Fuentes verificadas

- Tienda: `main` y `borrador-principal` en `4312f45a40cbf681f110d960db7933354bde2544` al crear la rama de integración. No se fusionó contenido.
- Mejoras de tienda: `dot/ferrenorte-storefront`, commit publicado `b685c4f899c891ff673ef515e699869c7223836b`, anterior al lote de accesibilidad administrativa que acompaña este documento.
- Panel separado: https://github.com/Alvaro-mendoza-12/admin-GRUPO-FERRENORTE-RO-MY
  - `main`: `59a55e46095007ea571ff6ba10570738818dae6a`.
  - `actualizacion`: `b9df2ef4d180ca83a277b191e421ea2b07f6befd`.
- `actualizacion` no se atribuye a Óscar sin confirmación del propietario. El usuario identifica `mejoras` como rama de Óscar; su existencia y ubicación deben verificarse antes de operar.

## Comparación técnica

| Área | Panel separado | Panel integrado mejorado | Recomendación |
| --- | --- | --- | --- |
| Catálogo básico | Productos, categorías e imágenes | Conserva esas funciones | Evitar duplicar paneles |
| Edición comercial | CRUD básico | Precios y stock base, variantes, fichas y configuración | Conservar integrado |
| Menú móvil | Añadido en `actualizacion` | Ya existe | No copiar un cambio duplicado |
| Guardados | Lógica CRUD básica compartida entre sus dos ramas | Conserva IDs, comprueba filas afectadas, bloquea concurrencia y reintentos inciertos | No reemplazar por versión anterior |
| Archivos | Sin las comprobaciones nuevas | Imágenes hasta 5 MiB y fichas hasta 10 MiB, con validación básica previa | Mantener; planificar controles del servidor |
| Backend | Configuración Supabase idéntica | Misma conexión; SQL adicional para funciones de tienda | Revisar esquema real antes de migraciones |
| Validación | Sin suite equivalente en ese repositorio | Suite local con mocks, sintaxis y build | Añadir luego QA visual y autenticada |

`actualizacion` del panel separado modifica únicamente `admin-script.js`, `admin-styles.css`, `index.html` y el logo. Sus cambios son menú móvil, estilos, recurso local y referencias CDN. No justifica sustituir la lógica del integrado.

**Límites:** SKU aparece en una migración, pero no hay edición de SKU implementada en la interfaz. Las variantes no ofrecen edición de stock aunque exista la columna. La validación de archivos es básica, no antivirus. Las operaciones multirregistro no son transaccionales. No se han certificado permisos o escrituras contra Supabase real.

## Plan propuesto de responsabilidades

Este reparto es una propuesta; no implica asignaciones o comunicaciones enviadas a Óscar.

1. **Usuario: confirmar fuentes y alcance.** Verificar URL y existencia de la rama `mejoras` de Óscar; confirmar qué datos de catálogo son reales, número de WhatsApp y necesidad de SKU/stock por variante. Definir entorno de pruebas Supabase. El usuario canceló el objetivo Vercel: la colaboración será sobre GitHub. Aceptación: referencias inequívocas y datos de prueba definidos.
2. **Óscar: preparar su contribución aislada.** Describir cambios de su rama, archivos afectados y dependencias; separar presentación de migraciones o cambios de permisos. Probar desktop/móvil y aportar capturas actuales. Aceptación: commits revisables y pasos de reproducción, sin sustituir el panel protegido.
3. **dot: comparar y seleccionar.** Revisar diferencias contra la base confirmada, mapear funciones duplicadas, detectar conflictos y proponer commits que conservar. Aceptación: lista de commits y riesgos, sin asumir autoría por el nombre de una rama.
4. **dot: integrar en borrador.** Incorporar únicamente los cambios seleccionados a `borrador-principal`, preservando historial y sin modificar `main`. Resolver conflictos de manera explícita; ejecutar sintaxis, tests, build y revisión independiente. Aceptación: árbol reproducible y pruebas aprobadas.
5. **Usuario y Óscar: validar negocio y presentación.** Revisar categorías, búsqueda, variantes, cotización, contacto y panel desde móvil/desktop en un entorno de pruebas acordado. Usar datos de prueba para CRUD; verificar estados vacíos, errores y recuperaciones. Aceptación: resultados documentados y defectos críticos resueltos.
6. **dot: validar antes de integrar a principal.** Comparar de nuevo con `main` por si avanzó, confirmar que no entra SQL no aprobado, completar smoke tests locales y registrar límites de la verificación. Integrar solo tras la evaluación acordada, sin force-push. Aceptación: commit de integración identificado y posibilidad de revertir el commit de integración.
7. **dot: entregar en GitHub.** Publicar los commits verificados y la documentación, con enlaces a ramas y evidencia de pruebas. No desplegar en Vercel ni volver a solicitar su conexión. Cualquier alojamiento futuro queda fuera del alcance actual.

## Criterios mínimos antes de integrar a main

- Cotización no implica pago ni pedido confirmado; importes referenciales claramente tratados.
- Ningún borrado de variante por un campo vacío; errores y resultados inciertos visibles.
- Archivos inválidos rechazados antes de escrituras; políticas de servidor revisadas por separado.
- Pruebas visuales actuales, no capturas heredadas del repositorio.
- Auth y permisos comprobados en entorno autorizado; no ejecutar scripts SQL por el solo hecho de existir.
- `main` preservada hasta cerrar validación; `borrador-principal` funciona como rama de integración, no como sustitución automática.
