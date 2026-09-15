import { registerPlugin } from '@capacitor/core'

/** Lo que manda BurbujaPlugin.notificarAccion() del lado nativo al tocar la burbuja. */
export interface AccionBurbuja {
  accion: 'iniciar' | 'terminar' | 'cerrar'
  km?: number
  inicioMs?: number
  finMs?: number
  tiempoMs?: number
}

interface BurbujaPlugin {
  tienePermiso(): Promise<{concedido:boolean}>
  solicitarPermiso(): Promise<{concedido:boolean}>
  mostrar(args:{km:string;tiempo:string;enViaje:boolean;totalViajes:number}): Promise<void>
  actualizar(args:{km:string;tiempo:string;enViaje:boolean;totalViajes:number}): Promise<void>
  ocultar(): Promise<void>
  addListener(eventName: 'accion', listenerFunc: (datos: AccionBurbuja) => void): Promise<{ remove: () => void }>
}
const Burbuja = registerPlugin<BurbujaPlugin>('Burbuja')
export async function mostrarBurbuja(km:string, tiempo:string, enViaje:boolean, totalViajes:number){
  const permiso=await Burbuja.tienePermiso()
  if(!permiso.concedido){ await Burbuja.solicitarPermiso(); return }
  await Burbuja.mostrar({km,tiempo,enViaje,totalViajes})
}
export async function actualizarBurbuja(km:string, tiempo:string, enViaje:boolean, totalViajes:number){
  const permiso=await Burbuja.tienePermiso().catch(()=>({concedido:false}))
  if(!permiso.concedido) return
  await Burbuja.actualizar({km,tiempo,enViaje,totalViajes})
}
export async function ocultarBurbuja(){ await Burbuja.ocultar().catch(()=>undefined) }

/** Onboarding (2026-09-15): permiso de "dibujar sobre otras apps" — Burbuja.solicitarPermiso() ya existía en el nativo, sin exportar todavía del lado TS. */
export async function solicitarPermisoBurbuja(): Promise<boolean> {
  const r = await Burbuja.solicitarPermiso()
  return r.concedido
}

/**
 * 2026-09-15, pedido explícito del usuario: el nativo (BurbujaService.kt)
 * ya reacciona a un solo toque sobre la burbuja — inicia/termina un viaje
 * ahí mismo (con su propio reloj y su propio "Viaje iniciado"/"Viaje
 * finalizado" hablado) y avisa acá vía `notifyListeners("accion", ...)`.
 * Antes de esto, nada del lado TS escuchaba ese evento — la burbuja "hacía
 * algo" nativamente pero nunca quedaba un viaje de verdad guardado en la
 * app. Ver domain/viajes/burbujaOrquestacion.ts, que es quien usa esto.
 */
export function suscribirseAccionesBurbuja(
  onAccion: (accion: AccionBurbuja) => void,
): Promise<{ remove: () => void }> {
  return Burbuja.addListener('accion', onAccion)
}
