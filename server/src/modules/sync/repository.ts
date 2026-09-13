import { prisma } from '../../lib/prisma.js'
import type { Prisma } from '@prisma/client'
import type { ViajeSyncEntrada, JornadaSyncEntrada, RegistroMantenimientoSyncEntrada } from './types.js'

export const repositorioSync = {
  /** null = no existe todavía ningún viaje con ese id. */
  async buscarViajePorId(id: string): Promise<{ usuarioId: string } | null> {
    return prisma.viaje.findUnique({ where: { id }, select: { usuarioId: true } })
  },

  /**
   * Upsert por id — si el viaje ya existe (mismo UUID, reenvío del cliente),
   * se actualiza; si no, se crea. Esta es la deduplicación real (requisito
   * #18 del documento MIA), no la validación de pertenencia (eso lo decide
   * el service ANTES de llamar acá, ver service.ts).
   */
  async guardarViaje(usuarioId: string, viaje: ViajeSyncEntrada): Promise<void> {
    const datos = {
      usuarioId,
      plataforma: viaje.plataforma,
      estado: viaje.estado,
      inicioISO: new Date(viaje.inicioISO),
      finISO: viaje.finISO ? new Date(viaje.finISO) : null,
      // `PuntoGPSSync[]` es un objeto JSON válido en los hechos, pero Prisma
      // exige que cualquier valor para una columna Json tenga una firma de
      // índice `string` explícita — una interfaz normal no la tiene, aunque
      // su forma real sí encaje. Cast explícito hacia el tipo Json de Prisma
      // en vez de hacia `any` (así se mantiene el chequeo de tipos del resto).
      recorrido: viaje.recorrido as unknown as Prisma.InputJsonValue,
      kmHastaRecoger: viaje.kmHastaRecoger,
      kmConPasajero: viaje.kmConPasajero,
      kmTotalesReales: viaje.kmTotalesReales,
      distanciaReportadaPlataforma: viaje.distanciaReportadaPlataforma,
      ingreso: viaje.ingreso,
      localidad: viaje.localidad,
      zona: viaje.zona,
    }

    await prisma.viaje.upsert({
      where: { id: viaje.id },
      create: { id: viaje.id, ...datos },
      update: datos,
    })
  },

  /** null = no existe todavía ninguna jornada con ese id. */
  async buscarJornadaPorId(id: string): Promise<{ usuarioId: string } | null> {
    return prisma.jornada.findUnique({ where: { id }, select: { usuarioId: true } })
  },

  /**
   * Upsert por id. A diferencia de un viaje, una jornada abierta se reenvía
   * varias veces (cada vez que se le agrega un viaje, ver
   * app/src/domain/jornada/store.ts) — cada subida actualiza la misma fila.
   */
  async guardarJornada(usuarioId: string, jornada: JornadaSyncEntrada): Promise<void> {
    const datos = {
      usuarioId,
      inicioISO: new Date(jornada.inicioISO),
      finISO: jornada.finISO ? new Date(jornada.finISO) : null,
      viajesIds: jornada.viajesIds,
    }

    await prisma.jornada.upsert({
      where: { id: jornada.id },
      create: { id: jornada.id, ...datos },
      update: datos,
    })
  },

  /** null = no existe todavía ningún registro con ese id. */
  async buscarRegistroMantenimientoPorId(id: string): Promise<{ usuarioId: string } | null> {
    return prisma.registroMantenimiento.findUnique({ where: { id }, select: { usuarioId: true } })
  },

  /**
   * Upsert por id. En la práctica un registro histórico no se vuelve a
   * reenviar tras el primer envío exitoso (no se edita en el cliente, ver
   * schema.prisma), pero el upsert cubre el mismo caso de reintento que
   * viajes/jornadas (ej. la app se cierra a mitad de la sincronización).
   */
  async guardarRegistroMantenimiento(usuarioId: string, registro: RegistroMantenimientoSyncEntrada): Promise<void> {
    const datos = {
      usuarioId,
      itemId: registro.itemId,
      fechaISO: new Date(registro.fechaISO),
      km: registro.km,
      costo: registro.costo,
      notas: registro.notas,
    }

    await prisma.registroMantenimiento.upsert({
      where: { id: registro.id },
      create: { id: registro.id, ...datos },
      update: datos,
    })
  },
}
