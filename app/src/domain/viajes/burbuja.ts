import { registerPlugin } from '@capacitor/core'
import { useTema } from '../tema/store'
import type { Tema } from '../tema/types'

/** Lo que manda BurbujaPlugin.notificarAccion() del lado nativo al tocar la burbuja. */
export interface AccionBurbuja {
  /**
   * 'abrirVoz' (2026-09-15): se tocó la manija — antes abría un panel resumen,
   * ahora activa a MIA. 'terminarJornada'/'alternarPausaJornada' (2026-09-15,
   * misma sesión, ronda posterior): mantener la burbuja presionada 2s termina
   * la jornada (y la burbuja se cierra sola, del lado nativo); doble-tap
   * pausa/reanuda — ver BurbujaService.kt y burbujaOrquestacion.ts.
   *
   * 'recogida' (2026-09-22, pedido explícito del usuario): antes un solo toque
   * alternaba iniciar/terminar, y la "zona de inicio" del viaje se resolvía en
   * el momento de aceptar el servicio (toque 1) — que casi nunca es donde se
   * recoge al pasajero de verdad. Ahora son 3 toques: iniciar (arranca GPS/km
   * igual que siempre) → recogida (acá se marca dónde se recogió al pasajero,
   * ver `marcarRecogida` en store.ts) → terminar. Ver BurbujaService.kt.
   */
  accion: 'iniciar' | 'recogida' | 'terminar' | 'cerrar' | 'abrirVoz' | 'terminarJornada' | 'alternarPausaJornada'
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
  viajesPendientes(): Promise<{viajesJson: string}>
  limpiarViajesPendientes(): Promise<void>
  addListener(eventName: 'accion', listenerFunc: (datos: AccionBurbuja) => void): Promise<{ remove: () => void }>
}
const Burbuja = registerPlugin<BurbujaPlugin>('Burbuja')

/**
 * 2026-09-23, pedido explícito del usuario (bug real: "hice 5 o 6 viajes con la burbuja sin
 * abrir la app... me acumuló todos en un solo viaje de 63 km"). Un viaje que la burbuja cierra
 * sola, sin la app abierta (`BurbujaService.kt`, `finalizarViaje` → `encolarViajePendiente`)
 * — ver el comentario largo ahí para la causa completa del bug. `puntosJson` es un
 * `PuntoGpsCrudo[]` serializado, ya recortado por el nativo al rango de tiempo de ESE viaje
 * (no toda la traza de la jornada).
 */
export interface ViajePendienteNativo {
  km: number
  inicioMs: number
  /** 0 = nunca se marcó "recogida" para este viaje (mismo criterio que `puntoDeRecogidaISO: null`). */
  recogidaMs: number
  finMs: number
  tiempoMs: number
  puntosJson: string
}

/** La cola completa de viajes que la burbuja cerró sola desde la última vez que se llamó a `limpiarViajesPendientesNativos()`. */
export async function obtenerViajesPendientesNativos(): Promise<ViajePendienteNativo[]> {
  const r = await Burbuja.viajesPendientes()
  try { return JSON.parse(r.viajesJson) as ViajePendienteNativo[] } catch { return [] }
}

export async function limpiarViajesPendientesNativos(): Promise<void> {
  await Burbuja.limpiarViajesPendientes().catch(() => undefined)
}

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
  papel: { colorAcento: '#161615', colorFg: '#161615', colorSurface: '#fafaf9' },
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
