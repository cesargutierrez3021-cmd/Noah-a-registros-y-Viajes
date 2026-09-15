import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import type { PuntoGPS } from './types'
import {
  iniciarCapturaSegundoPlano,
  detenerCapturaSegundoPlano,
  suscribirsePuntosGps,
  type PuntoGpsCrudo,
} from './gpsBackground'

/**
 * Servicio de captura GPS. Única función del proyecto que habla directamente
 * con el plugin de geolocalización — el resto del dominio solo recibe PuntoGPS ya listos.
 *
 * Fase 5 / D-9: en Android nativo, esto delega en el foreground service propio
 * (GpsTrackingService + GpsTrackingPlugin, ver gpsBackground.ts), que sigue
 * capturando el recorrido con la app minimizada o la pantalla apagada.
 *
 * Fuera de Android nativo (navegador, dev en web) cae a @capacitor/geolocation,
 * que solo captura en primer plano — suficiente para desarrollar la UI, nunca
 * para un viaje real, por eso el fallback solo aplica cuando no hay plataforma
 * nativa Android disponible.
 */

export interface SeguidorGPS {
  detener: () => void
}

/**
 * 2026-09-15: intenté en un primer momento subir esto (35→50) y aflojar el
 * umbral de movimiento de abajo, con la teoría de que el filtro estaba
 * descartando movimiento real a velocidad de tráfico urbano. Una simulación
 * completa de un viaje real (parado/lento/ciudad/avenida, con ruido GPS
 * realista) demostró que esa teoría estaba MAL: con el filtro viejo el
 * cálculo da 101-106% de la distancia real incluso en el peor caso (trancón
 * total, sin ningún tramo rápido); con el filtro aflojado, sobrecuenta hasta
 * 326% en ese mismo escenario (el "anterior" sigue avanzando con cada punto
 * de precisión aceptable aunque no sume distancia — el filtro no pierde
 * movimiento real, solo lo agrupa hasta que hay suficiente desplazamiento
 * neto). Revertido — el problema real de "kilometraje en cero" está en otro
 * lado (ver `domain/viajes/store.ts`, `recorridoDefinitivo`, y el resto de
 * la investigación en PLAN-MAESTRO). No tocar este número sin volver a
 * correr esa simulación primero.
 */
const PRECISION_MAXIMA_M = 35

function puntoCrudoAPuntoGPS(punto: PuntoGpsCrudo): PuntoGPS {
  return {
    lat: punto.lat,
    lng: punto.lng,
    timestampISO: new Date(punto.timestampMs).toISOString(),
  }
}

function puntoValido(punto: PuntoGpsCrudo, anterior: PuntoGPS | null): boolean {
  if (!Number.isFinite(punto.lat) || !Number.isFinite(punto.lng)) return false
  if (punto.precisionMetros <= 0 || punto.precisionMetros > PRECISION_MAXIMA_M) return false
  if (!anterior) return true
  const a = anterior
  const R = 6371000
  const dLat = (punto.lat - a.lat) * Math.PI / 180
  const dLng = (punto.lng - a.lng) * Math.PI / 180
  const lat1 = a.lat * Math.PI / 180
  const lat2 = punto.lat * Math.PI / 180
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2
  const distanciaM = R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h))
  const dt = Math.max(0.001, (punto.timestampMs - Date.parse(a.timestampISO))/1000)
  const velocidad = distanciaM / dt
  if (dt > 30) return false
  if (velocidad > 55) return false
  if (distanciaM < Math.max(8, (punto.precisionMetros + 10) * 0.5)) return false
  return true
}

/**
 * Procesa UN punto crudo contra el "anterior" vigente — misma lógica que
 * antes vivía inline en la suscripción en vivo (`iniciarSeguimientoNativo`),
 * ahora compartida (D-18) con `filtrarRecorridoValido` de abajo, que aplica
 * el mismo criterio sobre una traza completa ya capturada (recuperación de
 * `obtenerTrazaPersistida()`), no solo en vivo punto a punto.
 */
function procesarPuntoCrudo(
  punto: PuntoGpsCrudo,
  anterior: PuntoGPS | null,
): { anteriorSiguiente: PuntoGPS | null; puntoValidoListo: PuntoGPS | null } {
  if (!puntoValido(punto, anterior)) {
    const anteriorSiguiente = punto.precisionMetros > 0 && punto.precisionMetros <= PRECISION_MAXIMA_M ? puntoCrudoAPuntoGPS(punto) : anterior
    return { anteriorSiguiente, puntoValidoListo: null }
  }
  const listo = puntoCrudoAPuntoGPS(punto)
  return { anteriorSiguiente: listo, puntoValidoListo: listo }
}

