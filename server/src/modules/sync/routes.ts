import { Router } from 'express'
import type { Request, Response } from 'express'
import { servicioSync, ErrorSync } from './service.js'
import { esquemaViajeSync, esquemaJornadaSync, esquemaRegistroMantenimientoSync, esquemaGastoSync, esquemaBonoSync, esquemaDeudaSync, esquemaAbonoDeudaSync, esquemaMetaAhorroSync, esquemaAbonoAhorroSync, esquemaConceptoFijoSync, esquemaGastoHogarSync } from './schemas.js'
import { requiereAutenticacion } from '../auth/middleware.js'
import { async } from '../../http/asyncHandler.js'
import { crearLimitadorDeTasa } from '../../http/rateLimit.js'
import { logEventoSeguridad } from '../../lib/logSeguridad.js'

export const rutasSync = Router()

// Fase 12/13: un conductor real sincroniza como mucho unos pocos viajes por
// minuto (los va cerrando uno a uno, no en ráfaga) — límite generoso para
// ponerse al día tras un rato sin internet, sin dejar la puerta abierta a
// alguien mandando miles de requests. Compartido por los tres recursos de
// sync a propósito (viajes/jornadas/registros): es un límite sobre "cuánto
// puede sincronizar este usuario por minuto", no sobre un endpoint en
// particular — si fueran contadores separados, alguien podría multiplicar su
// cupo real repartiendo requests entre los tres.
const limitadorSync = crearLimitadorDeTasa(60 * 1000, 60, 'Demasiadas sincronizaciones seguidas. Espera un momento.')

/**
 * POST /sync/viajes — Fase 13. UN viaje por request (no un batch) a propósito:
 * así el tamaño del body queda acotado por la duración de ESE viaje, no por
 * cuántos viajes se acumularon sin internet — evita que un día entero sin
 * conexión se convierta en un solo request gigante que choque contra el
 * límite de body de Express (ver index.ts, Fase 12). El cliente
 * (domain/viajes/sync.ts) llama a esto una vez por cada viaje pendiente,
 * en secuencia.
 */
rutasSync.post(
  '/viajes',
  requiereAutenticacion,
  limitadorSync,
  async(async (req: Request, res: Response) => {
    const viaje = esquemaViajeSync.parse(req.body)
    try {
      await servicioSync.sincronizarViaje(req.usuarioId!, viaje)
      res.json({ id: viaje.id, sincronizado: true })
    } catch (err) {
      if (err instanceof ErrorSync) {
        logEventoSeguridad({ tipo: 'sync_conflicto_pertenencia', ip: req.ip ?? 'desconocida', detalle: `viajeId=${viaje.id}` })
      }
      throw err
    }
  }),
)

/**
 * POST /sync/jornadas — Fase 13 (continuación). Igual patrón que /viajes,
 * salvo que el cliente puede llamar esto varias veces para LA MISMA jornada
 * mientras sigue abierta (cada vez que termina un viaje, ver
 * domain/jornada/sync.ts) — el upsert por id hace que cada llamada actualice
 * la misma fila.
 */
rutasSync.post(
  '/jornadas',
  requiereAutenticacion,
  limitadorSync,
  async(async (req: Request, res: Response) => {
    const jornada = esquemaJornadaSync.parse(req.body)
    try {
      await servicioSync.sincronizarJornada(req.usuarioId!, jornada)
      res.json({ id: jornada.id, sincronizado: true })
    } catch (err) {
      if (err instanceof ErrorSync) {
        logEventoSeguridad({ tipo: 'sync_conflicto_pertenencia', ip: req.ip ?? 'desconocida', detalle: `jornadaId=${jornada.id}` })
      }
      throw err
    }
  }),
)

/**
 * POST /sync/mantenimiento/registros — Fase 13 (continuación). Solo registros
 * históricos de mantenimiento realizado, nunca la configuración de ítems
 * (`ItemMantenimiento`) — ver schema.prisma (modelo RegistroMantenimiento)
 * sobre por qué.
 */
rutasSync.post(
  '/mantenimiento/registros',
  requiereAutenticacion,
  limitadorSync,
  async(async (req: Request, res: Response) => {
    const registro = esquemaRegistroMantenimientoSync.parse(req.body)
    try {
      await servicioSync.sincronizarRegistroMantenimiento(req.usuarioId!, registro)
      res.json({ id: registro.id, sincronizado: true })
    } catch (err) {
      if (err instanceof ErrorSync) {
        logEventoSeguridad({ tipo: 'sync_conflicto_pertenencia', ip: req.ip ?? 'desconocida', detalle: `registroMantenimientoId=${registro.id}` })
      }
      throw err
    }
  }),
)

