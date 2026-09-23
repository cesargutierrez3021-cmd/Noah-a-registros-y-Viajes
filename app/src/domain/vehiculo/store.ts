import { create } from 'zustand'
import type { TipoVehiculo } from './types'

const CLAVE_VEHICULO = 'mia:tipoVehiculo'

function leerVehiculoGuardado(): TipoVehiculo | null {
  const crudo = localStorage.getItem(CLAVE_VEHICULO)
  return crudo === 'moto' || crudo === 'carro' || crudo === 'ambos' ? crudo : null
}

interface EstadoVehiculo {
  tipoVehiculo: TipoVehiculo
  /** true = el usuario ya pasó por el paso de elegir vehículo (Onboarding o Ajustes) al menos una vez. */
  yaElegido: boolean
  elegirVehiculo: (tipo: TipoVehiculo) => void
}

const vehiculoGuardado = leerVehiculoGuardado()

/**
 * Por defecto 'moto': todos los conductores que ya venían usando la app
 * agregaron ítems del catálogo de moto (el único que existía hasta esta
 * ronda) — no se les cambia el catálogo debajo del pie sin que lo pidan.
 * Se puede cambiar en Ajustes cuando sea (mismo criterio que el tema).
 *
 * `yaElegido` (2026-09-15, pedido explícito del usuario: elegir vehículo
 * pasa a ser un paso del Onboarding, justo después de tema) sigue el mismo
 * criterio que `domain/tema/store.ts`: mirar si hay algo guardado en
 * localStorage, no preguntarle a ningún servidor.
 */
export const useVehiculo = create<EstadoVehiculo>((set) => ({
  tipoVehiculo: vehiculoGuardado ?? 'moto',
  yaElegido: vehiculoGuardado !== null,
  elegirVehiculo: (tipoVehiculo) => {
    localStorage.setItem(CLAVE_VEHICULO, tipoVehiculo)
    set({ tipoVehiculo, yaElegido: true })
  },
}))
