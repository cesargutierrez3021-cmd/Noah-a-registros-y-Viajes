import type { EstadoAlerta, ItemMantenimiento, PlantillaItemMantenimiento } from './types'

/**
 * Catálogo de mantenimientos comunes para una moto de uso intensivo
 * (conductor de plataforma). Son valores SUGERIDOS, no una recomendación
 * del fabricante — el conductor los edita antes de agregarlos (ver
 * PlantillaItemMantenimiento en types.ts, y SeccionMantenimiento.tsx) o
 * agrega los suyos propios como personalizado.
 *
 * 2026-09-15, pedido explícito del usuario, con paquete visual propio
 * ("Paquete de tarjetas ejecutivas de mantenimiento" — 7 categorías con
 * imagen real): se reordenó/renombró el catálogo para que sus nombres
 * calcen 1:1 con las 7 imágenes (`imagen`, ver ImagenMantenimiento en
 * types.ts). "Rotación de llantas"/"Alineación y balanceo"/"Filtro de
 * aire"/"Pastillas de freno" del catálogo viejo se renombraron a los
 * nombres exactos del paquete ("Cambio de llantas"/"Balanceo"/"Cambio de
 * filtro de aire"/"Cambio de pastillas de freno") en vez de tener las dos
 * versiones a la vez (D-18: un ítem, un nombre). Se agregó "Cambio de
 * aceite" (solo, sin filtro) y "Mantenimiento general", nuevos en el
 * paquete. Batería/SOAT/Revisión técnico-mecánica no venían en el paquete
 * (sin imagen propia) — se mantienen igual, se muestran sin la tarjeta
 * ejecutiva.
 *
 * 2026-09-15 (misma sesión), el usuario mandó un catálogo de carro aparte
 * ("Los de carro") — varios nombres chocan literalmente con los de moto
 * (Cambio de aceite, Cambio de llantas, Mantenimiento general, Batería,
 * con km distintos en cada vehículo). `vehiculo` en cada plantilla es lo
 * que evita el choque: SeccionMantenimiento.tsx solo muestra las del tipo
 * de vehículo elegido (domain/vehiculo, por defecto 'moto', cambiable en
 * Ajustes) — nunca las 25 mezcladas.
 */
export const CATALOGO_MANTENIMIENTO: PlantillaItemMantenimiento[] = [
  { nombre: 'Cambio de aceite', criterio: 'km_o_dias', intervaloKm: 3000, intervaloDias: 90, imagen: 'cambio_de_aceite', vehiculo: 'moto' },
  { nombre: 'Cambio de aceite y filtro', criterio: 'km_o_dias', intervaloKm: 5000, intervaloDias: 180, imagen: 'aceite_y_filtro', vehiculo: 'moto' },
  { nombre: 'Cambio de llantas', criterio: 'km', intervaloKm: 20000, intervaloDias: null, imagen: 'cambio_de_llantas', vehiculo: 'moto' },
  { nombre: 'Mantenimiento general', criterio: 'km_o_dias', intervaloKm: 5000, intervaloDias: 180, imagen: 'mantenimiento_general', vehiculo: 'moto' },
  { nombre: 'Balanceo', criterio: 'km', intervaloKm: 5000, intervaloDias: null, imagen: 'balanceo', vehiculo: 'moto' },
  { nombre: 'Cambio de filtro de aire', criterio: 'km', intervaloKm: 15000, intervaloDias: null, imagen: 'filtro_de_aire', vehiculo: 'moto' },
  { nombre: 'Cambio de pastillas de freno', criterio: 'km', intervaloKm: 20000, intervaloDias: null, imagen: 'pastillas_de_freno', vehiculo: 'moto' },
  { nombre: 'Batería', criterio: 'dias', intervaloKm: null, intervaloDias: 730, imagen: null, vehiculo: 'moto' },
  { nombre: 'SOAT', criterio: 'dias', intervaloKm: null, intervaloDias: 365, imagen: null, vehiculo: 'moto' },
  { nombre: 'Revisión técnico-mecánica', criterio: 'dias', intervaloKm: null, intervaloDias: 365, imagen: null, vehiculo: 'moto' },
  { nombre: 'Líquido de frenos', criterio: 'dias', intervaloKm: null, intervaloDias: 365, imagen: 'liquido_de_frenos', vehiculo: 'moto' },
  { nombre: 'Aceite y retenes de horquilla', criterio: 'km', intervaloKm: 20000, intervaloDias: null, imagen: 'aceite_y_retenes_horquilla', vehiculo: 'moto' },
  { nombre: 'Reglaje de válvulas', criterio: 'km', intervaloKm: 20000, intervaloDias: null, imagen: 'reglaje_de_valvulas', vehiculo: 'moto' },
  { nombre: 'Rodamientos de dirección', criterio: 'km', intervaloKm: 30000, intervaloDias: null, imagen: 'rodamientos_de_direccion', vehiculo: 'moto' },
  { nombre: 'Rodamientos de rueda', criterio: 'km', intervaloKm: 30000, intervaloDias: null, imagen: 'rodamientos_de_rueda', vehiculo: 'moto' },
  { nombre: 'Cambio de aceite', criterio: 'km', intervaloKm: 5000, intervaloDias: null, imagen: 'carro_cambio_de_aceite', vehiculo: 'carro' },
  { nombre: 'Filtro de aire', criterio: 'km', intervaloKm: 10000, intervaloDias: null, imagen: 'carro_filtro_de_aire', vehiculo: 'carro' },
  { nombre: 'Cambio de llantas', criterio: 'km', intervaloKm: 40000, intervaloDias: null, imagen: 'carro_cambio_de_llantas', vehiculo: 'carro' },
  { nombre: 'Frenos', criterio: 'km', intervaloKm: 20000, intervaloDias: null, imagen: 'carro_frenos', vehiculo: 'carro' },
  { nombre: 'Mantenimiento general', criterio: 'km', intervaloKm: 10000, intervaloDias: null, imagen: 'carro_mantenimiento_general', vehiculo: 'carro' },
  { nombre: 'Batería', criterio: 'km', intervaloKm: 30000, intervaloDias: null, imagen: 'carro_bateria', vehiculo: 'carro' },
  { nombre: 'Suspensión', criterio: 'km', intervaloKm: 50000, intervaloDias: null, imagen: 'carro_suspension', vehiculo: 'carro' },
  { nombre: 'Refrigerante', criterio: 'km', intervaloKm: 20000, intervaloDias: null, imagen: 'carro_refrigerante', vehiculo: 'carro' },
  { nombre: 'Bujías', criterio: 'km', intervaloKm: 30000, intervaloDias: null, imagen: 'carro_bujias', vehiculo: 'carro' },
  { nombre: 'Limpiaparabrisas', criterio: 'dias', intervaloKm: null, intervaloDias: 365, imagen: 'carro_limpiaparabrisas', vehiculo: 'carro' },
]

