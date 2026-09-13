/**
 * Fase 7 solo necesitaba el plan "gratis" existir y asignarse solo. Fase 11
 * agrega el catálogo real de planes (incluye los pagos) y la validación de
 * compra contra Google Play — ver modules/billing/.
 */
export const CLAVE_PLAN_GRATIS = 'gratis'
export const CLAVE_PLAN_PRO_MENSUAL = 'pro_mensual'

export interface PlanBase {
  clave: string
  nombre: string
  limiteConsultasIA: number | null
  /** SKU de Google Play Console. Null para el plan gratis (no se compra). */
  productIdGooglePlay: string | null
}

/**
 * Catálogo de planes que el server garantiza que existan al arrancar (ver
 * `repositorioPlanes.asegurarPlanesBaseExisten`, llamado desde `index.ts`).
 * `productIdGooglePlay` es el ID de producto/suscripción que hay que crear
 * en Play Console con el MISMO valor — si no coinciden, `POST
 * /billing/validar-compra` nunca va a encontrar a qué plan mapear la compra.
 * Ese ID todavía no se registró en ninguna Play Console real (no existe
 * cuenta de desarrollador todavía, ver "Qué falta decidir") — es un valor
 * razonable elegido para que el código tenga algo concreto con qué trabajar,
 * no una confirmación de que ya existe en Google Play.
 */
export const PLANES_BASE: PlanBase[] = [
  { clave: CLAVE_PLAN_GRATIS, nombre: 'Gratis', limiteConsultasIA: 20, productIdGooglePlay: null },
  { clave: CLAVE_PLAN_PRO_MENSUAL, nombre: 'Pro mensual', limiteConsultasIA: null, productIdGooglePlay: 'mia_pro_mensual' },
]

export interface PlanPublico {
  clave: string
  nombre: string
  limiteConsultasIA: number | null
}
