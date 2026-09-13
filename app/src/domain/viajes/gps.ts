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

async function iniciarSeguimientoNativo(onPunto: (p: PuntoGPS) => void): Promise<SeguidorGPS> {
  // Primero la suscripción, después arrancar el servicio: así no se pierde
  // ningún punto emitido justo al arrancar.
  const suscripcion = await suscribirsePuntosGps((punto) => onPunto(puntoCrudoAPuntoGPS(punto)))

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
