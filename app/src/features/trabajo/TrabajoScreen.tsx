import { SeccionPulso } from './SeccionPulso'
import { SeccionViajesYJornada } from './SeccionViajesYJornada'

/**
 * Bloque 4, ítem 11 (no-visual) + ítems 9/10/13/14 (visual). Fusiona en una
 * sola pantalla lo que antes eran 5 rutas separadas — "toda la zona de
 * trabajo en un solo panel". Ningún store se tocó (D-3).
 *
 * 2026-09-15, pedido explícito del usuario ("para no hacer tanto scroll"):
 * Mantenimiento, Gastos y Estadísticas dejaron de renderizarse siempre
 * apiladas acá — ahora viven DENTRO de las píldoras "Lectura del día" de
 * SeccionPulso (pestañas "Mantenimiento y gastos" / "Estadísticas"), así
 * que ya no se importan ni se listan acá (se duplicarían con las que
 * SeccionPulso renderiza condicionalmente). Solo "Jornada y viajes" queda
 * siempre visible debajo del pulso — es la acción principal del panel, no
 * una "lectura" de datos.
 *
 * `.tema-trabajo` (design/tokens.css) es donde entra el tema visual — ya no
 * es exclusivo de este panel (los tokens se unificaron, ver PLAN-MAESTRO
 * 2026-09-15), pero la clase se deja acá igual: es la que activa las clases
 * `.tt-*` que usa este panel en particular.
 */
export function TrabajoScreen() {
  return (
    <section className="pantalla tema-trabajo">
      <SeccionPulso />
      <SeccionViajesYJornada />
    </section>
  )
}
