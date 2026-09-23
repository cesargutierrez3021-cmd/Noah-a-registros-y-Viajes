import { getAutenticado } from '../../lib/api'
import { repositorioViajes } from '../viajes/repository'
import type { Viaje } from '../viajes/types'
import { repositorioJornadas } from '../jornada/repository'
import type { Jornada } from '../jornada/types'
import { repositorioMantenimiento } from '../mantenimiento/repository'
import type { RegistroMantenimiento } from '../mantenimiento/types'
import { repositorioGastos } from '../gastos/repository'
import type { CategoriaGasto, Gasto } from '../gastos/types'
import { repositorioBonos } from '../bonos/repository'
import type { Bono } from '../bonos/types'
import { repositorioDeudas } from '../deudas/repository'
import type { AbonoDeuda, CuotaProgramada, Deuda } from '../deudas/types'
import { repositorioAhorro } from '../ahorro/repository'
import type { AbonoAhorro, AportePlaneado, MetaAhorro } from '../ahorro/types'
import { repositorioHogar } from '../hogar/repository'
import type { ConceptoFijo, GastoHogar } from '../hogar/types'

/**
 * 2026-09-17, pedido explícito del usuario: "cada vez que instalo la
 * aplicación se borran todos los datos... supuestamente estamos conectados
 * a Render y a Neon para guardar la base de datos" — el sync hasta ahora era
 * de una sola vía (domain/*\/sync.ts solo SUBE), así que reinstalar la app
 * perdía todo aunque hubiera cuenta creada. Este módulo es el otro sentido:
 * se llama UNA vez, justo después de iniciar sesión o crear cuenta con
 * éxito (ver domain/auth/store.ts) — trae los 11 recursos completos
 * (GET /sync/todo, server/src/modules/sync/routes.ts) y los agrega a cada
 * repositorio local.
 *
 * Criterio de fusión, a propósito conservador: NUNCA pisa un registro que
 * ya existe en local (mismo id) — solo agrega los que faltan. En un
 * reinstall real, local está vacío, así que esto restaura todo sin más. Si
 * en cambio esto corre con datos locales ya presentes (ej. se inicia sesión
 * en una cuenta después de haber usado la app offline un rato), lo local
 * gana siempre — no hay forma de saber acá cuál versión es "más nueva" sin
 * un mecanismo de versionado que este diseño no tiene, así que la opción
 * seguro es no arriesgar perder algo que el conductor cargó a mano.
 */

interface ViajeCrudo {
  id: string
  plataforma: string
  estado: string
  inicioISO: string
  finISO: string | null
  recorrido: unknown
  kmHastaRecoger: number
  kmConPasajero: number
  kmTotalesReales: number
  distanciaReportadaPlataforma: number | null
  ingreso: number
  ingresoPendiente: boolean
  localidad: string | null
  zona: string | null
  localidadInicio: string | null
  zonaInicio: string | null
  localidadFin: string | null
  zonaFin: string | null
}
interface JornadaCrudo { id: string; inicioISO: string; finISO: string | null; viajesIds: unknown }
interface RegistroMantenimientoCrudo { id: string; itemId: string; fechaISO: string; km: number; costo: number | null; notas: string | null }
interface GastoCrudo { id: string; categoria: string; monto: number; fechaISO: string; litros: number | null; notas: string | null }
interface BonoCrudo { id: string; monto: number; fechaISO: string }
interface DeudaCrudo {
  id: string
  nombre: string
  saldoInicial: number
  saldoActual: number
  cuotaProgramada: CuotaProgramada | null
  fechaLimiteISO: string | null
  creadaEnISO: string
}
interface AbonoDeudaCrudo { id: string; deudaId: string; monto: number; fechaISO: string }
interface MetaAhorroCrudo {
  id: string
  nombre: string
  montoObjetivo: number
  saldoActual: number
  aportePlaneado: AportePlaneado | null
  fechaLimiteISO: string | null
  creadaEnISO: string
}
interface AbonoAhorroCrudo { id: string; metaId: string; monto: number; fechaISO: string }
interface ConceptoFijoCrudo { id: string; nombre: string; montoEsperado: number; diaDelMes: number; activo: boolean; creadoEnISO: string }
interface GastoHogarCrudo { id: string; nombre: string; monto: number; tipo: string; fechaISO: string; conceptoFijoId: string | null }

