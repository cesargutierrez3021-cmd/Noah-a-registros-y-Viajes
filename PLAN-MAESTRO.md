# MIA — Plan maestro

> **Instrucción para cualquier sesión nueva (Claude u otra persona):** lee este archivo primero, completo, antes de tocar código. Aquí está el estado real: qué fase va, qué se decidió y por qué, y qué sigue exactamente. No releer el proyecto viejo (NOAH Conductor) salvo que se busque un dato puntual de funcionalidad — ese proyecto es solo referencia, nunca se copia código de ahí (excepción: plugins nativos de Android, ver decisión D-1).

Última actualización: Fase 13 (offline + sincronización con dedupe) — retry con backoff agregado (`app/src/lib/autoSync.ts`), resolviendo el pendiente #4 (los tres dominios ahora reintentan solos y reaccionan al evento `online`). Antes de esto: continuación con jornadas y registros de mantenimiento sincronizándose (mismo diseño push-only + upsert por id que viajes, D-16). Los ítems de mantenimiento (configuración editable/borrable) siguen sin sincronizar, a propósito — ver "Estado real de Fase 13" para el porqué completo. Jornada, que era la única excepción al patrón de D-8 (persistencia suelta dentro de `store.ts`, sin `repository.ts`), ahora tiene su `repository.ts` real. Antes de esto: Fase 13 arrancada — EN CURSO, solo viajes. Push-only, un viaje por request (`POST /sync/viajes`), dedupe real por `id` (upsert) + verificación de que ese `id` no pertenezca a otro usuario (403 si pasa). Esto también obligó a revisar el límite de body de Fase 12 (256kb → 512kb, documentado en `index.ts` por qué). Antes de esto: Fase 12 (Seguridad) — los pendientes #4 (logging de eventos de seguridad, `server/src/lib/logSeguridad.ts`, conectado a rate limit y a login/registro fallidos) y #5 (límite explícito de body) quedaron cerrados esa sesión. Antes de esto: Fase 11 (Google Play Billing) arrancada — EN CURSO, bloqueada en la práctica por no existir todavía una cuenta de desarrollador de Google Play (ver D-14 y "Estado real de Fase 11"). Antes: continuación de Fase 10 — pantalla de login/registro del cliente (`CuentaScreen.tsx`) construida (D-13), cerrando el pendiente #4 de Fase 7. Antes de eso: Fase 10 (voz + conversación continua) arrancada — EN CURSO, primera conexión real cliente↔backend (D-11). Antes: Fase 9 (IA analista) HECHA con salvedades (proveedor de IA real sigue sin decidirse). Antes de eso, Fase 5 (GPS en segundo plano): causa probable del permiso que nunca se disparó, corrección aplicada en `MainActivity.java`, **pero sigue sin confirmarse en un dispositivo real**. Fase 7 sigue EN CURSO (backend sin probar; cliente con login). Fase 6 con el código escrito, sin probar. **Nota importante para cualquier sesión futura: Claude no tiene memoria entre conversaciones — solo existe lo que quede efectivamente dentro del zip.** Antes de cerrar cualquier sesión, hay que verificar que TODO archivo mencionado como "creado en esta sesión" esté de verdad incluido en el zip final que se entrega, no solo descrito en este documento.

---

## Cómo continuar en una sesión nueva

1. Descomprime el zip que te entregaron junto con este archivo.
2. Lee la sección "Estado actual" (abajo) para saber exactamente dónde quedamos.
3. Lee "Decisiones tomadas" para no repreguntar cosas ya resueltas.
4. Sigue con la fase marcada como `EN CURSO` o la siguiente `PENDIENTE`.
5. Al cerrar la sesión (o cuando el usuario avise que se acaba el límite): actualiza este archivo (estado + decisiones nuevas) y entrega un zip nuevo con el código avanzado.

---

## Fases (documento de requisitos del usuario → 14 fases originales, reorganizadas en fases de trabajo reales)

| # | Fase | Estado | Entregable |
|---|---|---|---|
| 1 | Auditoría del proyecto viejo (NOAH Conductor) | ✅ HECHA | Hallazgos: pantallas huérfanas, CSS parchado, código muerto — documentados en el historial de conversación |
| 2 | Arquitectura limpia (cliente + backend + fuente única de verdad por responsabilidad) | ✅ HECHA | `docs/FASE2-ARQUITECTURA.md` (incluido en este proyecto) |
| 3 | Elegir stack técnico del proyecto nuevo, desde cero | ✅ HECHA | Decisiones D-1 a D-8 |
| 4 | Reconstruir el núcleo: dominio de viajes (GPS en primer plano, km reales, plataforma, jornada) | ✅ HECHA | `app/src/domain/viajes/`, `app/src/domain/jornada/` |
| 5 | GPS en segundo plano (foreground service nativo) + zonas/geofencing local | 🟡 EN CURSO | `app/android/.../gps/` (servicio + plugin), `app/src/domain/viajes/gpsBackground.ts`, `app/src/domain/viajes/geofencing.ts` — código escrito, sin integrar ni probar (ver "Estado real de Fase 5" abajo) |
| 6 | Mantenimiento + estadísticas | 🟡 EN CURSO (código escrito, sin probar) | `app/src/domain/mantenimiento/`, `app/src/domain/estadisticas/`, `app/src/features/mantenimiento/`, `app/src/features/estadisticas/` — ver "Estado real de Fase 6" abajo |
| 7 | Backend: auth + usuarios + planes | 🟡 EN CURSO (backend escrito, sin probar; cliente ahora tiene pantalla de login/registro, ver Fase 10) | `server/src/modules/auth`, `server/src/modules/plans`, `server/prisma/schema.prisma`, `app/src/domain/auth/`, `app/src/features/auth/CuentaScreen.tsx` — ver "Estado real de Fase 7" abajo |
| 8 | Intent Router (reglas + clasificador) | ✅ HECHA (con salvedades — ver "Estado real de Fase 8" abajo) | `server/src/modules/ai` |
| 9 | IA analista (proxy + contexto compacto) | ✅ HECHA (con salvedades — ver "Estado real de Fase 9" abajo) | `server/src/modules/ai` (analisis.ts, contextoCompacto.ts, proveedorIA.ts) |
| 10 | Voz + conversación continua | 🟡 EN CURSO (código escrito, sin probar) | `server/src/modules/ai/conversacion.ts` (+ ruta `POST /ai/conversacion`), `app/src/domain/conversacion/`, `app/src/features/conversacion/ConversacionScreen.tsx`, `app/src/lib/api.ts` — ver "Estado real de Fase 10" abajo |
| 11 | Google Play Billing (planes) + validación server-side | 🟡 EN CURSO (código escrito, sin probar) | `server/src/modules/billing/`, catálogo de planes ampliado en `server/src/modules/plans/`, `app/src/domain/planes/`, `app/src/features/planes/PlanesScreen.tsx` — ver "Estado real de Fase 11" abajo |
| 12 | Seguridad (auth, rate limits, datos por usuario) | 🟡 EN CURSO — lo que faltaba de código ya está (logging + límite de body); lo que queda está bloqueado por red/despliegue, no por código | `server/src/http/rateLimit.ts`, `server/src/lib/logSeguridad.ts`, `cors`/`helmet` en `index.ts`, `env.corsOrigenes` — ver "Estado real de Fase 12" abajo |
| 13 | Offline + sincronización con dedupe | 🟡 EN CURSO — viajes, jornadas y registros de mantenimiento (ítems de mantenimiento a propósito afuera, ver "Estado real de Fase 13") | `server/src/modules/sync/`, `app/src/domain/{viajes,jornada,mantenimiento}/{api,sync}.ts`, `app/src/domain/jornada/repository.ts` (nuevo) |
| 14 | Pruebas completas + limpieza final + preparación para Google Play (Data Safety, permisos, target API) | ⬜ PENDIENTE | — |

---

## Decisiones tomadas (no volver a preguntar esto)

