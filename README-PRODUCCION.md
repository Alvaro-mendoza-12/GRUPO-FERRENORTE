# Preparación para producción: Grupo Ferrenorte

## Estado actual

La tienda y el panel integrado tienen mejoras de funcionamiento, pruebas locales y revisión visual con datos simulados. **Esto no certifica todavía la operación en producción.** El usuario retiró Vercel del alcance; no se ejecutan despliegues ni migraciones automáticamente.

- Tienda: catálogo, categorías, búsqueda, variantes y lista de cotización por WhatsApp. No procesa pagos ni confirma pedidos.
- Panel: productos, categorías, variantes, archivos y configuración. Los controles del navegador no sustituyen autorización del servidor.
- Pruebas: `npm run check`, `npm run build` y revisión del resultado `dist/`. Las pruebas de Supabase usan mocks.
- Auditoría npm del 11 de noviembre de 2026: cero vulnerabilidades reportadas. No incluye recursos CDN, permisos reales ni lógica de negocio.

## Destino pendiente de confirmar

La API de GitHub indica que el repositorio tiene Pages habilitado (`has_pages: true`), pero no se verificó aquí qué rama/carpeta publica ni su dominio efectivo. El antiguo `og:url` menciona `grupo-ferrenorte.web.app`; no existe configuración Firebase versionada que confirme ese destino. No asumir que uno de estos destinos está autorizado para publicar la nueva versión.

Antes de publicar hay que verificar URL, cuenta, proyecto y origen de despliegue. Mientras tanto se trabaja en GitHub. `main` no se cambia sin la validación acordada; los cambios visuales permanecen en la rama de trabajo hasta revisión.

## Cómo verificar el código localmente

1. Instalar dependencias bloqueadas con `npm ci`.
2. Ejecutar `npm run check` para sintaxis y pruebas.
3. Ejecutar `npm run build` y servir únicamente `dist/` con un servidor HTTP local.
4. Revisar escritorio, tablet y móvil: búsqueda, categorías, fotos, variantes, cantidades, reintento de cotización y controles de teclado.
5. Verificar que el build no incluya SQL, tests, archivos internos o fixtures de QA. La lista de activos está en `scripts/build.cjs`.

No publicar directamente la raíz del repositorio como sustituto del build: contiene SQL y documentación que no son activos de la tienda. No usar capturas antiguas como prueba de la versión actual.

## Puertas de salida para producción

- [ ] Confirmar el hosting existente, su dominio y la rama/carpeta de publicación. No desplegar hasta identificar el destino.
- [ ] Confirmar acceso al proyecto Supabase correcto y esquema realmente desplegado. Una comprobación pública desde este entorno devolvió 503 de conexión upstream para productos/categorías/configuración; no demuestra por sí sola una caída del proyecto, pero impidió verificarlo.
- [ ] Verificar lectura pública de catálogo y categorías, variantes activas y configuración comercial con datos reales autorizados.
- [ ] Verificar inicio/cierre/expiración de sesión con una cuenta de pruebas autorizada. No crear usuarios ni cambiar autenticación sin aprobación.
- [ ] Auditar RLS y Storage reales: los SQL heredados equiparan `authenticated` con administrador. No considerar esto suficiente sin revisar quién puede registrarse y qué usuarios tienen permiso de administrar.
- [ ] Probar CRUD en entorno de ensayo con datos desechables autorizados, incluidas fallas parciales y reintentos. No probar eliminaciones sobre datos comerciales reales.
- [ ] Decidir una operación de backend transaccional/idempotente para producto y variantes si se exige atomicidad. Las protecciones actuales reducen duplicados/pérdida de contexto, pero no convierten varias llamadas en una transacción.
- [ ] Revisar validación de archivos del servidor y límites de Storage. Las firmas verificadas por el cliente no son antivirus ni validación completa de documentos.
- [ ] Confirmar información comercial: contactos, horarios, razón social, precios referenciales, disponibilidad y derechos de uso de imágenes.
- [ ] QA con navegador y datos reales, móvil físico si forma parte de aceptación, teclado y lector de pantalla. Documentar consola, rutas, imágenes y flujos.
- [ ] Registrar commit candidato, resultados y plan de reversión antes de actualizar la versión pública.

## SQL y secretos

Los archivos SQL son material para revisión, no instrucciones de ejecución automática. Algunos modifican políticas y estructuras. Leerlos, contrastarlos con el esquema actual y obtener la aprobación correspondiente antes de ejecutarlos.

La clave pública/anon de Supabase puede estar en el frontend, pero solo resulta segura con autorización correcta en el servidor. Nunca incorporar claves service-role, contraseñas ni secretos administrativos al navegador, a commits o al build.

## Documentación de trabajo

- `docs/AUDITORIA-2026-11-11.md`: hallazgos, correcciones y límites verificados.
- `docs/COMPARACION-ADMIN-E-INTEGRACION.md`: comparación del panel separado y plan de ramas.
- `docs/REDISENO-CATALOGO-2026-11-11.md`: investigación visual y QA del nuevo escaparate.
