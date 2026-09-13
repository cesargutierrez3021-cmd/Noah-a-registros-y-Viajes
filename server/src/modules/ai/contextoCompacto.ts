import type { ContextoAnalisis, ProfundidadAnalisis } from './types.js'

/**
 * Arma el "contexto compacto" que se manda al proveedor de IA — punto de
 * Fase 9 (docs/FASE2-ARQUITECTURA.md, sección 3: "el backend arma el
 * contexto compacto antes de cada llamada, el cliente nunca decide qué
 * mandarle al modelo"). Función pura: no llama a ningún modelo, solo decide
 * qué tanto de `contexto` entra en el prompt y cómo se ordena.
 *
 * "Compacto" acá significa dos cosas concretas:
 *  1. Nunca manda el objeto crudo tal cual — lo convierte a líneas de texto
 *     cortas (menos tokens que JSON con nombres de campo repetidos).
 *  2. En profundidad 'normal' limita el historial a los últimos 8 períodos;
 *     en 'profundo' no lo limita — quien pida análisis profundo está
 *     aceptando un prompt más largo (y más caro) a propósito.
 */
export function armarContextoCompacto(contexto: ContextoAnalisis | undefined, profundidad: ProfundidadAnalisis): string {
  if (!contexto) return 'Sin datos del conductor disponibles para esta pregunta.'

  const bloques: string[] = []

  if (contexto.hoy) {
    const { kmTotales, ingresos, cantidadViajes } = contexto.hoy
    bloques.push(`Hoy: ${cantidadViajes} viajes, ${kmTotales} km, ${ingresos} de ingresos.`)
  }

  if (contexto.semana) {
    const { kmTotales, ingresos, cantidadViajes } = contexto.semana
    bloques.push(`Esta semana: ${cantidadViajes} viajes, ${kmTotales} km, ${ingresos} de ingresos.`)
  }

  if (contexto.mantenimiento && contexto.mantenimiento.length > 0) {
    const vencidos = contexto.mantenimiento.filter((i) => i.vencido).map((i) => i.nombre)
    const proximos = contexto.mantenimiento.filter((i) => i.proximoAVencer).map((i) => i.nombre)
    if (vencidos.length > 0) bloques.push(`Mantenimiento vencido: ${vencidos.join(', ')}.`)
    if (proximos.length > 0) bloques.push(`Mantenimiento próximo a vencer: ${proximos.join(', ')}.`)
  }

  if (contexto.historial && contexto.historial.length > 0) {
    const limite = profundidad === 'profundo' ? contexto.historial.length : 8
    const puntos = contexto.historial.slice(0, limite)
    const lineas = puntos.map((p) => `${p.clave}: ${p.resumen.cantidadViajes} viajes, ${p.resumen.kmTotales} km, ${p.resumen.ingresos} ingresos`)
    bloques.push(`Historial (${puntos.length} período${puntos.length === 1 ? '' : 's'}):\n${lineas.join('\n')}`)
  }

  if (bloques.length === 0) {
    return 'El conductor no mandó datos concretos (hoy/semana/mantenimiento/historial) con esta pregunta.'
  }

  return bloques.join('\n')
}
