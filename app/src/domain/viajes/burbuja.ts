import { registerPlugin } from '@capacitor/core'
import { useTema } from '../tema/store'
import type { Tema } from '../tema/types'

/** Lo que manda BurbujaPlugin.notificarAccion() del lado nativo al tocar la burbuja. */
export interface AccionBurbuja {
  /** 'abrirVoz' (2026-09-15): se tocó la manija — antes abría un panel resumen, ahora activa a MIA. */
  accion: 'iniciar' | 'terminar' | 'cerrar' | 'abrirVoz'
  km?: number
  inicioMs?: number
  finMs?: number
  tiempoMs?: number
}

interface ColoresBurbuja {
  colorAcento: string
  colorFg: string
  colorSurface: string
}

interface BurbujaPlugin {
  tienePermiso(): Promise<{concedido:boolean}>
  solicitarPermiso(): Promise<{concedido:boolean}>
  mostrar(args:{km:string;tiempo:string;enViaje:boolean;totalViajes:number} & ColoresBurbuja): Promise<void>
  actualizar(args:{km:string;tiempo:string;enViaje:boolean;totalViajes:number} & ColoresBurbuja): Promise<void>
  ocultar(): Promise<void>
  actualizarApariencia(args: ColoresBurbuja): Promise<void>
  addListener(eventName: 'accion', listenerFunc: (datos: AccionBurbuja) => void): Promise<{ remove: () => void }>
}
const Burbuja = registerPlugin<BurbujaPlugin>('Burbuja')

/**
 * 2026-09-15, pedido explícito del usuario: la burbuja se veía siempre con
 * un dorado fijo (los valores por defecto que trae el propio plugin nativo,
 * pensados en su momento para el tema "Carbón dorado mate") sin importar
 * qué tema tuviera activo la app — no era un tema viejo de otro proyecto,
 * era que nada del lado TS le mandaba color nunca (el nativo YA aceptaba
 * colorAcento/colorFg/colorSurface en mostrar()/actualizar()/actualizarApariencia(),
 * solo que ningún llamado se los pasaba). Se resuelve acá, un solo lugar
 * (D-18) — así ningún punto de llamada (domain/viajes/store.ts,
 * SeccionPulso.tsx) tiene que saber de temas.
 */
const COLORES_POR_TEMA: Record<Tema, ColoresBurbuja> = {
  verde: { colorAcento: '#6ee7c8', colorFg: '#f3f7f5', colorSurface: '#070a0d' },
  oro: { colorAcento: '#aa9671', colorFg: '#eeeae0', colorSurface: '#0c0c0c' },
}

function coloresDelTemaActivo(): ColoresBurbuja {
  return COLORES_POR_TEMA[useTema.getState().tema]
}

export async function mostrarBurbuja(km:string, tiempo:string, enViaje:boolean, totalViajes:number){
  const permiso=await Burbuja.tienePermiso()
  if(!permiso.concedido){ await Burbuja.solicitarPermiso(); return }
  await Burbuja.mostrar({km,tiempo,enViaje,totalViajes, ...coloresDelTemaActivo()})
}
export async function actualizarBurbuja(km:string, tiempo:string, enViaje:boolean, totalViajes:number){
  const permiso=await Burbuja.tienePermiso().catch(()=>({concedido:false}))
  if(!permiso.concedido) return
  await Burbuja.actualizar({km,tiempo,enViaje,totalViajes, ...coloresDelTemaActivo()})
}
export async function ocultarBurbuja(){ await Burbuja.ocultar().catch(()=>undefined) }

/** Llamado desde AjustesScreen.tsx al cambiar de tema — si la burbuja está visible en ese momento, se repinta sola, sin esperar al próximo mostrar()/actualizar(). */
export async function sincronizarAparienciaBurbuja(): Promise<void> {
  await Burbuja.actualizarApariencia(coloresDelTemaActivo()).catch(() => undefined)
}

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
