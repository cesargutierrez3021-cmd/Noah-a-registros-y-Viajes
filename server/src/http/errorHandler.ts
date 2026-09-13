import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { ErrorAuth } from '../modules/auth/service.js'
import { ErrorProveedorIANoConfigurado } from '../modules/ai/proveedorIA.js'
import { ErrorBilling } from '../modules/billing/service.js'
import { ErrorBillingNoConfigurado } from '../modules/billing/googlePlay.js'
import { ErrorSync } from '../modules/sync/service.js'

/**
 * Único lugar donde se decide qué código HTTP y qué forma de JSON de error
 * ve el cliente. Las rutas nunca arman su propio res.status(...).json({error})
 * para fallos — lanzan, y esto los traduce.
 */
export function manejadorDeErrores(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Datos inválidos', detalles: err.flatten() })
    return
  }

  if (err instanceof ErrorAuth) {
    res.status(err.codigoHttp).json({ error: err.message })
    return
  }

  if (err instanceof ErrorProveedorIANoConfigurado) {
    res.status(err.codigoHttp).json({ error: err.message })
    return
  }

  if (err instanceof ErrorBillingNoConfigurado) {
    res.status(err.codigoHttp).json({ error: err.message })
    return
  }

  if (err instanceof ErrorBilling) {
    res.status(err.codigoHttp).json({ error: err.message })
    return
  }

  if (err instanceof ErrorSync) {
    res.status(err.codigoHttp).json({ error: err.message })
    return
  }

  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
}
