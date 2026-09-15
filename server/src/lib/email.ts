/**
 * Envío de email — hoy solo lo usa "olvidé mi contraseña"
 * (modules/auth/service.ts). Mismo patrón que proveedorIA.ts: interfaz
 * simple, sin dependencia nueva (un fetch a la API HTTP de Resend), y falla
 * explícito si no está configurado en vez de fingir que el email se mandó.
 *
 * Se eligió Resend por ser la opción más simple de integrar sin SDK (un
 * POST con fetch) y con plan gratuito suficiente para el volumen de un
 * "olvidé mi contraseña" — no hay pasarela de email propia, igual que D-6
 * decidió no tener pasarela de pago propia.
 */

export class ErrorEmailNoConfigurado extends Error {
  codigoHttp = 503

  constructor() {
    super('El envío de email todavía no está configurado en el backend (falta RESEND_API_KEY).')
  }
}

export async function enviarEmail(destinatario: string, asunto: string, textoPlano: string): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new ErrorEmailNoConfigurado()

  const remitente = process.env.RESEND_FROM_EMAIL ?? 'MIA <onboarding@resend.dev>'

  const respuesta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from: remitente, to: destinatario, subject: asunto, text: textoPlano }),
  })

  if (!respuesta.ok) {
    const detalle = (await respuesta.json().catch(() => null)) as { message?: string } | null
    throw new Error(`No se pudo enviar el email (${detalle?.message ?? `HTTP ${respuesta.status}`})`)
  }
}
