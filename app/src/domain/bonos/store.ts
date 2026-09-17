import { create } from 'zustand'
import type { Bono } from './types'
import { repositorioBonos } from './repository'

interface EstadoBonos {
  bonos: Bono[]
  cargando: boolean
  cargar: () => Promise<void>
  agregarBono: (monto: number) => Promise<Bono>
}

function generarId(): string {
  return crypto.randomUUID()
}

export const useBonos = create<EstadoBonos>((set, get) => ({
  bonos: [],
  cargando: false,

  cargar: async () => {
    set({ cargando: true })
    const bonos = await repositorioBonos.listar()
    set({ bonos, cargando: false })
  },

  agregarBono: async (monto) => {
    const bono: Bono = {
      id: generarId(),
      monto,
      fechaISO: new Date().toISOString(),
      pendienteDeSync: true,
    }
    await repositorioBonos.guardar(bono)
    set({ bonos: [...get().bonos, bono] })
    return bono
  },
}))
