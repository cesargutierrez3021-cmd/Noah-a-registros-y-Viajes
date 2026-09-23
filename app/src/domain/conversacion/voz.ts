import { Capacitor } from '@capacitor/core'

/**
 * Servicio de voz: reconocimiento de voz (STT) y texto a voz (TTS). Única
 * pieza del dominio de conversación que habla directo con los plugins — el
 * resto (store.ts, ConversacionScreen.tsx) solo pide "escuchar" o "decir
 * esto", igual que domain/viajes/gps.ts es la única pieza que habla con el
 * GPS (mismo patrón, D-9/Fase 5).
 *
 * Fase 10 (D-12, ver PLAN-MAESTRO): se usan plugins de Capacitor ya
 * existentes en la comunidad (@capacitor-community/speech-recognition,
 * @capacitor-community/text-to-speech) en vez de escribir plugins nativos propios como
 * se hizo para GPS (D-9). A diferencia del GPS en segundo plano, ni el
 * reconocimiento de voz ni el texto a voz necesitan un foreground service —
 * solo funcionan con la app abierta en primer plano, que es exactamente el
 * caso de uso ("el conductor le habla a la app mientras maneja"), así que no
 * hay razón para reescribir algo que ya existe y mantiene, a diferencia del
 * caso de GPS donde SÍ hacía falta (ver D-9).
 *
 * NO PROBADO en dispositivo real (mismo límite que el resto del proyecto en
 * este entorno, sin Android SDK/emulador) — ver "Estado real de Fase 10" en
 * PLAN-MAESTRO para el detalle de qué falta confirmar.
 */

export interface SuscripcionVoz {
  detener: () => void
}

/** Mismo shape que `SpeechSynthesisVoice` del plugin nativo y de la Web Speech API — reexportado acá para que el resto del dominio no tenga que importar del paquete del plugin directo. */
export interface VozDisponible {
  name: string
  lang: string
}

/**
 * 2026-09-23, pedido explícito del usuario ("no me gusta ese tono de voz"): lista las voces
 * en español que el motor de texto a voz del teléfono tiene instaladas, para que el
 * conductor pueda elegir otra distinta a la que venía por defecto. Filtra por idioma acá
 * (no en la UI) porque el motor nativo suele traer decenas de voces de otros idiomas que no
 * aplican para esta app. Puede devolver una lista de un solo elemento (o vacía) si el
 * teléfono solo tiene una voz en español instalada — la UI debe manejar ese caso mostrando
 * el ajuste de tono (pitch) como alternativa, no asumir que siempre hay para elegir.
 */
export async function listarVocesDisponibles(prefijoIdioma = 'es'): Promise<VozDisponible[]> {
  if (esAndroidNativo()) {
    const { TextToSpeech } = await import('@capacitor-community/text-to-speech')
    const { voices } = await TextToSpeech.getSupportedVoices()
    return voices.filter((v) => v.lang.toLowerCase().startsWith(prefijoIdioma)).map((v) => ({ name: v.name, lang: v.lang }))
  }

  if (!('speechSynthesis' in window)) return []
  const voces = window.speechSynthesis.getVoices()
  return voces.filter((v) => v.lang.toLowerCase().startsWith(prefijoIdioma)).map((v) => ({ name: v.name, lang: v.lang }))
}

