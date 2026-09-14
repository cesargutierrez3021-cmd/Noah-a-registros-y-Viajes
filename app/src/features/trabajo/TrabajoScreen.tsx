import { SeccionPulso } from './SeccionPulso'
import { SeccionViajesYJornada } from './SeccionViajesYJornada'
import { SeccionMantenimiento } from './SeccionMantenimiento'
import { SeccionGastos } from './SeccionGastos'
import { SeccionEstadisticas } from './SeccionEstadisticas'

/**
 * Bloque 4, ítem 11 (parte no-visual). Fusiona en una sola pantalla, con
 * scroll y secciones internas, lo que antes eran 5 rutas separadas
 * (Viajes, Mantenimiento, Gastos, Estadísticas + la tarjeta de pulso nueva)
 * — el pedido del usuario fue "toda la zona de trabajo de Uber en un solo
 * panel, no en seis o siete". Ningún store se tocó (D-3): cada Seccion*
 * es la misma lógica que ya existía, solo movida de pantalla propia a
 * sección dentro de esta. A propósito SIN tema/vestido todavía — mismas
 * clases genéricas de siempre (pantalla/titulo-pantalla/tarjeta-viaje) —
 * eso es la parte visual de Bloque 4, pendiente hasta que se elija el tema.
 */
export function TrabajoScreen() {
  return (
    <section className="pantalla">
      <h1 className="titulo-pantalla">Trabajo</h1>
      <SeccionPulso />
      <SeccionViajesYJornada />
      <SeccionMantenimiento />
      <SeccionGastos />
      <SeccionEstadisticas />
    </section>
  )
}
