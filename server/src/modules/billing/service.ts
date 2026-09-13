import { repositorioPlanes } from '../plans/repository'
import { verificadorSinConfigurar } from './googlePlay'
import type { VerificadorGooglePlay } from './types'
import type { PlanPublico } from '../plans/types'

export class ErrorBilling extends Error {
  constructor(
    message: string,
    public codigoHttp: number,
  ) {
    super(message)
  }
}

function aPlanPublico(plan: { clave: string; nombre: string; limiteConsultasIA: number | null }): PlanPublico {
  return { clave: plan.clave, nombre: plan.nombre, limiteConsultasIA: plan.limiteConsultasIA }
}

export const servicioBilling = {
  /**
   * Fase 11 — se llama desde `POST /billing/validar-compra` con lo que la
   * Billing Library del cliente entregó después de una compra. Reglas, en
   * orden:
   *
   * 1. `productId` tiene que mapear a un Plan real (`Plan.productIdGooglePlay`)
   *    — si no, es un producto que el catálogo no conoce, error 400.
   * 2. Idempotencia primero, ANTES de gastar una llamada a Google: si este
   *    `purchaseToken` ya generó una fila (`buscarPlanDeUsuarioPorTokenDeCompra`),
   *    se devuelve el plan que ya se activó, sin volver a verificar ni
   *    duplicar — cubre reintentos del cliente (ej. la app se cerró justo
   *    después de comprar, antes de recibir la respuesta, y reintenta).
   * 3. Recién ahí se verifica contra Google (`verificador`, inyectable —
   *    ver googlePlay.ts). Si Google dice que no es válida, error 402.
   * 4. Se desactivan los planes activos anteriores del usuario (no se
   *    borran, queda el historial) y se crea el nuevo `PlanDeUsuario` con
   *    el `purchaseToken` y la fecha de expiración que informó Google.
   */
  async validarCompra(
    usuarioId: string,
    packageName: string,
    productId: string,
    purchaseToken: string,
    verificador: VerificadorGooglePlay = verificadorSinConfigurar,
  ): Promise<PlanPublico> {
    const plan = await repositorioPlanes.buscarPlanPorProductoGoogle(productId)
    if (!plan) {
      throw new ErrorBilling(`No existe ningún plan asociado al producto de Google Play "${productId}"`, 400)
    }

    const yaProcesada = await repositorioPlanes.buscarPlanDeUsuarioPorTokenDeCompra(purchaseToken)
    if (yaProcesada) {
      return aPlanPublico(yaProcesada.plan)
    }

    const estado = await verificador({ packageName, productId, purchaseToken })
    if (!estado.valida) {
      throw new ErrorBilling('Google Play no reconoce esta compra como válida (puede estar cancelada, reembolsada o no pagada).', 402)
    }

    await repositorioPlanes.desactivarPlanesActivosDeUsuario(usuarioId)
    await repositorioPlanes.asignarPlanAUsuario(usuarioId, plan.id, {
      purchaseToken,
      finISO: estado.expiraEnISO ? new Date(estado.expiraEnISO) : null,
    })

    return aPlanPublico(plan)
  },
}
