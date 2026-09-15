import { create } from 'zustand'
import type { TipoVehiculo } from './types'

const CLAVE_VEHICULO = 'mia:tipoVehiculo'

function leerVehiculoGuardado(): TipoVehiculo | null {
  const crudo = localStorage.getItem(CLAVE_VEHICULO)
  return crudo === 'moto' || crudo === 'carro' ? crudo : null
}

interface EstadoVehiculo {
  tipoVehiculo: TipoVehiculo
  elegirVehiculo: (tipo: TipoVehiculo) => void
}

/**
 * Por defecto 'moto': todos los conductores que ya venían usando la app
 * agregaron ítems del catálogo de moto (el único que existía hasta esta
 * ronda) — no se les cambia el catálogo debajo del pie sin que lo pidan.
 * Se puede cambiar en Ajustes cuando sea (mismo criterio que el tema).
 */
export const useVehiculo = create<EstadoVehiculo>((set) => ({
  tipoVehiculo: leerVehiculoGuardado() ?? 'moto',
  elegirVehiculo: (tipoVehiculo) => {
    localStorage.setItem(CLAVE_VEHICULO, tipoVehiculo)
    set({ tipoVehiculo })
  },
}))
