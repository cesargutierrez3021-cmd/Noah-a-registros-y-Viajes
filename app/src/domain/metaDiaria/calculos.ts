import type { ConceptoFijo } from '../hogar/types'
import type { Deuda, FrecuenciaCuota } from '../deudas/types'
import type { MetaAhorro } from '../ahorro/types'
import type { ItemMantenimiento } from '../mantenimiento/types'
import { tarifaDiariaItem } from '../mantenimiento/reglas'
import { fechaNegocioISO } from '../../lib/fechas'
import type { DesgloseMetaBaseDiaria, ResultadoMetaDiaria } from './types'

const DIAS_MES = 30

function diasPorFrecuencia(frecuencia: FrecuenciaCuota): number {
  if (frecuencia === 'semanal') return 7
  if (frecuencia === 'quincenal') return 15
  return DIAS_MES
}

/**
 * Cuánto cuesta "un día normal" — la meta ANTES de sumarle el arrastre de
 * días anteriores sin cubrir (eso lo hace `calcularMetaDiaria`, más abajo).
 * Cada fuente se prorratea a una tarifa diaria con su propio criterio (mes
 * calendario para hogar/gasolina, la frecuencia real de la cuota para
 * deudas, el intervalo del ítem para mantenimiento) — D-10: función pura,
 * recibe todo como parámetro, no importa ningún store.
 */
export function calcularMetaBaseDiaria(input: {
  conceptosFijosActivos: ConceptoFijo[]
  deudasActivas: Deuda[]
  metasAhorroEnProgreso: MetaAhorro[]
  itemsMantenimiento: ItemMantenimiento[]
  kmPromedioDiario: number
  presupuestoGasolinaMensual: number | null
}): DesgloseMetaBaseDiaria {
  const hogar = input.conceptosFijosActivos.reduce((acc, c) => acc + c.montoEsperado, 0) / DIAS_MES

  const deudas = input.deudasActivas.reduce((acc, d) => {
    if (!d.cuotaProgramada) return acc
    return acc + d.cuotaProgramada.monto / diasPorFrecuencia(d.cuotaProgramada.frecuencia)
  }, 0)

  const ahorro = input.metasAhorroEnProgreso.reduce((acc, m) => acc + (m.aporteMensualObjetivo ?? 0), 0) / DIAS_MES

  const mantenimiento = input.itemsMantenimiento
    .filter((i) => i.fijo && i.costoAproximado)
    .reduce((acc, i) => acc + tarifaDiariaItem(i, input.kmPromedioDiario), 0)

  const gasolina = (input.presupuestoGasolinaMensual ?? 0) / DIAS_MES

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
