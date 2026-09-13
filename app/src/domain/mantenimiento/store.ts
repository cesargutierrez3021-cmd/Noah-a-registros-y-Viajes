import { create } from 'zustand'
import type { EstadoAlerta, ItemMantenimiento, PlantillaItemMantenimiento, RegistroMantenimiento } from './types'
import { repositorioMantenimiento } from './repository'
import { calcularEstadoAlerta } from './reglas'

interface EstadoMantenimiento {
  items: ItemMantenimiento[]
  registros: RegistroMantenimiento[]
  cargando: boolean
  cargar: () => Promise<void>
  agregarDesdeCatalogo: (plantilla: PlantillaItemMantenimiento, kmActual: number) => Promise<void>
  agregarPersonalizado: (
    datos: Pick<ItemMantenimiento, 'nombre' | 'criterio' | 'intervaloKm' | 'intervaloDias'>,
    kmActual: number,
  ) => Promise<void>
  eliminarItem: (id: string) => Promise<void>
  marcarRealizado: (itemId: string, kmActual: number, costo: number | null, notas: string | null) => Promise<void>
  alertas: (kmActual: number) => EstadoAlerta[]
}

function generarId(): string {
  return crypto.randomUUID()
}

export const useMantenimiento = create<EstadoMantenimiento>((set, get) => ({
  items: [],
  registros: [],
  cargando: false,

  cargar: async () => {
    set({ cargando: true })
    const [items, registros] = await Promise.all([
      repositorioMantenimiento.listarItems(),
      repositorioMantenimiento.listarRegistros(),
    ])
    set({ items, registros, cargando: false })
  },

  agregarDesdeCatalogo: async (plantilla, kmActual) => {
    const item: ItemMantenimiento = {
      id: generarId(),
      nombre: plantilla.nombre,
      origen: 'predefinido',
      criterio: plantilla.criterio,
      intervaloKm: plantilla.intervaloKm,
      intervaloDias: plantilla.intervaloDias,
      ultimoKm: kmActual,
      ultimaFechaISO: new Date().toISOString(),
    }
    await repositorioMantenimiento.guardarItem(item)
    set({ items: [...get().items, item] })
  },

  agregarPersonalizado: async (datos, kmActual) => {
    const item: ItemMantenimiento = {
      id: generarId(),
      origen: 'personalizado',
      ultimoKm: kmActual,
      ultimaFechaISO: new Date().toISOString(),
      ...datos,
    }
    await repositorioMantenimiento.guardarItem(item)
    set({ items: [...get().items, item] })
  },

  eliminarItem: async (id) => {
    await repositorioMantenimiento.eliminarItem(id)
    set({ items: get().items.filter((i) => i.id !== id) })
  },

  marcarRealizado: async (itemId, kmActual, costo, notas) => {
    const item = get().items.find((i) => i.id === itemId)
    if (!item) return

    const ahoraISO = new Date().toISOString()
    const registro: RegistroMantenimiento = {
      id: generarId(),
      itemId,
      fechaISO: ahoraISO,
      km: kmActual,
      costo,
      notas,
      pendienteDeSync: true,
    }
    await repositorioMantenimiento.guardarRegistro(registro)

    const itemActualizado: ItemMantenimiento = { ...item, ultimoKm: kmActual, ultimaFechaISO: ahoraISO }
    await repositorioMantenimiento.guardarItem(itemActualizado)

    set({
      items: get().items.map((i) => (i.id === itemId ? itemActualizado : i)),
      registros: [...get().registros, registro],
    })
  },

  alertas: (kmActual) => get().items.map((item) => calcularEstadoAlerta(item, kmActual)),
}))
