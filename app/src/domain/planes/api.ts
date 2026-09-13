import { get, getAutenticado } from '../../lib/api'
import type { Plan } from './types'

/** GET /planes — catálogo público, no necesita sesión. */
export async function listarPlanes(): Promise<Plan[]> {
  return get<Plan[]>('/planes')
}

/** GET /planes/actual — el plan activo del usuario logueado. */
export async function obtenerPlanActual(): Promise<Plan> {
  return getAutenticado<Plan>('/planes/actual')
}
