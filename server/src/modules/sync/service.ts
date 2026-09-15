import { repositorioSync } from './repository.js'
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

export class ErrorSync extends Error {
  constructor(
    message: string,
    public codigoHttp: number,
  ) {
    super(message)
  }
}

/**
 * Compartido por los tres recursos de sync: si ya existe una fila con este id
 * pero de OTRO usuario, se rechaza. Ver el comentario original de
 * `sincronizarViaje` (más abajo) para el razonamiento completo — se factorizó
 * acá porque jornadas y registros de mantenimiento repiten exactamente la
 * misma regla, no porque haya cambiado el criterio.
 */
function verificarPertenencia(usuarioId: string, existente: { usuarioId: string } | null, mensaje: string): void {
  if (existente && existente.usuarioId !== usuarioId) {
    throw new ErrorSync(mensaje, 403)
  }
}

export const servicioSync = {
  /**
   * Reglas, en orden:
   * 1. Si el id ya existe pero pertenece a OTRO usuario, se rechaza (403). No
   *    debería pasar nunca en la práctica (el id es un UUID generado en el
   *    cliente, la probabilidad de colisión es despreciable) pero es barato
   *    de verificar y cierra por completo la posibilidad de que un usuario
   *    sobrescriba el viaje de otro adivinando o reutilizando un id — mismo
   *    criterio de "nunca confiar solo en lo que manda el cliente" que ya se
   *    aplicó en Fase 12 (D-15, auditoría de usuarioId por JWT). El logging
   *    de este caso (evento de seguridad) se hace en routes.ts, no acá —
   *    este servicio no tiene acceso a la IP del request (D-8: separación de
   *    capas), mismo patrón que auth/routes.ts con `login_fallido`.
   * 2. Si no hay conflicto, upsert — mismo id ya existente del mismo usuario
   *    = actualización (dedupe real, no crea una segunda fila). Id nuevo =
   *    inserción.
   */
  async sincronizarViaje(usuarioId: string, viaje: ViajeSyncEntrada): Promise<void> {
    const existente = await repositorioSync.buscarViajePorId(viaje.id)
    verificarPertenencia(usuarioId, existente, 'Este viaje ya pertenece a otra cuenta.')
    await repositorioSync.guardarViaje(usuarioId, viaje)
  },

  /** Mismo criterio que sincronizarViaje. Ver schema.prisma (modelo Jornada) sobre por qué se reenvía varias veces mientras está abierta. */
  async sincronizarJornada(usuarioId: string, jornada: JornadaSyncEntrada): Promise<void> {
    const existente = await repositorioSync.buscarJornadaPorId(jornada.id)
    verificarPertenencia(usuarioId, existente, 'Esta jornada ya pertenece a otra cuenta.')
    await repositorioSync.guardarJornada(usuarioId, jornada)
  },

  /** Mismo criterio que sincronizarViaje. Ver schema.prisma (modelo RegistroMantenimiento) sobre por qué solo se sincronizan registros, no ítems. */
  async sincronizarRegistroMantenimiento(usuarioId: string, registro: RegistroMantenimientoSyncEntrada): Promise<void> {
    const existente = await repositorioSync.buscarRegistroMantenimientoPorId(registro.id)
    verificarPertenencia(usuarioId, existente, 'Este registro ya pertenece a otra cuenta.')
    await repositorioSync.guardarRegistroMantenimiento(usuarioId, registro)
  },

  /** Mismo criterio que sincronizarViaje. Ver schema.prisma (modelo Gasto). */
  async sincronizarGasto(usuarioId: string, gasto: GastoSyncEntrada): Promise<void> {
    const existente = await repositorioSync.buscarGastoPorId(gasto.id)
    verificarPertenencia(usuarioId, existente, 'Este gasto ya pertenece a otra cuenta.')
    await repositorioSync.guardarGasto(usuarioId, gasto)
  },

  /** Mismo criterio que sincronizarViaje. Ver schema.prisma (modelo Deuda) sobre por qué esta sí se sincroniza mutable, sin soporte de borrado. */
  async sincronizarDeuda(usuarioId: string, deuda: DeudaSyncEntrada): Promise<void> {
    const existente = await repositorioSync.buscarDeudaPorId(deuda.id)
    verificarPertenencia(usuarioId, existente, 'Esta deuda ya pertenece a otra cuenta.')
    await repositorioSync.guardarDeuda(usuarioId, deuda)
  },

  /**
   * Mismo criterio de pertenencia que los demás, más una traducción de error
   * específica de este recurso: `deudaId` es un FK real (ver schema.prisma),
   * así que si la deuda todavía no llegó al backend, Prisma rechaza el
   * insert con P2003. Se traduce acá a un 409 con mensaje claro — el cliente
   * ya intenta evitar este caso (domain/deudas/sync.ts sube la deuda antes
   * que sus abonos), pero esta es la garantía real del lado del servidor,
   * no una simple optimización.
   */
  async sincronizarAbonoDeuda(usuarioId: string, abono: AbonoDeudaSyncEntrada): Promise<void> {
    const existente = await repositorioSync.buscarAbonoDeudaPorId(abono.id)
    verificarPertenencia(usuarioId, existente, 'Este abono ya pertenece a otra cuenta.')
    try {
      await repositorioSync.guardarAbonoDeuda(usuarioId, abono)
    } catch (err) {
      const esViolacionDeFK = typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2003'
      if (esViolacionDeFK) {
        throw new ErrorSync('La deuda de este abono todavía no está sincronizada. Reintentá en un momento.', 409)
      }
      throw err
    }
  },

  /** Mismo criterio que sincronizarDeuda, invertido: ver schema.prisma (modelo MetaAhorro) sobre por qué saldoActual sube en vez de bajar. */
  async sincronizarMetaAhorro(usuarioId: string, meta: MetaAhorroSyncEntrada): Promise<void> {
    const existente = await repositorioSync.buscarMetaAhorroPorId(meta.id)
    verificarPertenencia(usuarioId, existente, 'Esta meta de ahorro ya pertenece a otra cuenta.')
    await repositorioSync.guardarMetaAhorro(usuarioId, meta)
  },

  /** Mismo criterio que sincronizarAbonoDeuda (incluida la traducción P2003 → 409), `metaId` en vez de `deudaId`. */
  async sincronizarAbonoAhorro(usuarioId: string, abono: AbonoAhorroSyncEntrada): Promise<void> {
    const existente = await repositorioSync.buscarAbonoAhorroPorId(abono.id)
    verificarPertenencia(usuarioId, existente, 'Este abono ya pertenece a otra cuenta.')
    try {
      await repositorioSync.guardarAbonoAhorro(usuarioId, abono)
    } catch (err) {
      const esViolacionDeFK = typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2003'
      if (esViolacionDeFK) {
        throw new ErrorSync('La meta de este abono todavía no está sincronizada. Reintentá en un momento.', 409)
      }
      throw err
    }
  },

  /** Mismo criterio que sincronizarDeuda. Ver schema.prisma (modelo ConceptoFijo) sobre por qué es mutable, sin soporte de borrado. */
  async sincronizarConceptoFijo(usuarioId: string, concepto: ConceptoFijoSyncEntrada): Promise<void> {
    const existente = await repositorioSync.buscarConceptoFijoPorId(concepto.id)
    verificarPertenencia(usuarioId, existente, 'Este concepto fijo ya pertenece a otra cuenta.')
    await repositorioSync.guardarConceptoFijo(usuarioId, concepto)
  },

  /**
   * Mismo criterio de pertenencia que los demás, más la misma traducción de
   * FK que sincronizarAbonoDeuda: `conceptoFijoId` (cuando no es null) es un
   * FK real hacia ConceptoFijo — si ese concepto todavía no llegó al
   * backend, Prisma rechaza con P2003. El cliente ya intenta evitar este
   * caso (domain/hogar/sync.ts sube los conceptos antes que sus gastos),
   * esta es la garantía real del lado del servidor.
   */
  async sincronizarGastoHogar(usuarioId: string, gasto: GastoHogarSyncEntrada): Promise<void> {
    const existente = await repositorioSync.buscarGastoHogarPorId(gasto.id)
    verificarPertenencia(usuarioId, existente, 'Este gasto de hogar ya pertenece a otra cuenta.')
    try {
      await repositorioSync.guardarGastoHogar(usuarioId, gasto)
    } catch (err) {
      const esViolacionDeFK = typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2003'
      if (esViolacionDeFK) {
        throw new ErrorSync('El concepto fijo de este gasto todavía no está sincronizado. Reintentá en un momento.', 409)
      }
      throw err
    }
  },
}
