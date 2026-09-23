import express from 'express'
import type { Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './config/env.js'
import { rutasAuth } from './modules/auth/routes.js'
import { rutasPlanes } from './modules/plans/routes.js'
import { rutasAI } from './modules/ai/routes.js'
import { rutasBilling } from './modules/billing/routes.js'
import { rutasSync } from './modules/sync/routes.js'
import { manejadorDeErrores } from './http/errorHandler.js'
import { repositorioPlanes } from './modules/plans/repository.js'
import { prisma } from './lib/prisma.js'

/**
 * Punto de entrada del backend MIA.
 *
 * Estado real (no inventar que todo ya funciona; corregido 2026-09-22 tras encontrar
 * en auditoría que varias líneas de abajo describían un estado ya superado):
 *   - modules/auth   → Fase 7 HECHA (registro, login, refresco de sesión, JWT propio — D-5)
 *   - modules/plans  → Fase 7 HECHA lo básico (plan gratis por defecto). Fase 11 agregó
 *                      el catálogo de planes pagos (PLANES_BASE) — la validación de
 *                      compra en sí vive en modules/billing/.
 *   - modules/billing → el verificador real contra Google Play SÍ existe (JWT Bearer
 *                      RFC 7523, intercambio OAuth2, Android Publisher API v3 — ver
 *                      modules/billing/googlePlay.ts). El 503 solo ocurre si falta
 *                      configurar GOOGLE_SERVICE_ACCOUNT_JSON, no es un stub permanente.
 *   - modules/sync    → cubre 11 recursos (viajes, jornadas, mantenimiento, gastos,
 *                      bonos, deudas+abonos, metas de ahorro+abonos, conceptos fijos
 *                      de hogar+gastos de hogar) con push + dedupe por id +
 *                      verificación de pertenencia, más restauración completa
 *                      (GET /sync/todo) al iniciar sesión o registrarse.
 *   - modules/ai      → el proveedor de IA real ya está integrado (OpenAI, chat
 *                      completions — ver modules/ai/proveedorIA.ts). El 503 solo
 *                      ocurre si falta configurar OPENAI_API_KEY.
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

/**
 * 2026-09-23, pedido explícito del usuario ("se queda pensando demasiado" al hablar con
 * MIA): dos capas duermen por inactividad — Render (el propio proceso, plan free) Y Neon
 * (la base de datos, también plan free, con auto-suspend propio no documentado antes acá).
 * Antes esta ruta no tocaba la base de datos, así que un ping periódico a `/salud` despertaba
 * Render pero NO evitaba que Neon se durmiera aparte — la primera consulta real después
 * seguía pagando el cold-start de la base. `SELECT 1` es la consulta más barata posible,
 * solo para mantener viva la conexión/cómputo de Neon; no compite en costo con nada real.
 * Ver `.github/workflows/keep-alive.yml` (pega acá cada 10 min, gratis en GitHub Actions).
 */
app.get('/salud', async (_req: Request, res: Response) => {
  await prisma.$queryRaw`SELECT 1`
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
