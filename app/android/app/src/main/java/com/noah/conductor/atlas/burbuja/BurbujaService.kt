@file:Suppress("UseKtx", "SetTextI18n", "ObsoleteSdkInt", "ClickableViewAccessibility")

package com.noah.conductor.atlas.burbuja

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.text.InputType
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import com.noah.conductor.atlas.MainActivity
import com.noah.conductor.atlas.R
import com.noah.conductor.atlas.gps.GpsTrackingService
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale
import kotlin.math.abs

class BurbujaService : Service(), TextToSpeech.OnInitListener {
    companion object {
        @Volatile var activo: Boolean = false
        // 2026-09-15, pedido explícito del usuario: "en la burbuja a veces no me hace el
        // conteo de los kilómetros". Referencia estática para que GpsTrackingService pueda
        // avisarle a la burbuja directo, nativo-a-nativo, sin pasar por el WebView — ver
        // `actualizarKmDesdeGps()` más abajo para el porqué.
        @Volatile var instanciaActiva: BurbujaService? = null
        const val ACCION_MOSTRAR = "mostrar"
        const val ACCION_ACTUALIZAR = "actualizar"
        const val EXTRA_KM = "km"
        const val EXTRA_TIEMPO = "tiempo"
        const val EXTRA_EN_VIAJE = "enViaje"
        const val EXTRA_COLOR_ACENTO = "colorAcento"
        const val EXTRA_COLOR_FG = "colorFg"
        const val EXTRA_COLOR_SURFACE = "colorSurface"
        const val EXTRA_TARJETA_ACTIVA = "tarjetaActiva"
        const val EXTRA_ESTILO = "estilo"
        const val EXTRA_TOTAL_VIAJES = "totalViajes"
        const val EXTRA_SOLO_ESTILO = "soloEstilo"
        private const val CANAL_ID = "mia_burbuja"
        private const val NOTIF_ID = 4201
        private const val UMBRAL_ARRASTRE_PX = 12
        // 2026-09-24, pedido explícito del usuario (bug real: "me apareció en la burbuja 14
        // viajes que fueron de ayer, hoy es otro día"). `viajesContados` es un contador nativo
        // simple, sin ningún concepto de "día" — con la burbuja ahora mucho más persistente
        // (stopWithTask="false", exenta de optimización de batería, ver rondas anteriores) el
        // MISMO proceso puede seguir vivo de un día para el otro si el conductor nunca vuelve a
        // abrir la app (que es la única forma en que hoy llegaba un `EXTRA_TOTAL_VIAJES` fresco
        // desde el lado JS) — el contador simplemente seguía sumando sobre el número de ayer.
        // Estas dos claves guardan CON qué día de negocio (Bogotá) corresponde el contador
        // persistido — ver `diaDeNegocioBogotaHoy()`/`asegurarContadorDelDiaVigente()` abajo.
        private const val CLAVE_VIAJES_DIA = "viajes_dia"
        private const val CLAVE_VIAJES_CONTADOS = "viajes_contados"
        // 2026-09-15, pedido explícito del usuario: mantener presionada la burbuja 2s termina
        // la jornada (y la cierra); doble-tap la pausa/reanuda. El tap simple (iniciar/terminar
        // un VIAJE) se retrasa este mismo tiempo de doble-tap para poder distinguir si viene un
        // segundo toque — mismo umbral que usa Android para su propio gesture detector.
        private const val UMBRAL_JORNADA_MS = 2000L
        private const val UMBRAL_DOBLE_TAP_MS = 300L
        private const val INTERVALO_RELOJ_MS = 1000L
        private const val PRECISION_MAXIMA_M = 35f
        private const val VELOCIDAD_MAXIMA_MS = 55.0
        // 2026-09-22: ver el comentario largo en domain/viajes/gps.ts (mismo criterio,
        // espejado acá para que el km que se ve EN VIVO en la burbuja — que no depende del
        // WebView, ver actualizarKmDesdeGps() — coincida con el que se guarda al final del
        // viaje. Antes era 30s; con el ancla ahora congelada (no reinicio en cada tick
        // rechazado) hace falta más margen para que el tráfico lento sostenido tenga tiempo
        // de cruzar el umbral antes de que se lo trate como un corte real.
        private const val DT_REINICIO_S = 120.0
    }

    private lateinit var windowManager: WindowManager
    private var vistaBurbuja: View? = null
    private var vistaManija: View? = null
    private lateinit var etiquetaTiempo: TextView
    private lateinit var etiquetaKm: TextView
    private lateinit var etiquetaViajes: TextView
    private var colorAcento = "#D4AF37"
    private var colorFg = "#F3EDDD"
    private var colorSurface = "#14100A"
    private var tarjetaActiva = true
    private var estilo = "marea"
    private var enViaje = false
    // 2026-09-22, pedido explícito del usuario: el ciclo de toques pasa de 2
    // (iniciar/terminar) a 3 (iniciar/recogida/terminar) — ver accionTapPendiente
    // más abajo y el comentario largo en burbuja.ts / burbujaOrquestacion.ts.
    private var pasajeroRecogido = false
    private var inicioViajeMs = 0L
    // 2026-09-23, pedido explícito del usuario (bug real: "hice 5 o 6 viajes
    // sin abrir la app... me acumuló todos en uno solo de 63 km"): sin esto no
    // había forma de saber, al reconstruir un viaje que la burbuja cerró sola,
    // dónde terminaba "hasta recoger" y empezaba "con pasajero" — ver
    // encolarViajePendiente() más abajo.
    private var recogidaMs = 0L
    private var kmAcumulados = 0.0
    private var viajesContados = 0
    // Ancla GPS vigente de `actualizarKmDesdeGps()` (nativo, ver comentario ahí) — solo avanza
    // cuando un punto se acepta de verdad, mismo criterio que domain/viajes/gps.ts.
    private var ultimoLatNativo: Double? = null
    private var ultimoLngNativo: Double? = null
    private var ultimaPrecisionNativa: Float = 0f
    // 2026-09-24, pedido explícito del usuario ("apenas guarde, se guarde en automático... y se
    // cierra otra vez la etiqueta"): la etiqueta chiquita para poner el precio al finalizar un
    // viaje — ver `mostrarEtiquetaDePrecio()`. `ultimoViajeInicioMs`/`ultimoViajeFinMs` identifican
    // en la cola nativa CUÁL entrada de `encolarViajePendiente()` hay que completarle el ingreso
    // cuando el conductor lo escribe acá.
    private var vistaPrecio: View? = null
    private var ultimoViajeInicioMs = 0L
    private var ultimoViajeFinMs = 0L
    private var ultimoTimestampNativoMs: Long = 0L
    private var tts: TextToSpeech? = null
    private val handler = Handler(Looper.getMainLooper())
    private val reloj = object : Runnable {
        override fun run() {
            if (enViaje) {
                actualizarTextos(formatearKm(kmAcumulados), formatearTiempo(System.currentTimeMillis() - inicioViajeMs))
                handler.postDelayed(this, INTERVALO_RELOJ_MS)
            }
        }
    }
    override fun onBind(intent: Intent?): IBinder? = null

