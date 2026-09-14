import { create } from 'zustand'
import type { ConceptoFijo, GastoHogar } from './types'
import { repositorioHogar } from './repository'
import { calcularGastosFijosPendientes } from './calculos'

interface EstadoHogar {
  gastos: GastoHogar[]
  conceptos: ConceptoFijo[]
  cargando: boolean
  /** Carga todo y, antes de terminar, autogenera los gastos fijos del período que falten (ver calculos.ts) — así el usuario nunca tiene que "darle a un botón" para que aparezcan. */
  cargar: () => Promise<void>
  agregarGastoUnico: (nombre: string, monto: number) => Promise<GastoHogar>
  agregarConceptoFijo: (nombre: string, montoEsperado: number, diaDelMes: number) => Promise<ConceptoFijo>
  /** El monto esperado cambia con el tiempo (ej. sube el arriendo) — se actualiza el concepto existente, nunca se crea uno nuevo para lo mismo (D-18). */
  actualizarMontoConceptoFijo: (id: string, nuevoMonto: number) => Promise<void>
  /** Desactivar, no borrar — ver el comentario de `activo` en types.ts. */
  desactivarConceptoFijo: (id: string) => Promise<void>
  conceptosActivos: () => ConceptoFijo[]
}

function generarId(): string {
  return crypto.randomUUID()
}

export const useHogar = create<EstadoHogar>((set, get) => ({
  gastos: [],
  conceptos: [],
  cargando: false,

  cargar: async () => {
    set({ cargando: true })
    const [gastos, conceptos] = await Promise.all([repositorioHogar.listarGastos(), repositorioHogar.listarConceptos()])

    const porGenerar = calcularGastosFijosPendientes(conceptos, gastos, new Date())
    const nuevos: GastoHogar[] = []
    for (const g of porGenerar) {
      const gasto: GastoHogar = {
        id: generarId(),
        nombre: g.nombre,
        monto: g.monto,
        tipo: 'fijo',
        fechaISO: g.fechaISO,
        conceptoFijoId: g.conceptoFijoId,
        pendienteDeSync: true,
      }
      await repositorioHogar.guardarGasto(gasto)
      nuevos.push(gasto)
    }

    set({ gastos: [...gastos, ...nuevos], conceptos, cargando: false })
  },

  agregarGastoUnico: async (nombre, monto) => {
    const gasto: GastoHogar = {
      id: generarId(),
      nombre,
      monto,
      tipo: 'unico',
      fechaISO: new Date().toISOString(),
      conceptoFijoId: null,
      pendienteDeSync: true,
    }
    await repositorioHogar.guardarGasto(gasto)
    set({ gastos: [...get().gastos, gasto] })
    return gasto
  },

  agregarConceptoFijo: async (nombre, montoEsperado, diaDelMes) => {
    const concepto: ConceptoFijo = {
      id: generarId(),
      nombre,
      montoEsperado,
      diaDelMes,
      activo: true,
      creadoEnISO: new Date().toISOString(),
      pendienteDeSync: true,
    }
    await repositorioHogar.guardarConcepto(concepto)
    set({ conceptos: [...get().conceptos, concepto] })
    return concepto
  },

  actualizarMontoConceptoFijo: async (id, nuevoMonto) => {
    const concepto = get().conceptos.find((c) => c.id === id)
    if (!concepto) return
    const actualizado: ConceptoFijo = { ...concepto, montoEsperado: nuevoMonto, pendienteDeSync: true }
    await repositorioHogar.guardarConcepto(actualizado)
    set({ conceptos: get().conceptos.map((c) => (c.id === id ? actualizado : c)) })
  },

  desactivarConceptoFijo: async (id) => {
    const concepto = get().conceptos.find((c) => c.id === id)
    if (!concepto) return
    const actualizado: ConceptoFijo = { ...concepto, activo: false, pendienteDeSync: true }
    await repositorioHogar.guardarConcepto(actualizado)
    set({ conceptos: get().conceptos.map((c) => (c.id === id ? actualizado : c)) })
  },

  conceptosActivos: () => get().conceptos.filter((c) => c.activo),
}))
