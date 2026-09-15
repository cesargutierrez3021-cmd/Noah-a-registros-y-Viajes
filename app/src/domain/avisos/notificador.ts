import { Capacitor } from '@capacitor/core'
import type { Aviso } from './types'

const CLAVE_YA_NOTIFICADOS = 'mia:avisos-notificados'

function esAndroidNativo(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

function leerYaNotificados(): Set<string> {
  try {
    const crudo = localStorage.getItem(CLAVE_YA_NOTIFICADOS)
    return new Set(crudo ? (JSON.parse(crudo) as string[]) : [])
  } catch {
    return new Set()
  }
}

function guardarYaNotificados(ids: Set<string>): void {
  // Máximo 500 — un Set que crece para siempre (deudas/conceptos fijos van
  // generando un id nuevo por cada vencimiento, ver `calculos.ts`, el sufijo
  // de fecha en el id) es una fuga lenta de localStorage. Se recorta a los
  // más recientes en vez de limpiar por fecha — no hace falta ser exacto acá.
  const lista = Array.from(ids).slice(-500)
  localStorage.setItem(CLAVE_YA_NOTIFICADOS, JSON.stringify(lista))
}

/** ID numérico estable para @capacitor/local-notifications (pide un número, no un string) — hash simple, alcanza para este volumen de avisos. */
function idNumerico(idAviso: string): number {
  let h = 0
  for (let i = 0; i < idAviso.length; i++) h = (h * 31 + idAviso.charCodeAt(i)) | 0
  return Math.abs(h) % 2_147_483_647
}

/**
 * 2026-09-15, pedido explícito del usuario: notificaciones reales de
 * deudas/gastos fijos/mantenimientos por vencer. Se llama cada vez que se
 * recalculan los avisos (ver features/avisos/AvisoBanner.tsx) — dispara una
 * notificación local SOLO para avisos que todavía no se habían mandado
 * (deduplicado acá, en `localStorage`, para no repetir la misma notificación
 * en cada recálculo). En navegador/iOS no hace nada (silencioso, mismo
 * patrón que el resto de los puentes nativos de este proyecto).
 */
export async function notificarAvisosNuevos(avisos: Aviso[]): Promise<void> {
  if (!esAndroidNativo() || avisos.length === 0) return

  const yaNotificados = leerYaNotificados()
  const nuevos = avisos.filter((a) => !yaNotificados.has(a.id))
  if (nuevos.length === 0) return

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const permiso = await LocalNotifications.checkPermissions()
    if (permiso.display !== 'granted') return

    await LocalNotifications.schedule({
      notifications: nuevos.map((a) => ({
        id: idNumerico(a.id),
        title: a.severidad === 'vencido' ? `Vencido: ${a.titulo}` : `Por vencer: ${a.titulo}`,
        body: a.detalle,
        schedule: { at: new Date(Date.now() + 500) },
      })),
    })

    nuevos.forEach((a) => yaNotificados.add(a.id))
    guardarYaNotificados(yaNotificados)
  } catch {
    // best-effort — un fallo acá no debe tumbar el banner en pantalla, que ya muestra lo mismo.
  }
}
