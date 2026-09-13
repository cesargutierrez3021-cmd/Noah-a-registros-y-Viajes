import { postAutenticado } from '../../lib/api'
import type { Viaje } from './types'

/**
 * POST /sync/viajes — un viaje por llamada (ver server/src/modules/sync/routes.ts
 * sobre por qué no es un batch). Se arma el payload a mano en vez de mandar
 * el `Viaje` del cliente tal cual: `pendienteDeSync` es un detalle de la cola
 * local que al backend no le importa, y `distancia` (objeto anidado del lado
 * cliente, ver types.ts) se aplana a los 3 campos sueltos que espera
 * `server/src/modules/sync/schemas.ts` — mismo criterio de siempre (D-8):
 * cliente y backend declaran sus propios shapes, uno no asume el del otro.
 */
export async function subirViaje(viaje: Viaje): Promise<void> {
  await postAutenticado<{ id: string; sincronizado: boolean }>('/sync/viajes', {
    id: viaje.id,
    plataforma: viaje.plataforma,
    estado: viaje.estado,
    inicioISO: viaje.inicioISO,
    finISO: viaje.finISO,
    recorrido: viaje.recorrido,
    kmHastaRecoger: viaje.distancia.kmHastaRecoger,
    kmConPasajero: viaje.distancia.kmConPasajero,
    kmTotalesReales: viaje.distancia.kmTotalesReales,
    distanciaReportadaPlataforma: viaje.distanciaReportadaPlataforma,
    ingreso: viaje.ingreso,
    localidad: viaje.localidad,
    zona: viaje.zona,
  })
}

