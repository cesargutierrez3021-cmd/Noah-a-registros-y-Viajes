import type { ContextoIntent, ContextoMantenimientoItem, Intencion } from './types.js'

/**
 * Arma la respuesta en texto para las intenciones que saben usar `contexto` — punto 3 de
 * "Estado real de Fase 8". Función pura: no consulta base de datos ni hace red, solo toma
 * lo que el cliente ya calculó localmente y lo convierte en una frase.
 *
 * Si el cliente no mandó el dato que esa intención necesita (o no mandó `contexto` en
 * absoluto), devuelve null — la ruta igual responde con la intención detectada, solo que
 * sin texto armado, tal como se comportaba antes de este punto.
 */
export function armarRespuesta(intencion: Intencion, contexto?: ContextoIntent): string | null {
  if (!contexto) return null

  switch (intencion) {
    case 'km_hoy':
      if (!contexto.hoy) return null
      return `Hoy llevas ${formatearKm(contexto.hoy.kmTotales)} km en ${contarViajes(contexto.hoy.cantidadViajes)}.`

    case 'ingresos_hoy':
      if (!contexto.hoy) return null
      return `Hoy llevas ${formatearDinero(contexto.hoy.ingresos)} en ${contarViajes(contexto.hoy.cantidadViajes)}.`

    case 'viajes_hoy':
      if (!contexto.hoy) return null
      return `Hoy llevas ${contarViajes(contexto.hoy.cantidadViajes)}.`

    case 'resumen_semana':
      if (!contexto.semana) return null
      return `Esta semana llevas ${formatearKm(contexto.semana.kmTotales)} km y ${formatearDinero(contexto.semana.ingresos)} en ${contarViajes(contexto.semana.cantidadViajes)}.`

    case 'mantenimientos_pendientes':
      return armarRespuestaMantenimiento(contexto.mantenimiento)

    default:
      return null
  }
}

function armarRespuestaMantenimiento(items?: ContextoMantenimientoItem[]): string | null {
  if (!items) return null

  const vencidos = items.filter((i) => i.vencido)
  const proximos = items.filter((i) => i.proximoAVencer)

  if (vencidos.length === 0 && proximos.length === 0) {
    return 'No tienes ningún mantenimiento vencido ni próximo a vencer.'
  }

  const partes: string[] = []
  if (vencidos.length > 0) partes.push(`vencido: ${vencidos.map((i) => i.nombre).join(', ')}`)
  if (proximos.length > 0) partes.push(`próximo a vencer: ${proximos.map((i) => i.nombre).join(', ')}`)
  return `Tienes ${partes.join(' — ')}.`
}

function contarViajes(cantidad: number): string {
  return `${cantidad} viaje${cantidad === 1 ? '' : 's'}`
}

function formatearKm(km: number): string {
  return km.toLocaleString('es-CO', { maximumFractionDigits: 1 })
}

function formatearDinero(valor: number): string {
  return valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}
