import { create } from 'zustand'
import type { CategoriaGasto, Gasto } from './types'
import { repositorioGastos } from './repository'
import { totalGastosEnRango } from './calculos'

interface DatosGastoNuevo {
  categoria: CategoriaGasto
  monto: number
  litros: number | null
  notas: string | null
  /** Si no se manda, se usa el momento actual — existe para permitir cargar un gasto de un día anterior. */
  fechaISO?: string
}

interface EstadoGastos {
  gastos: Gasto[]
  cargando: boolean
  cargar: () => Promise<void>
  agregarGasto: (datos: DatosGastoNuevo) => Promise<Gasto>
  /** Suma de montos en el rango [desdeISO, hastaISO). Sin filtro de categoría — para eso, filtrar `gastos` directo. */
  totalEnRango: (desdeISO: string, hastaISO: string) => number
}

function generarId(): string {
  return crypto.randomUUID()
}

export const useGastos = create<EstadoGastos>((set, get) => ({
  gastos: [],
  cargando: false,

  cargar: async () => {
    set({ cargando: true })
    const gastos = await repositorioGastos.listar()
    set({ gastos, cargando: false })
  },

  agregarGasto: async (datos) => {
    const gasto: Gasto = {
      id: generarId(),
      categoria: datos.categoria,
      monto: datos.monto,
      fechaISO: datos.fechaISO ?? new Date().toISOString(),
      litros: datos.litros,
      notas: datos.notas,
      pendienteDeSync: true,
    }
    await repositorioGastos.guardar(gasto)
    set({ gastos: [...get().gastos, gasto] })
    return gasto
  },

  totalEnRango: (desdeISO, hastaISO) => totalGastosEnRango(get().gastos, desdeISO, hastaISO),
}))
