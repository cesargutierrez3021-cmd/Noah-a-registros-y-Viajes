import { create } from 'zustand'
import type { EstiloGrafico } from './types'

const CLAVE = 'mia:estilo-grafico'
const VALORES_VALIDOS: EstiloGrafico[] = ['anillos', 'cristal3d', 'prisma']

function leerGuardado(): EstiloGrafico | null {
  const crudo = localStorage.getItem(CLAVE)
  return (VALORES_VALIDOS as string[]).includes(crudo ?? '') ? (crudo as EstiloGrafico) : null
}

interface EstadoEstiloGrafico {
  estilo: EstiloGrafico
  elegirEstilo: (estilo: EstiloGrafico) => void
}

/** Mismo patrón que domain/tema/store.ts: 'anillos' es el default (lo que ya existía antes de que el usuario pidiera opciones). */
export const useEstiloGrafico = create<EstadoEstiloGrafico>((set) => ({
  estilo: leerGuardado() ?? 'anillos',
  elegirEstilo: (estilo) => {
    localStorage.setItem(CLAVE, estilo)
    set({ estilo })
  },
}))
