import type { Viaje } from '../viajes/types'
import type { Jornada } from '../jornada/types'
import type { Gasto } from '../gastos/types'
import type { Bono } from '../bonos/types'
import { minutosDelDiaLocalBogota } from '../../lib/fechas'
import type {
  CostoPorKm,
  DesglosePor,
  FranjaHoraria,
  PuntoPeriodo,
  RentabilidadPorHora,
  ResumenViajes,
  TiempoJornada,
  UnidadPeriodo,
} from './types'

const SIN_ZONA = 'Sin zona detectada'

/** Solo viajes cerrados cuentan para estadísticas — uno "en_curso" todavía no tiene cifras finales. */
function soloFinalizados(viajes: Viaje[]): Viaje[] {
  return viajes.filter((v) => v.estado === 'finalizado')
}

/**
 * `bonos` (2026-09-17, pedido explícito del usuario): un bono de plataforma
 * (ej. Uber/DiDi por cumplir X viajes) es plata real que entra, pero NO es
 * un viaje — se suma a `ingresos`, pero a propósito NUNCA a `cantidadViajes`
 * ni al numerador de `ingresoPromedioPorViaje` (ese promedio sigue siendo
 * solo de viajes reales, sin inflarse ni desinflarse por un bono). Opcional
 * con default `[]` para no romper ningún llamador existente que no tiene
 * bonos en su alcance (desgloses por plataforma/zona/franja horaria — un
 * bono no tiene ninguna de esas tres cosas, así que no le corresponde
 * aparecer ahí).
 */
export function calcularResumen(viajes: Viaje[], bonos: Bono[] = []): ResumenViajes {
  const finalizados = soloFinalizados(viajes)
  const cantidadViajes = finalizados.length
  const kmTotales = finalizados.reduce((acc, v) => acc + v.distancia.kmTotalesReales, 0)
  const ingresosViajes = finalizados.reduce((acc, v) => acc + v.ingreso, 0)
  const ingresosBonos = bonos.reduce((acc, b) => acc + b.monto, 0)
  return {
    cantidadViajes,
    kmTotales,
    ingresos: ingresosViajes + ingresosBonos,
    ingresoPromedioPorViaje: cantidadViajes === 0 ? 0 : ingresosViajes / cantidadViajes,
  }
}

function claveDia(fechaISO: string): string {
  return fechaISO.slice(0, 10) // YYYY-MM-DD
}

function claveMes(fechaISO: string): string {
  return fechaISO.slice(0, 7) // YYYY-MM
}

/** Semana ISO-8601 (lunes a domingo), formato '2026-W37'. */
function claveSemana(fechaISO: string): string {
  const fecha = new Date(fechaISO)
  const copia = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()))
  const diaSemanaISO = copia.getUTCDay() || 7
  copia.setUTCDate(copia.getUTCDate() + 4 - diaSemanaISO)
  const inicioAño = new Date(Date.UTC(copia.getUTCFullYear(), 0, 1))
  const numeroSemana = Math.ceil(((copia.getTime() - inicioAño.getTime()) / 86400000 + 1) / 7)
  return `${copia.getUTCFullYear()}-W${String(numeroSemana).padStart(2, '0')}`
}

function claveDePeriodo(fechaISO: string, unidad: UnidadPeriodo): string {
  if (unidad === 'dia') return claveDia(fechaISO)
  if (unidad === 'semana') return claveSemana(fechaISO)
  return claveMes(fechaISO)
}

/**
 * Agrupa por día, semana o mes, usando la fecha de inicio del viaje. Orden:
 * más reciente primero. `bonos` (2026-09-17, opcional, default `[]`, mismo
 * criterio que en `calcularResumen`) se agrupan por su propia fecha con el
 * mismo criterio de período, y se cruzan por clave — así un bono del mismo
 * día/semana/mes que un viaje termina en el mismo punto del resultado.
 */
