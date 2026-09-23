import type { EstadoAlerta, ItemMantenimiento, PlantillaItemMantenimiento, RegistroMantenimiento } from './types'

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
/**
 * 2026-09-16, pedido explícito del usuario ("hay que poner cuánto vale
 * aproximadamente los mantenimientos"): costos SUGERIDOS en pesos
 * colombianos, precios de calle aproximados para 2026 — el conductor los
 * edita antes de confirmar, igual que ya edita el intervalo (mismo criterio
 * de "sugerido, no impuesto" que el resto del catálogo).
 */
export const CATALOGO_MANTENIMIENTO: PlantillaItemMantenimiento[] = [
  { nombre: 'Cambio de aceite', criterio: 'km_o_dias', intervaloKm: 3000, intervaloDias: 90, imagen: 'cambio_de_aceite', vehiculo: 'moto', costoAproximado: 45000 },
  { nombre: 'Cambio de aceite y filtro', criterio: 'km_o_dias', intervaloKm: 5000, intervaloDias: 180, imagen: 'aceite_y_filtro', vehiculo: 'moto', costoAproximado: 65000 },
  { nombre: 'Cambio de llantas', criterio: 'km', intervaloKm: 20000, intervaloDias: null, imagen: 'cambio_de_llantas', vehiculo: 'moto', costoAproximado: 280000 },
  { nombre: 'Mantenimiento general', criterio: 'km_o_dias', intervaloKm: 5000, intervaloDias: 180, imagen: 'mantenimiento_general', vehiculo: 'moto', costoAproximado: 120000 },
  { nombre: 'Balanceo', criterio: 'km', intervaloKm: 5000, intervaloDias: null, imagen: 'balanceo', vehiculo: 'moto', costoAproximado: 25000 },
  { nombre: 'Cambio de filtro de aire', criterio: 'km', intervaloKm: 15000, intervaloDias: null, imagen: 'filtro_de_aire', vehiculo: 'moto', costoAproximado: 35000 },
  { nombre: 'Cambio de pastillas de freno', criterio: 'km', intervaloKm: 20000, intervaloDias: null, imagen: 'pastillas_de_freno', vehiculo: 'moto', costoAproximado: 60000 },
  { nombre: 'Batería', criterio: 'dias', intervaloKm: null, intervaloDias: 730, imagen: null, vehiculo: 'moto', costoAproximado: 180000 },
  { nombre: 'SOAT', criterio: 'dias', intervaloKm: null, intervaloDias: 365, imagen: null, vehiculo: 'moto', costoAproximado: 450000 },
  { nombre: 'Revisión técnico-mecánica', criterio: 'dias', intervaloKm: null, intervaloDias: 365, imagen: null, vehiculo: 'moto', costoAproximado: 90000 },
  { nombre: 'Líquido de frenos', criterio: 'dias', intervaloKm: null, intervaloDias: 365, imagen: 'liquido_de_frenos', vehiculo: 'moto', costoAproximado: 30000 },
  { nombre: 'Aceite y retenes de horquilla', criterio: 'km', intervaloKm: 20000, intervaloDias: null, imagen: 'aceite_y_retenes_horquilla', vehiculo: 'moto', costoAproximado: 90000 },
  { nombre: 'Reglaje de válvulas', criterio: 'km', intervaloKm: 20000, intervaloDias: null, imagen: 'reglaje_de_valvulas', vehiculo: 'moto', costoAproximado: 70000 },
  { nombre: 'Rodamientos de dirección', criterio: 'km', intervaloKm: 30000, intervaloDias: null, imagen: 'rodamientos_de_direccion', vehiculo: 'moto', costoAproximado: 80000 },
  { nombre: 'Rodamientos de rueda', criterio: 'km', intervaloKm: 30000, intervaloDias: null, imagen: 'rodamientos_de_rueda', vehiculo: 'moto', costoAproximado: 70000 },
  { nombre: 'Cambio de aceite', criterio: 'km', intervaloKm: 5000, intervaloDias: null, imagen: 'carro_cambio_de_aceite', vehiculo: 'carro', costoAproximado: 180000 },
  { nombre: 'Filtro de aire', criterio: 'km', intervaloKm: 10000, intervaloDias: null, imagen: 'carro_filtro_de_aire', vehiculo: 'carro', costoAproximado: 60000 },
  { nombre: 'Cambio de llantas', criterio: 'km', intervaloKm: 40000, intervaloDias: null, imagen: 'carro_cambio_de_llantas', vehiculo: 'carro', costoAproximado: 1600000 },
  { nombre: 'Frenos', criterio: 'km', intervaloKm: 20000, intervaloDias: null, imagen: 'carro_frenos', vehiculo: 'carro', costoAproximado: 220000 },
  { nombre: 'Mantenimiento general', criterio: 'km', intervaloKm: 10000, intervaloDias: null, imagen: 'carro_mantenimiento_general', vehiculo: 'carro', costoAproximado: 350000 },
  { nombre: 'Batería', criterio: 'km', intervaloKm: 30000, intervaloDias: null, imagen: 'carro_bateria', vehiculo: 'carro', costoAproximado: 380000 },
  { nombre: 'Suspensión', criterio: 'km', intervaloKm: 50000, intervaloDias: null, imagen: 'carro_suspension', vehiculo: 'carro', costoAproximado: 600000 },
  { nombre: 'Refrigerante', criterio: 'km', intervaloKm: 20000, intervaloDias: null, imagen: 'carro_refrigerante', vehiculo: 'carro', costoAproximado: 70000 },
  { nombre: 'Bujías', criterio: 'km', intervaloKm: 30000, intervaloDias: null, imagen: 'carro_bujias', vehiculo: 'carro', costoAproximado: 150000 },
  { nombre: 'Limpiaparabrisas', criterio: 'dias', intervaloKm: null, intervaloDias: 365, imagen: 'carro_limpiaparabrisas', vehiculo: 'carro', costoAproximado: 50000 },
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

/**
 * 2026-09-16, pedido explícito del usuario ("la meta diaria se tiene que
 * definir sobre... los gastos de mantenimiento"): cuánto de `costoAproximado`
 * corresponde a UN día, para prorratearlo en domain/metaDiaria. Solo tiene
 * sentido para ítems `fijo: true` con `costoAproximado` puesto — el llamador
 * filtra eso antes de invocar esta función (D-10: acá solo se calcula la
 * tarifa, no se decide qué ítems cuentan).
 *
 * `criterio === 'km'` necesita `kmPromedioDiario` (cuántos km hace el
 * conductor por día en promedio, ver domain/metaDiaria/calculos.ts) para
 * convertir un intervalo de kilómetros en un intervalo de días — sin eso
 * (conductor sin viajes todavía) no hay forma de prorratear, se devuelve 0.
 * `km_o_dias` usa la tarifa MÁS ALTA de las dos (mismo criterio de "lo que
 * pase primero" que ya usa `calcularEstadoAlerta`) — más conservador: mejor
 * sobrestimar un poco la meta que dejar un mantenimiento sin cubrir.
 */
export function tarifaDiariaItem(item: ItemMantenimiento, kmPromedioDiario: number): number {
  const costo = item.costoAproximado
  if (!costo || costo <= 0) return 0

  const tarifaPorDias = item.intervaloDias && item.intervaloDias > 0 ? costo / item.intervaloDias : null
  const diasParaKm = item.intervaloKm && kmPromedioDiario > 0 ? item.intervaloKm / kmPromedioDiario : null
  const tarifaPorKm = diasParaKm && diasParaKm > 0 ? costo / diasParaKm : null

  if (item.criterio === 'dias') return tarifaPorDias ?? 0
  if (item.criterio === 'km') return tarifaPorKm ?? 0
  return Math.max(tarifaPorDias ?? 0, tarifaPorKm ?? 0)
}

/**
 * 2026-09-23, corrección de un bug real reportado por el usuario ("cuando yo lo pongo en
 * mantenimiento... y le doy realizado hoy y pongo el valor de lo que costó... tiene que
 * calcularme eso también como gasto de la moto, pero no me lo está calculando"): `costo`
 * (`RegistroMantenimiento`, cargado al marcar un mantenimiento como realizado) es plata real
 * gastada, pero vivía completamente aislado de `domain/gastos` — nada en "Lectura del día",
 * "Resumen" (Hoy/Semana/Mes) ni el acordeón "Gastos de la moto" de Balance lo sumaba, solo se
 * contaba un gasto de categoría "mantenimiento" cargado A MANO desde "Gastos de jornada". Un
 * solo lugar (D-18) para esta cuenta — mismo criterio de rango [desdeISO, hastaISO) que
 * `sumaCategoria`/`sumaTotalGastos` (SeccionPulso.tsx).
 */
export function costoRealizadoEnRango(registros: RegistroMantenimiento[], desdeISO: string, hastaISO: string): number {
  return registros
    .filter((r) => r.fechaISO >= desdeISO && r.fechaISO < hastaISO)
    .reduce((acc, r) => acc + (r.costo ?? 0), 0)
}
