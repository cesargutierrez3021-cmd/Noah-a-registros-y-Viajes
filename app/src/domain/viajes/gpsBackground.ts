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
  getPersistedTrack(): Promise<{pointsJson: string}>;
  clearPersistedTrack(): Promise<void>;
  /** Solo pide el permiso (foreground + background) — no arranca el foreground service. Ver domain/onboarding. */
  solicitarPermisos(): Promise<{concedido: boolean}>;
  /**
   * 2026-09-15, bug real reportado ("la mayoría de los viajes queda en cero
   * kilómetros"): pide excluir la app de la optimización de batería — sin
   * esto, varios fabricantes (Xiaomi/Samsung/Huawei/Oppo) pueden parar la
   * captura de GPS en segundo plano en silencio. Paso explícito de
   * Onboarding; el arranque real del servicio (`beginService()`, nativo)
   * también lo pide una sola vez si el Onboarding no alcanzó a cubrirlo
   * (instalación de antes de este fix).
   */
  solicitarIgnorarOptimizacionBateria(): Promise<{exento: boolean}>;
  /**
   * 2026-09-24, pedido explícito del usuario ("mi celular... cierra todas las aplicaciones en
   * segundo plano"): intenta abrir el ajuste de batería PROPIO del fabricante (Xiaomi/Huawei/
   * Oppo/Vivo/Samsung, aparte del estándar de Android que ya pide `solicitarIgnorarOptimizacionBateria`)
   * — si no encuentra la pantalla específica de la marca, cae a "Detalles de la app" de Android.
   * `especifico` avisa cuál de las dos abrió, para poder explicarle al conductor qué buscar.
   */
  abrirAjustesDeFabricante(): Promise<{abierto: boolean; especifico: boolean}>;
  addListener(
    eventName: 'locationUpdate',
    listenerFunc: (punto: PuntoGpsCrudo) => void
  ): Promise<{ remove: () => void }>;
}

const GpsTracking = registerPlugin<GpsTrackingPlugin>('GpsTracking');

export async function iniciarCapturaSegundoPlano(): Promise<void> {
  await GpsTracking.startTracking();
}

export async function obtenerTrazaPersistida(): Promise<PuntoGpsCrudo[]> {
  const r = await GpsTracking.getPersistedTrack()
  try { return JSON.parse(r.pointsJson) as PuntoGpsCrudo[] } catch { return [] }
}

export async function limpiarTrazaPersistida(): Promise<void> {
  await GpsTracking.clearPersistedTrack()
}

export async function detenerCapturaSegundoPlano(): Promise<void> {
  await GpsTracking.stopTracking();
}

/** Onboarding (2026-09-15): pide ubicación foreground + background sin arrancar el servicio. */
export async function solicitarPermisosUbicacion(): Promise<boolean> {
  const r = await GpsTracking.solicitarPermisos()
  return r.concedido
}

/** Onboarding (2026-09-15, bug real corregido): pide excluir la app de la optimización de batería estándar de Android. */
export async function solicitarIgnorarOptimizacionBateria(): Promise<boolean> {
  const r = await GpsTracking.solicitarIgnorarOptimizacionBateria()
  return r.exento
}

/** Ajustes (2026-09-24): abre el ajuste de batería propio del fabricante — ver el comentario largo en la interfaz de arriba. */
export async function abrirAjustesDeFabricante(): Promise<{ abierto: boolean; especifico: boolean }> {
  return GpsTracking.abrirAjustesDeFabricante()
}

export function suscribirsePuntosGps(
  onPunto: (punto: PuntoGpsCrudo) => void
): Promise<{ remove: () => void }> {
  return GpsTracking.addListener('locationUpdate', onPunto);
}
