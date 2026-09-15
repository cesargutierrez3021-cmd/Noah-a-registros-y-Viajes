import { Capacitor } from '@capacitor/core'
import { solicitarPermisosUbicacion } from '../viajes/gpsBackground'
import { solicitarPermisoBurbuja } from '../viajes/burbuja'
import { pedirPermisoVoz } from '../conversacion/voz'

/**
 * Onboarding (2026-09-15, pedido explícito del usuario): los 4 permisos que
 * la app necesita, pedidos uno por uno apenas se abre por primera vez —
 * antes de mostrar ningún panel. Cada función de acá reutiliza el mismo
 * puente nativo que ya usa el resto de la app (D-18: no se duplica ninguna
 * lógica de permisos, solo se llama en un momento distinto):
 *   - notificaciones → @capacitor/local-notifications (ya es dependencia)
 *   - ubicación       → GpsTrackingPlugin.solicitarPermisos() (nuevo método nativo, mismo flujo foreground+background que ya usaba startTracking())
 *   - burbuja         → BurbujaPlugin.solicitarPermiso() (ya existía, sin exportar del lado TS)
 *   - micrófono       → domain/conversacion/voz.ts, pedirPermisoVoz() (Fase 10, sin cambios)
 *
 * Ninguna de las 4 rechaza si el usuario niega — el onboarding sigue
 * adelante igual (mismo criterio que ya aplicaba GpsTrackingPlugin al
 * permiso de background: "mejor tener parte que no tener nada"). El
 * conductor puede conceder cualquiera más tarde desde los ajustes del
 * sistema; la app no lo bloquea por no haberlo hecho acá.
 */

function esAndroidNativo(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

export async function solicitarNotificaciones(): Promise<boolean> {
  if (!esAndroidNativo()) return true
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const r = await LocalNotifications.requestPermissions()
    return r.display === 'granted'
  } catch {
    return false
  }
}

export async function solicitarUbicacion(): Promise<boolean> {
  if (!esAndroidNativo()) return true
  try {
    return await solicitarPermisosUbicacion()
  } catch {
    return false
  }
}

export async function solicitarBurbuja(): Promise<boolean> {
  if (!esAndroidNativo()) return true
  try {
    return await solicitarPermisoBurbuja()
  } catch {
    return false
  }
}

export async function solicitarMicrofono(): Promise<boolean> {
  try {
    return await pedirPermisoVoz()
  } catch {
    return false
  }
}