export function agruparPorPeriodo(viajes: Viaje[], unidad: UnidadPeriodo, bonos: Bono[] = []): PuntoPeriodo[] {
  const finalizados = soloFinalizados(viajes)
  const gruposViajes = new Map<string, Viaje[]>()

  for (const viaje of finalizados) {
    const clave = claveDePeriodo(viaje.inicioISO, unidad)
    const lista = gruposViajes.get(clave) ?? []
    lista.push(viaje)
    gruposViajes.set(clave, lista)
  }

  const gruposBonos = new Map<string, Bono[]>()
  for (const bono of bonos) {
    const clave = claveDePeriodo(bono.fechaISO, unidad)
    const lista = gruposBonos.get(clave) ?? []
    lista.push(bono)
    gruposBonos.set(clave, lista)
  }

  const todasLasClaves = new Set([...gruposViajes.keys(), ...gruposBonos.keys()])

  return Array.from(todasLasClaves)
    .map((clave) => ({ clave, resumen: calcularResumen(gruposViajes.get(clave) ?? [], gruposBonos.get(clave) ?? []) }))
    .sort((a, b) => b.clave.localeCompare(a.clave))
}

export function desglosePorPlataforma(viajes: Viaje[]): DesglosePor<string>[] {
  const finalizados = soloFinalizados(viajes)
  const grupos = new Map<string, Viaje[]>()

  for (const viaje of finalizados) {
    const lista = grupos.get(viaje.plataforma) ?? []
    lista.push(viaje)
    grupos.set(viaje.plataforma, lista)
  }

  return Array.from(grupos.entries())
    .map(([clave, viajesDeLaPlataforma]) => ({ clave, resumen: calcularResumen(viajesDeLaPlataforma) }))
    .sort((a, b) => b.resumen.ingresos - a.resumen.ingresos)
}

function desglosePorZonaGenerico(viajes: Viaje[], zonaDe: (v: Viaje) => string | null): DesglosePor<string>[] {
  const finalizados = soloFinalizados(viajes)
  const grupos = new Map<string, Viaje[]>()

  for (const viaje of finalizados) {
    const clave = zonaDe(viaje) ?? viaje.zona ?? SIN_ZONA
    const lista = grupos.get(clave) ?? []
    lista.push(viaje)
    grupos.set(clave, lista)
  }

  return Array.from(grupos.entries())
    .map(([clave, viajesDeLaZona]) => ({ clave, resumen: calcularResumen(viajesDeLaZona) }))
    .sort((a, b) => b.resumen.ingresos - a.resumen.ingresos)
}

/**
 * Desglose por zona de RECOGIDA (domain/viajes/zonasBogota.ts) — a propósito
 * `zonaInicio`, no `zonaFin`: 2026-09-15, pedido explícito del usuario —
 * "qué suena mejor" se decide por dónde recoges al pasajero, no por dónde lo
 * dejas (ahí ya cobraste, esa zona no te sirve para decidir dónde pararte la
 * próxima vez). `zona` queda como respaldo para viajes viejos, de antes de
 * que existiera la separación inicio/fin (ver migración
 * 20260914090000_viaje_zonas_inicio_fin). Viajes sin zona detectada
 * (manuales, o GPS que no alcanzó a ubicar) se agrupan aparte.
 */
export function desglosePorZona(viajes: Viaje[]): DesglosePor<string>[] {
  return desglosePorZonaGenerico(viajes, (v) => v.zonaInicio)
}

/**
 * 2026-09-17, pedido explícito del usuario: "en qué zona es donde dejo más
 * viajes, donde finalizo los viajes" — complemento de `desglosePorZona`
 * (recogida), mismo criterio (D-18: reusa `desglosePorZonaGenerico`), pero
 * con `zonaFin`. Útil para lo contrario de la de recogida: no dónde
 * pararse a esperar el próximo viaje, sino a qué zonas suele terminar
 * llevando pasajeros.
 */
export function desglosePorZonaFin(viajes: Viaje[]): DesglosePor<string>[] {
  return desglosePorZonaGenerico(viajes, (v) => v.zonaFin)
}

/**
 * A qué franja horaria pertenece un ISO, en hora de Bogotá (nunca UTC crudo
 * — mismo criterio que `fechaNegocioISO`, D-18: reutiliza
 * `minutosDelDiaLocalBogota` en vez de sacar la hora a mano).
 *
 * 2026-09-17, pedido explícito del usuario, cortes en minutos del día
 * (0 = medianoche): mañana 240-689 (4:00-11:29), mediodía 690-899
 * (11:30-14:59), tarde 900-1199 (15:00-19:59), noche 1200-239 (20:00-3:59,
 * cruza medianoche). Ver FranjaHoraria en types.ts.
 */
