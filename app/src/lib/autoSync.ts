/**
 * Fase 13, pendiente #4 (registrado en PLAN-MAESTRO.md): ninguno de los tres
 * `sync.ts` (viajes, jornada, mantenimiento) reintentaba solo ni se disparaba
 * al recuperar internet. Esta utilidad es genérica a propósito — los tres
 * dominios llaman a `registrarSincronizacionAutomatica` con su propia función
 * de sincronización, en vez de repetir esta lógica tres veces (mismo motivo
 * que D-8: un patrón, no una reinvención por módulo).
 *
 * Comportamiento:
 * - Corre una vez al registrar (llamada inicial, igual que antes).
 * - Si `sincronizados < intentados` (algo falló — típicamente sin internet a
 *   mitad de la cola) o `primerError` no es null, programa un reintento con
 *   backoff exponencial: 5s, 10s, 20s, 40s, 80s, tope en 5 minutos.
 * - Si un intento sale limpio (todo lo pendiente se sincronizó, o no había
 *   nada pendiente), se cancela cualquier reintento programado y el backoff
 *   se resetea a 5s para la próxima vez que haga falta.
 * - Además de los reintentos programados, el evento `online` del navegador
 *   (funciona igual en el WebView de Capacitor) dispara un intento inmediato
 *   y resetea el backoff — recuperar internet no debería esperar el próximo
 *   backoff largo si ya pasó bastante tiempo sin conexión.
 *
 * No hace nada si la pestaña/app se cierra: no hay persistencia de timers
 * entre sesiones de la app — eso es igual de aceptable que antes (ver
 * pendiente #4 original: "alcanza para el caso normal").
 */

interface ResultadoSincronizacion {
  intentados: number
  sincronizados: number
  primerError: string | null
}

const ESPERA_INICIAL_MS = 5_000
const ESPERA_MAXIMA_MS = 5 * 60_000

export function registrarSincronizacionAutomatica(
  nombre: string,
  sincronizar: () => Promise<ResultadoSincronizacion>,
): void {
  let esperaActualMs = ESPERA_INICIAL_MS
  let timerReintento: ReturnType<typeof setTimeout> | null = null

  function cancelarReintentoProgramado() {
    if (timerReintento !== null) {
      clearTimeout(timerReintento)
      timerReintento = null
    }
  }

  async function intentar() {
    cancelarReintentoProgramado()

    let resultado: ResultadoSincronizacion
    try {
      resultado = await sincronizar()
    } catch {
      // sincronizar() ya es best-effort internamente (no debería relanzar),
      // pero por si acaso: tratar una excepción no esperada igual que un
      // fallo normal, no dejar que tumbe el temporizador.
      resultado = { intentados: 1, sincronizados: 0, primerError: 'Error inesperado' }
    }

    const huboFallo = resultado.primerError !== null || resultado.sincronizados < resultado.intentados

    if (huboFallo) {
      timerReintento = setTimeout(() => {
        void intentar()
      }, esperaActualMs)
      esperaActualMs = Math.min(esperaActualMs * 2, ESPERA_MAXIMA_MS)
    } else {
      esperaActualMs = ESPERA_INICIAL_MS
    }
  }

  function alRecuperarInternet() {
    esperaActualMs = ESPERA_INICIAL_MS
    void intentar()
  }

  window.addEventListener('online', alRecuperarInternet)

  void intentar()

  // No hay "des-registrar" expuesto a propósito: las tres sincronizaciones
  // viven mientras vive la app (se registran una sola vez en App.tsx, nunca
  // dentro de una pantalla que se monta/desmonta) — ver uso en App.tsx.
  void nombre // (nombre queda reservado para logging futuro si hace falta depurar cuál de los tres falla más)
}
