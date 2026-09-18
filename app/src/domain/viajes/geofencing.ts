/**
 * Fase 5 / D-7: motor de zonas local, sin API externa por viaje.
 *
 * Se conecta en `crearViajeDesdeCiere` (repository.ts), donde `localidad`/`zona`
 * se resuelven contra este motor. El set de zonas por defecto son las 20
 * localidades oficiales de Bogotá (ver zonasBogota.ts) — decisión tomada con
 * el usuario en Fase 5.
 */

import { ZONAS_BOGOTA } from './zonasBogota'

export interface PuntoGPS {
  lat: number
  lng: number
}

export interface Zona {
  id: string
  nombre: string
  /**
   * Uno o más anillos simples. La mayoría de zonas tienen un solo anillo;
   * algunas (ej. Santa Fe en Bogotá) tienen más de uno porque su territorio
   * administrativo real está partido en más de un área. Un punto pertenece
   * a la zona si cae dentro de CUALQUIERA de sus anillos (unión, no resta) —
   * ninguna de las zonas cargadas hoy usa un anillo como hueco/exclusión.
   */
  poligono: PuntoGPS[][]
}

/** Zonas activas por defecto: las 20 localidades de Bogotá (D-7). */
export const ZONAS: Zona[] = ZONAS_BOGOTA

/**
 * Ray casting: determina si un punto está dentro de un anillo simple.
 * Suficiente para polígonos de escala de ciudad; no corrige curvatura
 * terrestre (innecesario a esta escala).
 */
function puntoDentroDeAnillo(punto: PuntoGPS, anillo: PuntoGPS[]): boolean {
  let dentro = false
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const vi = anillo[i]
    const vj = anillo[j]

    const cruzaEnY = vi.lat > punto.lat !== vj.lat > punto.lat
    if (!cruzaEnY) continue

    const xInterseccion =
      ((vj.lng - vi.lng) * (punto.lat - vi.lat)) / (vj.lat - vi.lat) + vi.lng

    if (punto.lng < xInterseccion) {
      dentro = !dentro
    }
  }
  return dentro
}

function puntoDentroDeZona(punto: PuntoGPS, zona: Zona): boolean {
  return zona.poligono.some((anillo) => puntoDentroDeAnillo(punto, anillo))
}

/**
 * Dado un punto GPS, devuelve el nombre de la zona/localidad a la que
 * pertenece, o null si no cae en ninguna zona conocida (ej. fuera de Bogotá).
 *
 * Si el punto cae en zonas superpuestas (no debería pasar con localidades
 * oficiales, pero por si se agregan zonas custom más adelante), devuelve la
 * primera coincidencia en el orden del array.
 */
export function obtenerZona(punto: PuntoGPS, zonas: Zona[] = ZONAS): string | null {
  for (const zona of zonas) {
    if (puntoDentroDeZona(punto, zona)) {
      return zona.nombre
    }
  }
  return null
}