interface RespuestaTodo {
  viajes: ViajeCrudo[]
  jornadas: JornadaCrudo[]
  registrosMantenimiento: RegistroMantenimientoCrudo[]
  gastos: GastoCrudo[]
  bonos: BonoCrudo[]
  deudas: DeudaCrudo[]
  abonosDeuda: AbonoDeudaCrudo[]
  metasAhorro: MetaAhorroCrudo[]
  abonosAhorro: AbonoAhorroCrudo[]
  conceptosFijos: ConceptoFijoCrudo[]
  gastosHogar: GastoHogarCrudo[]
}

/**
 * Agrega los remotos cuyo id todavía no existe en `locales` — nunca pisa un
 * id ya presente. Secuencial a propósito (no `Promise.all`): cada
 * `repositorio.guardar()` local hace lectura-modificación-escritura sobre el
 * MISMO array de localStorage, y llamarlos en paralelo sobre el mismo
 * dominio perdería escrituras (el último `write` gana, pisando lo que
 * guardaron los anteriores a mitad de camino).
 */
async function restaurarLista<TLocal extends { id: string }, TRemoto extends { id: string }>(
  locales: TLocal[],
  remotos: TRemoto[],
  mapear: (remoto: TRemoto) => TLocal,
  guardar: (item: TLocal) => Promise<void>,
): Promise<number> {
  const idsLocales = new Set(locales.map((l) => l.id))
  let restaurados = 0
  for (const remoto of remotos) {
    if (idsLocales.has(remoto.id)) continue
    await guardar(mapear(remoto))
    restaurados++
  }
  return restaurados
}

