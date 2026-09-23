import { create } from 'zustand'
import type { EstadoAlerta, ItemMantenimiento, PlantillaItemMantenimiento, RegistroMantenimiento } from './types'
import { repositorioMantenimiento } from './repository'
import { calcularEstadoAlerta } from './reglas'

interface EstadoMantenimiento {
  items: ItemMantenimiento[]
  registros: RegistroMantenimiento[]
  cargando: boolean
  cargar: () => Promise<void>
  /**
   * 2026-09-15, pedido explícito del usuario: antes esto agregaba la
   * plantilla del catálogo TAL CUAL (km/días fijos, sin poder ajustarlos)
   * — "no todo el mundo tiene la misma moto ni hace los mismos cambios al
   * mismo tiempo". Ahora recibe también `valores`, lo que el conductor
   * eligió en la pantalla de editar antes de confirmar (criterio + su(s)
   * intervalo(s)) — la plantilla solo aporta nombre/imagen/origen.
   */
  agregarDesdeCatalogo: (
    plantilla: PlantillaItemMantenimiento,
    valores: Pick<ItemMantenimiento, 'criterio' | 'intervaloKm' | 'intervaloDias' | 'costoAproximado' | 'fijo'>,
    kmActual: number,
  ) => Promise<void>
  agregarPersonalizado: (
    datos: Pick<ItemMantenimiento, 'nombre' | 'criterio' | 'intervaloKm' | 'intervaloDias' | 'costoAproximado' | 'fijo'>,
    kmActual: number,
  ) => Promise<void>
  eliminarItem: (id: string) => Promise<void>
  marcarRealizado: (itemId: string, kmActual: number, costo: number | null, notas: string | null) => Promise<void>
  /** Edita solo el costo aproximado y la bandera "fijo" de un ítem ya agregado — ver el comentario de `fijo` en types.ts. */
  actualizarCostoYFijo: (itemId: string, costoAproximado: number | null, fijo: boolean) => Promise<void>
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

  agregarDesdeCatalogo: async (plantilla, valores, kmActual) => {
    const item: ItemMantenimiento = {
      id: generarId(),
      nombre: plantilla.nombre,
      origen: 'predefinido',
      criterio: valores.criterio,
      intervaloKm: valores.intervaloKm,
      intervaloDias: valores.intervaloDias,
      ultimoKm: kmActual,
      ultimaFechaISO: new Date().toISOString(),
      imagen: plantilla.imagen ?? null,
      costoAproximado: valores.costoAproximado ?? null,
      fijo: valores.fijo ?? false,
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

  actualizarCostoYFijo: async (itemId, costoAproximado, fijo) => {
    const item = get().items.find((i) => i.id === itemId)
    if (!item) return
    const itemActualizado: ItemMantenimiento = { ...item, costoAproximado, fijo }
    await repositorioMantenimiento.guardarItem(itemActualizado)
    set({ items: get().items.map((i) => (i.id === itemId ? itemActualizado : i)) })
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
