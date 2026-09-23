import jwt from 'jsonwebtoken'
import type { EstadoCompraGoogle, ParametrosVerificacionCompra, VerificadorGooglePlay } from './types.js'

/**
 * Implementación real de Fase 11 — antes era un stub a propósito (sin cuenta
 * de Google Play Developer ni red para probar contra el sandbox no tenía
 * sentido inventar la forma exacta de la llamada). Ahora que se necesita
 * para poder cobrar suscripciones, queda escrita siguiendo el protocolo
 * documentado y estable de Google (no específico de una versión de SDK):
 *
 *   1. Autenticación de cuenta de servicio (RFC 7523, JWT Bearer Flow):
 *      se firma un JWT con la private key de la cuenta de servicio
 *      (`jsonwebtoken`, ya es dependencia — ver auth/jwt.ts) y se cambia por
 *      un access_token en POST https://oauth2.googleapis.com/token.
 *   2. Se llama a la Android Publisher API v3
 *      (`purchases.subscriptions.get`) con ese access_token — sin agregar el
 *      paquete `googleapis`, es un solo GET con fetch.
 *
 * No se agregó soporte para compras únicas (`purchases.products.get`) a
 * propósito: PLANES_BASE (modules/plans/types.ts) hoy solo tiene un plan de
 * suscripción mensual (D-6) — se agrega el día que exista un plan que no sea
 * suscripción, no antes (D-18: no construir sin necesidad confirmada).
 *
 * Sigue sin escuchar Real-time Developer Notifications (RTDN) — una
 * cancelación en Google no revierte el plan sola todavía, solo se entera en
 * el momento en que el cliente vuelve a llamar a /billing/validar-compra.
 * Eso queda pendiente, no es parte de este corte.
 *
 * Se activa configurando GOOGLE_SERVICE_ACCOUNT_JSON (el JSON completo de la
 * clave de la cuenta de servicio, como string) — ver server/.env.example. Sin
 * esa variable, se comporta exactamente como el stub anterior: 503 explícito,
 * nunca inventa una compra válida.
 */

export class ErrorBillingNoConfigurado extends Error {
  codigoHttp = 503

  constructor(motivo?: string) {
    super(
      motivo ??
        'La verificación de compras de Google Play todavía no está configurada en el backend (falta GOOGLE_SERVICE_ACCOUNT_JSON — ver PLAN-MAESTRO).',
    )
  }
}

interface CredencialCuentaServicio {
  clientEmail: string
  privateKey: string
}

function leerCredencial(): CredencialCuentaServicio | null {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!json) return null

  let datos: { client_email?: string; private_key?: string }
  try {
    datos = JSON.parse(json)
  } catch {
    return null
  }
  if (!datos.client_email || !datos.private_key) return null
  return { clientEmail: datos.client_email, privateKey: datos.private_key }
}

// El access_token de Google dura 1h (3600s) — se cachea en memoria del
// proceso y se renueva con margen (55min) para no pedir uno nuevo en cada
// compra. Mismo criterio de simplicidad que http/rateLimit.ts: si el backend
// llega a correr en varias instancias, cada una cachea el suyo — no hace
// daño, cada una simplemente pide su propio token cuando le toque.
let tokenCacheado: { valor: string; expiraEnMs: number } | null = null

async function obtenerTokenDeAcceso(credencial: CredencialCuentaServicio): Promise<string> {
  if (tokenCacheado && Date.now() < tokenCacheado.expiraEnMs) {
    return tokenCacheado.valor
  }

  const ahoraSegundos = Math.floor(Date.now() / 1000)
  const assertion = jwt.sign(
    {
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: ahoraSegundos,
      exp: ahoraSegundos + 3600,
    },
    credencial.privateKey,
    { algorithm: 'RS256', issuer: credencial.clientEmail },
  )

  const respuesta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  const datos = (await respuesta.json().catch(() => null)) as { access_token?: string; error_description?: string } | null
  if (!respuesta.ok || !datos?.access_token) {
    throw new ErrorBillingNoConfigurado(
      `No se pudo autenticar contra Google (${datos?.error_description ?? `HTTP ${respuesta.status}`}) — revisa GOOGLE_SERVICE_ACCOUNT_JSON.`,
    )
  }

  tokenCacheado = { valor: datos.access_token, expiraEnMs: Date.now() + 55 * 60 * 1000 }
  return tokenCacheado.valor
}

/** paymentState de Google: 1 = pago recibido, 2 = prueba gratis activa. 0 = pago pendiente, 3 = pago diferido pendiente — ninguno de esos dos cuenta como válido todavía. */
function pagoConfirmado(paymentState: number | undefined): boolean {
  return paymentState === 1 || paymentState === 2
}

export const verificadorSinConfigurar: VerificadorGooglePlay = async ({
  packageName,
  productId,
  purchaseToken,
}: ParametrosVerificacionCompra): Promise<EstadoCompraGoogle> => {
  const credencial = leerCredencial()
  if (!credencial) throw new ErrorBillingNoConfigurado()

  const tokenAcceso = await obtenerTokenDeAcceso(credencial)
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`

  const respuesta = await fetch(url, { headers: { Authorization: `Bearer ${tokenAcceso}` } })

  // Google devuelve 404/410 para un token que no existe o ya no es válido —
  // no es un error de nuestro lado, es "esta compra no es real".
  if (respuesta.status === 404 || respuesta.status === 410) {
    return { valida: false, expiraEnISO: null }
  }

  const datos = (await respuesta.json().catch(() => null)) as
    | { expiryTimeMillis?: string; paymentState?: number }
    | null
  if (!respuesta.ok || !datos) {
    throw new ErrorBillingNoConfigurado(`Google Play respondió HTTP ${respuesta.status} al verificar la suscripción.`)
  }

  const expiraEnMs = datos.expiryTimeMillis ? Number(datos.expiryTimeMillis) : null
  const vigente = expiraEnMs !== null && expiraEnMs > Date.now()

  return {
    valida: vigente && pagoConfirmado(datos.paymentState),
    expiraEnISO: expiraEnMs !== null ? new Date(expiraEnMs).toISOString() : null,
  }
}