/**
 * POST /sync/gastos — Bloque 3 (dominios nuevos). Mismo patrón que los demás:
 * upsert por id, un gasto por request. Ver schema.prisma (modelo Gasto) sobre
 * por qué esto sí se puede sincronizar tal cual (a diferencia de
 * `ItemMantenimiento`).
 */
rutasSync.post(
  '/gastos',
  requiereAutenticacion,
  limitadorSync,
  async(async (req: Request, res: Response) => {
    const gasto = esquemaGastoSync.parse(req.body)
    try {
      await servicioSync.sincronizarGasto(req.usuarioId!, gasto)
      res.json({ id: gasto.id, sincronizado: true })
    } catch (err) {
      if (err instanceof ErrorSync) {
        logEventoSeguridad({ tipo: 'sync_conflicto_pertenencia', ip: req.ip ?? 'desconocida', detalle: `gastoId=${gasto.id}` })
      }
      throw err
    }
  }),
)

/**
 * POST /sync/bonos — 2026-09-17, pedido explícito del usuario. Mismo patrón
 * que /gastos: upsert por id, un bono por request.
 */
rutasSync.post(
  '/bonos',
  requiereAutenticacion,
  limitadorSync,
  async(async (req: Request, res: Response) => {
    const bono = esquemaBonoSync.parse(req.body)
    try {
      await servicioSync.sincronizarBono(req.usuarioId!, bono)
      res.json({ id: bono.id, sincronizado: true })
    } catch (err) {
      if (err instanceof ErrorSync) {
        logEventoSeguridad({ tipo: 'sync_conflicto_pertenencia', ip: req.ip ?? 'desconocida', detalle: `bonoId=${bono.id}` })
      }
      throw err
    }
  }),
)

/**
 * POST /sync/deudas — Bloque 3 (continuación). A diferencia de /viajes, esta
 * se reenvía completa en cada abono (mismo patrón que /jornadas): el upsert
 * por id actualiza `saldoActual` en el lugar.
 */
rutasSync.post(
  '/deudas',
  requiereAutenticacion,
  limitadorSync,
  async(async (req: Request, res: Response) => {
    const deuda = esquemaDeudaSync.parse(req.body)
    try {
      await servicioSync.sincronizarDeuda(req.usuarioId!, deuda)
      res.json({ id: deuda.id, sincronizado: true })
    } catch (err) {
      if (err instanceof ErrorSync) {
        logEventoSeguridad({ tipo: 'sync_conflicto_pertenencia', ip: req.ip ?? 'desconocida', detalle: `deudaId=${deuda.id}` })
      }
      throw err
    }
  }),
)

/**
 * POST /sync/deudas/abonos — Bloque 3 (continuación). El cliente sube la
 * deuda antes que sus abonos (domain/deudas/sync.ts), pero esta ruta puede
 * igual recibir un 409 si por algún motivo el abono llega primero (FK real
 * a Deuda, ver schema.prisma y service.ts) — el cliente lo reintenta solo en
 * la próxima pasada de sync, no hace falta manejo especial acá.
 */
rutasSync.post(
  '/deudas/abonos',
  requiereAutenticacion,
  limitadorSync,
  async(async (req: Request, res: Response) => {
    const abono = esquemaAbonoDeudaSync.parse(req.body)
    try {
      await servicioSync.sincronizarAbonoDeuda(req.usuarioId!, abono)
      res.json({ id: abono.id, sincronizado: true })
    } catch (err) {
      // Solo el 403 (pertenencia) es un evento de seguridad real. El 409
      // (deuda todavía no sincronizada) es tráfico normal de un flujo
      // offline-first — loguearlo acá saturaría el log de seguridad con
      // reintentos esperables, no con nada sospechoso.
      if (err instanceof ErrorSync && err.codigoHttp === 403) {
        logEventoSeguridad({ tipo: 'sync_conflicto_pertenencia', ip: req.ip ?? 'desconocida', detalle: `abonoDeudaId=${abono.id}` })
      }
      throw err
    }
  }),
)

/**
 * POST /sync/ahorro — 2026-09-15. Mismo patrón exacto que /sync/deudas
 * (upsert, mutable, un recurso por request) — ver schema.prisma (modelo MetaAhorro).
 */
