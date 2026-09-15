import { useViajes } from './store'
import { suscribirseAccionesBurbuja } from './burbuja'

/**
 * 2026-09-15, pedido explícito del usuario: "yo espicho el botón flotante...
 * y él en voz me tiene que decir viaje iniciado" — la burbuja nativa ya
 * habla y ya lleva su propio reloj (BurbujaService.kt), pero antes de esto
 * nada conectaba ese toque con un viaje de verdad en la app. Esta función
 * es la capa de orquestación (D-10: coordinar entre `domain/viajes` y el
 * puente nativo de la burbuja no le pertenece a ningún store) — se registra
 * UNA sola vez desde App.tsx, mismo patrón que `registrarSincronizacionAutomatica`.
 *
 * - accion "iniciar": si no hay ya un viaje en curso, arranca uno de
 *   verdad (GPS real, mismo camino que elegir una plataforma a mano). La
 *   burbuja no tiene forma de preguntar la plataforma con un solo toque —
 *   se usa 'Particular' como valor por defecto; el conductor puede editar
 *   esto más adelante si se agrega esa función (no existe todavía, D-18:
 *   no se inventa acá).
 * - accion "terminar": para el GPS en el momento exacto del toque y deja
 *   el viaje "esperando ingreso" — `pausarParaIngreso()` — porque el monto
 *   no se puede escribir desde la burbuja. La pantalla de Jornada y viajes
 *   se encarga de pedirlo la próxima vez que se abre la app.
 */
const PLATAFORMA_POR_DEFECTO_BURBUJA = 'Particular'

export function registrarEscuchaBurbuja(): void {
  void suscribirseAccionesBurbuja((datos) => {
    const estado = useViajes.getState()
    if (datos.accion === 'iniciar') {
      if (!estado.viajeEnCurso) void estado.iniciarViaje(PLATAFORMA_POR_DEFECTO_BURBUJA)
    } else if (datos.accion === 'terminar') {
      if (estado.viajeEnCurso && !estado.viajeEnCurso.finISOPendiente) estado.pausarParaIngreso()
    }
  })
}
