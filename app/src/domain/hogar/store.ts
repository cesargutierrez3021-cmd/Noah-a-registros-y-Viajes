import { create } from 'zustand'
import type { ConceptoFijo, GastoHogar } from './types'
import { repositorioHogar } from './repository'
import { calcularGastosFijosPendientesDeConfirmar, type GastoFijoPendienteConfirmar } from './calculos'

interface EstadoHogar {
  gastos: GastoHogar[]
  conceptos: ConceptoFijo[]
  cargando: boolean
  /**
   * 2026-09-17, corrección de un bug real (ver el comentario largo en
   * calculos.ts): `cargar()` ya NO autogenera gastos fijos solo — recalcula
   * `pendientesDeConfirmar` (conceptos cuya fecha de este mes ya llegó y
   * todavía no se confirmó el pago). El gasto real recién se crea cuando el
   * usuario toca "✓ Ya pagué" (`confirmarGastoFijo`).
   */
  cargar: () => Promise<void>
  /** Conceptos fijos activos cuya fecha de este mes ya llegó y todavía no se confirmó — ver SeccionHogar.tsx, botón "✓ Ya pagué". */
  pendientesDeConfirmar: GastoFijoPendienteConfirmar[]
  agregarGastoUnico: (nombre: string, monto: number) => Promise<GastoHogar>
  agregarConceptoFijo: (nombre: string, montoEsperado: number, diaDelMes: number) => Promise<ConceptoFijo>
  /** El monto esperado cambia con el tiempo (ej. sube el arriendo) — se actualiza el concepto existente, nunca se crea uno nuevo para lo mismo (D-18). */
  actualizarMontoConceptoFijo: (id: string, nuevoMonto: number) => Promise<void>
  /** Desactivar, no borrar — ver el comentario de `activo` en types.ts. */
  desactivarConceptoFijo: (id: string) => Promise<void>
  /**
   * 2026-09-17, pedido explícito del usuario ("botoncito de chulo... que yo
   * solo tenga que despichar el botón y ya calculado"): crea el GastoHogar
   * real de este concepto fijo, con el monto ya conocido del concepto (sin
   * que el usuario tenga que escribirlo) — fechado a AHORA (el momento en
   * que se confirma), no al `diaDelMes` teórico, porque lo que importa acá
   * es "cuándo se pagó de verdad".
   */
  confirmarGastoFijo: (conceptoFijoId: string) => Promise<void>
  conceptosActivos: () => ConceptoFijo[]
}

function generarId(): string {
  return crypto.randomUUID()
}

export const useHogar = create<EstadoHogar>((set, get) => ({
  gastos: [],
  conceptos: [],
  cargando: false,
  pendientesDeConfirmar: [],

  cargar: async () => {
    set({ cargando: true })
    const [gastos, conceptos] = await Promise.all([repositorioHogar.listarGastos(), repositorioHogar.listarConceptos()])
    const pendientesDeConfirmar = calcularGastosFijosPendientesDeConfirmar(conceptos, gastos, new Date())
    set({ gastos, conceptos, pendientesDeConfirmar, cargando: false })
  },

  confirmarGastoFijo: async (conceptoFijoId) => {
    const pendiente = get().pendientesDeConfirmar.find((p) => p.conceptoFijoId === conceptoFijoId)
    if (!pendiente) return
    const gasto: GastoHogar = {
      id: generarId(),
      nombre: pendiente.nombre,
      monto: pendiente.monto,
      tipo: 'fijo',
      fechaISO: new Date().toISOString(),
      conceptoFijoId: pendiente.conceptoFijoId,
      pendienteDeSync: true,
    }
    await repositorioHogar.guardarGasto(gasto)
    const gastos = [...get().gastos, gasto]
    set({
      gastos,
      pendientesDeConfirmar: calcularGastosFijosPendientesDeConfirmar(get().conceptos, gastos, new Date()),
    })
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
    const conceptos = [...get().conceptos, concepto]
    set({ conceptos, pendientesDeConfirmar: calcularGastosFijosPendientesDeConfirmar(conceptos, get().gastos, new Date()) })
    return concepto
  },

  actualizarMontoConceptoFijo: async (id, nuevoMonto) => {
    const concepto = get().conceptos.find((c) => c.id === id)
    if (!concepto) return
    const actualizado: ConceptoFijo = { ...concepto, montoEsperado: nuevoMonto, pendienteDeSync: true }
    await repositorioHogar.guardarConcepto(actualizado)
    const conceptos = get().conceptos.map((c) => (c.id === id ? actualizado : c))
    set({ conceptos, pendientesDeConfirmar: calcularGastosFijosPendientesDeConfirmar(conceptos, get().gastos, new Date()) })
  },

  desactivarConceptoFijo: async (id) => {
    const concepto = get().conceptos.find((c) => c.id === id)
    if (!concepto) return
    const actualizado: ConceptoFijo = { ...concepto, activo: false, pendienteDeSync: true }
    await repositorioHogar.guardarConcepto(actualizado)
    const conceptos = get().conceptos.map((c) => (c.id === id ? actualizado : c))
    set({ conceptos, pendientesDeConfirmar: calcularGastosFijosPendientesDeConfirmar(conceptos, get().gastos, new Date()) })
  },

  conceptosActivos: () => get().conceptos.filter((c) => c.activo),
}))