rutasSync.post(
  '/ahorro',
  requiereAutenticacion,
  limitadorSync,
  async(async (req: Request, res: Response) => {
    const meta = esquemaMetaAhorroSync.parse(req.body)
    try {
      await servicioSync.sincronizarMetaAhorro(req.usuarioId!, meta)
      res.json({ id: meta.id, sincronizado: true })
    } catch (err) {
      if (err instanceof ErrorSync) {
        logEventoSeguridad({ tipo: 'sync_conflicto_pertenencia', ip: req.ip ?? 'desconocida', detalle: `metaAhorroId=${meta.id}` })
      }
      throw err
    }
  }),
)

/**
 * POST /sync/ahorro/abonos — mismo patrón exacto que /sync/deudas/abonos: el
 * cliente sube la meta antes que sus abonos (domain/ahorro/sync.ts), puede
 * igual recibir un 409 si el abono llega primero (FK real a MetaAhorro).
 */
rutasSync.post(
  '/ahorro/abonos',
  requiereAutenticacion,
  limitadorSync,
  async(async (req: Request, res: Response) => {
    const abono = esquemaAbonoAhorroSync.parse(req.body)
    try {
      await servicioSync.sincronizarAbonoAhorro(req.usuarioId!, abono)
      res.json({ id: abono.id, sincronizado: true })
    } catch (err) {
      if (err instanceof ErrorSync && err.codigoHttp === 403) {
        logEventoSeguridad({ tipo: 'sync_conflicto_pertenencia', ip: req.ip ?? 'desconocida', detalle: `abonoAhorroId=${abono.id}` })
      }
      throw err
    }
  }),
)

/**
 * POST /sync/hogar/conceptos-fijos — Bloque 3, sección 3/4. Mismo patrón que
 * /deudas: se reenvía completo cada vez que cambia (monto esperado, o al
 * desactivarlo) — el upsert por id actualiza la fila en el lugar.
 */
rutasSync.post(
  '/hogar/conceptos-fijos',
  requiereAutenticacion,
  limitadorSync,
  async(async (req: Request, res: Response) => {
    const concepto = esquemaConceptoFijoSync.parse(req.body)
    try {
      await servicioSync.sincronizarConceptoFijo(req.usuarioId!, concepto)
      res.json({ id: concepto.id, sincronizado: true })
    } catch (err) {
      if (err instanceof ErrorSync) {
        logEventoSeguridad({ tipo: 'sync_conflicto_pertenencia', ip: req.ip ?? 'desconocida', detalle: `conceptoFijoId=${concepto.id}` })
      }
      throw err
    }
  }),
)

/**
 * POST /sync/hogar/gastos — Bloque 3, sección 3/4. El cliente sube el
 * concepto fijo antes que los gastos que generó (domain/hogar/sync.ts),
 * pero esta ruta puede igual recibir un 409 si el gasto llega primero (FK
 * real a ConceptoFijo cuando conceptoFijoId no es null) — mismo criterio que
 * /deudas/abonos.
 */
rutasSync.post(
  '/hogar/gastos',
  requiereAutenticacion,
  limitadorSync,
  async(async (req: Request, res: Response) => {
    const gasto = esquemaGastoHogarSync.parse(req.body)
    try {
      await servicioSync.sincronizarGastoHogar(req.usuarioId!, gasto)
      res.json({ id: gasto.id, sincronizado: true })
    } catch (err) {
      if (err instanceof ErrorSync && err.codigoHttp === 403) {
        logEventoSeguridad({ tipo: 'sync_conflicto_pertenencia', ip: req.ip ?? 'desconocida', detalle: `gastoHogarId=${gasto.id}` })
      }
      throw err
    }
  }),
)

/**
 * GET /sync/todo — 2026-09-17, pedido explícito del usuario: el sync hasta
 * acá era de una sola vía (push), así que reinstalar la app perdía todo aunque
 * hubiera cuenta. Esta ruta devuelve los 11 recursos completos del usuario
 * autenticado en un solo request — la usa domain/restauracion/ en el cliente,
 * una sola vez al iniciar sesión (login o registro), nunca en el loop de sync
 * automático normal (eso sigue siendo solo push, ver el resto de este
 * archivo). Mismo `limitadorSync` que las rutas de arriba — un usuario real
 * inicia sesión unas pocas veces por instalación, nunca en ráfaga.
 */
rutasSync.get(
  '/todo',
  requiereAutenticacion,
  limitadorSync,
  async(async (req: Request, res: Response) => {
    const datos = await servicioSync.obtenerTodo(req.usuarioId!)
    res.json(datos)
  }),
)