/**
 * 2026-09-15, pedido explícito del usuario: aplica el mismo filtro de
 * `puntoValido` sobre una traza COMPLETA ya capturada (no en vivo) — la usa
 * `domain/viajes/store.ts` al cerrar un viaje, para reconstruir el recorrido
 * a partir de la traza persistida por el servicio nativo (`GpsTrackingService`)
 * en vez de confiar solo en lo que alcanzó a llegar al store de JS en vivo
 * (que puede quedar incompleto si el WebView estuvo caído parte del viaje —
 * ver el comentario largo en store.ts, `recorridoDefinitivo`).
 */
export function filtrarRecorridoValido(puntos: PuntoGpsCrudo[]): PuntoGPS[] {
  let anterior: PuntoGPS | null = null
  const validos: PuntoGPS[] = []
  for (const punto of puntos) {
    const { anteriorSiguiente, puntoValidoListo } = procesarPuntoCrudo(punto, anterior)
    anterior = anteriorSiguiente
    if (puntoValidoListo) validos.push(puntoValidoListo)
  }
  return validos
}

async function iniciarSeguimientoNativo(onPunto: (p: PuntoGPS) => void): Promise<SeguidorGPS> {
  // Primero la suscripción, después arrancar el servicio: así no se pierde
  // ningún punto emitido justo al arrancar.
  let anterior: PuntoGPS | null = null
  const suscripcion = await suscribirsePuntosGps((punto) => {
    const { anteriorSiguiente, puntoValidoListo } = procesarPuntoCrudo(punto, anterior)
    anterior = anteriorSiguiente
    if (puntoValidoListo) onPunto(puntoValidoListo)
  })

  try {
    await iniciarCapturaSegundoPlano()
  } catch (error) {
    await suscripcion.remove()
    throw error instanceof Error
      ? error
      : new Error('No se pudo iniciar la captura de GPS en segundo plano')
  }

  return {
    detener: () => {
      void suscripcion.remove()
      void detenerCapturaSegundoPlano()
    },
  }
}

async function iniciarSeguimientoWeb(onPunto: (p: PuntoGPS) => void): Promise<SeguidorGPS> {
  const permiso = await Geolocation.requestPermissions()
  const concedido = permiso.location === 'granted' || permiso.coarseLocation === 'granted'
  if (!concedido) {
    throw new Error('Permiso de ubicación no concedido')
  }

  const watchId = await Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 10000 }, (posicion, error) => {
    if (error || !posicion) return
    onPunto({
      lat: posicion.coords.latitude,
      lng: posicion.coords.longitude,
      timestampISO: new Date(posicion.timestamp).toISOString(),
    })
  })

  return {
    detener: () => {
      void Geolocation.clearWatch({ id: watchId })
    },
  }
}

export async function iniciarSeguimientoGPS(onPunto: (p: PuntoGPS) => void): Promise<SeguidorGPS> {
  const esAndroidNativo = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
  return esAndroidNativo ? iniciarSeguimientoNativo(onPunto) : iniciarSeguimientoWeb(onPunto)
}

/**
 * 2026-09-15, pedido explícito del usuario: reportó un viaje de 50 metros,
 * iniciado y terminado casi de inmediato (por la burbuja), que quedó "zona no
 * detectada" tanto al inicio como al final — aunque el viaje ANTERIOR, en el
 * mismo lugar físico, sí había resuelto bien la zona. Causa real: el primer
 * fix de GPS en frío (`iniciarSeguimientoGPS`, `watchPosition`/el servicio
 * nativo) puede tardar varios segundos en llegar — un viaje tan corto puede
 * terminar ANTES de que llegue el primer punto válido, dejando `recorrido`
 * vacío (`puntoInicio`/`puntoFin` en null, ver repository.ts). Esto es un
 * pedido puntual de UNA posición (no un `watch` en curso, no pasa por el
 * filtro de `puntoValido` de arriba — no hay "anterior" con el que comparar
 * velocidad/distancia en un solo punto) para usar como último recurso cuando
 * el recorrido real quedó vacío — mejor una zona aproximada por la posición
 * actual del teléfono que "no detectada" para un viaje que sí ocurrió acá.
 */
export async function obtenerUbicacionActual(): Promise<PuntoGPS | null> {
  try {
    const posicion = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 })
    return {
      lat: posicion.coords.latitude,
      lng: posicion.coords.longitude,
      timestampISO: new Date(posicion.timestamp).toISOString(),
    }
  } catch {
    return null
  }
}
