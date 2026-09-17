import { create } from 'zustand'

const CLAVE_CUENTA_VISTA = 'mia:onboarding:cuentaVista'

function leerCuentaVista(): boolean {
  return localStorage.getItem(CLAVE_CUENTA_VISTA) === '1'
}

/**
 * 2026-09-17, pedido explícito del usuario: el paso de "iniciar sesión /
 * crear cuenta" se agrega al onboarding, justo después de tema y vehículo
 * — mismo motivo detrás del pedido de restaurar datos (domain/restauracion):
 * si nadie llega nunca a la pantalla de Cuenta (que ya no tiene pestaña
 * propia, ver App.tsx), reinstalar pierde todo. `cuentaVista` es
 * deliberadamente independiente de `useAuth().autenticado()` — es "¿ya le
 * mostramos este paso al usuario?", no "¿tiene sesión iniciada ahora
 * mismo?": tocar "Más tarde" también lo marca true, para no insistirle en
 * cada apertura, y cerrar sesión después no debe hacer reaparecer el
 * onboarding.
 */
interface EstadoOnboarding {
  cuentaVista: boolean
  marcarCuentaVista: () => void
}

export const useOnboarding = create<EstadoOnboarding>((set) => ({
  cuentaVista: leerCuentaVista(),
  marcarCuentaVista: () => {
    localStorage.setItem(CLAVE_CUENTA_VISTA, '1')
    set({ cuentaVista: true })
  },
}))
