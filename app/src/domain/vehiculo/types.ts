/**
 * Dominio: Vehículo
 *
 * 2026-09-15, pedido explícito del usuario: mandó un catálogo de
 * mantenimiento de carro además del de moto ("Los de carro") — varios
 * nombres chocan entre los dos catálogos (Cambio de aceite, Cambio de
 * llantas, Mantenimiento general, Batería existen en ambos con km
 * distintos), así que hace falta saber qué maneja el conductor para
 * mostrarle el catálogo correcto (ver domain/mantenimiento/reglas.ts y
 * features/trabajo/SeccionMantenimiento.tsx). Dominio chico a propósito,
 * mismo patrón que domain/tema: una sola preferencia local, sin sync.
 */
export type TipoVehiculo = 'moto' | 'carro' | 'ambos'

export const VEHICULOS_DISPONIBLES: { valor: TipoVehiculo; nombre: string; descripcion: string }[] = [
  { valor: 'moto', nombre: 'Moto', descripcion: 'Catálogo de mantenimiento para moto: aceite, llantas, balanceo, horquilla, válvulas, rodamientos.' },
  { valor: 'carro', nombre: 'Carro', descripcion: 'Catálogo de mantenimiento para carro: aceite, frenos, suspensión, batería, bujías, refrigerante.' },
  { valor: 'ambos', nombre: 'Ambos', descripcion: 'Manejas carro y moto: en Mantenimiento vas a ver las dos pestañas, una por cada catálogo.' },
]
