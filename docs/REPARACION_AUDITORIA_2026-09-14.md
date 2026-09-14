# Reparación MIA — 2026-09-14

Se aplicaron directamente sobre el ZIP auditado:

- Separación de localidad oficial vs zona personalizada y almacenamiento de inicio/fin.
- Filtrado GPS por precisión, saltos, velocidad e intervalos.
- Persistencia nativa de la traza GPS activa para recuperación tras muerte del WebView.
- Eliminación del segundo motor GPS de `BurbujaService`: la burbuja ahora es UI/control, no otra fuente de kilómetros.
- Refresh automático de access token con single-flight y reintento único tras 401.
- Corrección de fecha de negocio a `America/Bogota`.
- Catálogo IA con límite finito para evitar coste ilimitado accidental.
- Proveedor IA OpenAI-compatible activable por variables de entorno.
- Billing: `packageName` deja de ser confiado desde el cliente y se toma del servidor.
- Unificación Java/Kotlin en JVM 21.
- Limpieza de branding NOAH visible en alarmas/burbuja.
- Rediseño visual global para que Balance/Casa/Cuenta/Planes/Manual no queden como formularios administrativos.

Pendientes que dependen de infraestructura externa o de prueba física: Google Play Billing real/RTDN, migración de todos los repositorios de localStorage a SQLite/IndexedDB, endpoint de restore completo para todos los dominios, prueba de APK en teléfono real, y publicación/políticas de permisos.
