import { SeccionPulso } from './SeccionPulso'
import { SeccionViajesYJornada } from './SeccionViajesYJornada'
import { SeccionMantenimiento } from './SeccionMantenimiento'
import { SeccionGastos } from './SeccionGastos'
import { SeccionEstadisticas } from './SeccionEstadisticas'

/**
 * Bloque 4, ítem 11 (no-visual) + ítems 9/10/13/14 (visual, esta sesión).
 * Fusiona en una sola pantalla, con scroll y secciones internas, lo que
 * antes eran 5 rutas separadas — "toda la zona de trabajo en un solo panel".
 * Ningún store se tocó (D-3).
 *
 * `.tema-trabajo` (design/tokens.css) es el único punto donde entra el tema
 * visual nuevo — pedido explícito del usuario: SOLO este panel se viste por
 * ahora, Balance/Casa y Deudas/Cuenta/Planes siguen con el look genérico.
 */
export function TrabajoScreen() {
  return (
    <section className="pantalla tema-trabajo">
      <SeccionPulso />
      <SeccionViajesYJornada />
      <SeccionMantenimiento />
      <SeccionGastos />
      <SeccionEstadisticas />
    </section>
  )
}
