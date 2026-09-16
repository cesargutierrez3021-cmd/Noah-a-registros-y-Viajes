import type { Aviso } from './types'
import type { EstadoAlerta } from '../mantenimiento/types'
import type { Deuda } from '../deudas/types'
import type { ConceptoFijo } from '../hogar/types'

/** Mismo margen que usa domain/mantenimiento/reglas.ts para deudas y gastos fijos — "próximo a vencer" dentro de esta cantidad de días. */
const MARGEN_AVISO_DIAS = 3

const MS_POR_DIA = 1000 * 60 * 60 * 24

function diasHasta(fecha: Date, ahoraMs: number): number {
  return Math.round((fecha.getTime() - ahoraMs) / MS_POR_DIA)
}

export function calcularAvisosMantenimiento(alertas: EstadoAlerta[]): Aviso[] {
  return alertas
    .filter((a) => a.vencido || a.proximoAVencer)
    .map((a) => ({
      id: `mantenimiento-${a.item.id}`,
      tipo: 'mantenimiento' as const,
      severidad: a.vencido ? ('vencido' as const) : ('proximo' as const),
      titulo: a.item.nombre,
      detalle: a.vencido
        ? 'Vencido — revisa cuándo puedas hacerlo.'
        : a.kmFaltantes !== null && a.kmFaltantes > 0
          ? `Faltan ${Math.round(a.kmFaltantes)} km.`
          : a.diasFaltantes !== null
            ? `Faltan ${a.diasFaltantes} días.`
            : 'Se acerca la fecha.',
    }))
}

/** Próxima fecha (a partir de `ahora`, inclusive) en que cae el día `dia` del mes — recorta al último día real si el mes es más corto. Reutilizada por deudas y por Hogar (D-18: una sola función "próximo día del mes", no dos). */
function proximoDiaDelMes(ahora: Date, dia: number): Date {
  const diaTope = (año: number, mes: number) => new Date(año, mes + 1, 0).getDate()
  let año = ahora.getFullYear()
  let mes = ahora.getMonth()
  let d = Math.min(dia, diaTope(año, mes))
  let candidata = new Date(año, mes, d)
  if (candidata.getTime() < new Date(año, mes, ahora.getDate()).getTime()) {
    mes += 1
    if (mes > 11) { mes = 0; año += 1 }
    d = Math.min(dia, diaTope(año, mes))
    candidata = new Date(año, mes, d)
  }
  return candidata
}

/** Próximo día de la semana (0=domingo..6=sábado, igual que Date.getDay()) a partir de `ahora`, inclusive. */
function proximoDiaDeSemana(ahora: Date, diaObjetivo: number): Date {
  const resultado = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const diff = (diaObjetivo - resultado.getDay() + 7) % 7
  resultado.setDate(resultado.getDate() + diff)
  return resultado
}

/**
 * 2026-09-15, pedido explícito del usuario: "hay que ponerle fecha límite...
 * si no, ¿cómo me va a emitir la alerta?" — `Deuda.fechaLimiteISO` (real,
 * puesta a mano por el conductor) es la fuente de verdad cuando existe.
 *
 * 2026-09-16 (misma sesión, corrección posterior): si no hay fecha límite
 * pero sí `cuotaProgramada` CON ancla puesta (`diaDelMes`/`diasDelMes`/
 * `diaDeLaSemana`, según la frecuencia — ver el comentario largo en
 * domain/deudas/types.ts), se calcula la próxima ocurrencia REAL de esa
 * ancla — ya no una aproximación contando intervalos de calendario desde
 * que se cargó la deuda. Si la cuota es quincenal, se toma la más próxima
 * de las dos fechas (`diasDelMes`). Solo si no hay ancla puesta (deudas con
 * cuota programada de antes de este campo, D-16) cae de vuelta a la
 * aproximación vieja, para no dejarlas sin ningún aviso de un día para otro.
 */
export function proximaFechaCuotaDeuda(deuda: Deuda, ahoraMs: number = Date.now()): Date | null {
  if (deuda.saldoActual <= 0) return null
  if (deuda.fechaLimiteISO) return new Date(deuda.fechaLimiteISO)
  if (!deuda.cuotaProgramada) return null

  const cuota = deuda.cuotaProgramada
  const ahora = new Date(ahoraMs)

  if (cuota.frecuencia === 'mensual' && cuota.diaDelMes != null) {
    return proximoDiaDelMes(ahora, cuota.diaDelMes)
  }
  if (cuota.frecuencia === 'quincenal' && cuota.diasDelMes) {
    const [d1, d2] = cuota.diasDelMes
    const f1 = proximoDiaDelMes(ahora, d1)
    const f2 = proximoDiaDelMes(ahora, d2)
    return f1.getTime() <= f2.getTime() ? f1 : f2
  }
  if (cuota.frecuencia === 'semanal' && cuota.diaDeLaSemana != null) {
    return proximoDiaDeSemana(ahora, cuota.diaDeLaSemana)
  }

  // Sin ancla puesta (deuda de antes de este campo) — misma aproximación de antes.
  const intervaloDias = { semanal: 7, quincenal: 15, mensual: 30 }[cuota.frecuencia]
  let fechaMs = new Date(deuda.creadaEnISO).getTime()
  // Tope de iteraciones por si `creadaEnISO` quedó en una fecha rara — nunca debería hacer falta en la práctica.
  for (let i = 0; i < 10_000 && fechaMs < ahoraMs; i++) fechaMs += intervaloDias * MS_POR_DIA
  return new Date(fechaMs)
}

export function calcularAvisosDeudas(deudas: Deuda[], ahoraMs: number = Date.now()): Aviso[] {
  const avisos: Aviso[] = []
  for (const deuda of deudas) {
    const fecha = proximaFechaCuotaDeuda(deuda, ahoraMs)
    if (!fecha) continue
    const dias = diasHasta(fecha, ahoraMs)
    if (dias > MARGEN_AVISO_DIAS) continue
    avisos.push({
      id: `deuda-${deuda.id}-${fecha.toISOString().slice(0, 10)}`,
      tipo: 'deuda',
      severidad: dias <= 0 ? 'vencido' : 'proximo',
      titulo: deuda.nombre,
      detalle: dias <= 0 ? 'La cuota ya se venció.' : dias === 0 ? 'La cuota vence hoy.' : `La cuota vence en ${dias} día${dias === 1 ? '' : 's'}.`,
    })
  }
  return avisos
}

export function calcularAvisosHogar(conceptos: ConceptoFijo[], ahoraMs: number = Date.now()): Aviso[] {
  const avisos: Aviso[] = []
  for (const concepto of conceptos) {
    if (!concepto.activo) continue
    const fecha = proximoDiaDelMes(new Date(ahoraMs), concepto.diaDelMes)
    const dias = diasHasta(fecha, ahoraMs)
    if (dias > MARGEN_AVISO_DIAS) continue
    avisos.push({
      id: `hogar-${concepto.id}-${fecha.toISOString().slice(0, 10)}`,
      tipo: 'hogar',
      severidad: dias <= 0 ? 'vencido' : 'proximo',
      titulo: concepto.nombre,
      detalle: dias <= 0 ? 'Ya debería estar pagado este mes.' : dias === 0 ? 'Vence hoy.' : `Vence en ${dias} día${dias === 1 ? '' : 's'}.`,
    })
  }
  return avisos
}
