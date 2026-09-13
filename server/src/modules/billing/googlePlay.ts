import type { VerificadorGooglePlay } from './types.js'

/**
 * Igual que `clasificadorIA.ts` (Fase 8) y `proveedorIA.ts` (Fase 9): acá
 * NO se implementa la llamada real a Google, a propósito.
 *
 * La implementación real necesita:
 *   1. Una cuenta de servicio de Google Cloud con acceso "Ver información
 *      financiera" en Play Console (se crea desde Play Console → Configuración
 *      de la API → vincular proyecto de Google Cloud).
 *   2. El paquete `googleapis` (o `google-auth-library` + fetch directo a
 *      `androidpublisher.googleapis.com`) — no está en `package.json` todavía,
 *      no se agregó una dependencia para código que no se puede probar.
 *   3. Llamar a `purchases.subscriptions.get` (o `purchases.products.get`
 *      para compras únicas) de la Android Publisher API v3 con
 *      `packageName` + `subscriptionId`/`productId` + `token`, y leer
 *      `expiryTimeMillis` (suscripciones) o `purchaseState` (compras únicas)
 *      de la respuesta para decidir `valida`/`expiraEnISO`.
 *   4. Idealmente, además de esto, escuchar las Real-time Developer
 *      Notifications (RTDN) de Google vía Pub/Sub para renovaciones y
 *      cancelaciones — hoy `POST /billing/validar-compra` solo se entera
 *      del estado de la compra en el momento en que el cliente la manda, no
 *      de cambios posteriores (una cancelación no revierte el plan sola).
 *      Eso queda pendiente, no es parte de este corte.
 *
 * Nada de esto se pudo escribir con confianza sin: (a) una cuenta de Google
 * Play Developer real para probar contra el sandbox, y (b) red para instalar
 * `googleapis` y consultar su API exacta — inventar la forma de la llamada
 * de memoria es peor que dejar el stub explícito. Cuando se resuelva, se
 * escribe una función con la forma de `VerificadorGooglePlay` y se pasa como
 * argumento a `servicioBilling.validarCompra` — el resto del módulo no
 * debería necesitar cambios (mismo principio que D-... de los otros stubs).
 */

export class ErrorBillingNoConfigurado extends Error {
  codigoHttp = 503

  constructor() {
    super('La verificación de compras de Google Play todavía no está configurada en el backend (Fase 11 — ver PLAN-MAESTRO).')
  }
}

export const verificadorSinConfigurar: VerificadorGooglePlay = async () => {
  throw new ErrorBillingNoConfigurado()
}
