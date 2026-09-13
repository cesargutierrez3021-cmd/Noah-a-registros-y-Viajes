import { create } from 'zustand'
import type { Jornada } from './types'

const CLAVE = 'mia:jornadas'

function leerTodas(): Jornada[] {
  const crudo = localStorage.getItem(CLAVE)
  return crudo ? (JSON.parse(crudo) as Jornada[]) : []
}

function escribirTodas(jornadas: Jornada[]): void {
  localStorage.setItem(CLAVE, JSON.stringify(jornadas))
}

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
  cargar: () => void
  jornadaAbierta: () => Jornada | undefined
  iniciarJornada: () => void
  terminarJornada: () => void
  /** Se llama desde la capa de orquestación (no desde domain/viajes) cuando un viaje termina. */
  agregarViajeAJornadaAbierta: (viajeId: string) => void
}

export const useJornada = create<EstadoJornada>((set, get) => ({
  jornadas: [],

  cargar: () => set({ jornadas: leerTodas() }),

  jornadaAbierta: () => get().jornadas.find((j) => j.finISO === null && esHoyLocal(j.inicioISO)),

  iniciarJornada: () => {
    if (get().jornadaAbierta()) return
    const nueva: Jornada = {
      id: crypto.randomUUID(),
      inicioISO: new Date().toISOString(),
      finISO: null,
      viajesIds: [],
    }
    const jornadas = [...get().jornadas, nueva]
    escribirTodas(jornadas)
    set({ jornadas })
  },

  terminarJornada: () => {
    const jornadas = get().jornadas.map((j) =>
      j.finISO === null && esHoyLocal(j.inicioISO) ? { ...j, finISO: new Date().toISOString() } : j
    )
    escribirTodas(jornadas)
    set({ jornadas })
  },

  agregarViajeAJornadaAbierta: (viajeId) => {
    const jornadas = get().jornadas.map((j) =>
      j.finISO === null && esHoyLocal(j.inicioISO) ? { ...j, viajesIds: [...j.viajesIds, viajeId] } : j
    )
    escribirTodas(jornadas)
    set({ jornadas })
  },
}))
