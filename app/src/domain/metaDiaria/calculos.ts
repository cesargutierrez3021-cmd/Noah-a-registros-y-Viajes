import type { ConceptoFijo } from '../hogar/types'
import type { CuotaProgramada, Deuda, FrecuenciaCuota } from '../deudas/types'
import type { MetaAhorro } from '../ahorro/types'
import type { ItemMantenimiento } from '../mantenimiento/types'
import { tarifaDiariaItem } from '../mantenimiento/reglas'
import { fechaNegocioISO, ultimoDiaDelMes } from '../../lib/fechas'
import type { DesgloseMetaBaseDiaria, ResultadoMetaDiaria } from './types'

/** Cuántas veces cae el día de semana `diaObjetivo` (0=domingo..6=sábado, igual que Date.getDay()) dentro del mes [año, mes]. */
function ocurrenciasDiaSemanaEnMes(año: number, mes: number, diaObjetivo: number): number {
  const dias = ultimoDiaDelMes(año, mes)
  let cuenta = 0
  for (let d = 1; d <= dias; d++) {
    if (new Date(año, mes, d).getDay() === diaObjetivo) cuenta++
  }
  return cuenta
}

/**
 * 2026-09-16, corrección de un bug real reportado por el usuario ("puse
 * muchas deudas y muchos gastos y no aumentaba la meta diaria... recuerda
 * que la meta diaria es en balance AL MES"): la ronda anterior agregó el
 * ancla real de cada cuota (`diaDelMes`/`diasDelMes`/`diaDeLaSemana`, ver
 * domain/deudas/types.ts) para las alertas de vencimiento, pero
 * `calcularMetaBaseDiaria` nunca llegó a USARLA — seguía prorrateando con
 * un divisor genérico (`monto / 7` para semanal, `/15` quincenal, `/30`
 * mensual) sin mirar cuántas veces cae de verdad la cuota en el mes actual.
 * Esta función cuenta las ocurrencias REALES dentro del mes de `ahora`:
 * - mensual   → siempre 1 vez al mes (con o sin ancla puesta).
 * - quincenal → siempre 2 veces al mes (las dos fechas elegidas).
 * - semanal   → 4 o 5 veces, según cuántos [diaDeLaSemana] caen ese mes —
 *   exactamente el ejemplo del usuario ("cuántas semanas del 1 al 30 o 31").
 *   Sin ancla puesta (deuda de antes de ese campo), cae a una aproximación
 *   genérica de 4 veces al mes.
 */
function ocurrenciasCuotaEnMes(cuota: CuotaProgramada, año: number, mes: number): number {
  if (cuota.frecuencia === 'mensual') return 1
  if (cuota.frecuencia === 'quincenal') return 2
  // semanal
  if (cuota.diaDeLaSemana != null) return ocurrenciasDiaSemanaEnMes(año, mes, cuota.diaDeLaSemana)
  return 4
}

/** Mismo criterio que `ocurrenciasCuotaEnMes`, pero para el aporte planeado de Ahorro — sin ancla de día (ver domain/ahorro/types.ts, AportePlaneado): "las semanas que alcancen en el mes", sin fijar cuál día de la semana. */
function ocurrenciasFrecuenciaEnMes(frecuencia: FrecuenciaCuota, año: number, mes: number): number {
  if (frecuencia === 'mensual') return 1
  if (frecuencia === 'quincenal') return 2
  return Math.floor(ultimoDiaDelMes(año, mes) / 7)
}

/**
 * Cuánto cuesta "un día normal" — la meta ANTES de sumarle el arrastre de
 * días anteriores sin cubrir (eso lo hace `calcularMetaDiaria`, más abajo).
 * Cada fuente se calcula como un TOTAL DEL MES CALENDARIO ACTUAL (usando
 * ocurrencias reales, ver arriba) y se divide entre los días reales de ESE
 * mes — no un promedio de 30 días fijo, D-10: función pura, recibe todo
 * como parámetro (incluido `ahora`, para poder probarla con una fecha fija).
 */
