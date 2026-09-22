import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import type { PuntoGPS } from './types'
import {
  iniciarCapturaSegundoPlano,
  detenerCapturaSegundoPlano,
  suscribirsePuntosGps,
  type PuntoGpsCrudo,
} from './gpsBackground'

/**
 * Servicio de captura GPS. Única función del proyecto que habla directamente
 * con el plugin de geolocalización — el resto del dominio solo recibe PuntoGPS ya listos.
 *
 * Fase 5 / D-9: en Android nativo, esto delega en el foreground service propio
 * (GpsTrackingService + GpsTrackingPlugin, ver gpsBackground.ts), que sigue
 * capturando el recorrido con la app minimizada o la pantalla apagada.
 *
 * Fuera de Android nativo (navegador, dev en web) cae a @capacitor/geolocation,
 * que solo captura en primer plano — suficiente para desarrollar la UI, nunca
 * para un viaje real, por eso el fallback solo aplica cuando no hay plataforma
 * nativa Android disponible.
 */

export interface SeguidorGPS {
  detener: () => void
}

/**
 * 2026-09-15: intenté en un primer momento subir esto (35→50) y aflojar el
 * umbral de movimiento de abajo, con la teoría de que el filtro estaba
 * descartando movimiento real a velocidad de tráfico urbano. Una simulación
 * completa de un viaje real (parado/lento/ciudad/avenida, con ruido GPS
 * realista) demostró que esa teoría estaba MAL: con el filtro viejo el
 * cálculo da 101-106% de la distancia real incluso en el peor caso (trancón
 * total, sin ningún tramo rápido); con el filtro aflojado, sobrecuenta hasta
 * 326% en ese mismo escenario. El número en sí (35m) no se tocó.
 *
 * 2026-09-22, pedido explícito del usuario (octava vez reportado — "cuando
 * escucho el viaje en la burbuja, muchos viajes no contabiliza el
 * kilometraje... a veces se anda muy lento, a veces medio, a veces a alta
 * velocidad... no hagas saltos porque cuando contabiliza, contabiliza mal"):
 * revisando la simulación de la ronda anterior con más cuidado, el filtro
 * SÍ tenía un bug real para tráfico lento/pesado sostenido (muy común en un
 * viaje de Uber en Bogotá). La función de abajo, `procesarPuntoCrudo`,
 * avanzaba el "ancla" (el punto contra el que se mide el próximo) a
 * CUALQUIER punto de precisión aceptable, sin importar POR QUÉ se había
 * rechazado el anterior:
 *   - rechazado por distancia insuficiente (tráfico lento: cada tick de
 *     ~5s mueve menos que el umbral) → el ancla igual saltaba al punto
 *     rechazado, así que el próximo tick se medía desde ahí, nunca desde el
 *     punto donde arrancó el tramo lento. Resultado: si CADA tick individual
 *     queda por debajo del umbral (típico en trancón, aunque el conductor sí
 *     avanzó varios metros en total), esos metros no se recuperan NUNCA — se
 *     pierden tick a tick, para siempre. Eso explica viajes reales con
 *     kilometraje en cero o muy por debajo de lo real.
 *   - rechazado por velocidad imposible (un solo punto con rebote de señal,
 *     "salto") → el ancla igual saltaba a ese punto corrupto, así que el
 *     PRÓXIMO punto real se medía contra una posición basura en vez de
 *     contra la última posición confiable — de ahí los "uno o dos kilómetros
 *     de más" que reportó el usuario cuando la velocidad variaba.
 *
 * La corrección: el ancla ahora SOLO avanza cuando un punto se acepta de
 * verdad. Si se rechaza por distancia insuficiente, el ancla queda
 * CONGELADA — así el desplazamiento lento se va acumulando tick a tick
 * contra el mismo punto de referencia hasta cruzar el umbral, y ahí sí se
 * acredita de una vez (sin perder nada, sin zigzaguear). Si se rechaza por
 * velocidad imposible, el punto se descarta por completo (ni se acredita ni
 * se vuelve ancla) para no corromper la referencia del próximo punto. Como
 * el ancla puede quedar congelada mucho tiempo con esto, se agrega un tope
 * de `DT_REINICIO_S` (2 minutos): si pasó más que eso sin que ningún punto
 * cruce el umbral, es una señal de que hubo un corte real (app suspendida,
 * GPS apagado, parada larga) y no tráfico lento — ahí sí se reinicia el
 * ancla al punto actual SIN acreditar distancia, para no arrastrar un ancla
 * arbitrariamente vieja.
 */
