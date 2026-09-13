import type { PuntoGPS, DistanciaReal, CierreViajeInput } from './types'

/**
 * Única función en todo el proyecto que calcula distancia a partir de puntos GPS.
 * Si en el futuro se necesita este cálculo en otro módulo (mantenimiento, estadísticas),
 * se importa de aquí — no se reescribe.
 */
function distanciaEntrePuntosKm(a: PuntoGPS, b: PuntoGPS): number {
  const R = 6371 // radio de la Tierra en km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return R * c
}

function distanciaRecorridoKm(recorrido: PuntoGPS[]): number {
  let total = 0
  for (let i = 1; i < recorrido.length; i++) {
    total += distanciaEntrePuntosKm(recorrido[i - 1], recorrido[i])
  }
  return total
}

/**
 * Divide el recorrido completo en dos tramos: antes de recoger al pasajero
 * y con el pasajero a bordo. Requisito: "medición real del conductor" (Fase 2, punto 8).
 */
export function calcularDistanciaReal(input: CierreViajeInput): DistanciaReal {
  const { recorrido, puntoDeRecogidaISO } = input

  if (!puntoDeRecogidaISO) {
    // No hubo tramo de recogida registrado (ej. viaje particular, o el GPS solo capturó
    // desde que el pasajero ya estaba a bordo): todo el recorrido cuenta como "con pasajero".
    const kmConPasajero = distanciaRecorridoKm(recorrido)
    return { kmHastaRecoger: 0, kmConPasajero, kmTotalesReales: kmConPasajero }
  }

  const indiceCorte = recorrido.findIndex((p) => p.timestampISO >= puntoDeRecogidaISO)
  const tramoRecogida = indiceCorte === -1 ? recorrido : recorrido.slice(0, indiceCorte + 1)
  const tramoConPasajero = indiceCorte === -1 ? [] : recorrido.slice(indiceCorte)

  const kmHastaRecoger = distanciaRecorridoKm(tramoRecogida)
  const kmConPasajero = distanciaRecorridoKm(tramoConPasajero)

  return {
    kmHastaRecoger,
    kmConPasajero,
    kmTotalesReales: kmHastaRecoger + kmConPasajero,
  }
}
