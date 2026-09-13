import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { servicioBilling } from './service.js'
import { requiereAutenticacion } from '../auth/middleware.js'
import { async } from '../../http/asyncHandler.js'
import { crearLimitadorDeTasa } from '../../http/rateLimit.js'

export const rutasBilling = Router()

// Fase 12: cada validación exitosa puede terminar llamando a la API de Google
// (cuando el verificador real exista, ver modules/billing/googlePlay.ts) —
// límite conservador, nadie compra 30 veces por minuto de verdad.
const limitadorBilling = crearLimitadorDeTasa(60 * 1000, 5, 'Demasiadas validaciones de compra seguidas. Espera un momento.')

const esquemaValidarCompra = z.object({
  packageName: z.string().min(1),
  productId: z.string().min(1),
  purchaseToken: z.string().min(1),
})

/**
 * POST /billing/validar-compra — Fase 11. El cliente llama a esto justo
 * después de que Google Play Billing Library le confirma una compra
 * (evento `onPurchasesUpdated` del lado de la app, todavía sin escribir —
 * ver "Estado real de Fase 11"). Protegida: hay que saber a qué usuario
 * asignarle el plan.
 */
rutasBilling.post(
  '/validar-compra',
  requiereAutenticacion,
  limitadorBilling,
  async(async (req: Request, res: Response) => {
    const { packageName, productId, purchaseToken } = esquemaValidarCompra.parse(req.body)
    const plan = await servicioBilling.validarCompra(req.usuarioId!, packageName, productId, purchaseToken)
    res.json(plan)
  }),
)
