import { repositorioSync } from './repository.js'
import type { ViajeSyncEntrada, JornadaSyncEntrada, RegistroMantenimientoSyncEntrada } from './types.js'

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
}
