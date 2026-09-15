import { prisma } from '../../lib/prisma.js'
import type { Prisma } from '@prisma/client'
import type {
  ViajeSyncEntrada,
  JornadaSyncEntrada,
  RegistroMantenimientoSyncEntrada,
  GastoSyncEntrada,
  DeudaSyncEntrada,
  AbonoDeudaSyncEntrada,
  MetaAhorroSyncEntrada,
  AbonoAhorroSyncEntrada,
  ConceptoFijoSyncEntrada,
  GastoHogarSyncEntrada,
} from './types.js'

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
      ingresoPendiente: viaje.ingresoPendiente,
      localidad: viaje.localidad,
      zona: viaje.zona,
      localidadInicio: viaje.localidadInicio ?? viaje.localidad,
      zonaInicio: viaje.zonaInicio ?? viaje.zona,
      localidadFin: viaje.localidadFin ?? viaje.localidad,
      zonaFin: viaje.zonaFin ?? viaje.zona,
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

  /** null = no existe todavía ningún gasto con ese id. */
  async buscarGastoPorId(id: string): Promise<{ usuarioId: string } | null> {
    return prisma.gasto.findUnique({ where: { id }, select: { usuarioId: true } })
  },

  /** Upsert por id — mismo criterio que los demás recursos de sync. */
  async guardarGasto(usuarioId: string, gasto: GastoSyncEntrada): Promise<void> {
    const datos = {
      usuarioId,
      categoria: gasto.categoria,
      monto: gasto.monto,
      fechaISO: new Date(gasto.fechaISO),
      litros: gasto.litros,
      notas: gasto.notas,
    }

    await prisma.gasto.upsert({
      where: { id: gasto.id },
      create: { id: gasto.id, ...datos },
      update: datos,
    })
  },

  /** null = no existe todavía ninguna deuda con ese id. */
  async buscarDeudaPorId(id: string): Promise<{ usuarioId: string } | null> {
    return prisma.deuda.findUnique({ where: { id }, select: { usuarioId: true } })
  },

  /** Upsert por id — Deuda es mutable (saldoActual cambia con cada abono), mismo criterio que Jornada. */
  async guardarDeuda(usuarioId: string, deuda: DeudaSyncEntrada): Promise<void> {
    const datos = {
      usuarioId,
      nombre: deuda.nombre,
      saldoInicial: deuda.saldoInicial,
      saldoActual: deuda.saldoActual,
      cuotaProgramada: (deuda.cuotaProgramada ?? undefined) as Prisma.InputJsonValue | undefined,
      fechaLimiteISO: deuda.fechaLimiteISO ? new Date(deuda.fechaLimiteISO) : null,
      creadaEnISO: new Date(deuda.creadaEnISO),
    }

    await prisma.deuda.upsert({
      where: { id: deuda.id },
      create: { id: deuda.id, ...datos },
      update: datos,
    })
  },

  /** null = no existe todavía ningún abono con ese id. */
  async buscarAbonoDeudaPorId(id: string): Promise<{ usuarioId: string } | null> {
    return prisma.abonoDeuda.findUnique({ where: { id }, select: { usuarioId: true } })
  },

  /**
   * Upsert por id. `deudaId` es un FK real (a diferencia de `itemId` en
   * RegistroMantenimiento) — si la deuda todavía no llegó al backend, Prisma
   * lanza P2003 (violación de FK) y esto se propaga tal cual. La traducción
   * a un error de negocio claro (409, "reintentá en un momento") se hace en
   * service.ts, no acá — mismo criterio de separación que ya usa
   * `verificarPertenencia` (el repository solo habla con la base, nunca
   * decide códigos HTTP ni arma `ErrorSync`).
   */
  async guardarAbonoDeuda(usuarioId: string, abono: AbonoDeudaSyncEntrada): Promise<void> {
    const datos = {
      usuarioId,
      deudaId: abono.deudaId,
      monto: abono.monto,
      fechaISO: new Date(abono.fechaISO),
    }

    await prisma.abonoDeuda.upsert({
      where: { id: abono.id },
      create: { id: abono.id, ...datos },
      update: datos,
    })
  },

  /** null = no existe todavía ninguna meta de ahorro con ese id. */
  async buscarMetaAhorroPorId(id: string): Promise<{ usuarioId: string } | null> {
    return prisma.metaAhorro.findUnique({ where: { id }, select: { usuarioId: true } })
  },

  /** Upsert por id — MetaAhorro es mutable (saldoActual sube con cada abono), mismo criterio que Deuda. */
  async guardarMetaAhorro(usuarioId: string, meta: MetaAhorroSyncEntrada): Promise<void> {
    const datos = {
      usuarioId,
      nombre: meta.nombre,
      montoObjetivo: meta.montoObjetivo,
      saldoActual: meta.saldoActual,
      creadaEnISO: new Date(meta.creadaEnISO),
    }

    await prisma.metaAhorro.upsert({
      where: { id: meta.id },
      create: { id: meta.id, ...datos },
      update: datos,
    })
  },

  /** null = no existe todavía ningún abono de ahorro con ese id. */
  async buscarAbonoAhorroPorId(id: string): Promise<{ usuarioId: string } | null> {
    return prisma.abonoAhorro.findUnique({ where: { id }, select: { usuarioId: true } })
  },

  /** Upsert por id. `metaId` es FK real, mismo criterio que guardarAbonoDeuda (la traducción P2003 → 409 vive en service.ts). */
  async guardarAbonoAhorro(usuarioId: string, abono: AbonoAhorroSyncEntrada): Promise<void> {
    const datos = {
      usuarioId,
      metaId: abono.metaId,
      monto: abono.monto,
      fechaISO: new Date(abono.fechaISO),
    }

    await prisma.abonoAhorro.upsert({
      where: { id: abono.id },
      create: { id: abono.id, ...datos },
      update: datos,
    })
  },

  /** null = no existe todavía ningún concepto fijo con ese id. */
  async buscarConceptoFijoPorId(id: string): Promise<{ usuarioId: string } | null> {
    return prisma.conceptoFijo.findUnique({ where: { id }, select: { usuarioId: true } })
  },

  /** Upsert por id — ConceptoFijo es mutable (montoEsperado/activo cambian con el tiempo), mismo criterio que Deuda. */
  async guardarConceptoFijo(usuarioId: string, concepto: ConceptoFijoSyncEntrada): Promise<void> {
    const datos = {
      usuarioId,
      nombre: concepto.nombre,
      montoEsperado: concepto.montoEsperado,
      diaDelMes: concepto.diaDelMes,
      activo: concepto.activo,
      creadoEnISO: new Date(concepto.creadoEnISO),
    }

    await prisma.conceptoFijo.upsert({
      where: { id: concepto.id },
      create: { id: concepto.id, ...datos },
      update: datos,
    })
  },

  /** null = no existe todavía ningún gasto de hogar con ese id. */
  async buscarGastoHogarPorId(id: string): Promise<{ usuarioId: string } | null> {
    return prisma.gastoHogar.findUnique({ where: { id }, select: { usuarioId: true } })
  },

  /**
   * Upsert por id. `conceptoFijoId` es un FK real cuando no es null (igual
   * que `AbonoDeuda.deudaId`) — si el concepto todavía no llegó al backend,
   * Prisma rechaza con P2003. La traducción a un error de negocio claro se
   * hace en service.ts, no acá (mismo criterio que guardarAbonoDeuda).
   */
  async guardarGastoHogar(usuarioId: string, gasto: GastoHogarSyncEntrada): Promise<void> {
    const datos = {
      usuarioId,
      nombre: gasto.nombre,
      monto: gasto.monto,
      tipo: gasto.tipo,
      fechaISO: new Date(gasto.fechaISO),
      conceptoFijoId: gasto.conceptoFijoId,
    }

    await prisma.gastoHogar.upsert({
      where: { id: gasto.id },
      create: { id: gasto.id, ...datos },
      update: datos,
    })
  },
}
