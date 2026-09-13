# MIA — Plan maestro

> **Instrucción para cualquier sesión nueva (Claude u otra persona):** lee este archivo primero, completo, antes de tocar código. Aquí está el estado real: qué fase va, qué se decidió y por qué, y qué sigue exactamente. No releer el proyecto viejo (NOAH Conductor) salvo que se busque un dato puntual de funcionalidad — ese proyecto es solo referencia, nunca se copia código de ahí (excepción: plugins nativos de Android, ver decisión D-1).

Última actualización: Fase 5 EN CURSO — plugin nativo de GPS, motor de geofencing e integración con `domain/viajes` ya escritos. Proyecto Capacitor Android armado a mano en esta sesión (antes no existía ningún archivo de proyecto real). Falta: correr `npm install` + `npx cap sync android` con el proyecto real, abrir en Android Studio y probar en dispositivo físico.

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
| 6 | Mantenimiento + estadísticas | ⬜ PENDIENTE | — |
| 7 | Backend: auth + usuarios + planes | ⬜ PENDIENTE | `server/src/modules/auth`, `server/src/modules/plans` (stubs creados, sin lógica real) |
| 8 | Intent Router (reglas + clasificador) | ⬜ PENDIENTE | `server/src/modules/ai` (carpeta creada, vacía) |
| 9 | IA analista (proxy + contexto compacto) | ⬜ PENDIENTE | — |
| 10 | Voz + conversación continua | ⬜ PENDIENTE | — |
| 11 | Google Play Billing (planes) + validación server-side | ⬜ PENDIENTE | — |
| 12 | Seguridad (auth, rate limits, datos por usuario) | ⬜ PENDIENTE | — |
| 13 | Offline + sincronización con dedupe | ⬜ PENDIENTE | Diseño ya definido en Fase 2, falta implementar |
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
- **D-8 — Convención de carpetas:** `app/` = cliente móvil, `server/` = backend, `docs/` = documentos de arquitectura y planeación. Cada módulo de dominio vive en `app/src/domain/<nombre>/` con `types.ts`, `repository.ts`, `store.ts` — ese es el patrón a repetir para cada nuevo módulo (gastos, deudas, mantenimiento, etc.), no inventar una estructura distinta por módulo.

---

## Qué falta decidir (preguntar al usuario cuando se llegue a esa fase, no antes)

- Proveedor de IA definitivo para el proxy del backend (Fase 9).
- Dónde se despliega el backend (Fase 7 en adelante) — Render/Railway/VPS propio/otro.
- Set de ciudades/zonas a cubrir en el geofencing local (Fase 5). ✅ RESUELTO — 20 localidades de Bogotá, ver D-7.
- Nombre final de paquete Android / branding (`com.mia.conductor` u otro) — no urge, se resuelve en Fase 14.

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

**No se pudo verificar que el build realmente compile** — este entorno no tiene acceso a red (falla `npm install` con 403 al registry) ni Android SDK, así que ninguno de estos archivos nuevos se probó de punta a punta. La primera corrida del workflow en GitHub Actions es, en los hechos, la primera vez que se prueba esta cadena completa.

## Primera corrida real en GitHub Actions (usuario) — resultado y fix

Corrió: `wrapper` ✅, `assembleDebug` ❌. Error real (Manifest merger):
`uses-sdk:minSdkVersion 23 cannot be smaller than version 24 declared in library [org.apache.cordova:framework:14.0.1]`. El módulo `capacitor-cordova-android-plugins` que Capacitor arma internamente (aunque el proyecto no usa ningún plugin Cordova) trae esa librería, que exige API 24 mínimo. **Fix aplicado:** `minSdkVersion` subido de 23 a 24 en `app/android/variables.gradle` (API 24 = Android 7.0, sigue cubriendo casi todo el parque de teléfonos real). Falta que el usuario vuelva a subir el zip y corra el Action de nuevo para confirmar que compila.

---

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
      features/
        viajes/
          ViajesScreen.tsx
      design/
        tokens.css
    android/                ← plugins nativos (burbuja, alarma) copiados del proyecto viejo (D-1)
  server/                   ← backend (Node + TS + Express, stub por ahora)
    src/
      modules/
        auth/               ← vacío, Fase 7
        sync/                ← vacío, Fase 13
        plans/               ← vacío, Fase 11
        ai/                  ← vacío, Fase 9
```