/** Margen de aviso antes de vencer: dentro de esto se marca "próximo a vencer". */
const MARGEN_AVISO_KM = 500
const MARGEN_AVISO_DIAS = 15

/**
 * 2026-09-15, pedido explícito del usuario: el km que usa esta app es solo
 * el que se midió DURANTE un viaje registrado — la moto también se mueve
 * fuera de eso (mandados, otros trabajos, uso personal), así que el
 * kilometraje real siempre es un poco más alto que el que la app alcanza a
 * ver. Para que la alerta de mantenimiento (basada en km) se acerque más a
 * cuándo toca el cambio DE VERDAD, se calcula con un 15% adicional sobre el
 * km medido — mejor avisar un poco antes que un poco tarde. Se aplica SOLO
 * acá (alertas de mantenimiento), nunca al km real que se muestra en
 * Balance/Estadísticas/Trabajo — ese sigue siendo el dato medido, sin
 * inflar. El usuario pidió que esto quede visible, no escondido — ver
 * `MARGEN_SEGURIDAD_TEXTO` y su uso en SeccionMantenimiento.tsx.
 */
export const MARGEN_SEGURIDAD_KM = 0.15
export const MARGEN_SEGURIDAD_TEXTO = 'Incluye un 15% adicional sobre el km medido, por uso de la moto fuera de la app.'

function diasEntre(desdeISO: string, hastaMs: number): number {
  const desdeMs = new Date(desdeISO).getTime()
  return Math.round((hastaMs - desdeMs) / (1000 * 60 * 60 * 24))
}

function kmEfectivo(kmActual: number): number {
  return kmActual * (1 + MARGEN_SEGURIDAD_KM)
}

/**
 * Calcula el estado de alerta de un ítem contra el km actual real del
 * vehículo. El km actual SIEMPRE viene de domain/viajes (suma de
 * distancia.kmTotalesReales) — este módulo nunca lo calcula por su cuenta,
 * solo le aplica el margen de seguridad de arriba antes de compararlo.
 */
export function calcularEstadoAlerta(item: ItemMantenimiento, kmActual: number, ahoraMs: number = Date.now()): EstadoAlerta {
  const kmActualConMargen = kmEfectivo(kmActual)
  const kmFaltantes =
    item.criterio === 'km' || item.criterio === 'km_o_dias'
      ? item.ultimoKm + (item.intervaloKm ?? 0) - kmActualConMargen
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

  const progresoPorKm = item.intervaloKm ? Math.min(100, Math.max(0, ((kmActualConMargen - item.ultimoKm) / item.intervaloKm) * 100)) : null
  const progresoPorDias = item.intervaloDias ? Math.min(100, Math.max(0, (diasTranscurridos / item.intervaloDias) * 100)) : null
  // "Lo que pase primero" (mismo criterio que `vencido`): el progreso mostrado es el más avanzado de los dos.
  const progresoPorcentaje = Math.max(progresoPorKm ?? 0, progresoPorDias ?? 0)

  return {
    item,
    kmFaltantes,
    diasFaltantes,
    vencido,
    proximoAVencer: !vencido && (proximoPorKm || proximoPorDias),
    progresoPorcentaje,
  }
}