    /** YYYY-MM-DD del día de negocio en Bogotá — mismo criterio que `fechaNegocioISO()` (lib/fechas.ts), medianoche a medianoche, sin horario de verano (Bogotá no lo usa). */
    private fun diaDeNegocioBogotaHoy(): String {
        val formato = java.text.SimpleDateFormat("yyyy-MM-dd", Locale.US)
        formato.timeZone = java.util.TimeZone.getTimeZone("America/Bogota")
        return formato.format(java.util.Date())
    }

    /**
     * 2026-09-24, pedido explícito del usuario (bug real: "me apareció en la burbuja 14 viajes
     * que fueron de ayer, hoy es otro día"). Si el día persistido no coincide con hoy, el
     * contador arranca en 0 — se llama desde `iniciarViaje()`, antes de sumar el viaje que
     * está por empezar.
     */
    private fun asegurarContadorDelDiaVigente() {
        val prefs = getSharedPreferences("mia-burbuja", MODE_PRIVATE)
        val hoy = diaDeNegocioBogotaHoy()
        if (prefs.getString(CLAVE_VIAJES_DIA, null) != hoy) {
            viajesContados = 0
            prefs.edit().putString(CLAVE_VIAJES_DIA, hoy).putInt(CLAVE_VIAJES_CONTADOS, 0).apply()
        }
    }

    private fun guardarViajesContados() {
        getSharedPreferences("mia-burbuja", MODE_PRIVATE).edit()
            .putString(CLAVE_VIAJES_DIA, diaDeNegocioBogotaHoy())
            .putInt(CLAVE_VIAJES_CONTADOS, viajesContados)
            .apply()
    }

