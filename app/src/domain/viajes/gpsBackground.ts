import { registerPlugin } from '@capacitor/core';

/**
 * Fase 5 / D-9: puente hacia el foreground service nativo de Android
 * (app/android/.../gps/GpsTrackingService.kt).
 *
 * Ya está conectado: domain/viajes/gps.ts delega en esto cuando corre en
 * Android nativo, en vez de usar @capacitor/geolocation directamente (que
 * es lo que se corta al minimizar la app). Este comentario decía antes
 * "todavía no conectado" — quedó desactualizado de una sesión anterior a
 * la integración real; se corrigió al revisar el pendiente crítico de
 * Fase 5 (permiso de GPS que nunca se disparó, ver MainActivity.java y
 * PLAN-MAESTRO).
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