function esAndroidNativo(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

/**
 * Pide los permisos de micrófono (RECORD_AUDIO en Android) antes del primer
 * uso. Se llama una sola vez, típicamente al abrir la pantalla de
 * conversación por primera vez — el mismo patrón de "divulgación destacada
 * antes de pedir el permiso" que ya aplica para ubicación en segundo plano
 * (docs/FASE2-ARQUITECTURA.md sección 5) aplica en principio también acá,
 * aunque el micrófono en primer plano no tiene el mismo nivel de exigencia
 * de Google que la ubicación en segundo plano — confirmar en Fase 14 al
 * llenar el formulario de Data Safety.
 */
export async function pedirPermisoVoz(): Promise<boolean> {
  if (!esAndroidNativo()) {
    // En navegador, el propio SpeechRecognition del navegador pide el
    // permiso de micrófono la primera vez que se llama a start().
    return true
  }

  const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')
  const permiso = await SpeechRecognition.requestPermissions()
  return permiso.speechRecognition === 'granted'
}

/**
 * Escucha UNA frase y resuelve con el texto transcrito cuando el conductor
 * deja de hablar (o al agotarse el tiempo de silencio que decida el propio
 * reconocedor nativo/del navegador). No hay "escucha continua" a nivel de
 * este archivo — la "conversación continua" (Fase 10) es una decisión de
 * más arriba (store.ts / ConversacionScreen.tsx): volver a llamar a esta
 * función automáticamente después de reproducir cada respuesta, no una
 * escucha ininterrumpida de fondo (eso consumiría batería sin necesidad, y
 * un conductor manejando no necesita que la app lo escuche cuando no le
 * está preguntando nada).
 */
export async function escucharUnaFrase(idioma = 'es-CO'): Promise<string> {
  return esAndroidNativo() ? escucharUnaFraseNativo(idioma) : escucharUnaFraseWeb(idioma)
}

async function escucharUnaFraseNativo(idioma: string): Promise<string> {
  const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')

  const resultado = await SpeechRecognition.start({
    language: idioma,
    maxResults: 1,
    prompt: '',
    partialResults: false,
    popup: false,
  })

  const texto = resultado.matches?.[0]
  if (!texto) {
    throw new Error('No se entendió lo que dijiste — intenta de nuevo.')
  }
  return texto
}

function escucharUnaFraseWeb(idioma: string): Promise<string> {
  // API estándar del navegador (Web Speech API) — con prefijo webkit en
  // Chrome/Edge. Sirve para desarrollar y probar la UI sin dispositivo
  // Android; el camino real para publicar es el nativo de arriba.
  const ReconocedorGlobal =
    (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition

  if (!ReconocedorGlobal) {
    return Promise.reject(new Error('Este navegador no soporta reconocimiento de voz. Probar en un Android real.'))
  }

  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reconocedor = new (ReconocedorGlobal as any)()
    reconocedor.lang = idioma
    reconocedor.continuous = false
    reconocedor.interimResults = false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reconocedor.onresult = (evento: any) => {
      const texto = evento.results?.[0]?.[0]?.transcript
      if (texto) resolve(texto)
      else reject(new Error('No se entendió lo que dijiste — intenta de nuevo.'))
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reconocedor.onerror = (evento: any) => reject(new Error(`Error de reconocimiento de voz: ${evento.error}`))
    reconocedor.start()
  })
}

export interface OpcionesHablar {
  idioma?: string
  /** Nombre de la voz (`VozDisponible.name`, ver `listarVocesDisponibles`) — null/undefined = la voz por defecto del motor. */
  vozNombre?: string | null
  /** 0.5-2.0, 1.0 = normal. 2026-09-23, pedido explícito del usuario: alternativa a elegir voz cuando el teléfono solo tiene una instalada en español — igual cambia cómo suena. */
  tono?: number
}

/** Lee `texto` en voz alta. Resuelve cuando termina de hablar. */
export async function hablar(texto: string, opciones: OpcionesHablar = {}): Promise<void> {
  const { idioma = 'es-CO', vozNombre = null, tono = 1.0 } = opciones

  if (esAndroidNativo()) {
    const { TextToSpeech } = await import('@capacitor-community/text-to-speech')
    let indiceVoz: number | undefined
    if (vozNombre) {
      const { voices } = await TextToSpeech.getSupportedVoices()
      const indice = voices.findIndex((v) => v.name === vozNombre)
      if (indice >= 0) indiceVoz = indice
    }
    await TextToSpeech.speak({ text: texto, lang: idioma, rate: 1.0, pitch: tono, volume: 1.0, voice: indiceVoz })
    return
  }

  if (!('speechSynthesis' in window)) {
    throw new Error('Este navegador no soporta texto a voz. Probar en un Android real.')
  }

  return new Promise((resolve, reject) => {
    const enunciado = new SpeechSynthesisUtterance(texto)
    enunciado.lang = idioma
    enunciado.pitch = tono
    if (vozNombre) {
      const voz = window.speechSynthesis.getVoices().find((v) => v.name === vozNombre)
      if (voz) enunciado.voice = voz
    }
    enunciado.onend = () => resolve()
    enunciado.onerror = () => reject(new Error('No se pudo reproducir la respuesta en voz.'))
    window.speechSynthesis.speak(enunciado)
  })
}

/** Interrumpe cualquier lectura en curso — se usa si el conductor toca "cancelar" a mitad de la respuesta. */
export async function detenerHabla(): Promise<void> {
  if (esAndroidNativo()) {
    const { TextToSpeech } = await import('@capacitor-community/text-to-speech')
    await TextToSpeech.stop()
    return
  }
  window.speechSynthesis?.cancel()
}