const PRECISION_MAXIMA_M = 35
const VELOCIDAD_MAXIMA_MS = 55
const DT_REINICIO_S = 120
const DISTANCIA_MINIMA_BASE_M = 8

/** Ancla interna del filtro — a diferencia de `PuntoGPS` (lo que se guarda en el recorrido del viaje), necesita la precisión para calcular el próximo umbral. */
interface AnclaGPS {
  lat: number
  lng: number
  timestampMs: number
  precisionMetros: number
}

function puntoCrudoAPuntoGPS(punto: PuntoGpsCrudo): PuntoGPS {
  return {
    lat: punto.lat,
    lng: punto.lng,
    timestampISO: new Date(punto.timestampMs).toISOString(),
  }
}

function puntoCrudoAAncla(punto: PuntoGpsCrudo): AnclaGPS {
  return { lat: punto.lat, lng: punto.lng, timestampMs: punto.timestampMs, precisionMetros: punto.precisionMetros }
}

function distanciaM(a: AnclaGPS, punto: PuntoGpsCrudo): number {
  const R = 6371000
  const dLat = (punto.lat - a.lat) * Math.PI / 180
  const dLng = (punto.lng - a.lng) * Math.PI / 180
  const lat1 = a.lat * Math.PI / 180
  const lat2 = punto.lat * Math.PI / 180
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h))
}

/**
 * Procesa UN punto crudo contra el "ancla" vigente — misma lógica que antes
 * vivía inline en la suscripción en vivo (`iniciarSeguimientoNativo`), ahora
 * compartida (D-18) con `filtrarRecorridoValido` de abajo, que aplica el
 * mismo criterio sobre una traza completa ya capturada (recuperación de
 * `obtenerTrazaPersistida()`), no solo en vivo punto a punto.
 */
function procesarPuntoCrudo(
  punto: PuntoGpsCrudo,
  ancla: AnclaGPS | null,
): { anclaSiguiente: AnclaGPS | null; puntoValidoListo: PuntoGPS | null } {
  if (!Number.isFinite(punto.lat) || !Number.isFinite(punto.lng)) return { anclaSiguiente: ancla, puntoValidoListo: null }
  if (punto.precisionMetros <= 0 || punto.precisionMetros > PRECISION_MAXIMA_M) return { anclaSiguiente: ancla, puntoValidoListo: null }

  if (!ancla) {
    return { anclaSiguiente: puntoCrudoAAncla(punto), puntoValidoListo: puntoCrudoAPuntoGPS(punto) }
  }

  const dM = distanciaM(ancla, punto)
  const dt = (punto.timestampMs - ancla.timestampMs) / 1000
  if (dt <= 0) return { anclaSiguiente: ancla, puntoValidoListo: null }

  if (dt > DT_REINICIO_S) {
    // Corte real (no tráfico lento: ya se le dio hasta 2 minutos para acumular) — reinicia sin acreditar.
    return { anclaSiguiente: puntoCrudoAAncla(punto), puntoValidoListo: null }
  }

  const velocidad = dM / dt
  if (velocidad > VELOCIDAD_MAXIMA_MS) {
    // Salto de un solo punto imposible (rebote de señal) — se descarta entero, el ancla NO avanza.
    return { anclaSiguiente: ancla, puntoValidoListo: null }
  }

  const umbral = Math.max(DISTANCIA_MINIMA_BASE_M, (ancla.precisionMetros + punto.precisionMetros + 10) * 0.5)
  if (dM < umbral) {
    // Movimiento ambiguo (ruido parado vs. avance lento real) — el ancla queda IGUAL para que
    // el desplazamiento se siga acumulando contra el mismo punto en el próximo tick.
    return { anclaSiguiente: ancla, puntoValidoListo: null }
  }

  return { anclaSiguiente: puntoCrudoAAncla(punto), puntoValidoListo: puntoCrudoAPuntoGPS(punto) }
}

