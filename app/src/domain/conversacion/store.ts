import { create } from 'zustand'
import { escucharUnaFrase, hablar, detenerHabla, listarVocesDisponibles, type VozDisponible } from './voz'
import { enviarTurnoConversacion, type ContextoConversacionEnvio } from './api'
import type { EstadoConversacion, TurnoConversacion } from './types'

const CLAVE_VOZ = 'mia:voz:nombre'
const CLAVE_TONO = 'mia:voz:tono'
const FRASE_DE_PRUEBA = 'Hola, así va a sonar mi voz de ahora en adelante.'

function leerVozGuardada(): string | null {
  return localStorage.getItem(CLAVE_VOZ)
}

function leerTonoGuardado(): number {
  const crudo = Number(localStorage.getItem(CLAVE_TONO))
  return Number.isFinite(crudo) && crudo > 0 ? crudo : 1.0
}

/**
 * Store del dominio de Conversación (Fase 10). Sin persistencia a propósito
 * (ver types.ts) — `turnos` vive solo mientras la pantalla de conversación
 * está abierta. Cerrar la app o navegar a otra pantalla y volver empieza una
 * conversación nueva y vacía.
 *
 * `contexto` NO se arma acá — lo recibe como parámetro en `escucharYResponder`,
 * armado por la capa de orquestación (ConversacionScreen.tsx), siguiendo el
 * mismo principio de D-10: este store solo conoce conversación, nunca lee
 * directamente domain/viajes ni domain/mantenimiento.
 */

interface EstadoStoreConversacion {
  estado: EstadoConversacion
  turnos: TurnoConversacion[]
  ultimoError: string | null
  /**
   * 2026-09-15, pedido explícito del usuario: la manija de la burbuja
   * flotante activa a MIA sin que el conductor tenga que navegar nada — ver
   * domain/viajes/burbujaOrquestacion.ts (quien llama `solicitarAperturaConVoz`)
   * y features/mia/MiaBurbuja.tsx (quien lo consume: abre el panel Y arranca
   * a escuchar solo, apenas el permiso de micrófono esté listo).
   */
  aperturaConVozSolicitada: boolean
  solicitarAperturaConVoz: () => void
  limpiarSolicitudApertura: () => void
  /** Escucha una frase, la manda al backend, y lee la respuesta en voz alta. */
  escucharYResponder: (contexto?: ContextoConversacionEnvio) => Promise<void>
  cancelar: () => void
  reiniciarConversacion: () => void
  /**
   * 2026-09-23, pedido explícito del usuario ("no me gusta ese tono de voz"): preferencia de
   * TTS persistida (localStorage, mismo patrón que `domain/tema`) — `vozElegida` null =
   * usar la voz por defecto del motor del teléfono. `tono` (pitch) siempre aplica, elegida
   * voz o no, porque algunos teléfonos solo traen una voz en español instalada.
   */
  vozElegida: string | null
  tono: number
  vocesDisponibles: VozDisponible[]
  cargarVocesDisponibles: () => Promise<void>
  elegirVoz: (nombre: string | null) => void
  elegirTono: (tono: number) => void
  probarVoz: () => Promise<void>
}

export const useConversacion = create<EstadoStoreConversacion>((set, get) => ({
  estado: 'inactiva',
  turnos: [],
  ultimoError: null,
  aperturaConVozSolicitada: false,
  solicitarAperturaConVoz: () => set({ aperturaConVozSolicitada: true }),
  limpiarSolicitudApertura: () => set({ aperturaConVozSolicitada: false }),

  vozElegida: leerVozGuardada(),
  tono: leerTonoGuardado(),
  vocesDisponibles: [],
  cargarVocesDisponibles: async () => {
    const voces = await listarVocesDisponibles()
    set({ vocesDisponibles: voces })
  },
  elegirVoz: (nombre) => {
    if (nombre) localStorage.setItem(CLAVE_VOZ, nombre)
    else localStorage.removeItem(CLAVE_VOZ)
    set({ vozElegida: nombre })
  },
  elegirTono: (tono) => {
    localStorage.setItem(CLAVE_TONO, String(tono))
    set({ tono })
  },
  probarVoz: async () => {
    const { vozElegida, tono } = get()
    await hablar(FRASE_DE_PRUEBA, { vozNombre: vozElegida, tono })
  },

  escucharYResponder: async (contextoBase) => {
    set({ estado: 'escuchando', ultimoError: null })

    let texto: string
    try {
      texto = await escucharUnaFrase()
    } catch (error) {
      set({ estado: 'error', ultimoError: mensajeDeError(error) })
      return
    }

    set({ estado: 'procesando' })

    let respuesta: string
    try {
      const contexto: ContextoConversacionEnvio = {
        ...contextoBase,
        turnosPrevios: get().turnos,
      }
      const resultado = await enviarTurnoConversacion(texto, contexto)
      respuesta = resultado.respuesta
    } catch (error) {
      set({ estado: 'error', ultimoError: mensajeDeError(error) })
      return
    }

    set({
      estado: 'hablando',
      turnos: [...get().turnos, { pregunta: texto, respuesta }],
    })

    try {
      await hablar(respuesta, { vozNombre: get().vozElegida, tono: get().tono })
    } catch (error) {
      // La respuesta ya quedó guardada en `turnos` (se puede mostrar en
      // pantalla como texto) aunque falle la lectura en voz alta — un fallo
      // de TTS no debería borrar la respuesta que sí se consiguió.
      set({ estado: 'error', ultimoError: mensajeDeError(error) })
      return
    }

    set({ estado: 'inactiva' })
  },

  cancelar: () => {
    void detenerHabla()
    set({ estado: 'inactiva' })
  },

  reiniciarConversacion: () => set({ turnos: [], estado: 'inactiva', ultimoError: null }),
}))

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
}