export function calcularMetaBaseDiaria(input: {
  conceptosFijosActivos: ConceptoFijo[]
  deudasActivas: Deuda[]
  metasAhorroEnProgreso: MetaAhorro[]
  itemsMantenimiento: ItemMantenimiento[]
  kmPromedioDiario: number
  presupuestoGasolinaMensual: number | null
  ahora?: Date
}): DesgloseMetaBaseDiaria {
  const ahora = input.ahora ?? new Date()
  const año = ahora.getFullYear()
  const mes = ahora.getMonth()
  const diasDelMesActual = ultimoDiaDelMes(año, mes)

  const totalHogarMes = input.conceptosFijosActivos.reduce((acc, c) => acc + c.montoEsperado, 0)
  const hogar = totalHogarMes / diasDelMesActual

  const totalDeudasMes = input.deudasActivas.reduce((acc, d) => {
    if (!d.cuotaProgramada) return acc
    return acc + d.cuotaProgramada.monto * ocurrenciasCuotaEnMes(d.cuotaProgramada, año, mes)
  }, 0)
  const deudas = totalDeudasMes / diasDelMesActual

  const totalAhorroMes = input.metasAhorroEnProgreso.reduce((acc, m) => {
    if (!m.aportePlaneado) return acc
    return acc + m.aportePlaneado.monto * ocurrenciasFrecuenciaEnMes(m.aportePlaneado.frecuencia, año, mes)
  }, 0)
  const ahorro = totalAhorroMes / diasDelMesActual

  const mantenimiento = input.itemsMantenimiento
    .filter((i) => i.fijo && i.costoAproximado)
    .reduce((acc, i) => acc + tarifaDiariaItem(i, input.kmPromedioDiario), 0)

  const gasolina = (input.presupuestoGasolinaMensual ?? 0) / diasDelMesActual

  return { hogar, deudas, ahorro, mantenimiento, gasolina, total: hogar + deudas + ahorro + mantenimiento + gasolina }
}

/**
 * 2026-09-16, pedido explícito del usuario: "si un día no se cubre, al otro
 * día ese faltante se tiene que ir reajustando." Ventana de 30 días — no se
 * arrastra déficit para siempre: un mes sin cubrir del todo no debería
 * perseguir al conductor indefinidamente, y calcular sobre TODO el
 * historial (a veces meses) con la tarifa de HOY (no había forma de guardar
 * la tarifa que regía cada día pasado) se volvería una aproximación cada
 * vez menos honesta cuanto más atrás se mire. 30 días alcanza para que el
 * ajuste día-a-día sea real sin arrastrar algo de hace meses.
 */
const VENTANA_DIAS_DEFICIT = 30

/** Claves YYYY-MM-DD (Bogotá) de ayer hacia atrás, hasta `ventanaDias` días o el primer viaje registrado (lo que sea más reciente) — no se inventa déficit de antes de que el conductor empezara a usar la app. */
export function generarClavesDiasAnteriores(primerViajeISO: string | null, ventanaDias: number = VENTANA_DIAS_DEFICIT): string[] {
  if (!primerViajeISO) return []
  const primerDiaClave = fechaNegocioISO(new Date(primerViajeISO))
  const claves: string[] = []
  for (let i = ventanaDias; i >= 1; i--) {
    const clave = fechaNegocioISO(new Date(Date.now() - i * 86_400_000))
    if (clave < primerDiaClave) continue
    claves.push(clave)
  }
  return claves
}

/**
 * Reconstruye el déficit acumulado rodando día a día sobre la ventana
 * reciente (más viejo primero): cada día que no alcanzó a cubrir su meta
 * (metaBase + lo que ya arrastraba) le suma el faltante al día siguiente;
 * un día que sí cubre resetea el arrastre a 0. Usa la tarifa de HOY para
 * los días pasados también (no hay snapshot histórico de la meta día a
 * día) — una aproximación razonable, documentada, no una réplica exacta.
 */
export function calcularMetaDiaria(
  metaBase: number,
  ingresosPorDiaClave: Map<string, number>,
  clavesDiasAnteriores: string[],
  ingresoHoy: number,
): ResultadoMetaDiaria {
  let deficit = 0
  for (const clave of clavesDiasAnteriores) {
    const metaDelDia = metaBase + deficit
    const ingresoDelDia = ingresosPorDiaClave.get(clave) ?? 0
    deficit = Math.max(0, metaDelDia - ingresoDelDia)
  }

  const metaDeHoy = metaBase + deficit
  const progresoPorcentaje = metaDeHoy <= 0 ? 100 : Math.min(100, (ingresoHoy / metaDeHoy) * 100)

  return {
    metaBase,
    deficitAcumulado: deficit,
    metaDeHoy,
    ingresoHoy,
    progresoPorcentaje,
    cubierta: ingresoHoy >= metaDeHoy,
  }
}
