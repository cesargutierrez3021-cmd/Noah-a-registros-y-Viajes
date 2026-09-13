import { Router } from 'express'
import type { Request, Response } from 'express'
import { servicioSync, ErrorSync } from './service.js'
import { esquemaViajeSync, esquemaJornadaSync, esquemaRegistroMantenimientoSync } from './schemas.js'
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