- **D-1 — Plugins nativos de Android (burbuja, alarma):** se reutilizan tal cual del proyecto viejo, sin reescribir. Es la única excepción a "todo se construye desde cero", justificada porque ya usan las APIs correctas de Android. Package original `com.noah.conductor.atlas.*` se mantiene por ahora para no generar trabajo extra de renombrado; se puede renombrar a `com.mia.*` en la Fase 14 (limpieza final) sin riesgo, es un cambio mecánico.
- **D-2 — Stack cliente:** Capacitor + React + TypeScript + Tailwind. Se re-eligió (no se heredó) porque sigue siendo la opción correcta para una app híbrida Android con necesidad de plugins nativos propios.
- **D-3 — Estado del cliente:** Zustand, pero **un store por dominio** (viajes, gastos, deudas, mantenimiento...), cada uno con su propia cola de sincronización — no un store monolítico como en el proyecto viejo.
- **D-4 — Stack backend:** Node.js + TypeScript + Express + PostgreSQL + Prisma. Elegido por ser estándar, sin vendor lock-in, fácil de mantener y con soporte amplio para desplegar donde sea.
- **D-5 — Auth inicial:** JWT propio (email + contraseña) para arrancar. Login con Google se puede agregar después sin romper nada, porque el backend ya abstrae "usuario autenticado" detrás de un middleware único.
- **D-6 — Pagos:** Google Play Billing Library en el cliente + endpoint en el backend que valida el recibo contra la API de Google (Play Developer API). Ninguna pasarela de pago propia para las mensualidades — es requisito de Google para contenido digital.
- **D-7 — Geolocalización de zonas:** motor local con polígonos embebidos en el cliente (sin API externa por viaje). **Resuelto en Fase 5:** las 20 localidades oficiales de Bogotá, tomadas del dataset "Localidad. Bogotá D.C." de Datos Abiertos Bogotá (Catastro Distrital), simplificadas con Douglas-Peucker (~40m de tolerancia, de 57.840 vértices originales a ~2.000) y cargadas en `app/src/domain/viajes/zonasBogota.ts`. Si la cobertura se extiende a otras ciudades más adelante, se agrega como otro archivo de zonas y se decide ahí cómo combinarlos — no es parte del alcance actual.
- **D-9 — GPS solo funciona en primer plano todavía (gap real, no ignorar):** `domain/viajes/gps.ts` usa `@capacitor/geolocation`, que deja de capturar recorrido si la app se minimiza o la pantalla se apaga. Para un conductor esto es inaceptable — el viaje puede durar con el teléfono guardado. La solución es un plugin nativo de Android nuevo, con un foreground service de tipo `location` (mismo patrón que `burbuja`/`alarma`, que si funcionan en esas condiciones). Este plugin **no existe todavía**. Es la prioridad #1 de la Fase 5, antes que las zonas/geofencing.
- **D-10 — Jornada es un dominio separado de viajes:** `domain/jornada/` solo agrupa IDs de viajes de un turno; no duplica ni recalcula nada de `domain/viajes`. La conexión entre los dos (agregar un viaje recién terminado a la jornada abierta) se hace en la capa de orquestación (`features/viajes/ViajesScreen.tsx`), nunca dentro de los stores — así ningún store depende de otro.
- **D-11 — Conexión cliente↔backend y conversación (Fase 10):** `/ai/conversacion` NO persiste nada en el backend — el cliente manda `turnosPrevios` (los últimos turnos de ESTA conversación de voz) en cada request, mismo principio que D-8/Fase 8 ("el cliente manda el dato ya calculado, el backend no es dueño de datos que no le corresponden todavía"). Esto también obligó a crear `app/src/lib/api.ts`, la primera vez que `app/` llama de verdad a `server/` (antes de esto, Fase 7 punto 4 lo dejaba pendiente para Fase 13/sync). El cliente guarda los tokens en `localStorage` (`lib/api.ts`) — inicialmente esto se escribió sin que existiera ninguna pantalla que llamara a guardar el token; **eso se resolvió en la continuación de esta misma fase (ver D-13): ya existe `app/src/features/auth/CuentaScreen.tsx`.**
- **D-12 — Voz: plugins de Capacitor de la comunidad, no plugins nativos propios:** a diferencia del GPS en segundo plano (D-9, que sí necesitó un plugin Kotlin propio porque no hay alternativa para un foreground service de ubicación), el reconocimiento de voz y el texto a voz usan `@capacitor-community/speech-recognition` y `@capacitor/text-to-speech` — plugins ya existentes y mantenidos, agregados a `app/package.json`. Ninguno necesita foreground service: solo funcionan con la app en primer plano, que es exactamente el caso de uso (el conductor le habla a la app abierta). Por eso NO es una excepción a "todo se construye desde cero" en el sentido de D-1 (no se copió código del proyecto viejo NOAH Conductor, que además nunca tuvo esta función) — es simplemente usar una librería de terceros para algo que no justifica reinventar, igual que ya se usa `@capacitor/geolocation` como fallback web en `gps.ts`.
- **D-13 — Pantalla de login/registro (continuación de Fase 10, cierra pendiente #4 de Fase 7):** una sola pantalla (`CuentaScreen.tsx`) con un toggle login/registro en vez de dos separadas, porque el formulario es idéntico (email + contraseña) y el backend ya distingue el error de cada caso. La sesión se guarda como el par de tokens en `localStorage` (`lib/api.ts`, `guardarTokens`/`obtenerTokenAcceso`/`obtenerTokenRefresco`/`borrarTokens`) — `haySesion()` decide "¿sigo logueado?" mirando si hay token de acceso guardado, NO se valida contra el backend al abrir la app. Huecos conocidos, dejados así a propósito por alcance (no bloquean usar la pantalla, sí hay que resolverlos antes de publicar): (1) no hay refresco automático — si el token de acceso (dura pocos minutos, `JWT_EXPIRACION_ACCESO_MIN`) expira a mitad de una conversación, la llamada falla con 401 y hoy no se reintenta sola con el token de refresco, aunque éste ya se guarda; (2) el objeto `usuario` (nombre/email en memoria) NO se restaura al recargar la app — solo el token persiste, así que tras recargar `autenticado()` da `true` pero `usuario` es `null` hasta el próximo login; la corrección natural es llamar a `GET /auth/yo` al arrancar si hay token guardado, no se hizo en este corte.
- **D-14 — Billing: idempotencia por `purchaseToken`, sin flujo de compra falso en el cliente (Fase 11):** `PlanDeUsuario.purchaseToken` es único en la base — si `POST /billing/validar-compra` recibe un token que ya generó una fila, devuelve el plan que ya se activó SIN volver a llamar a Google ni duplicar nada (cubre reintentos del cliente). Activar un plan nuevo desactiva —no borra— los anteriores del usuario, para conservar historial. Del lado del cliente, `PlanesScreen.tsx` es **solo lectura** (plan actual + catálogo): no hay botón de "Comprar" que simule una compra, porque D-6 exige que cualquier cobro dentro de la app pase por Google Play Billing Library, y esa integración nativa no se escribió en este corte (ver "Estado real de Fase 11" — el bloqueante real es no tener todavía una cuenta de desarrollador de Google Play contra la cual probar nada de esto).
- **D-15 — Rate limiting propio en memoria, no un paquete (Fase 12):** `http/rateLimit.ts` es una ventana fija por IP escrita a mano (15 líneas), no `express-rate-limit`. Se verificó con `node` (bloquea al superar el máximo, se resetea pasada la ventana, cada IP tiene su propio contador). **Límite real, no ignorar:** vive en memoria del proceso — si el backend corre en más de una instancia, cada una cuenta por separado (el límite efectivo se multiplica por la cantidad de instancias). Migrar a un store compartido (Redis) si eso llega a pasar; no se adelantó sin necesidad confirmada. También se agregó `app.set('trust proxy', 1)` para que `req.ip` sea la IP real del cliente y no la del proxy — asumiendo un solo proxy delante (típico de Render/Railway/Heroku), sin poder confirmarlo contra un despliegue real todavía (sigue sin decidirse dónde se despliega, ver "Qué falta decidir").
- **D-16 — Sync push-only, un viaje por request, no un lote (Fase 13):** `POST /sync/viajes` recibe UN viaje, no un array. Se decidió así por dos razones juntas: (1) acota el tamaño del body al de un solo viaje, no al de "todo lo acumulado sin internet" — importante porque el `recorrido` (puntos GPS) es lo único de este backend que puede pesar de verdad, y un lote de un día entero sin sync sí podía chocar contra el límite de Fase 12; (2) hace el dedupe y el manejo de errores más simples: si algo falla a mitad de la cola, se sabe exactamente cuál viaje fue, sin tener que descomponer una respuesta parcial de un batch. El cliente (`domain/viajes/sync.ts`) recorre la cola local en secuencia, uno a la vez — no en paralelo, para no saturar el rate limiter de `/sync/viajes`. Es **push-only**: el backend no empuja cambios de vuelta al cliente (no hay sincronización multi-dispositivo) — no hay ningún requisito de "varios dispositivos" en el documento original de MIA, así que no se construyó sin necesidad confirmada.
- **D-8 — Convención de carpetas:** `app/` = cliente móvil, `server/` = backend, `docs/` = documentos de arquitectura y planeación. Cada módulo de dominio vive en `app/src/domain/<nombre>/` con `types.ts`, `repository.ts`, `store.ts` — ese es el patrón a repetir para cada nuevo módulo (gastos, deudas, mantenimiento, etc.), no inventar una estructura distinta por módulo.
- **D-17 — Despliegue: Render (backend) + Neon (Postgres), ambos plan free, elegidos explícitamente por el usuario por ser "lo más fácil ahora sin perder la salida después":** el criterio fue que D-4 (Node + Express + Postgres + Prisma) ya se había elegido por no tener nada propietario de un proveedor — así que cualquier combinación de hosting estándar sirve, y migrar después es `pg_dump`/`pg_restore` + cambiar `DATABASE_URL`, nada de reescribir código. Se prefirió Neon sobre el Postgres gratis de Render porque el de Render expira a los 30 días (hay que pagar o perder los datos); Neon es gratis sin fecha límite. Render se eligió para el backend en sí porque se conecta directo a GitHub desde el navegador (coherente con que el usuario no tiene PC).

---

## Qué falta decidir (preguntar al usuario cuando se llegue a esa fase, no antes)

- Proveedor de IA definitivo para el proxy del backend — aplica tanto al clasificador de respaldo de Fase 8 como al proxy de análisis de Fase 9 (mismo tipo de pieza en ambos: `(entrada) => Promise<resultado>`, inyectable, sin implementación real todavía).
- Dónde se despliega el backend (Fase 7 en adelante) — ✅ RESUELTO esta sesión: Render (web service, plan free) + Neon (Postgres, plan free permanente — a diferencia del Postgres gratis de Render, que expira a los 30 días). Ver D-17 y "Despliegue — Render + Neon" más abajo.
- Set de ciudades/zonas a cubrir en el geofencing local (Fase 5). ✅ RESUELTO — 20 localidades de Bogotá, ver D-7.
- Nombre final de paquete Android / branding (`com.mia.conductor` u otro) — no urge, se resuelve en Fase 14. **Fase 11 ya empezó a depender de esto**: `packageName` es uno de los tres datos que `POST /billing/validar-compra` le manda a Google para verificar una compra — si el paquete final termina siendo otro, no rompe el código (es un parámetro, no algo hardcodeado), pero si urge más de lo que se pensaba porque también hay que crear la app en Play Console con ese mismo nombre antes de poder configurar ningún producto.
- Cuenta de desarrollador de Google Play — todavía no existe (o al menos, no se confirmó que exista). Sin ella no hay Play Console, y sin Play Console no se puede: (a) crear el producto/suscripción real que `PLANES_BASE.pro_mensual.productIdGooglePlay` (`'mia_pro_mensual'`, ver `modules/plans/types.ts`) asume que va a existir, (b) generar la cuenta de servicio que necesita `modules/billing/googlePlay.ts` para verificar compras, ni (c) probar nada de Fase 11 de punta a punta. Es, en la práctica, EL bloqueante de Fase 11 — no un detalle de "Qué falta decidir" tardío.
- Precio del plan `pro_mensual` (y si hace falta más de un plan pago) — no se inventó un precio porque fijarlo es una decisión de negocio, no técnica.

## Estado real de Fase 5 (para la próxima sesión)

Hecho hasta ahora:

1. **Plugin nativo Kotlin** en `app/android/app/src/main/java/com/noah/conductor/atlas/gps/`:
   - `GpsTrackingService.kt` — foreground service tipo `location`, usa `FusedLocationProviderClient`, notificación persistente con botón "Detener", `START_STICKY`.
   - `GpsTrackingPlugin.kt` — puente Capacitor (`GpsTracking.startTracking()` / `.stopTracking()` / `addListener('locationUpdate', ...)`), maneja el flujo de permisos de foreground y background location por separado (requisito de Android 10+).
2. **Wrapper TS** `app/src/domain/viajes/gpsBackground.ts` — llama al plugin nativo.
3. **`domain/viajes/gps.ts` ya integrado**: `iniciarSeguimientoGPS` detecta si corre en Android nativo (`Capacitor.isNativePlatform() && getPlatform() === 'android'`) y en ese caso delega en el foreground service; si no (navegador/dev web), cae a `@capacitor/geolocation` como antes. La interfaz `SeguidorGPS` no cambió, así que **`store.ts` y `ViajesScreen.tsx` no se tocaron** — el patrón de Fase 4 sigue intacto.
4. **Motor de geofencing** `app/src/domain/viajes/geofencing.ts` + `app/src/domain/viajes/zonasBogota.ts` — `obtenerZona(punto, zonas)` con ray casting sobre polígonos, soporta zonas con más de un anillo (Santa Fe tiene 2 partes separadas en la fuente oficial). **`ZONAS` ya no está vacío**: son las 20 localidades reales de Bogotá (D-7 resuelto), verificadas contra puntos conocidos (aeropuerto El Dorado → Fontibón, Corabastos → Kennedy, un punto en Chía → `null`).
5. **`repository.ts` ya conectado**: `crearViajeDesdeCiere` resuelve `localidad`/`zona` contra el último punto del recorrido usando `obtenerZona`. Ambos campos reciben el mismo valor por ahora (el motor no distingue "localidad" de "zona" como capas separadas todavía — ver comentario en el código).
6. `docs/FASE5-GPS-MANIFEST.md` — permisos y declaración de servicio que hay que agregar a mano en `AndroidManifest.xml` (no venía en este zip).

Hecho en esta sesión (continuación de Fase 5, punto pendiente #1 de la sesión anterior):

7. **Proyecto Capacitor Android armado desde cero** — no existía ningún archivo de proyecto real, se escribieron a mano (sin poder correr `npx cap add android` porque este entorno no tiene red ni `node_modules` instalados):
   - `app/capacitor.config.ts` — `appId: com.noah.conductor.atlas` (D-1: se mantiene el package viejo, renombrar es tarea de Fase 14).
   - `app/android/build.gradle`, `settings.gradle`, `variables.gradle`, `gradle.properties` — proyecto Gradle raíz.
   - `app/android/app/build.gradle` — módulo `app`, **ya con la dependencia `play-services-location` aplicada** (punto 4 de `docs/FASE5-GPS-MANIFEST.md`).
   - `app/android/app/src/main/AndroidManifest.xml` — **con los permisos y el `<service>` de `GpsTrackingService` de `docs/FASE5-GPS-MANIFEST.md` ya aplicados**, más lo que ya necesitaban los plugins viejos (`BurbujaService` con `foregroundServiceType="specialUse"` porque llama `startForeground()` y con targetSdk 35 eso es obligatorio; `AlarmaActivity` con `showWhenLocked`/`turnScreenOn` según el comentario del propio `.kt`).
   - `MainActivity.java` (extiende `BridgeActivity`, sin `registerPlugin()` manual — Capacitor 3+ detecta los `@CapacitorPlugin` solo).
   - Recursos mínimos: `strings.xml`, `colors.xml`, `styles.xml` (tema `Theme.SplashScreen`), `file_paths.xml`, e iconos placeholder (círculo, todas las densidades) — **hay que reemplazarlos por el icono real antes de publicar, no antes**.
   - `app/android/capacitor-cordova-android-plugins/` — módulo vacío que Capacitor espera aunque no haya plugins Cordova.

   **Lo que NO se pudo hacer por no tener red/Android SDK en este entorno** (queda para la próxima sesión, con el proyecto real):
   - No se corrió `npm install` ni `npx cap sync android` — `settings.gradle` apunta a `node_modules/@capacitor/...` que todavía no existen en este zip. Al correr `cap sync` con las dependencias instaladas, Capacitor regenerará `app/android/app/capacitor.build.gradle` (aquí quedó un placeholder mínimo) y puede ajustar rutas.
   - Falta el **wrapper de Gradle** (`gradlew`, `gradlew.bat`, `gradle-wrapper.jar`) — solo se dejó `gradle-wrapper.properties`. Android Studio lo regenera solo al abrir el proyecto y sincronizar, o se genera con `gradle wrapper` si hay un Gradle local instalado.
   - No se compiló ni se probó nada — sin Android SDK/emulador/dispositivo en este entorno es imposible. **Sigue siendo tarea del usuario** compilar y probar en un teléfono físico (el emulador no sirve para GPS en segundo plano de forma confiable).

Pendiente para cerrar la Fase 5 (en orden):

1. Push del repo a GitHub (no hace falta PC — se puede crear el repo y subir los archivos desde el navegador/celular) para que corra `.github/workflows/build-apk.yml`.
2. Descargar el APK generado (artefacto del workflow) e instalarlo en un Android físico.
3. Probar en ese dispositivo — verificar que el recorrido se siga grabando con la app minimizada y la pantalla apagada. Esto no se puede mover a la nube, necesita un teléfono real.
4. Reemplazar los iconos placeholder por los definitivos (no urgente, antes de publicar).
5. Decidir si `localidad` y `zona` deben ser dos lookups distintos o si el valor único actual es suficiente (no urgente).
6. No se tocó `domain/jornada` en ningún momento de la Fase 5.

## El usuario no tiene PC — no puede usar Android Studio (aclarado en esta sesión)

Se agregó `.github/workflows/build-apk.yml` — un flujo de GitHub Actions que compila el APK en la nube. **Ajustado en esta misma sesión** porque GitHub, desde el navegador de un celular, no deja subir una carpeta completa ni descomprime zips subidos — solo deja elegir archivos sueltos. Solución: el workflow ahora **descomprime el zip él mismo** (`unzip -o mia-proyecto.zip -d .` como primer paso). Así el usuario solo sube dos archivos sueltos a la raíz del repo, nunca carpeta por carpeta:
1. `.github/workflows/build-apk.yml` — se crea con "Add file → Create new file" en github.com, escribiendo la ruta completa con barras en el campo de nombre (GitHub crea las carpetas solo).
2. `mia-proyecto.zip` — el zip del proyecto tal cual, sin descomprimir, subido con "Add file → Upload files" (selecciona un solo archivo, sin arrastrar carpetas).

Después: `npm install` → `npm run build` (vite) → `npx cap sync android` → `gradle wrapper` (genera `gradlew`, que este proyecto armado a mano nunca tuvo) → `./gradlew assembleDebug`. El APK queda descargable como artefacto del workflow.

De paso, revisando por qué el build web podía fallar, se encontró que **faltaban archivos base del cliente que ninguna fase anterior había creado** (no es un pendiente que estuviera escrito en este plan, es un hueco real): `index.html`, `src/main.tsx`, `src/App.tsx`, `vite.config.ts`, `tsconfig.json`/`tsconfig.app.json`/`tsconfig.node.json`. Se crearon todos en esta sesión — `App.tsx` monta `ViajesScreen` (único feature construido hasta ahora); cuando arranque Fase 6 y haga falta navegación entre pantallas, ahí se agrega `react-router-dom` (ya está en `package.json`, sin usar todavía).

**No se pudo verificar que el build realmente compile** — este entorno no tiene acceso a red (falla `npm install` con 403 al registry) ni Android SDK, así que ninguno de estos archivos nuevos se probó de punta a punta. La primera corrida del workflow en GitHub Actions es, en los hechos, la primera vez que se prueba esta cadena completa. Si falla, el log de esa corrida (pestaña Actions en github.com) dice exactamente en qué paso y por qué.

---

## ⚠️ Pendiente crítico arrastrado de Fase 5 — INVESTIGADO esta sesión, corrección aplicada, FALTA CONFIRMAR EN DISPOSITIVO REAL

Al probar el APK en casa, el sistema nunca pidió el permiso de ubicación — ni el de primer plano ni el de segundo plano.

**Causa más probable, encontrada por revisión de código (no se pudo confirmar en dispositivo real, sin Android SDK/emulador en este entorno):** `MainActivity.java` no registraba manualmente los plugins nativos propios (`GpsTrackingPlugin`, `BurbujaPlugin`, `AlarmaPantallaPlugin`). Estos tres viven directamente en el módulo de la app (no son paquetes npm, D-1), y el auto-registro de Capacitor (vía `capacitor.plugins.json`, generado por `npx cap sync`) **solo aplica a plugins instalados como paquete npm** — no a plugins nativos escritos a mano dentro de la app. El comentario que había antes en `MainActivity.java` ("Capacitor los detecta solo desde la versión 3+") era incorrecto para este caso, y `docs/FASE5-GPS-MANIFEST.md` ya había dejado esto como duda abierta ("confirmar... en el proyecto real") que nunca se confirmó — quedó marcada por error como "resuelta".

Sin ese registro, cualquier llamada desde JS a estos tres plugins (incluyendo `GpsTracking.startTracking()`, que es la que dispara el flujo de permisos) nunca llega al lado nativo — coincide exactamente con el síntoma reportado.

**Corrección aplicada esta sesión:** `MainActivity.java` ahora registra los tres plugins en `onCreate()`, antes de `super.onCreate()` (patrón oficial de Capacitor para plugins nativos propios). También se corrigieron dos comentarios que habían quedado desactualizados y decían "esto no está conectado todavía" en `gpsBackground.ts` y `GpsTrackingPlugin.kt` (la integración con `domain/viajes/gps.ts` sí existe desde una sesión anterior; lo que faltaba era el registro del plugin, no esa conexión).

**Esto NO está confirmado como el arreglo definitivo** — es el candidato más probable tras revisar el código, no una prueba. Antes de dar por cerrado este pendiente:

1. Compilar el APK de nuevo (push a GitHub → workflow → descargar artefacto).
2. Instalar en un Android físico y repetir la prueba: iniciar un viaje y confirmar que el sistema sí pide el permiso de ubicación (primero foreground, después background).
3. Si el permiso se pide pero background sigue sin dispararse, revisar la pantalla de "divulgación destacada" que exige Google antes de `ACCESS_BACKGROUND_LOCATION` (candidato #2, sin descartar todavía).
4. Aprovechar la misma prueba para confirmar si `Burbuja`/`AlarmaPantalla` tenían el mismo problema silencioso (nunca se reportó explícitamente que fallaran, pero comparten el mismo bug potencial y no está confirmado que se probaran a fondo en esta app nueva, a diferencia del proyecto viejo del que se heredaron).

## Estado real de Fase 6 (para la próxima sesión)

Decisión tomada con el usuario al iniciar la fase: Mantenimiento cubre **ítems predefinidos + personalizados** (ambos); Estadísticas muestra lo básico **+ desglose por plataforma y por zona/localidad de Bogotá**.

Hecho:

1. **`domain/mantenimiento/`** (patrón D-8: types/repository/store, más `reglas.ts` con el catálogo):
   - `types.ts` — `ItemMantenimiento`, `RegistroMantenimiento`, `EstadoAlerta`, con criterio `'km' | 'dias' | 'km_o_dias'` (lo que pase primero, ver arquitectura Fase 2 sección 3).
   - `reglas.ts` — `CATALOGO_MANTENIMIENTO` con 8 ítems típicos de carro de uso intensivo (aceite, llantas, frenos, filtro de aire, alineación, batería, SOAT, técnico-mecánica) con intervalos de referencia editables; `calcularEstadoAlerta()` calcula km/días faltantes y marca vencido o "próximo a vencer" (margen de 500 km / 15 días).
   - `repository.ts` — localStorage, mismo patrón que `RepositorioViajesLocal`.
   - `store.ts` — `useMantenimiento`: cargar, agregar desde catálogo, agregar personalizado, eliminar (solo personalizados), marcar realizado (crea registro histórico + actualiza `ultimoKm`/`ultimaFechaISO` del ítem).
   - **Importante:** este dominio NUNCA calcula el km del vehículo por su cuenta — lo recibe como parámetro (`kmActual`), que la pantalla obtiene de `domain/estadisticas/calculos.ts` (`calcularResumen(viajes).kmTotales`), que a su vez lo deriva de `domain/viajes` (única fuente de verdad real).

2. **`domain/estadisticas/`** — a propósito **sin repository ni store propios**: es solo un módulo de funciones puras (`calculos.ts`) que deriva de `Viaje[]` (de `domain/viajes`, vía `useViajes`). No duplica el dato de km/ingreso/plataforma/zona, solo lo agrega.
   - `calcularResumen()`, `agruparPorPeriodo()` (día/semana ISO/mes), `desglosePorPlataforma()`, `desglosePorZona()` (usa el campo `zona` que ya resuelve `domain/viajes` contra `zonasBogota.ts`, agrupando lo no detectado en "Sin zona detectada").
   - **Decisión D-11 — Gastos y ganancia neta NO se calculan todavía:** `domain/gastos` no existe como módulo (solo estaba nombrado como ejemplo futuro en D-3/D-8). Estadísticas muestra ingresos, km y cantidad de viajes, y dice explícitamente en la UI que gastos/ganancia neta se agregan cuando ese dominio exista. No se inventó un número de "gastos" en cero disfrazado de dato real — se prefirió ser explícito con el hueco.

3. **`features/mantenimiento/MantenimientoScreen.tsx`** y **`features/estadisticas/EstadisticasScreen.tsx`** — nuevas pantallas, mismo estilo que `ViajesScreen.tsx`.

4. **Navegación real agregada** — `App.tsx` ahora usa `react-router-dom` (`HashRouter`, porque la app corre empaquetada en Capacitor, no como sitio con rutas de servidor) con una barra de navegación fija abajo (Viajes / Mantenimiento / Estadísticas). Antes `App.tsx` solo montaba `ViajesScreen` a secas.

5. `design/tokens.css` — se agregaron `.insignia` (ok/próximo/vencido) y `.barra-navegacion`, siguiendo la regla de "un solo archivo de tokens, nunca `-extra.css`".

**No se pudo verificar que compile ni corre** — mismo límite que en Fase 5: este entorno no tiene red para `npm install` ni forma de correr Vite/TypeScript de punta a punta. La próxima corrida del workflow de GitHub Actions (o `npm run build` local si el usuario consigue un PC) es la primera vez que se prueba esta cadena.

Pendiente para cerrar Fase 6:

1. Verificar que el build compile (subir a GitHub y correr el workflow, o `npm install && npm run build` si hay PC disponible).
2. Probar en el APK: agregar un ítem del catálogo, marcar uno como realizado, agregar uno personalizado, ver que las 3 pantallas naveguen bien con la barra de abajo.
3. Decidir si se quiere notificación/alerta proactiva (push o local notification) cuando un ítem se vence, o si por ahora basta con verlo al entrar a la pantalla (no se construyó nada de notificaciones en esta fase, `@capacitor/local-notifications` ya está en `package.json` sin usar).
4. `domain/gastos` sigue sin existir — cuando se construya (no está en las 14 fases originales como una fase propia, quedó implícito en D-3), Estadísticas se actualiza para calcular ganancia neta real.

## Estado real de Fase 7 (para la próxima sesión)

Hecho:

1. **`server/prisma/schema.prisma`** — modelos `Usuario`, `TokenRefresco`, `Plan`, `PlanDeUsuario`. Postgres (D-4). El refresh token se guarda **hasheado** (SHA-256), nunca en texto plano — mismo criterio que una contraseña.
2. **`modules/auth/`** completo:
   - `password.ts` (bcryptjs, 12 rondas), `jwt.ts` (access token JWT corto, 15 min por defecto), `refreshTokens.ts` (refresh token **opaco**, no JWT — así se puede revocar por fila en la base de datos sin depender de que expire un JWT firmado).
   - `service.ts` — `registrar` (crea usuario + le asigna el plan gratis automáticamente, ver punto 3), `iniciarSesion` (mismo mensaje de error si el email no existe o la contraseña es incorrecta, a propósito, para no filtrar qué emails están registrados), `refrescarSesion` (con **rotación**: el refresh token usado se revoca y se emite uno nuevo).
   - `middleware.ts` — `requiereAutenticacion`, único lugar que lee el header `Authorization`.
   - `routes.ts` — `POST /auth/registro`, `POST /auth/login`, `POST /auth/refrescar`, `GET /auth/yo` (ruta protegida de referencia).
3. **`modules/plans/`** — solo lo que pide D-6 para *ahora*: el plan `gratis` se crea solo al arrancar el server (`asegurarPlanGratisExiste`, idempotente) y se asigna automáticamente a cada usuario nuevo. **Google Play Billing y validación de recibo NO están aquí** — eso es Fase 11 a propósito, no se adelantó ni se simuló.
4. **`http/asyncHandler.ts` + `http/errorHandler.ts`** — manejo de errores centralizado (Zod → 400, `ErrorAuth` → su código HTTP, cualquier otra cosa → 500 sin filtrar detalles internos al cliente).
5. `server/tsconfig.json` — no existía (mismo hueco que tuvo el cliente antes de Fase 5), se creó ahora.
6. `server/.env.example` — variables necesarias (`DATABASE_URL`, dos secretos JWT distintos para poder revocar acceso sin invalidar refresco, tiempos de expiración).
7. `package.json` del backend actualizado con `bcryptjs`, `jsonwebtoken`, `zod` y sus tipos, más scripts `prisma:generate` / `prisma:migrate` / `prisma:deploy`.

**No se pudo verificar que esto corra ni una vez** — sin red no se pudo `npm install`, y tampoco hay una instancia de Postgres disponible en este entorno para correr `prisma migrate dev` contra una base real. Es la misma limitación de siempre, ver sección de Fase 5.

Pendiente para cerrar Fase 7 (en orden):

1. Conseguir una base Postgres (local con Docker, o algo como Neon/Supabase gratis) y correr `npx prisma migrate dev --name init` para generar la primera migración real — hoy solo existe el `schema.prisma`, nunca se corrió contra una base de datos de verdad.
2. Llenar `server/.env` con secretos JWT generados de verdad (el comando para generarlos está en `.env.example`).
3. Probar el flujo completo a mano (con curl, Postman o Thunder Client): `POST /auth/registro` → `GET /auth/yo` con el token → `POST /auth/refrescar` → confirmar que el token viejo ya no sirve (rotación).
4. Conectar el cliente (`app/`) a estos endpoints — **hecho parcialmente en la continuación de Fase 10**: ya existe `app/src/lib/api.ts` (POST autenticado y sin autenticar) y `app/src/features/auth/CuentaScreen.tsx` (login/registro). Sigue sin probarse de punta a punta porque no hay Postgres real en este entorno para levantar el backend. El resto de dominios (`viajes`, `mantenimiento`, `estadisticas`) sigue siendo 100% local (localStorage) — la sincronización real de esos datos con el backend sigue siendo Fase 13, esto solo resolvió la autenticación que Fase 10 (voz) necesitaba.
5. Decidir dónde se despliega esto (sigue en "Qué falta decidir", no es nuevo de esta fase).

## Estado real de Fase 8 (léelo antes de seguir — HECHA con salvedades, no "perfecta")

División de la fase en 4 partes (la misma de la sesión anterior), y qué pasó con cada una en esta sesión:

1. **[HECHO]** Capa de reglas determinísticas — ya existía, se amplió.
2. **[HECHO, como stub]** Clasificador con IA de respaldo — existe el código y el punto de enganche, pero NO llama a ningún modelo real todavía (ver detalle abajo, esto es intencional).
3. **[HECHO, con una decisión de diseño nueva]** Conectar cada intención con datos reales — resuelto sin esperar a Fase 13 (ver detalle abajo).
4. **[PENDIENTE — sigue siendo Fase 9, no se tocó]** Contexto compacto + proxy de IA completo.

### Punto 1 — Reglas (ampliado esta sesión)

- `modules/ai/reglas.ts` — `REGLAS_INTENT` pasó de 3 a **5 intenciones**: se agregaron `viajes_hoy` y `resumen_semana`. Se agregaron porque ya hay datos reales para responderlas (`calcularResumen`, `agruparPorPeriodo` con unidad `'semana'` en `app/src/domain/estadisticas/calculos.ts`), **no porque se confirmara contra el documento de requisitos original** — esta sesión tenía instrucción explícita de leer solo este archivo, no ese documento. Sigue pendiente confirmar contra ese documento qué otras intenciones faltan.

### Punto 2 — Clasificador IA de respaldo (nuevo esta sesión, como stub deliberado)

- `modules/ai/clasificadorIA.ts` — tipo `ClasificadorIntentIA` (interfaz inyectable) + `clasificadorSinImplementar`, la implementación por defecto: **no llama a ningún modelo**, siempre devuelve `'no_reconocida'`. Es un stub a propósito, no un olvido: qué proveedor de IA usar sigue sin decidirse (ver "Qué falta decidir" — es la misma pregunta pendiente para el proxy de Fase 9). No correspondía elegir un proveedor por mi cuenta en este corte.
- `modules/ai/router.ts` — `resolverIntencion(texto, contexto?, clasificadorIA?)` ahora es **async** y recibe el clasificador como parámetro con ese stub de default. Cuando se decida el proveedor, se escribe una función con la misma forma (`(texto) => Promise<ResultadoIntent>`) y se pasa como tercer argumento — no hace falta tocar el resto del router.

### Punto 3 — Conectar con datos reales (nuevo esta sesión — decisión de diseño, revisar)

En vez de que el backend consulte km/ingresos/mantenimiento (lo que exigiría sync real, Fase 13), se optó por la opción que la sesión anterior ya había dejado anotada como alternativa: **el cliente manda el dato ya calculado junto con la pregunta**, porque `domain/estadisticas` y `domain/mantenimiento` ya lo calculan localmente hoy.

- `modules/ai/types.ts` — nuevo `ContextoIntent` (`hoy`, `semana`, `mantenimiento`), todo opcional. Los shapes `ContextoResumen` y `ContextoMantenimientoItem` están duplicados a mano (no importados) desde `ResumenViajes` y `EstadoAlerta` del cliente — a propósito, porque `server/` no depende de `app/` (D-8). **Si esos tipos cambian del lado del cliente, esto no se entera solo.**
- `modules/ai/respuestas.ts` (nuevo) — `armarRespuesta(intencion, contexto)`: función pura que arma el texto final ("Hoy llevas 123,4 km en 7 viajes.", etc.) cuando el dato que esa intención necesita vino en `contexto`; si no vino, devuelve `null` y la ruta responde igual que antes (solo la intención, sin texto).
- `modules/ai/routes.ts` — `POST /ai/intent` ahora acepta `{ texto, contexto? }`, valida `contexto` con Zod, y devuelve `respuesta` en el JSON.
- `modules/ai/router.ts` — arma `respuesta` cuando una regla matchea.

**Esto NO conecta la UI real todavía** — ninguna pantalla de `app/src/features/` llama a este endpoint ni arma `contexto` desde los stores. Eso sigue pendiente y es trabajo de cliente, no de este módulo.

**Esta es una decisión de arquitectura que no estaba en las "Decisiones tomadas" (D-1 a D-10) — revisarla con el usuario antes de darla por definitiva.** Alternativa: si más adelante se prefiere que el backend sea dueño de los datos (vía sync, Fase 13) en vez de recibirlos por request, este endpoint se puede migrar sin romper el contrato público (`texto` seguiría funcionando igual; `contexto` se volvería innecesario).

### Punto 4 — Sigue sin tocar, es Fase 9.

**Actualización: Fase 9 ya se hizo (ver "Estado real de Fase 9" más abajo) — este punto 4 quedó resuelto ahí, no aquí.**

### Verificación hecha esta sesión

**No se corrió el código TypeScript real ni una vez** — mismo límite que el resto del proyecto en este entorno (`npm install` da 403, sin red). Sí se verificó la lógica (normalización de texto, matching de reglas, armado de respuestas con distintos `contexto`, incluyendo casos sin contexto y con listas vacías de mantenimiento) reimplementándola en JavaScript plano fuera del proyecto y corriéndola con `node` — el comportamiento fue el esperado en todos los casos probados, pero **esto no reemplaza compilar y correr el TypeScript real** (tipos de Zod, de Express, etc. sin verificar). Antes de dar Fase 8 por cerrada de verdad: correr `npm install` (con red) y al menos un `curl` a `POST /ai/intent` con y sin `contexto`.

### Pendiente real para cerrar Fase 8 del todo

1. Confirmar contra el documento de requisitos original qué intenciones faltan (punto 1 — no se releyó ese documento en este corte, ver nota arriba).
2. Decidir el proveedor de IA para el clasificador de respaldo (sigue en "Qué falta decidir") y escribir la implementación real de `ClasificadorIntentIA`.
3. Confirmar con el usuario la decisión de diseño del punto 3 (contexto por request vs. esperar a Fase 13/sync) — no es un asunto cerrado, es la opción que pareció más razonable sin poder preguntar en el momento.
4. Compilar y probar el código de verdad en cuanto haya `npm install` con red.

## Estado real de Fase 9 (léelo antes de seguir — HECHA con salvedades, mismo patrón que Fase 8)

Fase 9 es "IA analista (proxy + contexto compacto)" (docs/FASE2-ARQUITECTURA.md, sección 6, punto 5): para preguntas que necesitan que un modelo *razone* sobre los datos del conductor (ej. "¿cómo puedo mejorar mis ingresos este mes?"), no solo mapear a una respuesta fija como hace el Intent Router de Fase 8.

Hecho:

1. **`modules/ai/types.ts`** — se agregaron `ProfundidadAnalisis` (`'normal' | 'profundo'`), `ContextoPuntoPeriodo`, `ContextoAnalisis` (extiende `ContextoIntent` de Fase 8 con `historial` opcional) y `ResultadoAnalisis`.
2. **`modules/ai/contextoCompacto.ts`** (nuevo) — `armarContextoCompacto(contexto, profundidad)`, función pura. Convierte el `contexto` crudo (números que el cliente ya calculó) en líneas de texto cortas, no JSON crudo. En profundidad `'normal'` recorta el historial a los últimos 8 períodos; en `'profundo'` lo manda completo. Esto es lo que la arquitectura (Fase 2, sección 3, fila "Historial de IA / contexto") llama "el backend arma el contexto compacto, el cliente nunca decide qué mandarle al modelo" — el cliente aporta los números, este archivo decide qué entra en el prompt y cómo.
3. **`modules/ai/proveedorIA.ts`** (nuevo) — mismo patrón que `clasificadorIA.ts` de Fase 8: tipo `ProveedorIA` (`(prompt) => Promise<string>`) inyectable, con `proveedorSinImplementar` como default. A diferencia del clasificador de Fase 8 (que se degrada en silencio a `'no_reconocida'`), acá el stub **lanza** `ErrorProveedorIANoConfigurado` (503) en vez de inventar una respuesta — no tiene sentido fingir un análisis con IA cuando el usuario pidió explícitamente eso. `http/errorHandler.ts` ya sabe traducir ese error.
4. **`modules/ai/analisis.ts`** (nuevo) — `generarAnalisis(pregunta, contexto, profundidad, proveedorIA?)`: arma el contexto compacto + una instrucción de sistema fija ("responde en español, corto, solo con los datos del contexto, no inventes cifras") + la pregunta, y se lo pasa al proveedor inyectado.
5. **`modules/ai/routes.ts`** — nueva ruta `POST /ai/analisis` (protegida), separada de `POST /ai/intent`. Acepta `{ pregunta, contexto?, profundidad? }` (contexto reutiliza los mismos campos de Fase 8 más `historial` opcional; `profundidad` por defecto `'normal'`).
6. `http/errorHandler.ts` e `index.ts` actualizados para reconocer el nuevo error y reflejar que `modules/ai` ya no está vacío ni a medias.

**Por qué el proveedor real sigue sin implementarse:** "Proveedor de IA definitivo para el proxy del backend (Fase 9)" sigue en "Qué falta decidir" — no era una decisión que correspondiera tomar sola. El proxy quedó armado para que conectar el proveedor real sea escribir una sola función nueva con la forma `(prompt) => Promise<string>` y pasarla como argumento a `generarAnalisis` — ningún otro archivo debería necesitar cambios.

**Verificación hecha esta sesión:** igual que Fase 8, no se pudo compilar ni correr el TypeScript real (sin red para `npm install` en este entorno). Sí se probó la lógica equivalente en JavaScript plano fuera del proyecto: recorte de historial a 8 períodos en profundidad `'normal'` vs. historial completo en `'profundo'`, contexto vacío/ausente, y que el stub del proveedor efectivamente rechaza con el error 503 en vez de responder algo — todos los casos se comportaron como se esperaba, pero esto no reemplaza correr el TypeScript real (tipos de Zod/Express sin verificar).

**Lo que NO se hizo (fuera de alcance real, no un olvido):**
- Conectar la UI (`app/src/features/`) a este endpoint — ninguna pantalla llama a `/ai/analisis` todavía, igual que con `/ai/intent` de Fase 8.
- Persistencia de historial de conversación — cada llamada a `/ai/analisis` es sin estado (no guarda nada en base de datos); conversación continua multi-turno es explícitamente Fase 10 ("depende de que el Intent Router y el proxy de IA ya funcionen bien por texto", docs/FASE2-ARQUITECTURA.md sección 6). No se adelantó nada de eso.
- Política de retención/borrado del historial de IA para el formulario de Data Safety de Google Play (docs/FASE2-ARQUITECTURA.md sección 5) — sigue siendo tema de Fase 14, no bloqueaba escribir el código de Fase 9, pero hay que resolverlo antes de publicar.

## Estado real de Fase 10 (léelo antes de seguir — EN CURSO, código escrito, sin probar)

Fase 10 es "Voz + conversación continua" (docs/FASE2-ARQUITECTURA.md sección 6, punto 6: "al final, porque depende de que el Intent Router y el proxy de IA ya funcionen bien por texto" — Fase 8 y 9 ya estaban hechas con salvedades, así que correspondía seguir con esta).

Hecho esta sesión:

1. **Backend — `server/src/modules/ai/conversacion.ts`** (nuevo) — `procesarTurnoConversacion(texto, contexto?, profundidad?, clasificadorIA?, proveedorIA?)`: prueba el Intent Router (Fase 8) primero; si resolvió una intención reconocida CON respuesta armada, la devuelve directo (rápido, gratis, sin IA). Si no, arma un bloque de texto con los últimos 6 turnos previos de la conversación y lo antepone a la pregunta antes de pasarla al proxy de IA (Fase 9, `generarAnalisis`).
2. **`server/src/modules/ai/types.ts`** — se agregaron `TurnoConversacion`, `ContextoConversacion` (extiende `ContextoAnalisis` con `turnosPrevios` opcional) y `ResultadoConversacion`.
3. **`server/src/modules/ai/routes.ts`** — nueva ruta `POST /ai/conversacion` (protegida), acepta `{ texto, contexto?, profundidad? }` donde `contexto` reutiliza el shape de `/ai/analisis` más `turnosPrevios` (array de `{pregunta, respuesta}`, máximo 20 — es la conversación de una sesión, no un historial permanente, ver D-11).
4. **Cliente — `app/src/lib/api.ts`** (nuevo) — primera conexión real de `app/` hacia `server/` (ver D-11). `postAutenticado()` (rutas protegidas) y `post()` (sin autenticar, para `/auth/*`), más `obtenerTokenAcceso`/`obtenerTokenRefresco`/`guardarTokens`/`borrarTokens`/`haySesion` (JWT en `localStorage`, claves `mia:tokenAcceso`/`mia:tokenRefresco`) y `ErrorSinSesion` para cuando todavía no hay token. *(El login/registro que consume esto se construyó en la continuación de esta misma fase — ver más abajo, "Continuación: pantalla de login".)*
5. **`app/src/domain/conversacion/`** (nuevo dominio, sin `repository.ts` a propósito — ver types.ts):
   - `types.ts` — `TurnoConversacion`, `EstadoConversacion`, `ResultadoTurno`.
   - `voz.ts` — reconocimiento de voz (STT) y texto a voz (TTS), con el mismo patrón nativo/web que `domain/viajes/gps.ts`: en Android nativo usa `@capacitor-community/speech-recognition` + `@capacitor/text-to-speech` (D-12); en navegador cae a la Web Speech API (`SpeechRecognition`/`speechSynthesis`) para poder desarrollar la UI sin dispositivo.
   - `api.ts` — llama a `POST /ai/conversacion` usando `lib/api.ts`.
   - `store.ts` (zustand, sin persistencia) — `turnos` de la conversación actual, `estado` (`inactiva`/`escuchando`/`procesando`/`hablando`/`error`), y `escucharYResponder(contexto?)` que encadena escuchar → mandar al backend → leer la respuesta en voz alta.
6. **`app/src/features/conversacion/ConversacionScreen.tsx`** (nuevo) — capa de orquestación: cruza `domain/viajes` + `domain/mantenimiento` para armar `contexto` (mismo principio D-10 que `ViajesScreen.tsx` usa para jornada/viajes), botón de micrófono, checkbox de "conversación continua" (si está prendido, en cuanto el asistente termina de hablar se vuelve a escuchar sola), lista del historial de turnos, botón "Nueva conversación".
7. **`app/App.tsx`** — nueva ruta `/conversacion` + ítem "MIA" en la barra de navegación.
8. **`app/package.json`** — se agregaron `@capacitor-community/speech-recognition` y `@capacitor/text-to-speech`.
9. **`app/android/.../AndroidManifest.xml`** — se agregó `RECORD_AUDIO`.
10. **`app/.env.example`** (nuevo) — `VITE_API_URL`, con nota sobre `10.0.2.2` en emulador Android vs. `localhost`.
11. De paso, se encontró que **`app/` nunca tuvo `.gitignore`** (hueco real, no un pendiente escrito en este plan) — se agregó uno básico (`node_modules/`, `dist/`, `.env`) porque ahora sí existe un `.env` real (`VITE_API_URL`) que no debería subirse a GitHub.

**Por qué el proveedor de IA real sigue sin importar acá:** `/ai/conversacion` reutiliza `generarAnalisis` (Fase 9) tal cual, que sigue dependiendo del stub `proveedorSinImplementar` (503). Si una pregunta de voz no la resuelve ninguna regla del Intent Router, hoy la respuesta hablada sería un error, no una frase — aceptable mientras el proveedor de IA sigue en "Qué falta decidir", pero hay que tenerlo presente al probar en dispositivo real: hoy solo las 5 intenciones de `reglas.ts` (Fase 8) van a funcionar de punta a punta por voz.

**Decisión de diseño nueva, sin confirmar con el usuario — revisar:** en `ConversacionScreen.tsx`, "esta semana" se aproxima tomando el bucket de semana MÁS RECIENTE de `agruparPorPeriodo(viajes, 'semana')`, no necesariamente la semana calendario actual — si el conductor no ha viajado esta semana todavía, eso mostraría la última semana con viajes en vez de "cero esta semana". Documentado en el propio código; no se resolvió mejor porque `claveSemana()` (el cálculo real de semana ISO) no está exportado desde `domain/estadisticas/calculos.ts` — exportarlo y comparar contra la semana de hoy es la corrección correcta, queda pendiente.

**Verificación hecha esta sesión:** igual que las fases anteriores del módulo `ai`, no se pudo compilar ni correr TypeScript real (`npm install` sin red en este entorno) ni menos aún probar el reconocimiento de voz o el texto a voz (necesitan micrófono/parlante reales, imposible en este entorno). Sí se reimplementó en JavaScript plano y se corrió con `node` la lógica de `conversacion.ts` (decidir camino rápido vs. proxy de IA, recorte de `turnosPrevios` a los últimos 6) — se comportó como se esperaba, pero esto no reemplaza compilar el TypeScript real ni probar la voz en un Android físico.

**Lo que NO se hizo (pendiente real para cerrar Fase 10):**

1. ~~Bloqueante para probar de punta a punta: construir la pantalla de login/registro en `app/`~~ — **resuelto en la continuación de esta fase, ver subsección abajo.** Sigue habiendo un bloqueante distinto: no hay Postgres real en este entorno, así que ni con la pantalla de login se pudo probar de punta a punta.
2. Confirmar en un Android físico que `@capacitor-community/speech-recognition` y `@capacitor/text-to-speech` funcionan como se espera (nombres de métodos/eventos escritos de memoria, sin poder consultar la documentación exacta de la versión instalada porque no hay red en este entorno) — antes de eso, tratar `voz.ts` como "probablemente correcto, no confirmado", mismo espíritu que el resto de plugins nativos del proyecto.
3. Decidir si vale la pena exportar `claveSemana()` de `calculos.ts` para que "esta semana" en la conversación sea exacto y no una aproximación (ver arriba).
4. Conectar `turnosPrevios` directo en `contextoCompacto.ts` (Fase 9) en vez de antepuesto a la pregunta a mano en `conversacion.ts` — mejora de prompt, no bloqueante (ver comentario en el propio `conversacion.ts`).
5. Confirmar las versiones exactas de `@capacitor-community/speech-recognition` y `@capacitor/text-to-speech` en `package.json` contra npm real (se escribieron versiones razonables de memoria, sin poder correr `npm view` sin red) — ajustar en cuanto haya `npm install` con red.
6. Política de retención/borrado del audio de voz para el formulario de Data Safety de Google Play — sigue siendo Fase 14, no bloqueaba escribir el código de Fase 10, pero el audio de voz es justo el tipo de dato que ese formulario pide declarar (docs/FASE2-ARQUITECTURA.md sección 5).
7. Decidir si "conversación continua" necesita algún límite de turnos o de tiempo antes de apagarse sola (hoy sigue indefinidamente hasta que el usuario destilde el checkbox o cierre la pantalla) — no se decidió porque no había con quién confirmarlo, quedó con el comportamiento más simple.

### Continuación: pantalla de login/registro (cierra el pendiente #1 de arriba, y el pendiente #4 de Fase 7)

Hecho en esta segunda sesión sobre Fase 10:

1. **`app/src/lib/api.ts` (reescrito)** — antes solo tenía `postAutenticado()`. Se agregó `post()` sin autenticar (para `/auth/registro`, `/auth/login`, `/auth/refrescar`, que no llevan `Authorization`), manejo de **ambos** tokens (acceso + refresco, antes solo se contemplaba el de acceso), y `haySesion()`.
2. **`app/src/domain/auth/`** (nuevo dominio, sin `repository.ts` a propósito — la sesión es el token que ya guarda `lib/api.ts`):
   - `types.ts` — `Usuario`.
   - `api.ts` — `registrarse`, `iniciarSesion`, `refrescarSesion` (llaman a `POST /auth/registro|login|refrescar`).
   - `store.ts` (zustand) — `usuario`, `cargando`, `error`, `autenticado()` (delega en `haySesion()`), `registrarse`/`iniciarSesion`/`cerrarSesion`.
3. **`app/src/features/auth/CuentaScreen.tsx`** (nuevo) — una sola pantalla con toggle login/registro (ver D-13). Al loguearse con éxito, navega a `/conversacion`.
4. **`app/App.tsx`** — ruta `/cuenta` + ítem "Cuenta" en la barra de navegación.
5. **`app/src/features/conversacion/ConversacionScreen.tsx`** — ahora chequea `useAuth().autenticado()` antes de mostrar el micrófono; si no hay sesión, muestra un aviso con un botón que lleva a `/cuenta`, en vez de dejar que el usuario toque el micrófono y recién ahí se entere con un `ErrorSinSesion` después de haber hablado.

**Huecos conocidos de esta continuación (ver D-13 para el detalle):** no hay refresco automático de token todavía (un 401 a mitad de conversación no se reintenta solo); el objeto `usuario` no se restaura al recargar la app (solo el token persiste, así que `autenticado()` da `true` pero `usuario` puede ser `null` hasta el próximo login — la corrección sería llamar a `GET /auth/yo` al arrancar si hay token, no se hizo).

**Verificación:** mismo límite que el resto — no se pudo compilar TypeScript real ni correr esto contra un backend real (sin Postgres en este entorno). No hizo falta reimplementar lógica en JavaScript plano esta vez porque no hay lógica de cálculo nueva (es orquestación de llamadas HTTP + estado de formulario), pero eso significa que la revisión fue solo de lectura — no probada ni siquiera de forma indirecta.

## Estado real de Fase 11 (léelo antes de seguir — EN CURSO, código escrito, sin probar)

Fase 11 es "Google Play Billing (planes) + validación server-side" (D-6: "Google Play Billing Library en el cliente + endpoint en el backend que valida el recibo contra la API de Google. Ninguna pasarela de pago propia.").

Hecho esta sesión:

1. **`server/prisma/schema.prisma`** — `Plan` ganó `productIdGooglePlay` (SKU de Play Console, único, null para el plan gratis). `PlanDeUsuario` ganó `purchaseToken` (único — ver D-14, idempotencia).
2. **`server/src/modules/plans/types.ts`** — nuevo catálogo `PLANES_BASE` (antes solo existía la constante `CLAVE_PLAN_GRATIS`): `gratis` (como antes) + `pro_mensual` (`limiteConsultasIA: null` = ilimitado, `productIdGooglePlay: 'mia_pro_mensual'`). **Ese SKU es un valor elegido para que el código tenga algo concreto, no la confirmación de que ya existe en ninguna Play Console real** — no existe cuenta de desarrollador todavía (ver "Qué falta decidir").
3. **`server/src/modules/plans/repository.ts`** — `asegurarPlanGratisExiste()` (Fase 7) se **renombró y amplió** a `asegurarPlanesBaseExisten()`: ahora hace upsert de TODO `PLANES_BASE`, no solo gratis. Nuevas funciones: `buscarPlanPorProductoGoogle`, `desactivarPlanesActivosDeUsuario`, `buscarPlanDeUsuarioPorTokenDeCompra`; `asignarPlanAUsuario` ahora acepta `{ purchaseToken?, finISO? }` opcional.
4. **`server/src/modules/plans/service.ts`** — `asignarPlanGratisPorDefecto` ya no llama a "asegurar", solo busca el plan gratis (que el arranque del server ya garantiza que existe) — evita hacer upsert de todo el catálogo en cada registro de usuario.
5. **`server/src/modules/billing/`** (nuevo módulo):
   - `types.ts` — `ParametrosVerificacionCompra`, `EstadoCompraGoogle`, `VerificadorGooglePlay` (tipo inyectable, mismo patrón que `ClasificadorIntentIA`/`ProveedorIA`).
   - `googlePlay.ts` — **stub a propósito**: `verificadorSinConfigurar` lanza `ErrorBillingNoConfigurado` (503). El comentario del archivo detalla qué hace falta para la implementación real (cuenta de servicio de Google Cloud, paquete `googleapis`, llamada a `purchases.subscriptions.get` de la Android Publisher API v3, y opcionalmente Real-time Developer Notifications para renovaciones/cancelaciones) — no se escribió de memoria porque sin poder instalar `googleapis` ni probar contra el sandbox de Google, inventar la forma exacta de esa llamada sería peor que dejar el hueco explícito.
   - `service.ts` — `servicioBilling.validarCompra(usuarioId, packageName, productId, purchaseToken, verificador?)`: valida que `productId` mapee a un plan conocido (400 si no), revisa idempotencia por `purchaseToken` ANTES de llamar a Google (ver D-14), llama al verificador inyectado, y si la compra es válida desactiva los planes activos anteriores y crea el nuevo `PlanDeUsuario`.
   - `routes.ts` — `POST /billing/validar-compra` (protegida): `{ packageName, productId, purchaseToken }`.
6. **`http/errorHandler.ts`** — reconoce `ErrorBillingNoConfigurado` (503) y `ErrorBilling` (código según el caso: 400 producto desconocido, 402 compra inválida).
7. **`index.ts`** — monta `/billing`, y el arranque ahora llama a `asegurarPlanesBaseExisten()` en vez de la función vieja.
8. **`server/.env.example`** — nota sobre qué variables va a necesitar el verificador real cuando se escriba (`GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_PLAY_PACKAGE_NAME`), sin agregarlas como obligatorias todavía (no tiene sentido romper el arranque del server por variables que ninguna implementación real usa aún).
9. **Cliente — `app/src/lib/api.ts`** — se agregaron `get()` (sin autenticar, catálogo público) y `getAutenticado()` (rutas protegidas tipo `GET /planes/actual`) — antes el archivo solo sabía hacer POST.
10. **`app/src/domain/planes/`** (nuevo, sin `repository.ts` — el plan lo decide el backend, no es un dato local): `types.ts`, `api.ts` (`listarPlanes`, `obtenerPlanActual`), `store.ts`.
11. **`app/src/features/planes/PlanesScreen.tsx`** (nuevo) — **de solo lectura a propósito** (ver D-14): muestra el plan actual del usuario (si hay sesión) y el catálogo completo, con una nota de que la compra dentro de la app no está disponible todavía para cualquier plan que no sea gratis. Deliberadamente NO se construyó un botón de "Comprar" que no complete una compra real.
12. **`app/App.tsx`** — ruta `/planes` + ítem "Planes" en la navegación.

**Verificación hecha esta sesión:** no se pudo compilar TypeScript real (sin red para `npm install`). Sí se reimplementó `servicioBilling.validarCompra` en JavaScript plano y se corrió con `node`: producto de Google desconocido se rechaza (400), una compra válida activa el plan correcto, el mismo `purchaseToken` mandado dos veces es idempotente (no se llama de nuevo al verificador, no se duplica ninguna fila), y una compra que Google marca como inválida se rechaza sin crear nada — los 5 casos se comportaron como se esperaba. Esto no reemplaza correr el TypeScript real ni, mucho menos, probar contra el sandbox de Google Play (imposible sin cuenta de desarrollador).

**Lo que NO se hizo (pendiente real para cerrar Fase 11, en orden):**

1. **Bloqueante real:** conseguir/confirmar una cuenta de desarrollador de Google Play — sin eso no hay Play Console, y sin Play Console no se puede crear el producto `mia_pro_mensual` de verdad, ni la cuenta de servicio que necesita el verificador, ni probar nada de esto de punta a punta.
2. Escribir el verificador real (`modules/billing/googlePlay.ts`) contra la Android Publisher API v3 en cuanto exista lo del punto 1 y haya red para instalar `googleapis`.
3. Integrar Google Play Billing Library del lado nativo Android (`app/android/`) — hoy `PlanesScreen.tsx` no dispara ninguna compra, solo muestra el plan actual. Sin esto, el usuario no tiene ninguna forma real de generar un `purchaseToken` para mandarle a `/billing/validar-compra`.
4. Real-time Developer Notifications (RTDN) — sin esto, una cancelación o falta de pago en una renovación NO revierte el plan solo; `validarCompra` solo se entera del estado en el momento en que el cliente la llama. Es una mejora de robustez, no bloqueante para un primer corte.
5. Decidir el precio real del plan pro (y si hace falta más de un plan pago) — decisión de negocio, no técnica, sigue en "Qué falta decidir".
6. Confirmar que `productIdGooglePlay: 'mia_pro_mensual'` es el nombre que efectivamente se va a usar en Play Console, o cambiarlo antes de que exista tráfico real (después de eso, cambiarlo rompe compras existentes).

## Estado real de Fase 12 (léelo antes de seguir — EN CURSO, código escrito, sin probar)

Fase 12 es "Seguridad (auth, rate limits, datos por usuario)". Auth ya estaba resuelta en Fase 7 (JWT propio, bcrypt, rotación de refresh tokens — D-5). Esta fase cerró lo que faltaba:

1. **`server/src/http/rateLimit.ts`** (nuevo) — `crearLimitadorDeTasa(ventanaMs, maximo, mensaje?)`, ventana fija en memoria, por IP (ver D-15). Cableado en:
   - `modules/auth/routes.ts` — `/registro`, `/login`, `/refrescar`: 10 intentos / 15 min por IP.
   - `modules/ai/routes.ts` — `/intent`, `/analisis`, `/conversacion`: 20 / minuto por IP.
   - `modules/billing/routes.ts` — `/validar-compra`: 5 / minuto por IP.
2. **`index.ts`** — `app.set('trust proxy', 1)`, `helmet()` (cabeceras de seguridad HTTP estándar), `cors({ origin: env.corsOrigenes })` (antes no había CORS configurado en absoluto).
3. **`config/env.ts`** — nueva `env.corsOrigenes` (lista separada por comas, `CORS_ORIGENES` en `.env`, con default razonable para desarrollo). `server/.env.example` y `server/package.json` (`cors`, `helmet`, `@types/cors`) actualizados.
4. **Auditoría de "datos por usuario"** (no generó cambios de código — se confirmó que ya estaba bien): se revisaron todas las rutas protegidas de `modules/*/routes.ts` y ninguna toma un `usuarioId` del body — todas usan `req.usuarioId` que sale exclusivamente del JWT verificado por `requiereAutenticacion` (`modules/auth/middleware.ts`). Es decir, no hay forma de que un usuario autenticado pida o modifique datos de otro usuario pasando un ID distinto en la request.

**Por qué CORS no es "la" protección acá:** una app Android nativa (Capacitor) no pasa por el chequeo de CORS de un navegador — eso solo protege llamadas hechas desde un navegador (Vite en desarrollo, o un futuro dashboard web). Lo que realmente protege los datos por usuario es el JWT + la auditoría del punto 4, no CORS.

**Verificación hecha esta sesión:** no se pudo compilar TypeScript real ni correr esto contra un backend real. Sí se verificó `crearLimitadorDeTasa` reimplementado en JavaScript plano con `node`: bloquea al superar el máximo dentro de la ventana, se resetea pasada la ventana, y dos IPs distintas no se pisan entre sí — los 3 casos se comportaron como se esperaba. `helmet`/`cors` no se pudieron probar en absoluto (paquetes nuevos, sin `npm install` en este entorno) — se usó su API pública documentada de memoria (`helmet()` y `cors({ origin })` son extremadamente estables y no han cambiado su forma básica en varias major versions), pero **tratar como "probablemente correcto, no confirmado"** hasta que corra un `npm install` real.

**Hecho en esta sesión (cierra los pendientes #4 y #5 de la lista anterior):**

4. **[HECHO]** `server/src/lib/logSeguridad.ts` (nuevo) — única puerta de salida para eventos de seguridad (`rate_limit_bloqueado`, `login_fallido`, `registro_rechazado`), imprime JSON de una línea a stdout con timestamp e IP. A propósito NO es una integración con un servicio de logging real (Datadog/Sentry/etc.) — eso depende de dónde se despliegue el backend, que sigue sin decidirse. Conectado en:
   - `http/rateLimit.ts` — loguea cada vez que una IP se bloquea por exceder el máximo (antes bloqueaba en silencio).
   - `modules/auth/routes.ts` — `/login` loguea `login_fallido` (sin el email, a propósito — no vale la pena que el log termine siendo una lista de emails válidos/inválidos); `/registro` loguea `registro_rechazado` con el motivo (acá sí, porque "ya existe una cuenta" no es información sensible de un tercero). Ambos casos: se loguea y se re-lanza el mismo error, `http/errorHandler.ts` sigue siendo el único que decide el status/forma de la respuesta HTTP — el logging no cambia ningún comportamiento visible para el cliente.
5. **[HECHO]** `index.ts` — `express.json()` pasó a `express.json({ limit: '256kb' })`, explícito en vez de heredar el default de Express sin que nadie lo hubiera revisado. Se eligió 256kb revisando las formas reales de los payloads (`modules/ai/types.ts`: `contexto`/`historial` son números y strings cortos, nada que se acerque a eso) — decisión razonada, no un número arbitrario.

**Verificación de esta sesión:** igual que el resto del proyecto, sin red no se pudo compilar ni correr el TypeScript real. Sí se verificó `crearLimitadorDeTasa` + `logEventoSeguridad` reimplementados en JavaScript plano con `node`: bloquea la 4ª request y la loguea en una línea JSON válida, otra IP no se pisa con la primera, y pasada la ventana se resetea — los 3 casos se comportaron como se esperaba.

**Lo que sigue sin hacerse (pendiente real para cerrar Fase 12 del todo):**

1. Confirmar `helmet`/`cors` contra el `npm install` real y un `curl` de verdad (headers de respuesta, preflight OPTIONS, etc.) — sigue bloqueado por falta de red en este entorno.
2. El rate limiter en memoria no sirve si el backend termina corriendo en más de una instancia — ver D-15. No es un problema hasta que se decida el despliegue (sigue en "Qué falta decidir").
3. `trust proxy` se dejó en `1` (un solo proxy delante) sin poder confirmarlo contra la plataforma de despliegue real, porque esa plataforma todavía no se eligió.
4. El logging de seguridad (punto 4 de arriba) hoy solo imprime a stdout — si el backend termina desplegado en algo que no persiste logs por su cuenta, esto se pierde. No se conecta a nada real todavía porque, otra vez, depende de dónde se despliegue (misma decisión pendiente que los puntos 2 y 3).

## Estado real de Fase 13 (para la próxima sesión)

Fase 13 es "offline + sincronización con dedupe". Alcance de este corte: **solo `domain/viajes`** — es el dominio que ya tenía la cola `pendienteDeSync` construida desde Fase 4/5 y el que más importa tener respaldado (es la fuente del ingreso real del conductor). Mantenimiento y jornada quedan para una continuación de esta misma fase, no es un olvido.

Hecho:

1. **`server/prisma/schema.prisma`** — modelo `Viaje` nuevo (`id` es el UUID que el cliente ya genera, NO `@default(uuid())` como los demás modelos — es a propósito, ese id es la clave de dedupe). `Usuario.viajes` agregado como relación inversa.
2. **`server/src/modules/sync/`** completo:
   - `types.ts` — `ViajeSyncEntrada`, declarado independiente del `Viaje` del cliente (D-8).
   - `schemas.ts` — validación con Zod, incluye que `id` sea un UUID de verdad.
   - `repository.ts` — `buscarViajePorId` (para la verificación de pertenencia) + `guardarViaje` (upsert real).
   - `service.ts` — `sincronizarViaje`: rechaza con 403 si el id ya pertenece a otro usuario, si no, upsert. Ver D-16 para el razonamiento completo del diseño (push-only, un viaje por request).
   - `routes.ts` — `POST /sync/viajes` (protegida, rate limit propio, loguea el caso de conflicto de pertenencia como evento de seguridad — reutiliza `lib/logSeguridad.ts` de Fase 12, se agregó el tipo `sync_conflicto_pertenencia`).
3. **`http/errorHandler.ts`** — reconoce `ErrorSync` (mismo patrón que `ErrorAuth`/`ErrorBilling`).
4. **`index.ts`** — monta `/sync`, y el límite de body de Fase 12 pasó de 256kb a 512kb con la razón documentada ahí mismo (un viaje largo con captura densa de GPS puede pesar más que un payload de texto).
5. **Cliente:**
   - `app/src/domain/viajes/api.ts` (nuevo) — `subirViaje`, arma el payload aplanando `distancia` a los 3 campos sueltos que espera el backend.
   - `app/src/domain/viajes/sync.ts` (nuevo) — `sincronizarViajesPendientes()`: recorre la cola local en secuencia, best-effort (un viaje que falla no frena los demás), no hace nada si no hay sesión (`haySesion()` de `lib/api.ts` — D-13).
   - `App.tsx` — la llama una vez al abrir la app (fire-and-forget, no bloquea el render).
   - `features/viajes/ViajesScreen.tsx` — también la llama justo después de `finalizarViaje`, para que la sincronización se sienta inmediata cuando hay internet.

**Verificación hecha esta sesión:** no se pudo compilar TypeScript real ni correr esto contra un backend/Postgres real — mismo límite de siempre (sin red en este entorno). Sí se reimplementó la lógica de `service.ts` y del orquestador en JavaScript plano y se corrió con `node`: un viaje nuevo se guarda, el mismo id reenviado por el mismo usuario actualiza en vez de duplicar, otro usuario mandando el mismo id se rechaza con 403, y el orquestador sigue con el resto de la cola aunque uno falle — los 4 casos se comportaron como se esperaba.

**Lo que NO se hizo (pendiente real, en orden):**

1. **Bloqueante para probar de punta a punta:** correr `npx prisma migrate dev` con los modelos `Viaje`, `Jornada` y `RegistroMantenimiento` contra una base Postgres real (sigue siendo la misma tarea pendiente de Fase 7, ahora con tres modelos más).
2. Probar `POST /sync/viajes`, `POST /sync/jornadas` y `POST /sync/mantenimiento/registros` con curl/Postman: un recurso nuevo, el mismo reenviado (confirmar que no duplica en la base de verdad, no solo en la simulación), y con el token de otro usuario contra un id ya existente (confirmar el 403 real) — para los tres, no solo viajes.
3. Nada de "bajar cambios" (pull) — si en algún momento se necesita multi-dispositivo, hay que diseñarlo aparte, no está resuelto ni a medias hoy.
4. Ninguno de los tres `sync.ts` (viajes, jornada, mantenimiento) reintenta con backoff ni se dispara solo al recuperar internet (ej. evento `online` del navegador/WebView) — hoy sincronizan en momentos puntuales (abrir la app, y justo después de la acción que generó el dato: cerrar un viaje, terminar/actualizar una jornada, marcar un mantenimiento realizado). Alcanza para el caso normal, pero algo cerrado sin internet y la app nunca más reabierta hasta el próximo turno queda esperando a ese próximo turno para subir — no es un bug, es una limitación conocida del alcance actual. **✅ RESUELTO esta sesión**, ver "Continuación de Fase 13 — retry con backoff" más abajo.

**Continuación de esta fase (hecho en esta sesión) — jornadas y registros de mantenimiento:**

Alcance de esta continuación: se sincronizan **jornadas completas** y **registros de mantenimiento** (el historial de "esto se hizo tal día"). Deliberadamente NO se sincronizan `ItemMantenimiento` (la configuración de qué mantenimientos existen) — un ítem se puede editar y **borrar** desde el cliente (`repositorioMantenimiento.eliminarItem`), y el diseño push-only con upsert por id (D-16) no tiene forma de propagar un borrado al backend: sincronizar ítems tal cual dejaría filas huérfanas cada vez que alguien borra uno localmente. Resolver eso bien necesita un diseño de borrado (tombstones o similar) que no se decidió — no es un olvido, está documentado en `schema.prisma` (modelo `RegistroMantenimiento`) y en `server/src/modules/sync/types.ts`.

Hecho:

1. **`schema.prisma`** — modelos `Jornada` y `RegistroMantenimiento` nuevos (mismo criterio que `Viaje`: `id` es el UUID del cliente, no `@default(uuid())`). `Usuario.jornadas` y `Usuario.registrosMantenimiento` agregados.
2. **`server/src/modules/sync/`** ampliado: `types.ts` (`JornadaSyncEntrada`, `RegistroMantenimientoSyncEntrada`), `schemas.ts` (validación Zod de los dos), `repository.ts` (buscar/guardar de los dos, mismo patrón upsert), `service.ts` (`sincronizarJornada`, `sincronizarRegistroMantenimiento`, con un helper `verificarPertenencia` compartido para no repetir la regla de los 403 tres veces), `routes.ts` (`POST /sync/jornadas`, `POST /sync/mantenimiento/registros`, **comparten el rate limiter de `/sync/viajes`** a propósito — es un cupo por usuario, no por endpoint, para que no se pueda esquivar repartiendo requests entre los tres).
3. **Cliente — jornada:** `domain/jornada/types.ts` con `pendienteDeSync`. Jornada era la única excepción al patrón de D-8 (persistencia suelta en `store.ts`, sin `repository.ts` propio) — se le creó `repository.ts` real y se reescribió `store.ts` para delegar en él, **sin cambiar la API pública** (`jornadaAbierta`, `iniciarJornada`, `terminarJornada`, `agregarViajeAJornadaAbierta`, `cargar`), así que `ViajesScreen.tsx` no se rompió. Nuevo `api.ts` (`subirJornada`) y `sync.ts` (`sincronizarJornadasPendientes`).
4. **Cliente — mantenimiento:** `pendienteDeSync` agregado SOLO a `RegistroMantenimiento`, nunca a `ItemMantenimiento` (ver el porqué arriba). Métodos `marcarRegistroSincronizado`/`registrosPendientesDeSync` agregados al repositorio existente. Nuevo `api.ts` (`subirRegistroMantenimiento`) y `sync.ts` (`sincronizarRegistrosMantenimientoPendientes`).
5. **Orquestación:** `App.tsx` dispara las tres sincronizaciones al abrir la app (viajes, jornadas, registros de mantenimiento). `ViajesScreen.tsx` sincroniza jornada justo después de cerrar un viaje (porque eso también actualiza la jornada abierta) y después de terminar una jornada. `MantenimientoScreen.tsx` sincroniza registros justo después de marcar un mantenimiento como realizado — mismo criterio de siempre: best-effort, no bloquea la UI.

**No verificado (mismo límite de siempre — sin red/Postgres en este entorno):** no se pudo correr la migración de Prisma ni probar ningún endpoint nuevo contra una base real. Sí se revisó a mano que el patrón de `service.ts`/`repository.ts` para jornada y registro sea estructuralmente idéntico al de viaje (que si se validó con `node` en la sesión anterior), así que el riesgo de que el diseño en sí esté mal es bajo — el riesgo real está en typos o detalles de Prisma que solo aparecen al migrar de verdad.

### Continuación de Fase 13 — retry con backoff (hecho en esta sesión)

Resuelve el pendiente #4 de arriba, para los tres dominios a la vez (viajes, jornada, mantenimiento):

- **`app/src/lib/autoSync.ts`** (nuevo) — `registrarSincronizacionAutomatica(nombre, sincronizar)`, genérico: cada dominio le pasa su propia función `sincronizarXPendientes` en vez de repetir la lógica tres veces (mismo criterio que D-8). Corre una vez al registrar; si algo queda sin sincronizar o hay `primerError`, programa un reintento con backoff exponencial (5s → 10s → 20s → 40s..., tope 5 minutos); si un intento sale limpio (todo sincronizado, o cola vacía), resetea el backoff a 5s. El evento `online` del navegador/WebView también dispara un intento inmediato y resetea el backoff — no hay que esperar el backoff largo si ya se recuperó internet.
- **`App.tsx`** — las tres llamadas sueltas (`void sincronizarXPendientes()`) se reemplazaron por `registrarSincronizacionAutomatica('x', sincronizarXPendientes)`. Las llamadas puntuales que ya existían en `ViajesScreen.tsx`/`MantenimientoScreen.tsx` justo después de cada acción (cerrar viaje, terminar jornada, marcar mantenimiento) **se dejaron tal cual** — siguen siendo un intento inmediato válido, independiente del ciclo de fondo con backoff que ahora vive en `App.tsx`.
- Se dejó deliberadamente sin exponer una forma de "desregistrar" — las tres sincronizaciones se registran una sola vez al abrir la app y viven mientras la app vive, nunca dentro de una pantalla que se monta/desmonta.

**Verificado con `node`** (reimplementación en JS plano de la lógica de backoff, mismo límite de siempre: sin poder compilar TS real) — 4 casos, todos correctos: (1) fallos consecutivos duplican la espera (5000→10000→20000→40000), (2) un éxito después de fallos resetea la espera a 5000, (3) cola vacía cuenta como éxito, no dispara reintento, (4) el backoff no supera el tope de 300000ms (5 min) aunque seguiría fallando indefinidamente.

**No verificado (no se puede en este entorno):** el evento `online` real del navegador/WebView, y que el listener sobreviva correctamente durante toda la vida de la app en un dispositivo real — solo se validó la lógica de backoff en sí, aislada del DOM.

## Despliegue — Render + Neon (decisión D-17, hecho esta sesión)

Con la decisión tomada, se dejó todo listo para que el usuario solo tenga que crear las dos cuentas y pegar una URL — nada de configurar campo por campo:

1. **`render.yaml`** (nuevo, en la raíz del repo) — Blueprint de Render: `rootDir: server`, build (`npm install && npx prisma generate && npm run build`) y start (`npx prisma migrate deploy && npm run start` — las migraciones corren solas en cada despliegue, porque el plan free de Render no trae terminal/Shell). `JWT_SECRETO_ACCESO`/`JWT_SECRETO_REFRESCO` con `generateValue: true` (Render los genera solo, seguros, nadie los escribe a mano). `DATABASE_URL` queda `sync: false` a propósito — ese sí lo pega el usuario a mano desde Neon, Render no puede adivinarlo.
2. **Fix real encontrado y corregido:** `server/src/config/env.ts` leía `process.env.PUERTO` (español) para el puerto del servidor. Render asigna el puerto real por la variable estándar `PORT` — sin este fix, el health check de Render habría fallado siempre. Ahora lee `PORT` primero, con `PUERTO` como fallback para desarrollo local (nadie más lo usaba).
3. **`.github/workflows/build-apk.yml` ampliado** — se le agregó un paso nuevo, "Publicar código fuente para Render", ANTES de instalar dependencias/compilar: hace `git add app server docs PLAN-MAESTRO.md` + commit + push de vuelta al repo. Es necesario porque Render construye desde archivos reales del repo, no sabe leer el `MIAPROYECTO.zip` — así el usuario sigue sin tener que subir carpeta por carpeta, el propio workflow "desempaqueta" el zip como archivos normales cada vez que lo actualiza. Requiere `permissions: contents: write` (agregado al workflow).
4. **`app/src/lib/api.ts`** (sin cambios de código, ya leía `VITE_API_URL` de antes) — el workflow ahora inyecta `VITE_API_URL=https://mia-backend.onrender.com` como variable de entorno justo al correr `npm run build`. Ese nombre de URL asume que "mia-backend" quede libre en Render (es el `name:` del servicio en `render.yaml`) — si Render le asigna otro nombre porque ya estaba tomado, hay que corregir esa línea en el workflow con la URL real.

**Pendiente — lo único que de verdad necesita al usuario, en orden:**

1. Crear cuenta en Neon (neon.tech, gratis, con GitHub o email) → crear un proyecto → copiar el `DATABASE_URL` que da (viene con `?sslmode=require`, dejarlo tal cual).
2. Crear cuenta en Render (render.com, gratis, conectar con GitHub) → "New" → "Blueprint" → elegir el repo → Render lee `render.yaml` solo y muestra qué va a crear → pegar el `DATABASE_URL` de Neon donde lo pida (es la única variable que pide a mano, las demás las genera o ya están en el archivo) → Apply.
3. Confirmar la URL real que Render le dio al servicio (dashboard → arriba del todo) — si no es exactamente `https://mia-backend.onrender.com`, avisar para corregir `VITE_API_URL` en el workflow.
4. Con eso desplegado, recién ahí tiene sentido el punto 1-2 pendiente de "Estado real de Fase 13" (correr la migración real y probar los tres endpoints con curl/Postman) — antes no había dónde probarlos.

**No verificado (no se puede sin las cuentas reales del usuario):** que el Blueprint de Render aplique sin errores, que `prisma migrate deploy` corra limpio contra Neon la primera vez, y que el health check de Render pase con el fix de `PORT`. Todo esto se revisó a mano contra la documentación de cada plataforma, no se probó en vivo.

### Primer intento real de build en Render — 2 clases de error encontradas y corregidas en TODO el backend

El Blueprint sí se aplicó (Neon conectado, `render.yaml` encontrado) y llegó a correr `npm run build` de verdad por primera vez en la historia de este proyecto — y falló, revelando dos bugs que existían desde que se escribió cada módulo, invisibles hasta ahora porque `npm run dev` (`tsx`) nunca los detecta, solo `tsc -b` (el build real) lo hace:

1. **`TS2835` — 85 imports relativos en 25 archivos sin extensión `.js`** (ej. `from './repository'` en vez de `from './repository.js'`). `tsconfig.json` usa `moduleResolution: "NodeNext"` (ESM real), que exige la extensión explícita del archivo compilado — no es opcional, es una regla del propio Node.js con ESM, no un capricho de configuración. Corregido con un script que revisó TODO `server/src`, no solo los archivos que aparecían en el log truncado.
2. **`TS7006` — parámetros `req`/`res` con tipo implícito `any`** en los 5 archivos de rutas (`ai`, `auth`, `billing`, `plans`, `sync`) que usan el wrapper `async(async (req, res) => {...})` de `http/asyncHandler.ts`, más el health-check `/salud` en `index.ts`. Se corrigió anotando explícitamente `(req: Request, res: Response)` en los 13 handlers que usan ese patrón, agregando `import type { Request, Response } from 'express'` donde faltaba. `middleware.ts`, `rateLimit.ts` y `errorHandler.ts` ya estaban bien tipados — se revisaron y no necesitaron cambios.

**No verificado todavía:** no hay forma de correr `tsc` real contra este proyecto en este entorno (no hay `express`, `@prisma/client` ni el resto de dependencias instaladas, y no hay red para instalarlas) — la corrección se hizo revisando el patrón a mano y confirmando con `grep` que no queda ningún caso de los dos patrones en todo `server/src`, pero la próxima corrida real en Render sigue siendo la primera prueba de verdad. Si vuelve a fallar el build, puede haber una tercera clase de error distinta que este repaso no cubrió — mandar el log completo, no solo las primeras líneas, para no repetir el mismo problema de "el error real estaba más abajo en el log".

## Estructura del repo (tal como va hoy)

```
mia/
  PLAN-MAESTRO.md          ← este archivo, léelo primero
  docs/
    FASE2-ARQUITECTURA.md
  app/                      ← cliente móvil (Capacitor + React + TS)
    src/
      domain/
        viajes/             ← primer módulo de referencia, ya iniciado (Fase 4)
          types.ts
          repository.ts
          store.ts
          api.ts            ← Fase 13: sube un viaje a POST /sync/viajes
          sync.ts           ← Fase 13: recorre la cola pendiente, best-effort
        jornada/            ← agrupa viajes de un turno (Fase 4)
        mantenimiento/      ← Fase 6: catálogo + personalizados + alertas
          types.ts
          reglas.ts
          repository.ts
          store.ts
        estadisticas/       ← Fase 6: solo funciones puras, sin repository/store propio
          types.ts
          calculos.ts
        conversacion/       ← Fase 10: voz + conversación continua, sin repository (D-11)
          types.ts
          voz.ts            ← STT/TTS, patrón nativo/web igual que viajes/gps.ts
          api.ts            ← llama a POST /ai/conversacion
          store.ts
        auth/               ← Fase 7 (cliente): sesión, sin repository (el token ya lo guarda lib/api.ts)
          types.ts
          api.ts            ← llama a POST /auth/registro|login|refrescar
          store.ts
        planes/             ← Fase 11 (cliente): solo lectura, sin repository (el backend es la fuente de verdad)
          types.ts
          api.ts            ← llama a GET /planes, GET /planes/actual
          store.ts
      features/
        viajes/
          ViajesScreen.tsx
        mantenimiento/
          MantenimientoScreen.tsx
        estadisticas/
          EstadisticasScreen.tsx
        conversacion/
          ConversacionScreen.tsx  ← cruza viajes+mantenimiento para armar el contexto (Fase 10)
        auth/
          CuentaScreen.tsx  ← login/registro en una sola pantalla (Fase 7/10, D-13)
        planes/
          PlanesScreen.tsx  ← plan actual + catálogo, sin botón de compra todavía (Fase 11, D-14)
      design/
        tokens.css
      lib/
        api.ts              ← Fase 10: primer cliente HTTP real hacia server/ (D-11)
    android/                ← plugins nativos (burbuja, alarma) copiados del proyecto viejo (D-1),
                                más RECORD_AUDIO en el manifiesto (Fase 10)
  server/                   ← backend (Node + TS + Express + Prisma + Postgres)
    prisma/
      schema.prisma         ← Usuario, TokenRefresco, Plan, PlanDeUsuario
    src/
      config/
        env.ts              ← única puerta de entrada a variables de entorno
      lib/
        prisma.ts           ← PrismaClient único para todo el proceso
        logSeguridad.ts     ← Fase 12: única puerta de salida para eventos de seguridad
      http/
        asyncHandler.ts
        errorHandler.ts     ← único lugar que decide status/forma del JSON de error
        rateLimit.ts         ← Fase 12: rate limiting en memoria, ahora loguea al bloquear
      modules/
        auth/               ← Fase 7: registro, login, refresco (JWT + refresh opaco), middleware
        plans/              ← Fase 7: plan gratis automático. Play Billing real = Fase 11
        sync/                ← Fase 13 (EN CURSO): types.ts, schemas.ts, repository.ts,
                                service.ts, routes.ts — POST /sync/viajes, dedupe por id +
                                verificación de pertenencia. Solo viajes (ver D-16).
        ai/                  ← Fase 8 y 9 hechas con salvedades: reglas.ts, router.ts,
                                respuestas.ts, clasificadorIA.ts (stub) — Fase 8;
                                analisis.ts, contextoCompacto.ts, proveedorIA.ts (stub) — Fase 9;
                                conversacion.ts (Fase 10, EN CURSO) — decide Intent Router vs.
                                proxy de IA por turno, reutiliza el stub de proveedorIA.ts.
                                Proveedor de IA real sin decidir en ninguna de las tres.
        billing/             ← Fase 11 (EN CURSO): types.ts, service.ts, routes.ts escritos;
                                googlePlay.ts es un stub a propósito (verificadorSinConfigurar,
                                503) — no hay cuenta de desarrollador de Google Play todavía.
```
