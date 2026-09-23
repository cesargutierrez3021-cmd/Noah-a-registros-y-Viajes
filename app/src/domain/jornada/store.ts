import { create } from 'zustand'
import type { Jornada } from './types'
import { repositorioJornadas } from './repository'
import { fechaNegocioISO } from '../../lib/fechas'

/**
 * Fase 13 (continuación): este store ahora delega toda la persistencia en
 * repositorioJornadas (antes accedía a localStorage directo, única excepción
 * al patrón de D-8 — ver repository.ts). La API pública (los nombres de estas
 * cinco funciones) NO cambió a propósito: ViajesScreen.tsx sigue funcionando
 * sin tocarlo.
 */

/**
 * 2026-09-22, corrección de un bug real encontrado en auditoría: esto comparaba
 * año/mes/día en hora LOCAL del teléfono (medianoche a medianoche), no en el día
 * de negocio de Bogotá que usa el resto de la app (`fechaNegocioISO`, lib/fechas.ts).
 * Un conductor que trabaja pasada la medianoche (turno nocturno, muy común) hacía
 * que, apenas cambiaba el día calendario del celular, `jornadaAbierta()` dejara de
 * encontrar la jornada real como "abierta" aunque siguiera corriendo — no se le
 * podían seguir agregando viajes, los gestos de la burbuja para terminarla/pausarla
 * dejaban de funcionar en silencio, y se podía abrir una segunda jornada duplicada
 * mientras la real quedaba abandonada para siempre.
 */
function esHoyBogota(iso: string): boolean {
  return fechaNegocioISO(new Date(iso)) === fechaNegocioISO()
}

interface EstadoJornada {
  jornadas: Jornada[]
  cargar: () => Promise<void>
  jornadaAbierta: () => Jornada | undefined
  iniciarJornada: () => Promise<void>
  terminarJornada: () => Promise<void>
  /** Se llama desde la capa de orquestación (no desde domain/viajes) cuando un viaje termina. */
  agregarViajeAJornadaAbierta: (viajeId: string) => Promise<void>
  /**
   * 2026-09-15, pedido explícito del usuario: "toca pausar jornada y reanudar
   * jornada... para que la gente si quiere poner doble tap, pues lo ponga y
   * no se inicie el viaje" — no hacen nada si ya está en ese estado (pausar
   * una jornada ya pausada, o reanudar una que no lo está), para que la
   * burbuja pueda mandar "alternar" sin preguntar antes en qué estado está.
   */
  pausarJornada: () => Promise<void>
  reanudarJornada: () => Promise<void>
}

export const useJornada = create<EstadoJornada>((set, get) => ({
  jornadas: [],

  cargar: async () => {
    const jornadas = await repositorioJornadas.listar()
    set({ jornadas })
  },

  jornadaAbierta: () => get().jornadas.find((j) => j.finISO === null && esHoyBogota(j.inicioISO)),

  iniciarJornada: async () => {
    if (get().jornadaAbierta()) return
    const nueva: Jornada = {
      id: crypto.randomUUID(),
      inicioISO: new Date().toISOString(),
      finISO: null,
      viajesIds: [],
      pausadaDesdeISO: null,
      msPausadosAcumulados: 0,
      pendienteDeSync: true,
    }
    await repositorioJornadas.guardar(nueva)
    set({ jornadas: [...get().jornadas, nueva] })
  },

  terminarJornada: async () => {
    const abierta = get().jornadaAbierta()
    if (!abierta) return
    // Si se termina la jornada a mitad de una pausa, esa pausa se cierra acá
    // mismo (no puede quedar "pausada desde" apuntando a un momento anterior
    // al cierre) — mismo criterio que usa `reanudarJornada`, ver abajo.
    const msPausaFinal = abierta.pausadaDesdeISO ? Math.max(0, Date.now() - new Date(abierta.pausadaDesdeISO).getTime()) : 0
    const actualizada: Jornada = {
      ...abierta,
      finISO: new Date().toISOString(),
      pausadaDesdeISO: null,
      msPausadosAcumulados: (abierta.msPausadosAcumulados ?? 0) + msPausaFinal,
      pendienteDeSync: true,
    }
    await repositorioJornadas.guardar(actualizada)
    set({ jornadas: get().jornadas.map((j) => (j.id === actualizada.id ? actualizada : j)) })
  },

  pausarJornada: async () => {
    const abierta = get().jornadaAbierta()
    if (!abierta || abierta.pausadaDesdeISO) return
    const actualizada: Jornada = { ...abierta, pausadaDesdeISO: new Date().toISOString(), pendienteDeSync: true }
    await repositorioJornadas.guardar(actualizada)
    set({ jornadas: get().jornadas.map((j) => (j.id === actualizada.id ? actualizada : j)) })
  },

  reanudarJornada: async () => {
    const abierta = get().jornadaAbierta()
    if (!abierta || !abierta.pausadaDesdeISO) return
    const msPausa = Math.max(0, Date.now() - new Date(abierta.pausadaDesdeISO).getTime())
    const actualizada: Jornada = {
      ...abierta,
      pausadaDesdeISO: null,
      msPausadosAcumulados: (abierta.msPausadosAcumulados ?? 0) + msPausa,
      pendienteDeSync: true,
    }
    await repositorioJornadas.guardar(actualizada)
    set({ jornadas: get().jornadas.map((j) => (j.id === actualizada.id ? actualizada : j)) })
  },

  agregarViajeAJornadaAbierta: async (viajeId) => {
    const abierta = get().jornadaAbierta()
    if (!abierta) return
    const actualizada: Jornada = {
      ...abierta,
      viajesIds: [...abierta.viajesIds, viajeId],
      pendienteDeSync: true,
    }
    await repositorioJornadas.guardar(actualizada)
    set({ jornadas: get().jornadas.map((j) => (j.id === actualizada.id ? actualizada : j)) })
  },
}))
