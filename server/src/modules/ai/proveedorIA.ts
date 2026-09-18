/**
 * Proxy de IA — Fase 9. Mismo patrón que `clasificadorIA.ts` (Fase 8): interfaz
 * inyectable, sin implementación real, porque el proveedor de IA sigue sin
 * decidirse (PLAN-MAESTRO, "Qué falta decidir" — "Proveedor de IA definitivo
 * para el proxy del backend (Fase 9)"). No correspondía elegir uno por mi
 * cuenta en este corte.
 *
 * A diferencia del clasificador de respaldo de Fase 8 (que se degrada
 * silenciosamente a 'no_reconocida' cuando no hay proveedor — total, ya
 * existía ese resultado desde antes), acá NO tiene sentido devolver una
 * respuesta falsa disfrazada de análisis: el usuario pidió explícitamente
 * un análisis con IA, así que el stub lanza un error tipado en vez de
 * inventar una respuesta. `errorHandler.ts` lo traduce a un 503 claro.
 */

/**
 * `prompt` ya viene armado por `contextoCompacto.ts` + la pregunta del
 * usuario — el proveedor solo tiene que mandarlo al modelo y devolver el
 * texto de la respuesta.
 */
export type ProveedorIA = (prompt: string) => Promise<string>

export class ErrorProveedorIANoConfigurado extends Error {
  codigoHttp = 503

  constructor() {
    super('El proveedor de IA todavía no está configurado en el backend (Fase 9, proveedor sin decidir — ver PLAN-MAESTRO).')
  }
}

/**
 * Implementación por defecto: no llama a ningún modelo, lanza el error de
 * arriba. Cuando se decida el proveedor (PLAN-MAESTRO, "Qué falta decidir"),
 * se escribe una función nueva con esta misma forma
 * (`(prompt) => Promise<string>`) y se pasa como argumento — el resto del
 * proxy (`analisis.ts`) no debería tener que cambiar.
 */
export const proveedorSinImplementar: ProveedorIA = async () => {
  throw new ErrorProveedorIANoConfigurado()
}
