import { create } from 'zustand'

const CLAVE = 'mia:metaDiaria:presupuestoGasolinaMensual'

interface EstadoMetaDiaria {
  /**
   * 2026-09-16, pedido explícito del usuario: "un gasto de gasolina
   * aproximado... un rango de gasolina que se me va al mes en dinero... que
   * no influya en nada más, sino solo para sacarlo de la meta diaria." A
   * propósito NO es un `Gasto` (domain/gastos) — es una proyección, nunca
   * una carga real, así que no tiene sentido en el historial de gastos ni
   * se sincroniza al backend (solo alimenta el cálculo local de la meta).
   * Solo local, mismo patrón que `plataformaPreferida` (domain/viajes/store.ts).
   */
  presupuestoGasolinaMensual: number | null
  cargar: () => void
  actualizarPresupuestoGasolina: (monto: number | null) => void
}

export const useMetaDiaria = create<EstadoMetaDiaria>((set) => ({
  presupuestoGasolinaMensual: null,

  cargar: () => {
    const crudo = localStorage.getItem(CLAVE)
    set({ presupuestoGasolinaMensual: crudo ? Number(crudo) : null })
  },

  actualizarPresupuestoGasolina: (monto) => {
    if (monto === null) localStorage.removeItem(CLAVE)
    else localStorage.setItem(CLAVE, String(monto))
    set({ presupuestoGasolinaMensual: monto })
  },
}))