    override fun onCreate() {
        super.onCreate()
        activo = true
        instanciaActiva = this
        val apariencia = getSharedPreferences("mia-burbuja", MODE_PRIVATE)
        colorAcento = apariencia.getString(EXTRA_COLOR_ACENTO, colorAcento) ?: colorAcento
        colorFg = apariencia.getString(EXTRA_COLOR_FG, colorFg) ?: colorFg
        colorSurface = apariencia.getString(EXTRA_COLOR_SURFACE, colorSurface) ?: colorSurface
        estilo = apariencia.getString(EXTRA_ESTILO, estilo) ?: estilo
        // Si Android mató y revivió el proceso a mitad del día (START_STICKY), recupera el
        // contador guardado — pero solo si sigue siendo el mismo día de negocio; si cambió de
        // día mientras el proceso estaba muerto, arranca en 0 igual que asegurarContadorDelDiaVigente().
        if (apariencia.getString(CLAVE_VIAJES_DIA, null) == diaDeNegocioBogotaHoy()) {
            viajesContados = apariencia.getInt(CLAVE_VIAJES_CONTADOS, 0)
        }
        getSharedPreferences("mia-burbuja", MODE_PRIVATE).edit().putBoolean("servicio_activo", true).apply()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        tts = TextToSpeech(this, this)
    }
    override fun onInit(status: Int) { if (status == TextToSpeech.SUCCESS) tts?.language = Locale("es", "CO") }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        crearCanalSiHaceFalta()
        startForeground(NOTIF_ID, construirNotificacion())
        colorAcento = intent?.getStringExtra(EXTRA_COLOR_ACENTO) ?: colorAcento
        colorFg = intent?.getStringExtra(EXTRA_COLOR_FG) ?: colorFg
        colorSurface = intent?.getStringExtra(EXTRA_COLOR_SURFACE) ?: colorSurface
        getSharedPreferences("mia-burbuja", MODE_PRIVATE).edit().putString(EXTRA_COLOR_ACENTO, colorAcento).putString(EXTRA_COLOR_FG, colorFg).putString(EXTRA_COLOR_SURFACE, colorSurface).apply()
        tarjetaActiva = intent?.getBooleanExtra(EXTRA_TARJETA_ACTIVA, tarjetaActiva) ?: tarjetaActiva
        estilo = intent?.getStringExtra(EXTRA_ESTILO) ?: estilo
        getSharedPreferences("mia-burbuja", MODE_PRIVATE).edit().putString(EXTRA_ESTILO, estilo).apply()
        // 2026-09-15: antes esto solo mostraba el km recibido UNA vez — el
        // reloj de abajo (`reloj`, cada 1s mientras enViaje) lo pisaba con
        // kmAcumulados, que nunca se actualizaba acá, así que un segundo
        // después de cada punto GPS real la burbuja volvía a mostrar "0".
        // Ahora, si el intent trae un km real (viene de actualizarBurbuja()
        // en domain/viajes/store.ts, con el km real medido por GPS), también
        // se guarda en kmAcumulados para que el reloj lo siga mostrando.
        val kmExtra = intent?.getStringExtra(EXTRA_KM)
        if (kmExtra != null) kmExtra.toDoubleOrNull()?.let { kmAcumulados = it }
        val km = kmExtra ?: formatearKm(kmAcumulados)
        val tiempo = intent?.getStringExtra(EXTRA_TIEMPO) ?: formatearTiempo(if (enViaje) System.currentTimeMillis() - inicioViajeMs else 0)
        val estadoSolicitado = intent?.getBooleanExtra(EXTRA_EN_VIAJE, enViaje) ?: enViaje
        val viajesExternos = intent?.getIntExtra(EXTRA_TOTAL_VIAJES, -1) ?: -1
        // El lado JS (domain/viajes/store.ts) es la fuente de verdad cuando la app está abierta
        // — si manda un total, se guarda TAL CUAL junto con el día de hoy (D-18: mismo mecanismo
        // de persistencia que usa asegurarContadorDelDiaVigente()/guardarViajesContados()).
        if (viajesExternos >= 0) { viajesContados = viajesExternos; guardarViajesContados() }
        if (estadoSolicitado && !enViaje) iniciarViaje(false)
        if (!estadoSolicitado && enViaje) finalizarViaje(false)
        if (vistaBurbuja == null) crearBurbuja()
        if (tarjetaActiva && vistaManija == null) crearManijaVoz()
        if (!tarjetaActiva && vistaManija != null) { vistaManija?.let { runCatching { windowManager.removeView(it) } }; vistaManija = null }
        aplicarColores()
        if (intent?.getBooleanExtra(EXTRA_SOLO_ESTILO, false) == true) return START_STICKY
        actualizarTextos(km, tiempo)
        return START_STICKY
    }

    override fun onDestroy() {
        activo = false
        if (instanciaActiva === this) instanciaActiva = null
        handler.removeCallbacksAndMessages(null); tts?.stop(); tts?.shutdown()
        getSharedPreferences("mia-burbuja", MODE_PRIVATE).edit().putBoolean("servicio_activo", false).apply()
        cerrarEtiquetaDePrecio()
        vistaManija?.let { runCatching { windowManager.removeView(it) } }
        vistaBurbuja?.let { runCatching { windowManager.removeView(it) } }
        vistaManija = null; vistaBurbuja = null
        super.onDestroy()
    }

    private fun iniciarViaje(anunciar: Boolean) {
        if (enViaje) return
        // Si quedó una etiqueta de precio abierta de un viaje anterior sin responder, este viaje
        // nuevo la cierra — nunca deben quedar dos flotando a la vez.
        cerrarEtiquetaDePrecio()
        asegurarContadorDelDiaVigente()
        enViaje = true; pasajeroRecogido = false; recogidaMs = 0L; viajesContados += 1; inicioViajeMs = System.currentTimeMillis(); kmAcumulados = 0.0
        guardarViajesContados()
        // Viaje nuevo, punto de referencia nuevo — si se dejara el de un viaje anterior,
        // el primer punto de este viaje calcularía distancia contra un lugar viejo.
        ultimoLatNativo = null; ultimoLngNativo = null; ultimoTimestampNativoMs = 0L
        asegurarGpsActivo()
        handler.removeCallbacks(reloj); handler.post(reloj)
        if (anunciar) hablar("Viaje iniciado")
        actualizarTextos("0.0", "0m")
    }

    /**
     * 2026-09-23, pedido explícito del usuario (bug real: "ya la burbujita no volvió a marcar el
     * kilómetro, aunque iniciara el viaje"). Causa: `GpsTrackingService` (el foreground service
     * que de verdad captura el GPS) y `BurbujaService` son DOS servicios separados con su propia
     * resiliencia — Android (u optimizaciones de batería del fabricante, Xiaomi/Samsung/Huawei/
     * Oppo, ya documentadas en `GpsTrackingPlugin.kt`) puede matar el de GPS sin matar el de la
     * burbuja, que sigue viva y respondiendo a los toques con normalidad. Antes, arrancar un
     * viaje NATIVAMENTE (un tap en la burbuja, sin la app abierta) solo reseteaba el estado
     * propio de `BurbujaService` — nunca se aseguraba de que `GpsTrackingService` siguiera vivo,
     * eso dependía por completo de que el lado JS (`domain/viajes/store.ts`, `iniciarViaje`)
     * corriera para volver a pedirlo, algo que nunca pasa con la app cerrada. Ahora, cada vez
     * que arranca un viaje por la burbuja, se le pide directo a `GpsTrackingService` que arranque
     * — si ya está vivo, `startTracking()` ahí (`GpsTrackingService.kt`) es un no-op inmediato
     * (`if (callback != null) return`); si murió, esto lo revive antes de que el conductor
     * empiece a manejar, en vez de quedar contando cero en silencio.
     */
    private fun asegurarGpsActivo() {
        val intent = Intent(this, GpsTrackingService::class.java).apply { action = GpsTrackingService.ACTION_START }
        runCatching {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(intent) else startService(intent)
        }
    }

    private fun finalizarViaje(anunciar: Boolean) {
        if (!enViaje) return
        val finMs = System.currentTimeMillis(); val duracionMs = (finMs - inicioViajeMs).coerceAtLeast(0L); val kmFinal = kmAcumulados; val inicioMs = inicioViajeMs; val recogidaFinal = recogidaMs
        enViaje = false; handler.removeCallbacks(reloj)
        if (anunciar) hablar("Viaje finalizado")
        actualizarTextos(formatearKm(kmFinal), formatearTiempo(duracionMs))
        encolarViajePendiente(kmFinal, inicioMs, recogidaFinal, finMs, duracionMs)
        if (anunciar) {
            BurbujaPlugin.instanciaActiva?.notificarAccion("terminar", kmFinal, inicioMs, finMs, duracionMs)
            // 2026-09-24, pedido explícito del usuario: "que se abra una etiqueta para poner
            // cuánto es el valor de ese viaje... apenas guarde, se guarde en automático". Viaje
            // ya encolado arriba (ingresoPendiente de siempre) — esta etiqueta es un atajo
            // opcional para no tener que esperar a abrir la app: si el conductor escribe el
            // precio, se lo completa a esa MISMA entrada de la cola (`aplicarPrecioAlUltimoViajeEncolado`);
            // si la cierra con la X sin escribir nada, el viaje queda exactamente como hoy
            // (pendiente de ingreso, se completa después desde la app).
            mostrarEtiquetaDePrecio(inicioMs, finMs)
        }
    }

    /**
     * 2026-09-24, pedido explícito del usuario: etiqueta chiquita y flotante, con foco (a
     * diferencia de la burbuja/manija, que a propósito NO lo tienen — ver `crearBurbuja()`/
     * `crearManijaVoz()`, para no interrumpir la app de abajo) porque necesita mostrar el
     * teclado. Dos salidas, las dos cierran la etiqueta y devuelven el foco a la app de abajo:
     * tocar ✓ (o Listo/Enter del teclado) guarda el precio de una vez; tocar ✕ la cierra sin
     * guardar nada (el viaje sigue pendiente, igual que si esto no existiera).
     */
    private fun mostrarEtiquetaDePrecio(inicioMs: Long, finMs: Long) {
        cerrarEtiquetaDePrecio()
        ultimoViajeInicioMs = inicioMs
        ultimoViajeFinMs = finMs

        val campo = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
            imeOptions = EditorInfo.IME_ACTION_DONE
            hint = "$"
            setTextColor(colorVisible(colorFg, colorSurface))
            setHintTextColor(Color.argb(140, 255, 255, 255))
            gravity = Gravity.CENTER
            textSize = 14f
            setPadding(dp(10), dp(4), dp(6), dp(4))
            setSingleLine(true)
            background = null
        }
        val botonGuardar = TextView(this).apply {
            text = "✓"; textSize = 16f; gravity = Gravity.CENTER
            setTextColor(colorSeguro(colorAcento, "#D4AF37"))
            setPadding(dp(8), dp(4), dp(8), dp(4))
        }
        val botonCerrar = TextView(this).apply {
            text = "✕"; textSize = 12f; gravity = Gravity.CENTER
            setTextColor(colorVisible(colorFg, colorSurface))
            setPadding(dp(8), dp(4), dp(10), dp(4))
        }

        fun guardar() {
            val monto = campo.text?.toString()?.trim()?.toDoubleOrNull()
            if (monto != null && monto > 0) {
                aplicarPrecioAlUltimoViajeEncolado(monto)
                hablar("Viaje guardado")
            }
            cerrarEtiquetaDePrecio()
        }
        campo.setOnEditorActionListener { _, accion, _ -> if (accion == EditorInfo.IME_ACTION_DONE) { guardar(); true } else false }
        botonGuardar.setOnClickListener { guardar() }
        botonCerrar.setOnClickListener { cerrarEtiquetaDePrecio() }

        val fila = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = GradientDrawable().apply { shape = GradientDrawable.RECTANGLE; cornerRadius = dp(16).toFloat(); setColor(colorSeguro(colorSurface, "#14100A")); setStroke(dp(1), colorSeguro(colorAcento, "#D4AF37")) }
            setPadding(dp(2), dp(2), dp(2), dp(2))
            addView(campo, LinearLayout.LayoutParams(dp(70), LinearLayout.LayoutParams.WRAP_CONTENT))
            addView(botonGuardar, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT))
            addView(botonCerrar, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT))
        }

        // 2026-09-24, corrección de un bug real reportado por el usuario ("no abre el teclado"):
        // `FLAG_ALT_FOCUSABLE_IM` SOLO tiene efecto cuando `FLAG_NOT_FOCUSABLE` también está
        // puesto (modifica su comportamiento con el teclado) — sin `FLAG_NOT_FOCUSABLE`, como acá
        // a propósito (es la única ventana flotante de esta app que SÍ necesita foco), ese flag
        // no hacía nada. Sin flags especiales la ventana ya es focusable de por sí; lo que
        // faltaba era pedirle el teclado AL SISTEMA de forma explícita — `SOFT_INPUT_STATE_ALWAYS_VISIBLE`
        // es un criterio pensado para ventanas de Activity normales, no siempre alcanza para una
        // ventana agregada a mano con `WindowManager.addView()`. Ahora se llama a
        // `InputMethodManager.showSoftInput()` directo, en un `post{}` para que corra después de
        // que la vista ya esté anclada de verdad a la ventana (pedir foco/teclado en el mismo
        // frame en que se agrega la vista puede fallar en silencio).
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT,
            tipoVentana(), 0, PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = dp(12); y = dp(160)
            softInputMode = WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE or WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
        }

        runCatching {
            windowManager.addView(fila, params)
            vistaPrecio = fila
            campo.isFocusable = true
            campo.isFocusableInTouchMode = true
            campo.requestFocus()
            campo.post {
                val imm = getSystemService(InputMethodManager::class.java)
                imm?.showSoftInput(campo, InputMethodManager.SHOW_FORCED)
            }
        }
    }

    private fun cerrarEtiquetaDePrecio() {
        val vista = vistaPrecio ?: return
        runCatching { getSystemService(InputMethodManager::class.java)?.hideSoftInputFromWindow(vista.windowToken, 0) }
        runCatching { windowManager.removeView(vista) }
        vistaPrecio = null
    }

    /** Completa el `ingreso` de la entrada que `finalizarViaje()` acaba de encolar — la identifica por inicioMs/finMs, únicos por viaje. */
    private fun aplicarPrecioAlUltimoViajeEncolado(monto: Double) {
        val prefs = getSharedPreferences("mia-burbuja", MODE_PRIVATE)
        val cola = runCatching { JSONArray(prefs.getString("viajes_pendientes", "[]")) }.getOrElse { JSONArray() }
        for (i in cola.length() - 1 downTo 0) {
            val entrada = cola.optJSONObject(i) ?: continue
            if (entrada.optLong("inicioMs") == ultimoViajeInicioMs && entrada.optLong("finMs") == ultimoViajeFinMs) {
                entrada.put("ingreso", monto)
                break
            }
        }
        prefs.edit().putString("viajes_pendientes", cola.toString()).apply()
    }

    /**
     * 2026-09-23, pedido explícito del usuario (bug real reportado): "hice 5 o 6 viajes con la
     * burbuja sin abrir la app... cuando entré me acumuló todos en un solo viaje de 63 km".
     * Causa: antes esta función escribía el resumen del viaje (km/inicio/fin) en UN SOLO lugar
     * de `SharedPreferences` (claves fijas `viaje_km`/`viaje_inicio`/...) — cada viaje nuevo
     * PISABA el anterior. Peor: nada de eso se usaba en realidad (confirmado con grep, cero
     * consumidores del lado JS) — al reabrir la app, `domain/viajes/store.ts` tomaba el
     * `viajeEnCurso` que había quedado guardado desde que arrancó el PRIMER viaje (el único que
     * alcanzó a registrar el lado JS antes de que Android matara el WebView) y le pegaba
     * ENCIMA la traza GPS completa acumulada desde que arrancó la jornada — todos los viajes
     * junto con el tiempo muerto entre ellos, de ahí los 63 km de un solo viaje.
     *
     * Ahora cada viaje que la burbuja cierra sola queda en una COLA (`viajes_pendientes`, un
     * JSONArray) con su propio recorte de puntos GPS (filtrados por el rango de tiempo real de
     * ESTE viaje, `inicioMs`..`finMs` — así el tiempo muerto entre viajes queda afuera solo, sin
     * necesidad de nada más) y su propio `recogidaMs` (para separar "hasta recoger" de "con
     * pasajero" igual que un viaje normal). `domain/viajes/store.ts` (`cargar()`) procesa esta
     * cola entera al abrir la app y crea un `Viaje` de verdad por cada entrada — ya no una sola
     * mezcla de todo.
     */
    private fun encolarViajePendiente(km: Double, inicioMs: Long, recogidaMsViaje: Long, finMs: Long, duracionMs: Long) {
        GpsTrackingService.instanciaActiva?.persistirCacheSiHaceFalta()
        val gpsPrefs = getSharedPreferences("mia-gps", MODE_PRIVATE)
        val todosLosPuntos = runCatching { JSONArray(gpsPrefs.getString("puntos", "[]")) }.getOrElse { JSONArray() }
        val puntosDelViaje = JSONArray()
        for (i in 0 until todosLosPuntos.length()) {
            val p = todosLosPuntos.optJSONObject(i) ?: continue
            val ts = p.optLong("timestampMs", -1L)
            if (ts in inicioMs..finMs) puntosDelViaje.put(p)
        }

        val prefs = getSharedPreferences("mia-burbuja", MODE_PRIVATE)
        val cola = runCatching { JSONArray(prefs.getString("viajes_pendientes", "[]")) }.getOrElse { JSONArray() }
        cola.put(JSONObject().apply {
            put("km", km); put("inicioMs", inicioMs); put("recogidaMs", recogidaMsViaje)
            put("finMs", finMs); put("tiempoMs", duracionMs); put("puntosJson", puntosDelViaje.toString())
        })
        // Tope defensivo — mismo criterio que el cap de 5000 puntos en GpsTrackingService: un
        // conductor no debería acumular más de esto sin abrir la app en algún momento, pero si
        // pasa, no tiene sentido dejar crecer la cola sin límite.
        while (cola.length() > 50) cola.remove(0)
        prefs.edit().putString("viajes_pendientes", cola.toString()).apply()

        // 2026-09-24, pedido explícito del usuario (bug real: "seis viajes... todos me marcó
        // 44.4 exactos, todos igual"). El total de km de este viaje ya NO sale de `puntosDelViaje`
        // (el lado JS ahora usa directo el `km` de arriba, ver `recuperarViajesPendientesDeBurbuja`
        // en domain/viajes/store.ts) — `puntosDelViaje` solo sigue sirviendo para resolver la zona
        // de recogida/destino. Pero sin esta limpieza, `todosLosPuntos` (la bolsa de
        // `GpsTrackingService`) seguía creciendo SIN separarse entre un viaje de la burbuja y el
        // siguiente — nada la reiniciaba mientras el GPS seguía corriendo sin cortes entre viajes
        // (`asegurarGpsActivo()` es un no-op si el servicio ya está vivo, así que nunca releía de
        // disco). Cada viaje nuevo dependía por completo de que el recorte por fecha/hora de
        // arriba separara bien una bolsa cada vez más grande y compartida — frágil, y la causa más
        // probable de que varios viajes terminaran calculando sobre puntos que no eran solo suyos.
        // Limpiarla acá, apenas se encola CADA viaje, hace que el próximo arranque de una bolsa
        // vacía de verdad — nunca vuelve a compartir puntos con el viaje anterior.
        GpsTrackingService.instanciaActiva?.limpiarPuntosPersistidos()
    }

    /**
     * 2026-09-15, pedido explícito del usuario: "en la burbuja a veces no me hace el conteo
     * de los kilómetros... dentro de la aplicación sí, a veces sí los coge". Causa real: antes
     * el km que ve la burbuja llegaba SOLO por un viaje redondo nativo→JS→nativo
     * (GpsTrackingService entrega el punto a GpsTrackingPlugin, que se lo pasa a
     * domain/viajes/gps.ts, que llama a `actualizarBurbuja()`). Ese viaje redondo depende de
     * que el WebView/Activity siga viva — Android la puede matar por presión de memoria
     * mientras el conductor pasa horas con la app minimizada (usando Uber en primer plano),
     * SIN matar los foreground services (BurbujaService y GpsTrackingService sí sobreviven).
     * Cuando eso pasa, `GpsTrackingPlugin.handleOnDestroy()` deja `GpsTrackingService.listener
     * = null` — los puntos se siguen guardando bien en SharedPreferences (por eso "dentro de
     * la aplicación, a veces sí los coge": al reabrir se recupera toda la traza persistida),
     * pero la burbuja deja de enterarse en vivo, porque nada la actualiza mientras tanto.
     *
     * Fix: GpsTrackingService llama ACÁ directo (mismo proceso, sin pasar por el WebView) cada
     * vez que recibe un punto nuevo — la burbuja cuenta los km sola, sin depender de que la
     * app siga viva. El filtro de abajo (precisión/velocidad/distancia mínima) es el mismo
     * criterio que ya usa `domain/viajes/gps.ts` (`puntoValido`) para no acumular ruido del
     * GPS — aproximado, no bit a bit idéntico: el km definitivo del viaje lo sigue calculando
     * el lado JS sobre la traza completa persistida al cerrar el viaje; esto es solo para que
     * el número que el conductor VE mientras maneja no se quede pegado.
     */
    fun actualizarKmDesdeGps(lat: Double, lng: Double, precisionMetros: Float, timestampMs: Long) {
        if (!enViaje) return
        if (precisionMetros <= 0f || precisionMetros > PRECISION_MAXIMA_M) return

        val latAncla = ultimoLatNativo
        val lngAncla = ultimoLngNativo

        if (latAncla == null || lngAncla == null) {
            ultimoLatNativo = lat; ultimoLngNativo = lng; ultimaPrecisionNativa = precisionMetros; ultimoTimestampNativoMs = timestampMs
            return
        }

        val distanciaM = distanciaHaversineM(latAncla, lngAncla, lat, lng)
        val dtS = (timestampMs - ultimoTimestampNativoMs) / 1000.0
        if (dtS <= 0.0) return

        if (dtS > DT_REINICIO_S) {
            // Corte real (no tráfico lento) — reinicia el ancla sin acreditar distancia.
            ultimoLatNativo = lat; ultimoLngNativo = lng; ultimaPrecisionNativa = precisionMetros; ultimoTimestampNativoMs = timestampMs
            return
        }

        val velocidadMs = distanciaM / dtS
        if (velocidadMs > VELOCIDAD_MAXIMA_MS) {
            // Salto de un solo punto imposible (rebote de señal) — se descarta entero, el ancla NO avanza.
            return
        }

        val umbralMinimoM = kotlin.math.max(8.0, (ultimaPrecisionNativa + precisionMetros + 10) * 0.5)
        if (distanciaM < umbralMinimoM) {
            // Movimiento ambiguo (ruido parado vs. avance lento real) — el ancla queda IGUAL
            // para que el desplazamiento se acumule tick a tick hasta cruzar el umbral, mismo
            // criterio que domain/viajes/gps.ts (ver el comentario largo ahí).
            return
        }

        ultimoLatNativo = lat; ultimoLngNativo = lng; ultimaPrecisionNativa = precisionMetros; ultimoTimestampNativoMs = timestampMs
        kmAcumulados += distanciaM / 1000.0
        actualizarTextos(formatearKm(kmAcumulados), formatearTiempo(System.currentTimeMillis() - inicioViajeMs))
    }

    private fun distanciaHaversineM(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
        val r = 6371000.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLng = Math.toRadians(lng2 - lng1)
        val a = kotlin.math.sin(dLat / 2).let { it * it } +
            kotlin.math.cos(Math.toRadians(lat1)) * kotlin.math.cos(Math.toRadians(lat2)) * kotlin.math.sin(dLng / 2).let { it * it }
        return r * 2 * kotlin.math.atan2(kotlin.math.sqrt(a), kotlin.math.sqrt(1 - a))
    }

    private fun hablar(texto: String) { tts?.speak(texto, TextToSpeech.QUEUE_FLUSH, null, "mia-viaje-${System.currentTimeMillis()}") }
    private fun crearCanalSiHaceFalta() { if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) { val nm = getSystemService(NotificationManager::class.java); if (nm.getNotificationChannel(CANAL_ID) == null) nm.createNotificationChannel(NotificationChannel(CANAL_ID, "Jornada activa", NotificationManager.IMPORTANCE_LOW)) } }
    private fun construirNotificacion(): android.app.Notification {
        val abrirApp = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        return NotificationCompat.Builder(this, CANAL_ID).setContentTitle("MIA · jornada abierta").setContentText("La burbuja muestra el tiempo y los kilómetros registrados.").setSmallIcon(R.mipmap.ic_launcher).setContentIntent(abrirApp).setOngoing(true).build()
    }

    private fun crearBurbuja() {
        val ancho = dp(78)
        val alto = dp(78)
        val contenedor = FrameLayout(this)
        contenedor.background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(colorSeguro(colorSurface, "#14100A")); setStroke(dp(2), colorSeguro(colorAcento, "#D4AF37")) }
        contenedor.addView(OrbitaView(this), FrameLayout.LayoutParams(-1, -1))
        etiquetaTiempo = TextView(this).apply { setTextColor(colorVisible(colorFg, colorSurface)); textSize = 12f; gravity = Gravity.CENTER }
        etiquetaKm = TextView(this).apply { setTextColor(colorSeguro(colorAcento, "#D4AF37")); textSize = 9f; gravity = Gravity.CENTER }
        etiquetaViajes = TextView(this).apply { setTextColor(colorVisible(colorFg, colorSurface)); textSize = if (estilo == "pulso") 9f else 8f; gravity = Gravity.CENTER }
        val columna = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; addView(etiquetaTiempo); addView(etiquetaKm); addView(etiquetaViajes) }
        contenedor.addView(columna, FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.CENTER))
        val tipoVentana = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE
        val params = WindowManager.LayoutParams(ancho, alto, tipoVentana, WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE, PixelFormat.TRANSLUCENT).apply { gravity = Gravity.TOP or Gravity.START; x = dp(12); y = dp(160) }
        var xInicial = 0; var yInicial = 0; var toqueXInicial = 0f; var toqueYInicial = 0f; var tiempoInicioToque = 0L; var fueArrastre = false
        var tiempoUltimoTap = 0L
        // 2026-09-15, pedido explícito del usuario: "manteniendo el presionado dos segundos se
        // termina la jornada... haciéndole doble tap a la burbuja, se pausa la jornada". Antes,
        // mantener presionado ~650ms abría la app — se reemplaza por este gesto nuevo; para
        // abrir la app sigue estando la notificación persistente (construirNotificacion(),
        // siempre visible mientras la jornada está abierta).
        val accionJornadaLarga = Runnable {
            hablar("Jornada terminada")
            BurbujaPlugin.instanciaActiva?.notificarAccion("terminarJornada")
            stopSelf()
        }
        // El tap simple (iniciar/recogida/terminar de un VIAJE) se retrasa UMBRAL_DOBLE_TAP_MS
        // para poder saber si viene un segundo toque atrás (doble-tap = pausar/reanudar la
        // JORNADA, algo completamente distinto) — sin este retraso no hay forma de distinguir
        // los dos gestos.
        //
        // 2026-09-22, pedido explícito del usuario: antes eran 2 toques (iniciar/terminar) — el
        // primero se usaba como "zona de inicio" del viaje, pero en realidad es el momento de
        // ACEPTAR el servicio, no donde se recoge al pasajero. Ahora son 3: iniciar (arranca
        // GPS/km igual que siempre) → recogida (acá sí se marca la zona de inicio real, ver
        // `marcarRecogida` en domain/viajes/store.ts vía burbujaOrquestacion.ts) → terminar.
        val accionTapPendiente = Runnable {
            when {
                !enViaje -> { iniciarViaje(true); BurbujaPlugin.instanciaActiva?.notificarAccion("iniciar") }
                !pasajeroRecogido -> {
                    pasajeroRecogido = true
                    recogidaMs = System.currentTimeMillis()
                    hablar("Pasajero recogido")
                    BurbujaPlugin.instanciaActiva?.notificarAccion("recogida")
                }
                else -> finalizarViaje(true)
            }
        }
        contenedor.setOnTouchListener { _, evento ->
            when (evento.action) {
                MotionEvent.ACTION_DOWN -> {
                    xInicial = params.x; yInicial = params.y; toqueXInicial = evento.rawX; toqueYInicial = evento.rawY
                    tiempoInicioToque = System.currentTimeMillis(); fueArrastre = false
                    handler.postDelayed(accionJornadaLarga, UMBRAL_JORNADA_MS)
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (evento.rawX - toqueXInicial).toInt(); val dy = (evento.rawY - toqueYInicial).toInt()
                    if (abs(dx) > UMBRAL_ARRASTRE_PX || abs(dy) > UMBRAL_ARRASTRE_PX) {
                        if (!fueArrastre) handler.removeCallbacks(accionJornadaLarga)
                        fueArrastre = true
                    }
                    params.x = xInicial + dx; params.y = yInicial + dy
                    runCatching { windowManager.updateViewLayout(contenedor, params) }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    handler.removeCallbacks(accionJornadaLarga)
                    val duracion = System.currentTimeMillis() - tiempoInicioToque
                    val cercaDelFondo = params.y > resources.displayMetrics.heightPixels - dp(220)
                    when {
                        fueArrastre && cercaDelFondo -> { BurbujaPlugin.instanciaActiva?.notificarAccion("cerrar"); stopSelf() }
                        fueArrastre -> Unit
                        duracion >= UMBRAL_JORNADA_MS -> Unit // ya se disparó solo vía accionJornadaLarga arriba
                        else -> {
                            val ahora = System.currentTimeMillis()
                            if (ahora - tiempoUltimoTap < UMBRAL_DOBLE_TAP_MS) {
                                handler.removeCallbacks(accionTapPendiente)
                                tiempoUltimoTap = 0L
                                BurbujaPlugin.instanciaActiva?.notificarAccion("alternarPausaJornada")
                            } else {
                                tiempoUltimoTap = ahora
                                handler.postDelayed(accionTapPendiente, UMBRAL_DOBLE_TAP_MS)
                            }
                        }
                    }
                    true
                }
                else -> false
            }
        }
        windowManager.addView(contenedor, params); vistaBurbuja = contenedor
    }

    /**
     * 2026-09-15, pedido explícito del usuario: esta manija abría un panel
     * "resumen" (Hoy/Semana/Mes) — se quitó, reemplazada por un solo toque
     * que activa el asistente de voz de MIA. No hay forma de correr
     * reconocimiento de voz de verdad sin la app en primer plano (mismo
     * límite ya documentado en domain/conversacion/voz.ts), así que esto
     * deja un aviso en SharedPreferences y trae la app al frente — el lado
     * TS (BurbujaPlugin.handleOnResume) lo recoge y abre la conversación con
     * MIA lista para escuchar, sin que el conductor tenga que navegar nada.
     */
    private fun crearManijaVoz() {
        val manija = TextView(this).apply {
            text = "◁"
            textSize = 14f
            gravity = Gravity.CENTER
            setPadding(dp(2), 0, dp(2), 0)
            setTextColor(colorSeguro(colorFg, "#FFFFFF"))
            background = GradientDrawable().apply { shape = GradientDrawable.RECTANGLE; cornerRadii = floatArrayOf(dp(3).toFloat(), dp(3).toFloat(), dp(14).toFloat(), dp(14).toFloat(), dp(14).toFloat(), dp(14).toFloat(), dp(3).toFloat(), dp(3).toFloat()); setColor(colorSeguro(colorSurface, "#14100A")); setStroke(dp(1), colorSeguro(colorAcento, "#D4AF37")) }
        }
        val params = WindowManager.LayoutParams(dp(22), dp(64), tipoVentana(), WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE, PixelFormat.TRANSLUCENT).apply { gravity = Gravity.TOP or Gravity.END; x = dp(2); y = dp(260) }
        var downX = 0f; var downY = 0f; var originX = 0; var originY = 0; var moved = false
        manija.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> { downX = event.rawX; downY = event.rawY; originX = params.x; originY = params.y; moved = false; true }
                MotionEvent.ACTION_MOVE -> { val dx = (event.rawX - downX).toInt(); val dy = (event.rawY - downY).toInt(); moved = moved || abs(dx) > dp(4) || abs(dy) > dp(4); params.x = (originX - dx).coerceAtLeast(0); params.y = (originY + dy).coerceIn(dp(80), resources.displayMetrics.heightPixels - dp(100)); runCatching { windowManager.updateViewLayout(manija, params) }; true }
                MotionEvent.ACTION_UP -> { if (!moved) activarAsistenteDeVoz(); true }
                else -> false
            }
        }
        windowManager.addView(manija, params)
        vistaManija = manija
    }

    /** Ver el comentario de `crearManijaVoz()` — deja el aviso para BurbujaPlugin.handleOnResume() y trae la app al frente. */
    private fun activarAsistenteDeVoz() {
        getSharedPreferences("mia-burbuja", MODE_PRIVATE).edit().putBoolean("voz_pendiente", true).apply()
        startActivity(Intent(this, MainActivity::class.java).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT) })
    }

    private fun aplicarColores() {
        if (::etiquetaTiempo.isInitialized) {
            etiquetaTiempo.setTextColor(colorVisible(colorFg, colorSurface)); etiquetaKm.setTextColor(colorSeguro(colorAcento, "#D4AF37")); etiquetaViajes.setTextColor(colorVisible(colorFg, colorSurface))
            (etiquetaTiempo.parent?.parent as? View)?.background = GradientDrawable().apply { shape = if (estilo == "pulso" || estilo == "marea") GradientDrawable.OVAL else GradientDrawable.RECTANGLE; cornerRadius = when (estilo) { "taller" -> dp(5).toFloat(); "editorial" -> dp(2).toFloat(); else -> dp(28).toFloat() }; setColor(colorSeguro(colorSurface, "#14100A")); setStroke(dp(if (estilo == "pulso") 3 else 2), colorSeguro(colorAcento, "#D4AF37")) }
        }
        if (vistaManija is TextView) { val manija = vistaManija as TextView; manija.setTextColor(colorVisible(colorFg, colorSurface)); (manija.background as? GradientDrawable)?.setColor(colorSeguro(colorSurface, "#14100A")); (manija.background as? GradientDrawable)?.setStroke(dp(1), colorSeguro(colorAcento, "#D4AF37")) }
    }
    private fun colorSeguro(valor: String, respaldo: String): Int = runCatching { Color.parseColor(valor.trim()) }.getOrElse { Color.parseColor(respaldo) }
    private fun colorVisible(texto: String, fondo: String): Int {
        val t = colorSeguro(texto, "#FFFFFF")
        val f = colorSeguro(fondo, "#14100A")
        val tl = (0.2126 * Color.red(t) + 0.7152 * Color.green(t) + 0.0722 * Color.blue(t)) / 255.0
        val fl = (0.2126 * Color.red(f) + 0.7152 * Color.green(f) + 0.0722 * Color.blue(f)) / 255.0
        return if (kotlin.math.abs(tl - fl) < 0.28) { if (fl > 0.55) Color.BLACK else Color.WHITE } else t
    }
    private fun tipoVentana() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE
    private fun actualizarTextos(km: String, tiempo: String) { if (::etiquetaTiempo.isInitialized) { etiquetaTiempo.text = tiempo.ifBlank { "0m" }.replace(Regex("\\s+\\d{2}s"), ""); etiquetaKm.text = "Km ${km.ifBlank { "0" }}"; etiquetaViajes.text = "$viajesContados viaje${if (viajesContados == 1) "" else "s"}" } }
    private fun formatearTiempo(ms: Long): String { val totalMinutos = (ms / 60000).coerceAtLeast(0); val horas = totalMinutos / 60; val minutos = totalMinutos % 60; return if (horas > 0) "%dh %02dm".format(horas, minutos) else "${minutos}m" }
    // 2026-09-22, pedido explícito del usuario (bug real): antes redondeaba a km entero
    // (round().toInt()) — cualquier viaje de pocos cientos de metros se veía "en 0" toda la
    // ruta, dando la impresión de que la burbuja no estaba contando nada. Con 1 decimal, igual
    // que el lado JS (ver actualizarBurbuja en domain/viajes/store.ts), se ve avanzar de verdad.
    private fun formatearKm(km: Double): String = "%.1f".format(km)
    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()
    private fun dp(v: Float): Int = (v * resources.displayMetrics.density).toInt()

    // 2026-09-24, pedido explícito del usuario ("como la burbuja tiene una animación, eso
    // consume más batería... si la quitamos ahorramos batería"): antes `angulo` lo movía un
    // ValueAnimator infinito (9s por vuelta) mientras la burbuja estuviera visible — prácticamente
    // toda la jornada, redibujando este `onDraw` hasta 60 veces por segundo sin parar. Ahora
    // `angulo` se queda fijo en 0 — un solo dibujo, sin ningún costo sostenido de batería/GPU.
    private inner class OrbitaView(context: android.content.Context) : View(context) {
        var angulo = 0f
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            val cx = width / 2f; val cy = height / 2f; val r = (width.coerceAtMost(height) * .28f)
            paint.style = Paint.Style.STROKE; paint.strokeWidth = dp(1).toFloat(); paint.color = colorSeguro(colorAcento, "#D4AF37"); paint.alpha = 190
            canvas.save(); canvas.rotate(28f + angulo, cx, cy); canvas.drawOval(cx - r * 1.65f, cy - r * .55f, cx + r * 1.65f, cy + r * .55f, paint); canvas.restore()
            paint.color = colorSeguro(colorFg, "#FFFFFF"); paint.alpha = 130; canvas.save(); canvas.rotate(-42f - angulo * .7f, cx, cy); canvas.drawOval(cx - r * .7f, cy - r * 1.7f, cx + r * .7f, cy + r * 1.7f, paint); canvas.restore()
            paint.style = Paint.Style.FILL; paint.color = colorSeguro(colorAcento, "#D4AF37"); paint.alpha = 235; canvas.drawCircle(cx, cy + r * .72f, r * .34f, paint)
            paint.color = colorSeguro(colorFg, "#FFFFFF"); paint.alpha = 220
            listOf(0f, 120f, 240f).forEach { degrees -> val rad = Math.toRadians((degrees + angulo).toDouble()); canvas.drawCircle(cx + kotlin.math.cos(rad).toFloat() * r * 1.55f, cy + kotlin.math.sin(rad).toFloat() * r * .62f, dp(3).toFloat(), paint) }
        }
    }

}
