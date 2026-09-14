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

function puntoCrudoAPuntoGPS(punto: PuntoGpsCrudo): PuntoGPS {
  return {
    lat: punto.lat,
    lng: punto.lng,
    timestampISO: new Date(punto.timestampMs).toISOString(),
  }
}

function puntoValido(punto: PuntoGpsCrudo, anterior: PuntoGPS | null): boolean {
  if (!Number.isFinite(punto.lat) || !Number.isFinite(punto.lng)) return false
  if (punto.precisionMetros <= 0 || punto.precisionMetros > 35) return false
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

async function iniciarSeguimientoNativo(onPunto: (p: PuntoGPS) => void): Promise<SeguidorGPS> {
  // Primero la suscripción, después arrancar el servicio: así no se pierde
  // ningún punto emitido justo al arrancar.
  let anterior: PuntoGPS | null = null
  const suscripcion = await suscribirsePuntosGps((punto) => {
    if (!puntoValido(punto, anterior)) {
      if (punto.precisionMetros <= 35) anterior = puntoCrudoAPuntoGPS(punto)
      return
    }
    const listo = puntoCrudoAPuntoGPS(punto)
    anterior = listo
    onPunto(listo)
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
