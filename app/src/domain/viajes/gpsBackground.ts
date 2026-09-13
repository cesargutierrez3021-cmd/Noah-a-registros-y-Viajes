import { registerPlugin } from '@capacitor/core';

/**
 * Fase 5 / D-9: puente hacia el foreground service nativo de Android
 * (app/android/.../gps/GpsTrackingService.kt).
 *
 * IMPORTANTE — esto es NUEVO, todavía no está conectado a
 * domain/viajes/gps.ts ni a ViajesScreen.tsx. Esa integración es
 * intencionalmente el siguiente paso, no algo que se decidió tocar hoy
 * sin revisión (ver PLAN-MAESTRO.md).
 *
 * Cuando se conecte, la idea es que domain/viajes/gps.ts delegue en esto
 * cuando el viaje esté "en curso", en vez de usar @capacitor/geolocation
 * directamente, que es lo que hoy se corta al minimizar la app.
 */

export interface PuntoGpsCrudo {
  lat: number;
  lng: number;
  precisionMetros: number;
  timestampMs: number;
}

interface GpsTrackingPlugin {
  startTracking(): Promise<void>;
  stopTracking(): Promise<void>;
  addListener(
    eventName: 'locationUpdate',
    listenerFunc: (punto: PuntoGpsCrudo) => void
  ): Promise<{ remove: () => void }>;
}

const GpsTracking = registerPlugin<GpsTrackingPlugin>('GpsTracking');

export async function iniciarCapturaSegundoPlano(): Promise<void> {
  await GpsTracking.startTracking();
}

export async function detenerCapturaSegundoPlano(): Promise<void> {
  await GpsTracking.stopTracking();
}

export function suscribirsePuntosGps(
  onPunto: (punto: PuntoGpsCrudo) => void
): Promise<{ remove: () => void }> {
  return GpsTracking.addListener('locationUpdate', onPunto);
}
