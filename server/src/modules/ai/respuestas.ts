import type { ContextoDesgloseItem, ContextoIntent, ContextoMantenimientoItem, Intencion } from './types.js'

/**
 * Arma la respuesta en texto para las intenciones que saben usar `contexto` — punto 3 de
 * "Estado real de Fase 8". Función pura: no consulta base de datos ni hace red, solo toma
 * lo que el cliente ya calculó localmente y lo convierte en una frase.
 *
 * Si el cliente no mandó el dato que esa intención necesita (o no mandó `contexto` en
 * absoluto), devuelve null — la ruta igual responde con la intención detectada, solo que
 * sin texto armado, tal como se comportaba antes de este punto.
 */
/**
 * Bloque 1, ítem 2 (bug "MIA no responde"): esta función ANTES devolvía
 * `null` cuando faltaba el dato (ej. `contexto.hoy` no llegó), y
 * `conversacion.ts` interpretaba ese `null` como "la regla no resolvió
 * nada" — cayendo al proxy de IA (stub sin configurar, 503). Eso rompía
 * incluso preguntas que el Intent Router SÍ reconoce perfectamente
 * ("cuántos viajes hice hoy" → intención `viajes_hoy`), solo porque el dato
 * de contexto no llegó completo esa vez. Ahora: si el router reconoció la
 * intención, SIEMPRE hay una respuesta hablable — con datos reales si
 * llegaron, o un aviso claro de qué falta si no. Nunca más null para una
 * intención reconocida — así `conversacion.ts` nunca tiene motivo real para
 * caer al proxy de IA cuando una regla ya resolvió la pregunta.
 */
export function armarRespuesta(intencion: Intencion, contexto?: ContextoIntent): string {
  switch (intencion) {
    case 'km_hoy':
      if (!contexto?.hoy) return sinDatos('de hoy')
      return `Hoy llevas ${formatearKm(contexto.hoy.kmTotales)} km en ${contarViajes(contexto.hoy.cantidadViajes)}.`

    case 'ingresos_hoy':
      if (!contexto?.hoy) return sinDatos('de hoy')
      return `Hoy llevas ${formatearDinero(contexto.hoy.ingresos)} en ${contarViajes(contexto.hoy.cantidadViajes)}.`

    case 'viajes_hoy':
      if (!contexto?.hoy) return sinDatos('de hoy')
      return `Hoy llevas ${contarViajes(contexto.hoy.cantidadViajes)}.`

    case 'resumen_semana':
      if (!contexto?.semana) return sinDatos('de esta semana')
      return `Esta semana llevas ${formatearKm(contexto.semana.kmTotales)} km y ${formatearDinero(contexto.semana.ingresos)} en ${contarViajes(contexto.semana.cantidadViajes)}.`

    case 'mantenimientos_pendientes':
      return armarRespuestaMantenimiento(contexto?.mantenimiento)

    case 'mejor_zona':
      return armarRespuestaMejorDe(contexto?.porZona, 'zona', 'donde más recoges y mejor te va')

    case 'mejor_horario':
      return armarRespuestaMejorDe(contexto?.porFranja, 'horario', 'en el que mejor te va')

    default:
      // No debería pasar nunca en la práctica: router.ts solo llama a esta
      // función con `regla.intencion`, y `ReglaIntent` excluye 'no_reconocida'
      // por tipo. Se deja un mensaje real (no null) igual, por si acaso.
      return 'No entendí bien esa pregunta.'
  }
}

function sinDatos(periodo: string): string {
  return `Todavía no tengo tus datos ${periodo} cargados. Abre la app un momento para que se sincronicen y vuelve a preguntarme.`
}

function armarRespuestaMantenimiento(items?: ContextoMantenimientoItem[]): string {
  if (!items) return sinDatos('de mantenimiento')

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

/**
 * Compartida por 'mejor_zona' y 'mejor_horario' — mismo cálculo (el de mayor
 * ingreso total), solo cambia la palabra ("zona"/"horario") y el contexto
 * que se le pasa. No asume que `items` ya viene ordenado por ingreso (aunque
 * desglosePorZona sí lo hace) — busca el máximo acá mismo, más robusto que
 * confiar en el orden de quien llama.
 */
function armarRespuestaMejorDe(items: ContextoDesgloseItem[] | undefined, etiqueta: string, calificativo: string): string {
  if (!items) return sinDatos(etiqueta === 'zona' ? 'de zonas' : 'de horarios')
  const conViajes = items.filter((i) => i.resumen.cantidadViajes > 0)
  if (conViajes.length === 0) return `Todavía no tengo viajes suficientes para saber tu mejor ${etiqueta}.`

  const mejor = conViajes.reduce((a, b) => (b.resumen.ingresos > a.resumen.ingresos ? b : a))
  return `Tu mejor ${etiqueta} es ${mejor.clave} — ${calificativo}, con ${formatearDinero(mejor.resumen.ingresos)} en ${contarViajes(mejor.resumen.cantidadViajes)}.`
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
