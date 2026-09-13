import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './config/env'
import { rutasAuth } from './modules/auth/routes'
import { rutasPlanes } from './modules/plans/routes'
import { rutasAI } from './modules/ai/routes'
import { rutasBilling } from './modules/billing/routes'
import { rutasSync } from './modules/sync/routes'
import { manejadorDeErrores } from './http/errorHandler'
import { repositorioPlanes } from './modules/plans/repository'

/**
 * Punto de entrada del backend MIA.
 *
 * Estado real (no inventar que todo ya funciona):
 *   - modules/auth   → Fase 7 HECHA (registro, login, refresco de sesión, JWT propio — D-5)
 *   - modules/plans  → Fase 7 HECHA lo básico (plan gratis por defecto). Fase 11 agregó
 *                      el catálogo de planes pagos (PLANES_BASE) — la validación de
 *                      compra en sí vive en modules/billing/.
 *   - modules/billing → Fase 11 EN CURSO: rutas y servicio escritos, pero el verificador
 *                      real contra Google Play NO existe (stub que lanza 503 a propósito
 *                      — ver modules/billing/googlePlay.ts y "Estado real de Fase 11").
 *   - modules/sync    → Fase 13 EN CURSO: POST /sync/viajes, /sync/jornadas y
 *                      /sync/mantenimiento/registros (push, un recurso por
 *                      request, dedupe por id + verificación de pertenencia —
 *                      ver "Estado real de Fase 13"). Los ítems de
 *                      mantenimiento (configuración editable/borrable) siguen
 *                      sin sincronizar a propósito — ver modules/sync/types.ts.
 *   - modules/ai      → Fase 8 y 9 HECHAS con salvedades (Intent Router + proxy de IA).
 *                        Fase 10 (voz + conversación continua, POST /ai/conversacion) EN
 *                        CURSO — ver "Estado real de Fase 10" en PLAN-MAESTRO.
 *                        El proveedor de IA real sigue sin decidirse — ver PLAN-MAESTRO.
 *   - Fase 12 (seguridad): rate limiting propio (http/rateLimit.ts), helmet, CORS y
 *                        trust proxy agregados acá abajo — ver "Estado real de Fase 12".
 *
 * No se ha podido correr esto ni una vez en este entorno (sin red, sin Postgres
 * disponible) — ver PLAN-MAESTRO.md "Estado real de Fase 7" para el detalle
 * exacto de qué falta probar antes de dar la fase por cerrada.
 */

const app = express()

// Fase 12 — necesario para que `req.ip` (que usa el rate limiter, ver
// http/rateLimit.ts) refleje la IP real del cliente y no la del proxy,
// cuando el backend corre detrás de un reverse proxy (típico en
// Render/Railway/Heroku — ver PLAN-MAESTRO "Qué falta decidir" sobre dónde
// se despliega). `1` confía en un solo proxy delante (el caso normal de esas
// plataformas). Si el despliegue final termina siendo otro (ej. detrás de
// varios proxies encadenados, o sin proxy en absoluto), este valor hay que
// revisarlo — no se pudo confirmar contra un despliegue real todavía.
app.set('trust proxy', 1)

// Fase 12 — seguridad básica de HTTP: cabeceras (helmet) + CORS acotado a
// los orígenes esperados (ver env.corsOrigenes). Antes de esta fase el
// server no tenía ninguno de los dos configurado.
app.use(helmet())
app.use(cors({ origin: env.corsOrigenes }))

// Fase 12, pendiente #5 (revisado en Fase 13): el límite explícito nació en
// 256kb pensando solo en credenciales/texto de preguntas. Fase 13 agrega
// POST /sync/viajes, cuyo body es un `recorrido` de puntos GPS — un viaje
// largo y con captura densa puede pesar más que eso (ver
// modules/sync/routes.ts, comentario sobre por qué es un viaje por request
// y no un lote). 512kb cubre con margen holgado incluso un viaje de varias
// horas capturando un punto cada pocos segundos; se documenta acá el nuevo
// número y el porqué, no se sube "por si acaso" sin motivo.
app.use(express.json({ limit: '512kb' }))

app.get('/salud', (_req, res) => {
  res.json({ estado: 'ok' })
})

app.use('/auth', rutasAuth)
app.use('/planes', rutasPlanes)
app.use('/ai', rutasAI)
app.use('/billing', rutasBilling)
app.use('/sync', rutasSync)

// Siempre al final: Express solo lo trata como manejador de errores por tener 4 argumentos.
app.use(manejadorDeErrores)

async function arrancar() {
  // Idempotente: si los planes ya existen, upsert no hace nada. Así el server
  // siempre garantiza que el catálogo completo (gratis + pagos) exista antes
  // de aceptar un registro o una validación de compra.
  await repositorioPlanes.asegurarPlanesBaseExisten()

  app.listen(env.puerto, () => {
    console.log(`MIA backend escuchando en el puerto ${env.puerto}`)
  })
}

arrancar().catch((err) => {
  console.error('El backend no pudo arrancar:', err)
  process.exit(1)
})
