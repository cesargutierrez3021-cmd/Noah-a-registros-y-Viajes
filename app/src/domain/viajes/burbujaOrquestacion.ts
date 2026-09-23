import { useViajes, registrarAlRecuperarViajesPendientes } from './store'
import { suscribirseAccionesBurbuja } from './burbuja'
import { useConversacion } from '../conversacion/store'
import { useJornada } from '../jornada/store'

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
 *   se usa `plataformaPreferida` (Ajustes, 2026-09-15 pedido explícito del
 *   usuario: "que cuando escucho la burbuja, me marques la plataforma que
 *   tengo como preferencia") o 'Particular' si todavía no eligió ninguna.
 *   Sigue siendo editable a mano: al completar el ingreso de un viaje que
 *   quedó pendiente (ver `pausarParaIngreso` abajo), `completarIngreso`
 *   acepta cambiar la plataforma antes de guardar.
 * - accion "recogida" (2026-09-22, pedido explícito del usuario): segundo
 *   toque del nuevo ciclo de 3 (ver el comentario largo en burbuja.ts) —
 *   marca dónde se recogió al pasajero de verdad, reusando el mismo
 *   `marcarRecogida()` que ya usaba el botón de la pantalla (SeccionViajesYJornada.tsx).
 *   `crearViajeDesdeCiere` (repository.ts) usa este punto, no el primero del
 *   recorrido, para resolver la "zona de inicio" del viaje.
 * - accion "terminar": para el GPS en el momento exacto del toque y GUARDA
 *   el viaje de una — `pausarParaIngreso()` — con `ingresoPendiente: true`
 *   porque el monto no se puede escribir desde la burbuja. La pantalla de
 *   Jornada y viajes pide el ingreso de cada viaje pendiente la próxima vez
 *   que se abre la app. 2026-09-16: antes `viajeEnCurso` se quedaba
 *   "ocupado" hasta ese momento, así que un segundo/tercer viaje por la
 *   burbuja sin abrir la app quedaba ignorado en silencio (bug real
 *   reportado por el usuario — perdía viajes). Ahora `pausarParaIngreso`
 *   libera `viajeEnCurso` de inmediato, así que este mismo chequeo alcanza.
 * - accion "abrirVoz" (2026-09-15, pedido explícito del usuario): se tocó
 *   la manija de la burbuja — antes abría un panel "resumen" (Hoy/Semana/
 *   Mes), ahora activa a MIA. No hay forma real de escuchar/hablar sin la
 *   app en primer plano (mismo límite ya documentado en
 *   domain/conversacion/voz.ts), así que el nativo ya trajo la app al
 *   frente antes de mandar esto — acá solo se le avisa a MiaBurbuja.tsx que
 *   se abra y empiece a escuchar sola.
 * - accion "terminarJornada" (2026-09-15, pedido explícito del usuario):
 *   mantener la burbuja presionada 2 segundos — BurbujaService.kt ya paró
 *   su propio reloj y se cerró solo (`stopSelf()`), acá solo falta cerrar la
 *   jornada del lado de la app (mismo `useJornada().terminarJornada()` que
 *   usa el botón de SeccionPulso.tsx).
 * - accion "alternarPausaJornada" (2026-09-15, pedido explícito del
 *   usuario): doble-tap sobre la burbuja. El lado nativo no sabe si la
 *   jornada está pausada o no (esa bandera vive en `domain/jornada`, no en
 *   el servicio) — por eso manda "alternar" sin más, y acá se decide
 *   pausar o reanudar según el estado real.
 */
/**
 * 2026-09-24, pedido explícito del usuario (bug real: "la jornada solo marcó el tiempo de la
 * jornada general, pero no el tiempo de los viajes" — llevaba horas trabajando por la burbuja sin
 * abrir la app, y al entrar "tiempo real trabajado" seguía en cero). Causa: un viaje que la
 * burbuja cierra sola queda `ingresoPendiente: true` — antes solo se vinculaba a la jornada
 * abierta (`agregarViajeAJornadaAbierta`, lo que hace que `calcularTiempoJornada` lo cuente) en el
 * momento en que el conductor completaba el ingreso a mano, potencialmente horas después. Mientras
 * tanto, ese viaje existía en `viajes` pero no en `jornada.viajesIds` — invisible para el tiempo
 * trabajado, el dinero por hora y el dinero en espera, aunque ya hubiera pasado de verdad.
 *
 * Acá se vincula apenas se recupera, sin esperar al ingreso — `registrarAlRecuperarViajesPendientes`
 * (domain/viajes/store.ts) es un hook genérico que ese store expone SIN conocer `domain/jornada`
 * (D-10: "este store SOLO conoce viajes"), y acá, que sí puede cruzar dominios, se conecta con la
 * jornada abierta. Se registra una sola vez desde App.tsx, igual que `registrarEscuchaBurbuja`.
 */
export function registrarVinculoDeJornadaAlRecuperarViajes(): void {
  registrarAlRecuperarViajesPendientes((viajesRecuperados) => {
    const jornada = useJornada.getState().jornadaAbierta()
    if (!jornada) return
    for (const viaje of viajesRecuperados) {
      void useJornada.getState().agregarViajeAJornadaAbierta(viaje.id)
    }
  })
}

export function registrarEscuchaBurbuja(): void {
  void suscribirseAccionesBurbuja((datos) => {
    const estado = useViajes.getState()
    if (datos.accion === 'iniciar') {
      if (!estado.viajeEnCurso) void estado.iniciarViaje(estado.plataformaPreferida ?? 'Particular')
    } else if (datos.accion === 'recogida') {
      if (estado.viajeEnCurso && !estado.viajeEnCurso.puntoDeRecogidaISO) estado.marcarRecogida()
    } else if (datos.accion === 'terminar') {
      if (estado.viajeEnCurso) void estado.pausarParaIngreso()
    } else if (datos.accion === 'abrirVoz') {
      useConversacion.getState().solicitarAperturaConVoz()
    } else if (datos.accion === 'terminarJornada') {
      if (useJornada.getState().jornadaAbierta()) void useJornada.getState().terminarJornada()
    } else if (datos.accion === 'alternarPausaJornada') {
      const jornada = useJornada.getState().jornadaAbierta()
      if (!jornada) return
      if (jornada.pausadaDesdeISO) void useJornada.getState().reanudarJornada()
      else void useJornada.getState().pausarJornada()
    }
  })
}
