import { create } from 'zustand'
import type { Tema } from './types'

const CLAVE_TEMA = 'mia:tema'

function aplicarAlDocumento(tema: Tema): void {
  document.documentElement.setAttribute('data-tema', tema)
}

function leerTemaGuardado(): Tema | null {
  const crudo = localStorage.getItem(CLAVE_TEMA)
  return crudo === 'verde' || crudo === 'oro' ? crudo : null
}

interface EstadoTema {
  tema: Tema
  /** true = el usuario ya pasó por la pantalla de elegir tema (Onboarding) al menos una vez. */
  yaElegido: boolean
  elegirTema: (tema: Tema) => void
}

/**
 * El tema se aplica al <html> apenas se importa este módulo (antes de que
 * React monte nada) — así no hay un parpadeo del tema por defecto seguido
 * del tema guardado. `yaElegido` es lo que decide si OnboardingScreen se
 * muestra: mismo criterio simple que `haySesion()` en lib/api.ts (mirar si
 * hay algo guardado, no preguntarle a ningún servidor).
 */
const temaGuardado = leerTemaGuardado()
aplicarAlDocumento(temaGuardado ?? 'verde')

export const useTema = create<EstadoTema>((set) => ({
  tema: temaGuardado ?? 'verde',
  yaElegido: temaGuardado !== null,

  elegirTema: (tema) => {
    localStorage.setItem(CLAVE_TEMA, tema)
    aplicarAlDocumento(tema)
    set({ tema, yaElegido: true })
  },
}))

/**
 * 2026-09-15, pedido explícito del usuario: en el Onboarding, tocar un tema
 * tiene que VERSE antes de confirmar ("no vas a comprar zapatos en bolsa
 * negra") — esto repinta el <html> de una, igual que `elegirTema`, pero SIN
 * guardar en localStorage ni tocar `yaElegido` (no termina el onboarding).
 * Si el usuario cierra la app sin confirmar, el próximo arranque vuelve a
 * leer localStorage (sigue vacío) y aplica el tema por defecto — no queda
 * ningún estado a medio confirmar.
 */
export function previsualizarTema(tema: Tema): void {
  aplicarAlDocumento(tema)
}
