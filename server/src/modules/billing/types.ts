/**
 * Fase 11 — Google Play Billing (planes) + validación server-side (D-6:
 * "Google Play Billing Library en el cliente + endpoint en el backend que
 * valida el recibo contra la API de Google. Ninguna pasarela de pago
 * propia."). Este archivo son los tipos del lado del backend — el cliente
 * (Billing Library) manda `purchaseToken` después de que el usuario compra
 * dentro de la app; el backend nunca ve una tarjeta ni un monto.
 */

export interface ParametrosVerificacionCompra {
  /** Nombre del paquete Android (ej. 'com.mia.conductor') — Google lo exige para evitar que un token de otra app se cuele acá. */
  packageName: string
  /** SKU/ID de producto o suscripción tal como está en Play Console (mismo valor que `Plan.productIdGooglePlay`). */
  productId: string
  /** Token opaco que entrega la Billing Library del lado del cliente al completar la compra. */
  purchaseToken: string
}

export interface EstadoCompraGoogle {
  /** true si Google Play confirma que la compra es real, está pagada y no fue reembolsada/cancelada. */
  valida: boolean
  /** Fecha de expiración de la suscripción según Google, o null si el producto no expira (compra única) o Google no la informó. */
  expiraEnISO: string | null
}

/** Verifica una compra contra la Play Developer API. Inyectable — ver googlePlay.ts para el porqué (mismo patrón que ProveedorIA/ClasificadorIntentIA). */
export type VerificadorGooglePlay = (parametros: ParametrosVerificacionCompra) => Promise<EstadoCompraGoogle>
