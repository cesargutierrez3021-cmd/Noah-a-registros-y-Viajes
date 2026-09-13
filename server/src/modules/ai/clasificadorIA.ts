import type { ResultadoIntent } from './types.js'

/**
 * Clasificador de respaldo con IA — punto 2 de "Estado real de Fase 8" en PLAN-MAESTRO.
 * Se llama SOLO cuando ninguna regla determinística matcheó.
 *
 * Se deja como interfaz inyectable a propósito: qué proveedor de IA se usa sigue sin
 * decidirse (PLAN-MAESTRO, "Qué falta decidir" — "Proveedor de IA definitivo para el
 * proxy del backend (Fase 9)", la misma pregunta aplica aquí). No correspondía asumir un
 * proveedor en este corte, así que el router (`router.ts`) depende de esta interfaz y no
 * de una implementación concreta — cuando se decida el proveedor, se escribe una función
 * nueva con esta misma forma y se pasa como argumento, sin tocar el resto del router.
 */
export type ClasificadorIntentIA = (textoUsuario: string) => Promise<ResultadoIntent>

/**
 * Implementación por defecto: NO llama a ningún modelo todavía. Devuelve siempre
 * 'no_reconocida' — desde afuera se ve exactamente igual que antes de este punto (cuando
 * el router no tenía clasificador de respaldo), pero ahora el hueco donde va la llamada
 * real ya existe y está aislado en un solo lugar.
 */
export const clasificadorSinImplementar: ClasificadorIntentIA = async () => ({
  intencion: 'no_reconocida',
  resueltaPorRegla: false,
  confianza: 0,
  respuesta: null,
})