/** Devuelve cuántos registros nuevos se restauraron en total, sumando los 11 recursos. */
export async function restaurarTodoDesdeServidor(): Promise<number> {
  const datos = await getAutenticado<RespuestaTodo>('/sync/todo')
  let total = 0

  total += await restaurarLista(await repositorioViajes.listar(), datos.viajes, (v): Viaje => ({
    id: v.id,
    plataforma: v.plataforma as Viaje['plataforma'],
    estado: v.estado as Viaje['estado'],
    inicioISO: v.inicioISO,
    finISO: v.finISO,
    recorrido: (v.recorrido ?? []) as Viaje['recorrido'],
    distancia: { kmHastaRecoger: v.kmHastaRecoger, kmConPasajero: v.kmConPasajero, kmTotalesReales: v.kmTotalesReales },
    distanciaReportadaPlataforma: v.distanciaReportadaPlataforma,
    ingreso: v.ingreso,
    localidad: v.localidad,
    zona: v.zona,
    localidadInicio: v.localidadInicio,
    zonaInicio: v.zonaInicio,
    localidadFin: v.localidadFin,
    zonaFin: v.zonaFin,
    ingresoPendiente: v.ingresoPendiente,
    pendienteDeSync: false,
  }), (v) => repositorioViajes.guardar(v))

  total += await restaurarLista(await repositorioJornadas.listar(), datos.jornadas, (j): Jornada => ({
    id: j.id,
    inicioISO: j.inicioISO,
    finISO: j.finISO,
    viajesIds: (j.viajesIds ?? []) as string[],
    // Pausa en curso no se sincroniza al backend (ver domain/jornada/types.ts) — se restaura "sin pausa", el peor caso es que el tiempo muerto de una jornada vieja recuperada no cuadre exacto.
    pausadaDesdeISO: null,
    msPausadosAcumulados: 0,
    pendienteDeSync: false,
  }), (j) => repositorioJornadas.guardar(j))

  total += await restaurarLista(await repositorioMantenimiento.listarRegistros(), datos.registrosMantenimiento, (r): RegistroMantenimiento => ({
    id: r.id,
    itemId: r.itemId,
    fechaISO: r.fechaISO,
    km: r.km,
    costo: r.costo,
    notas: r.notas,
    pendienteDeSync: false,
  }), (r) => repositorioMantenimiento.guardarRegistro(r))

  total += await restaurarLista(await repositorioGastos.listar(), datos.gastos, (g): Gasto => ({
    id: g.id,
    categoria: g.categoria as CategoriaGasto,
    monto: g.monto,
    fechaISO: g.fechaISO,
    litros: g.litros,
    notas: g.notas,
    pendienteDeSync: false,
  }), (g) => repositorioGastos.guardar(g))

  total += await restaurarLista(await repositorioBonos.listar(), datos.bonos, (b): Bono => ({
    id: b.id,
    monto: b.monto,
    fechaISO: b.fechaISO,
    pendienteDeSync: false,
  }), (b) => repositorioBonos.guardar(b))

  total += await restaurarLista(await repositorioDeudas.listarDeudas(), datos.deudas, (d): Deuda => ({
    id: d.id,
    nombre: d.nombre,
    saldoInicial: d.saldoInicial,
    saldoActual: d.saldoActual,
    cuotaProgramada: d.cuotaProgramada,
    fechaLimiteISO: d.fechaLimiteISO,
    creadaEnISO: d.creadaEnISO,
    pendienteDeSync: false,
  }), (d) => repositorioDeudas.guardarDeuda(d))

  total += await restaurarLista(await repositorioDeudas.listarAbonos(), datos.abonosDeuda, (a): AbonoDeuda => ({
    id: a.id,
    deudaId: a.deudaId,
    monto: a.monto,
    fechaISO: a.fechaISO,
    pendienteDeSync: false,
  }), (a) => repositorioDeudas.guardarAbono(a))

  total += await restaurarLista(await repositorioAhorro.listarMetas(), datos.metasAhorro, (m): MetaAhorro => ({
    id: m.id,
    nombre: m.nombre,
    montoObjetivo: m.montoObjetivo,
    saldoActual: m.saldoActual,
    aportePlaneado: m.aportePlaneado,
    fechaLimiteISO: m.fechaLimiteISO,
    creadaEnISO: m.creadaEnISO,
    pendienteDeSync: false,
  }), (m) => repositorioAhorro.guardarMeta(m))

  total += await restaurarLista(await repositorioAhorro.listarAbonos(), datos.abonosAhorro, (a): AbonoAhorro => ({
    id: a.id,
    metaId: a.metaId,
    monto: a.monto,
    fechaISO: a.fechaISO,
    pendienteDeSync: false,
  }), (a) => repositorioAhorro.guardarAbono(a))

  total += await restaurarLista(await repositorioHogar.listarConceptos(), datos.conceptosFijos, (c): ConceptoFijo => ({
    id: c.id,
    nombre: c.nombre,
    montoEsperado: c.montoEsperado,
    diaDelMes: c.diaDelMes,
    activo: c.activo,
    creadoEnISO: c.creadoEnISO,
    pendienteDeSync: false,
  }), (c) => repositorioHogar.guardarConcepto(c))

  total += await restaurarLista(await repositorioHogar.listarGastos(), datos.gastosHogar, (g): GastoHogar => ({
    id: g.id,
    nombre: g.nombre,
    monto: g.monto,
    tipo: g.tipo as GastoHogar['tipo'],
    fechaISO: g.fechaISO,
    conceptoFijoId: g.conceptoFijoId,
    pendienteDeSync: false,
  }), (g) => repositorioHogar.guardarGasto(g))

  return total
}
