/**
 * Cliente HTTP hacia server/ (el backend). Antes de Fase 10 esto NO EXISTÍA
 * — ver PLAN-MAESTRO, Fase 7 punto 4: "app/ sigue sin saber que el backend
 * existe". La conversación de voz (Fase 10) fue la primera función del
 * cliente que necesitó llamar al backend de verdad (POST /ai/conversacion) —
 * ver D-11 en PLAN-MAESTRO. Esta sesión (continuación de Fase 10, pendiente
 * #1 "bloqueante") agrega lo que faltaba para que esas llamadas autenticadas
 * tengan de dónde sacar un token real: `post()` sin autenticar (para
 * /auth/registro, /auth/login, /auth/refrescar — esas rutas no llevan
 * Authorization) y el manejo de AMBOS tokens (acceso + refresco), no solo el
 * de acceso como había quedado en la primera versión de este archivo.
 */

const CLAVE_TOKEN_ACCESO = 'mia:tokenAcceso'
const CLAVE_TOKEN_REFRESCO = 'mia:tokenRefresco'

// Vite expone las variables que empiezan con VITE_ en import.meta.env.
// Sin .env local, cae a localhost:3000 (mismo puerto por defecto que
// server/.env.example) — sirve para desarrollar contra un backend local.
// Exportado temporalmente para diagnóstico en pantalla (ver PLAN-MAESTRO,
// sección "Bug encontrado y corregido — Failed to fetch al crear cuenta" —
// el usuario no tiene forma de conectar el teléfono a una PC para ver la
// consola real, así que se muestra este valor directo en la UI del error).
// Quitar el export cuando el diagnóstico ya no haga falta.
export const URL_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export function obtenerTokenAcceso(): string | null {
  return localStorage.getItem(CLAVE_TOKEN_ACCESO)
}

export function obtenerTokenRefresco(): string | null {
  return localStorage.getItem(CLAVE_TOKEN_REFRESCO)
}

/** Se llama con la respuesta de /auth/registro, /auth/login o /auth/refrescar — siempre trae los dos tokens juntos. */
export function guardarTokens(tokenAcceso: string, tokenRefresco: string): void {
  localStorage.setItem(CLAVE_TOKEN_ACCESO, tokenAcceso)
  localStorage.setItem(CLAVE_TOKEN_REFRESCO, tokenRefresco)
}

export function borrarTokens(): void {
  localStorage.removeItem(CLAVE_TOKEN_ACCESO)
  localStorage.removeItem(CLAVE_TOKEN_REFRESCO)
}

export function haySesion(): boolean {
  return obtenerTokenAcceso() !== null
}

export class ErrorSinSesion extends Error {
  constructor() {
    super('Todavía no hay sesión iniciada.')
  }
}

export class ErrorApi extends Error {
  constructor(
    message: string,
    public codigoHttp: number,
  ) {
    super(message)
  }
}

async function procesarRespuesta<TRespuesta>(respuesta: Response): Promise<TRespuesta> {
  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    const mensaje = (datos as { error?: string } | null)?.error ?? `Error del backend (${respuesta.status})`
    throw new ErrorApi(mensaje, respuesta.status)
  }
  return datos as TRespuesta
}

/** POST sin autenticar — solo para /auth/registro, /auth/login, /auth/refrescar. */
export async function post<TRespuesta>(ruta: string, cuerpo: unknown): Promise<TRespuesta> {
  const respuesta = await fetch(`${URL_BASE}${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  })
  return procesarRespuesta<TRespuesta>(respuesta)
}

/** GET sin autenticar — hoy solo GET /planes (server/src/modules/plans/routes.ts no la protege: es un catálogo público). */
export async function get<TRespuesta>(ruta: string): Promise<TRespuesta> {
  const respuesta = await fetch(`${URL_BASE}${ruta}`)
  return procesarRespuesta<TRespuesta>(respuesta)
}

/** GET autenticado — hoy lo usa domain/planes (GET /planes, GET /planes/actual). */
export async function getAutenticado<TRespuesta>(ruta: string): Promise<TRespuesta> {
  const token = obtenerTokenAcceso()
  if (!token) {
    throw new ErrorSinSesion()
  }

  const respuesta = await fetch(`${URL_BASE}${ruta}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })

  return procesarRespuesta<TRespuesta>(respuesta)
}

/**
 * POST genérico y autenticado contra el backend. Todas las rutas protegidas
 * usadas desde el cliente son POST (ver server/src/modules/ai/routes.ts), así
 * que no hace falta soportar otros métodos todavía.
 *
 * NO reintenta sola con el token de refresco si el de acceso ya expiró (el
 * de acceso dura pocos minutos, ver server/.env.example
 * JWT_EXPIRACION_ACCESO_MIN) — eso queda pendiente, ver "Estado real de
 * Fase 10" en PLAN-MAESTRO. Hoy, si el token de acceso expiró a mitad de una
 * conversación de voz, esto lanza `ErrorApi` 401 y quien llame tiene que
 * decidir qué hacer (por ahora: mandar a `/cuenta` a iniciar sesión de nuevo).
 */
export async function postAutenticado<TRespuesta>(ruta: string, cuerpo: unknown): Promise<TRespuesta> {
  const token = obtenerTokenAcceso()
  if (!token) {
    throw new ErrorSinSesion()
  }

  const respuesta = await fetch(`${URL_BASE}${ruta}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(cuerpo),
  })

  return procesarRespuesta<TRespuesta>(respuesta)
}