export function franjaHoraria(fechaISO: string): FranjaHoraria {
  const minutos = minutosDelDiaLocalBogota(fechaISO)
  if (minutos >= 240 && minutos < 690) return 'mañana'
  if (minutos >= 690 && minutos < 900) return 'mediodía'
  if (minutos >= 900 && minutos < 1200) return 'tarde'
  return 'noche' // 20:00–3:59, cruza medianoche
}

/** Desglose por franja horaria de INICIO del viaje — mismo criterio de "recogida" que desglosePorZona. */
export function desglosePorFranjaHoraria(viajes: Viaje[]): DesglosePor<FranjaHoraria>[] {
  const finalizados = soloFinalizados(viajes)
  const grupos = new Map<FranjaHoraria, Viaje[]>()

  for (const viaje of finalizados) {
    const clave = franjaHoraria(viaje.inicioISO)
    const lista = grupos.get(clave) ?? []
    lista.push(viaje)
    grupos.set(clave, lista)
  }

  // Orden fijo del día, no por ingreso — a diferencia de zona/plataforma, acá
  // el orden cronológico es más legible que ordenar por plata (D-18: no
  // copiar el mismo criterio de orden sin pensar si aplica).
  const ORDEN: FranjaHoraria[] = ['mañana', 'mediodía', 'tarde', 'noche']
  return ORDEN.filter((f) => grupos.has(f)).map((clave) => ({ clave, resumen: calcularResumen(grupos.get(clave)!) }))
}

const UNA_HORA_MS = 3_600_000

/**
 * Bloque 2, ítem 3. Cruza `Jornada` (domain/jornada) con `Viaje[]` (domain/viajes)
 * — sigue siendo una función pura: recibe ambos como parámetros, no importa
 * ningún store (D-10: la coordinación entre dominios pasa por la capa de
 * orquestación que llama a esto, nunca dentro de un store).
 *
 * Si la jornada sigue abierta (`finISO === null`), usa el momento actual como
 * fin provisional — así el tiempo muerto/trabajado se puede mostrar EN VIVO
 * mientras el conductor sigue de turno, no solo después de cerrar.
 */
export function calcularTiempoJornada(jornada: Jornada, viajes: Viaje[]): TiempoJornada {
  const inicioMs = new Date(jornada.inicioISO).getTime()
  const finMs = jornada.finISO ? new Date(jornada.finISO).getTime() : Date.now()

  // 2026-09-15, pedido explícito del usuario: "pausar jornada y reanudar
  // jornada" — mientras está pausada, ese tiempo no cuenta como parte de la
  // jornada (ni trabajado ni muerto: el conductor avisó que no está de
  // turno). `?? null`/`?? 0` por si la jornada es de antes de que existieran
  // estos dos campos (D-16, jornadas viejas ya guardadas sin ellos).
  const msPausaEnCurso =
    jornada.pausadaDesdeISO && !jornada.finISO ? Math.max(0, Date.now() - new Date(jornada.pausadaDesdeISO).getTime()) : 0
  const msPausadoTotal = (jornada.msPausadosAcumulados ?? 0) + msPausaEnCurso

  const tiempoTotalMs = Math.max(0, finMs - inicioMs - msPausadoTotal)

  const viajesDeLaJornada = viajes.filter(
    (v) => jornada.viajesIds.includes(v.id) && v.estado === 'finalizado' && v.finISO,
  )
  const tiempoTrabajadoMs = viajesDeLaJornada.reduce((acc, v) => {
    const duracion = new Date(v.finISO as string).getTime() - new Date(v.inicioISO).getTime()
    return acc + Math.max(0, duracion)
  }, 0)

  // Math.min acá, no solo el Math.max de cada sumando: un viaje manual (Bloque
  // 2, ítem 4) pudo cargarse con una duración que en teoría se solapa o excede
  // el tiempo total de la jornada (el conductor tipeó mal una hora) — mejor
  // mostrar "tiempo muerto: 0" que un número negativo sin sentido.
  const tiempoMuertoMs = Math.max(0, tiempoTotalMs - Math.min(tiempoTotalMs, tiempoTrabajadoMs))

  return { tiempoTotalMs, tiempoTrabajadoMs, tiempoMuertoMs }
}

