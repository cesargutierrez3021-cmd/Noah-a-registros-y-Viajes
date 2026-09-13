import { create } from 'zustand'
import type { Jornada } from './types'
import { repositorioJornadas } from './repository'

/**
 * Fase 13 (continuación): este store ahora delega toda la persistencia en
 * repositorioJornadas (antes accedía a localStorage directo, única excepción
 * al patrón de D-8 — ver repository.ts). La API pública (los nombres de estas
 * cinco funciones) NO cambió a propósito: ViajesScreen.tsx sigue funcionando
 * sin tocarlo.
 */

function esHoyLocal(iso: string): boolean {
  const fecha = new Date(iso)
  const hoy = new Date()
  return (
    fecha.getFullYear() === hoy.getFullYear() &&
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getDate() === hoy.getDate()
  )
}

interface EstadoJornada {
  jornadas: Jornada[]
  cargar: () => Promise<void>
  jornadaAbierta: () => Jornada | undefined
  iniciarJornada: () => Promise<void>
  terminarJornada: () => Promise<void>
  /** Se llama desde la capa de orquestación (no desde domain/viajes) cuando un viaje termina. */
  agregarViajeAJornadaAbierta: (viajeId: string) => Promise<void>
}

export const useJornada = create<EstadoJornada>((set, get) => ({
  jornadas: [],

  cargar: async () => {
    const jornadas = await repositorioJornadas.listar()
    set({ jornadas })
  },

  jornadaAbierta: () => get().jornadas.find((j) => j.finISO === null && esHoyLocal(j.inicioISO)),

  iniciarJornada: async () => {
    if (get().jornadaAbierta()) return
    const nueva: Jornada = {
      id: crypto.randomUUID(),
      inicioISO: new Date().toISOString(),
      finISO: null,
      viajesIds: [],
      pendienteDeSync: true,
    }
    await repositorioJornadas.guardar(nueva)
    set({ jornadas: [...get().jornadas, nueva] })
  },

  terminarJornada: async () => {
    const abierta = get().jornadaAbierta()
    if (!abierta) return
    const actualizada: Jornada = { ...abierta, finISO: new Date().toISOString(), pendienteDeSync: true }
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
