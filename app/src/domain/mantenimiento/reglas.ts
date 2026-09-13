import type { EstadoAlerta, ItemMantenimiento, PlantillaItemMantenimiento } from './types'

/**
 * Catálogo de mantenimientos comunes para un carro de uso intensivo (conductor
 * de plataforma). Son valores de referencia general, no una recomendación del
 * fabricante — el usuario puede ajustarlos o agregar los suyos propios
 * (ver requisito "Ambos" resuelto para Fase 6 en PLAN-MAESTRO).
 */
export const CATALOGO_MANTENIMIENTO: PlantillaItemMantenimiento[] = [
  { nombre: 'Cambio de aceite y filtro', criterio: 'km_o_dias', intervaloKm: 5000, intervaloDias: 180 },
  { nombre: 'Rotación de llantas', criterio: 'km', intervaloKm: 10000, intervaloDias: null },
  { nombre: 'Pastillas de freno', criterio: 'km', intervaloKm: 20000, intervaloDias: null },
  { nombre: 'Filtro de aire', criterio: 'km', intervaloKm: 15000, intervaloDias: null },
  { nombre: 'Alineación y balanceo', criterio: 'km', intervaloKm: 10000, intervaloDias: null },
  { nombre: 'Batería', criterio: 'dias', intervaloKm: null, intervaloDias: 730 },
  { nombre: 'SOAT', criterio: 'dias', intervaloKm: null, intervaloDias: 365 },
  { nombre: 'Revisión técnico-mecánica', criterio: 'dias', intervaloKm: null, intervaloDias: 365 },
]

/** Margen de aviso antes de vencer: dentro de esto se marca "próximo a vencer". */
const MARGEN_AVISO_KM = 500
const MARGEN_AVISO_DIAS = 15

function diasEntre(desdeISO: string, hastaMs: number): number {
  const desdeMs = new Date(desdeISO).getTime()
  return Math.round((hastaMs - desdeMs) / (1000 * 60 * 60 * 24))
}

/**
 * Calcula el estado de alerta de un ítem contra el km actual real del
 * vehículo. El km actual SIEMPRE viene de domain/viajes (suma de
 * distancia.kmTotalesReales) — este módulo nunca lo calcula por su cuenta.
 */
export function calcularEstadoAlerta(item: ItemMantenimiento, kmActual: number, ahoraMs: number = Date.now()): EstadoAlerta {
  const kmFaltantes =
    item.criterio === 'km' || item.criterio === 'km_o_dias'
      ? item.ultimoKm + (item.intervaloKm ?? 0) - kmActual
      : null

  const diasTranscurridos = diasEntre(item.ultimaFechaISO, ahoraMs)
  const diasFaltantes =
    item.criterio === 'dias' || item.criterio === 'km_o_dias'
      ? (item.intervaloDias ?? 0) - diasTranscurridos
      : null

  const vencidoPorKm = kmFaltantes !== null && kmFaltantes <= 0
  const vencidoPorDias = diasFaltantes !== null && diasFaltantes <= 0
  const vencido = vencidoPorKm || vencidoPorDias

  const proximoPorKm = kmFaltantes !== null && kmFaltantes > 0 && kmFaltantes <= MARGEN_AVISO_KM
  const proximoPorDias = diasFaltantes !== null && diasFaltantes > 0 && diasFaltantes <= MARGEN_AVISO_DIAS

  return {
    item,
    kmFaltantes,
    diasFaltantes,
    vencido,
    proximoAVencer: !vencido && (proximoPorKm || proximoPorDias),
  }
}