/**
 * Bloque 2, ítem 3. Reutiliza `calcularTiempoJornada` (D-18: no duplicar un
 * cálculo que ya existe) para las horas, y suma el ingreso de los mismos
 * viajes finalizados de la jornada.
 *
 * 2026-09-15, pedido explícito del usuario: con UN SOLO viaje no hay
 * suficiente historial para proyectar una tarifa por hora real — dividir
 * "$26.000 en 10 minutos" da $156.000/hora, un número inflado que solo
 * extrapola un único dato, no algo que el conductor de verdad se está
 * haciendo. El propio usuario confirmó el punto de corte con su ejemplo: con
 * 2-3 viajes ("dos horas... me dice 60 mil, dice 30 mil por hora") la
 * división SÍ es la cuenta correcta — eso no se toca. Con 0 o 1 viaje
 * finalizado, se muestra el ingreso real tal cual, sin dividir — "porque no
 * hay registros" (sus palabras) para proyectar nada todavía.
 */
export function calcularRentabilidadPorHora(jornada: Jornada, viajes: Viaje[]): RentabilidadPorHora {
  const viajesFinalizadosDeLaJornada = viajes.filter((v) => jornada.viajesIds.includes(v.id) && v.estado === 'finalizado')
  const ingresos = viajesFinalizadosDeLaJornada.reduce((acc, v) => acc + v.ingreso, 0)

  if (viajesFinalizadosDeLaJornada.length < 2) {
    return { ingresoPorHoraTrabajada: ingresos, ingresoPorHoraConEspera: ingresos }
  }

  const tiempo = calcularTiempoJornada(jornada, viajes)
  const horasTrabajadas = tiempo.tiempoTrabajadoMs / UNA_HORA_MS
  const horasTotales = tiempo.tiempoTotalMs / UNA_HORA_MS

  return {
    ingresoPorHoraTrabajada: horasTrabajadas === 0 ? 0 : ingresos / horasTrabajadas,
    ingresoPorHoraConEspera: horasTotales === 0 ? 0 : ingresos / horasTotales,
  }
}

/**
 * Bloque 4, ítem 13 (visual) — "dinero que se va en espera": cuánto se deja
 * de ganar en el tiempo muerto de la jornada, medido contra la propia tarifa
 * efectiva del conductor mientras SÍ está trabajando (`ingresoPorHoraTrabajada`
 * — reutilizada, D-18, no se recalcula nada de cero). Es un estimado de
 * oportunidad perdida, no plata que de verdad se gastó — se muestra así en
 * la tarjeta correspondiente, no como un gasto real.
 */
export function calcularDineroEnEspera(tiempo: TiempoJornada, rentabilidad: RentabilidadPorHora): number {
  const horasMuertas = tiempo.tiempoMuertoMs / UNA_HORA_MS
  return horasMuertas * rentabilidad.ingresoPorHoraTrabajada
}

/**
 * Bloque 4 — costo por km en un rango de fechas [desdeISO, hastaISO). Recibe
 * los gastos y los viajes ya filtrados/agregados por quien llama (capa de
 * orquestación) o el rango crudo — acá se filtran ambos contra el mismo
 * rango para no depender de que quien llama haya filtrado igual las dos
 * listas.
 */
export function calcularCostoPorKm(gastos: Gasto[], viajes: Viaje[], desdeISO: string, hastaISO: string): CostoPorKm {
  const gastoTotal = gastos
    .filter((g) => g.fechaISO >= desdeISO && g.fechaISO < hastaISO)
    .reduce((acc, g) => acc + g.monto, 0)

  const kmTotales = soloFinalizados(viajes)
    .filter((v) => v.inicioISO >= desdeISO && v.inicioISO < hastaISO)
    .reduce((acc, v) => acc + v.distancia.kmTotalesReales, 0)

  return { gastoTotal, kmTotales, costoPorKm: kmTotales === 0 ? null : gastoTotal / kmTotales }
}