/**
 * 2026-09-15, pedido explícito del usuario: aplica el mismo filtro de
 * `puntoValido` sobre una traza COMPLETA ya capturada (no en vivo) — la usa
 * `domain/viajes/store.ts` al cerrar un viaje, para reconstruir el recorrido
 * a partir de la traza persistida por el servicio nativo (`GpsTrackingService`)
 * en vez de confiar solo en lo que alcanzó a llegar al store de JS en vivo
 * (que puede quedar incompleto si el WebView estuvo caído parte del viaje —
 * ver el comentario largo en store.ts, `recorridoDefinitivo`).
 */
export function filtrarRecorridoValido(puntos: PuntoGpsCrudo[]): PuntoGPS[] {
  let ancla: AnclaGPS | null = null
  const validos: PuntoGPS[] = []
  for (const punto of puntos) {
    const { anclaSiguiente, puntoValidoListo } = procesarPuntoCrudo(punto, ancla)
    ancla = anclaSiguiente
    if (puntoValidoListo) validos.push(puntoValidoListo)
  }
  return validos
}

async function iniciarSeguimientoNativo(onPunto: (p: PuntoGPS) => void): Promise<SeguidorGPS> {
  // Primero la suscripción, después arrancar el servicio: así no se pierde
  // ningún punto emitido justo al arrancar.
  let ancla: AnclaGPS | null = null
  const suscripcion = await suscribirsePuntosGps((punto) => {
    const { anclaSiguiente, puntoValidoListo } = procesarPuntoCrudo(punto, ancla)
    ancla = anclaSiguiente
    if (puntoValidoListo) onPunto(puntoValidoListo)
  })

  try {
    await iniciarCapturaSegundoPlano()
  } catch (error) {
    await suscripcion.remove()
    throw error instanceof Error
      ? error
      : new Error('No se pudo iniciar la captura de GPS en segundo plano')
  }

  return {
    detener: () => {
      void suscripcion.remove()
      void detenerCapturaSegundoPlano()
    },
  }
}

async function iniciarSeguimientoWeb(onPunto: (p: PuntoGPS) => void): Promise<SeguidorGPS> {
  const permiso = await Geolocation.requestPermissions()
  const concedido = permiso.location === 'granted' || permiso.coarseLocation === 'granted'
  if (!concedido) {
    throw new Error('Permiso de ubicación no concedido')
  }

  const watchId = await Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 10000 }, (posicion, error) => {
    if (error || !posicion) return
    onPunto({
      lat: posicion.coords.latitude,
      lng: posicion.coords.longitude,
      timestampISO: new Date(posicion.timestamp).toISOString(),
    })
  })

  return {
    detener: () => {
      void Geolocation.clearWatch({ id: watchId })
    },
  }
}

export async function iniciarSeguimientoGPS(onPunto: (p: PuntoGPS) => void): Promise<SeguidorGPS> {
  const esAndroidNativo = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
  return esAndroidNativo ? iniciarSeguimientoNativo(onPunto) : iniciarSeguimientoWeb(onPunto)
}

/**
 * 2026-09-15, pedido explícito del usuario: reportó un viaje de 50 metros,
 * iniciado y terminado casi de inmediato (por la burbuja), que quedó "zona no
 * detectada" tanto al inicio como al final — aunque el viaje ANTERIOR, en el
 * mismo lugar físico, sí había resuelto bien la zona. Causa real: el primer
 * fix de GPS en frío (`iniciarSeguimientoGPS`, `watchPosition`/el servicio
 * nativo) puede tardar varios segundos en llegar — un viaje tan corto puede
 * terminar ANTES de que llegue el primer punto válido, dejando `recorrido`
 * vacío (`puntoInicio`/`puntoFin` en null, ver repository.ts). Esto es un
 * pedido puntual de UNA posición (no un `watch` en curso, no pasa por el
 * filtro de `puntoValido` de arriba — no hay "anterior" con el que comparar
 * velocidad/distancia en un solo punto) para usar como último recurso cuando
 * el recorrido real quedó vacío — mejor una zona aproximada por la posición
 * actual del teléfono que "no detectada" para un viaje que sí ocurrió acá.
 */
export async function obtenerUbicacionActual(): Promise<PuntoGPS | null> {
  try {
    const posicion = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 })
    return {
      lat: posicion.coords.latitude,
      lng: posicion.coords.longitude,
      timestampISO: new Date(posicion.timestamp).toISOString(),
    }
  } catch {
    return null
  }
}
