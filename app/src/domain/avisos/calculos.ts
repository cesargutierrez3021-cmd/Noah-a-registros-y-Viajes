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

/**
 * Sin fecha de vencimiento real guardada en Deuda (solo `cuotaProgramada`
 * con frecuencia, no un ancla de fecha) — se usa `creadaEnISO` como primera
 * cuota y se proyecta hacia adelante por la frecuencia hasta encontrar la
 * próxima ocurrencia. Es una aproximación honesta, no una fecha exacta que
 * el usuario haya confirmado — si `domain/deudas` gana un campo real de
 * "próxima fecha de pago" más adelante, esta función se simplifica.
 */
export function proximaFechaCuotaDeuda(deuda: Deuda, ahoraMs: number = Date.now()): Date | null {
  if (!deuda.cuotaProgramada || deuda.saldoActual <= 0) return null
  const intervaloDias = { semanal: 7, quincenal: 15, mensual: 30 }[deuda.cuotaProgramada.frecuencia]
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

function proximaFechaConceptoFijo(concepto: ConceptoFijo, ahoraMs: number): Date {
  const ahora = new Date(ahoraMs)
  const diaTope = (año: number, mes: number) => new Date(año, mes + 1, 0).getDate()
  let año = ahora.getFullYear()
  let mes = ahora.getMonth()
  let dia = Math.min(concepto.diaDelMes, diaTope(año, mes))
  let candidata = new Date(año, mes, dia)
  if (candidata.getTime() < new Date(año, mes, ahora.getDate()).getTime()) {
    mes += 1
    if (mes > 11) { mes = 0; año += 1 }
    dia = Math.min(concepto.diaDelMes, diaTope(año, mes))
    candidata = new Date(año, mes, dia)
  }
  return candidata
}

export function calcularAvisosHogar(conceptos: ConceptoFijo[], ahoraMs: number = Date.now()): Aviso[] {
  const avisos: Aviso[] = []
  for (const concepto of conceptos) {
    if (!concepto.activo) continue
    const fecha = proximaFechaConceptoFijo(concepto, ahoraMs)
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
