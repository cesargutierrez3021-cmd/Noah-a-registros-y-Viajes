@file:Suppress("UseKtx", "SetTextI18n", "ObsoleteSdkInt", "ClickableViewAccessibility")

package com.noah.conductor.atlas.burbuja

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.RadialGradient
import android.graphics.Shader
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import android.animation.ValueAnimator
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import com.noah.conductor.atlas.MainActivity
import com.noah.conductor.atlas.R
import java.util.Locale
import kotlin.math.abs

class BurbujaService : Service(), TextToSpeech.OnInitListener {
    companion object {
        @Volatile var activo: Boolean = false
        const val ACCION_MOSTRAR = "mostrar"
        const val ACCION_ACTUALIZAR = "actualizar"
        const val EXTRA_KM = "km"
        const val EXTRA_TIEMPO = "tiempo"
        const val EXTRA_EN_VIAJE = "enViaje"
        const val EXTRA_RESUMEN_HOY = "resumenHoy"
        const val EXTRA_RESUMEN_SEMANA = "resumenSemana"
        const val EXTRA_RESUMEN_MES = "resumenMes"
        const val EXTRA_COLOR_ACENTO = "colorAcento"
        const val EXTRA_COLOR_FG = "colorFg"
        const val EXTRA_COLOR_SURFACE = "colorSurface"
        const val EXTRA_TARJETA_ACTIVA = "tarjetaActiva"
        const val EXTRA_ESTILO = "estilo"
        const val EXTRA_TOTAL_VIAJES = "totalViajes"
        const val EXTRA_SOLO_ESTILO = "soloEstilo"
        private const val CANAL_ID = "noah_burbuja"
        private const val NOTIF_ID = 4201
        private const val UMBRAL_TOQUE_MS = 650L
        private const val UMBRAL_ARRASTRE_PX = 12
        private const val UMBRAL_DESLIZAMIENTO_PX = 100
        private const val INTERVALO_RELOJ_MS = 1000L
        private const val PRECISION_MAXIMA_M = 35f
        private const val VELOCIDAD_MINIMA_MS = 0.42
        private const val VELOCIDAD_MAXIMA_MS = 55.0
        private const val INTERVALO_MAXIMO_S = 30.0
    }

    private lateinit var windowManager: WindowManager
    private lateinit var locationManager: LocationManager
    private var vistaBurbuja: View? = null
    private var vistaResumen: View? = null
    private var vistaManija: View? = null
    private var resumenAnimator: ValueAnimator? = null
    private var decoracionResumen: ResumenDecoracionView? = null
    private var resumenParams: WindowManager.LayoutParams? = null
    private lateinit var etiquetaTiempo: TextView
    private lateinit var etiquetaKm: TextView
    private lateinit var etiquetaViajes: TextView
    private lateinit var etiquetaResumen: TextView
    private var etiquetasPeriodo = emptyList<TextView>()
    private var periodoResumen = "hoy"
    private var resumenHoy = ""
    private var resumenSemana = ""
    private var resumenMes = ""
    private var colorAcento = "#D4AF37"
    private var colorFg = "#F3EDDD"
    private var colorSurface = "#14100A"
    private var tarjetaActiva = true
    private var estilo = "marea"
    private var enViaje = false
    private var inicioViajeMs = 0L
    private var kmAcumulados = 0.0
    private var viajesContados = 0
    private var ultimaUbicacion: Location? = null
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
    private val locationListener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
            // La red puede saltar decenas o cientos de metros. Solo el proveedor
            // GPS se usa como fuente oficial de kilómetros.
            if (location.provider != LocationManager.GPS_PROVIDER) return
            if (location.accuracy <= 0f || location.accuracy > PRECISION_MAXIMA_M) {
                ultimaUbicacion = null
                return
            }
            val anterior = ultimaUbicacion
            if (anterior != null) {
                val distancia = anterior.distanceTo(location)
                val segundos = ((location.time - anterior.time).coerceAtLeast(1L)) / 1000.0
                val velocidad = distancia / segundos
                val umbralM = maxOf(8f, (location.accuracy + anterior.accuracy) * 0.5f)
                // Tras una pérdida de señal no se une el punto nuevo al anterior:
                // hacerlo convertiría un salto GPS en kilómetros recorridos.
                if (segundos > INTERVALO_MAXIMO_S) {
                    ultimaUbicacion = location
                    actualizarTextos(formatearKm(kmAcumulados), formatearTiempo(System.currentTimeMillis() - inicioViajeMs))
                    return
                }
                if (distancia >= umbralM && velocidad >= VELOCIDAD_MINIMA_MS && velocidad <= VELOCIDAD_MAXIMA_MS) {
                    kmAcumulados += distancia / 1000.0
                } else if (velocidad > VELOCIDAD_MAXIMA_MS) {
                    // Punto incompatible con la velocidad de una moto/carro: se
                    // descarta y se reinicia la referencia para no arrastrar el salto.
                    ultimaUbicacion = location
                    actualizarTextos(formatearKm(kmAcumulados), formatearTiempo(System.currentTimeMillis() - inicioViajeMs))
                    return
                }
            }
            ultimaUbicacion = location
            actualizarTextos(formatearKm(kmAcumulados), formatearTiempo(System.currentTimeMillis() - inicioViajeMs))
        }
        override fun onProviderEnabled(provider: String) {}
        override fun onProviderDisabled(provider: String) {}
        override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
    }

    override fun onBind(intent: Intent?): IBinder? = null
    override fun onCreate() {
        super.onCreate()
        activo = true
        val apariencia = getSharedPreferences("noah-burbuja", MODE_PRIVATE)
        colorAcento = apariencia.getString(EXTRA_COLOR_ACENTO, colorAcento) ?: colorAcento
        colorFg = apariencia.getString(EXTRA_COLOR_FG, colorFg) ?: colorFg
        colorSurface = apariencia.getString(EXTRA_COLOR_SURFACE, colorSurface) ?: colorSurface
        estilo = apariencia.getString(EXTRA_ESTILO, estilo) ?: estilo
        getSharedPreferences("noah-burbuja", MODE_PRIVATE).edit().putBoolean("servicio_activo", true).apply()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        locationManager = getSystemService(LOCATION_SERVICE) as LocationManager
        tts = TextToSpeech(this, this)
    }
    override fun onInit(status: Int) { if (status == TextToSpeech.SUCCESS) tts?.language = Locale("es", "CO") }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        crearCanalSiHaceFalta()
        startForeground(NOTIF_ID, construirNotificacion())
        intent?.getStringExtra(EXTRA_RESUMEN_HOY)?.takeIf { it.isNotBlank() }?.let { resumenHoy = it }
        intent?.getStringExtra(EXTRA_RESUMEN_SEMANA)?.takeIf { it.isNotBlank() }?.let { resumenSemana = it }
        intent?.getStringExtra(EXTRA_RESUMEN_MES)?.takeIf { it.isNotBlank() }?.let { resumenMes = it }
        colorAcento = intent?.getStringExtra(EXTRA_COLOR_ACENTO) ?: colorAcento
        colorFg = intent?.getStringExtra(EXTRA_COLOR_FG) ?: colorFg
        colorSurface = intent?.getStringExtra(EXTRA_COLOR_SURFACE) ?: colorSurface
        getSharedPreferences("noah-burbuja", MODE_PRIVATE).edit().putString(EXTRA_COLOR_ACENTO, colorAcento).putString(EXTRA_COLOR_FG, colorFg).putString(EXTRA_COLOR_SURFACE, colorSurface).apply()
        tarjetaActiva = intent?.getBooleanExtra(EXTRA_TARJETA_ACTIVA, tarjetaActiva) ?: tarjetaActiva
        estilo = intent?.getStringExtra(EXTRA_ESTILO) ?: estilo
        getSharedPreferences("noah-burbuja", MODE_PRIVATE).edit().putString(EXTRA_ESTILO, estilo).apply()
        val km = intent?.getStringExtra(EXTRA_KM) ?: formatearKm(kmAcumulados)
        val tiempo = intent?.getStringExtra(EXTRA_TIEMPO) ?: formatearTiempo(if (enViaje) System.currentTimeMillis() - inicioViajeMs else 0)
        val estadoSolicitado = intent?.getBooleanExtra(EXTRA_EN_VIAJE, enViaje) ?: enViaje
        val viajesExternos = intent?.getIntExtra(EXTRA_TOTAL_VIAJES, -1) ?: -1
        if (viajesExternos >= 0) viajesContados = viajesExternos
        if (estadoSolicitado && !enViaje) iniciarViaje(false)
        if (!estadoSolicitado && enViaje) finalizarViaje(false)
        if (vistaBurbuja == null) crearBurbuja()
        if (tarjetaActiva && vistaManija == null) crearManijaResumen()
        if (!tarjetaActiva && vistaManija != null) { vistaManija?.let { runCatching { windowManager.removeView(it) } }; vistaManija = null }
        aplicarColores()
        if (intent?.getBooleanExtra(EXTRA_SOLO_ESTILO, false) == true) return START_STICKY
        actualizarTextos(km, tiempo)
        return START_STICKY
    }

    override fun onDestroy() {
        activo = false
        detenerGps(); handler.removeCallbacksAndMessages(null); tts?.stop(); tts?.shutdown()
        getSharedPreferences("noah-burbuja", MODE_PRIVATE).edit().putBoolean("servicio_activo", false).apply()
        vistaResumen?.let { runCatching { windowManager.removeView(it) } }
        vistaManija?.let { runCatching { windowManager.removeView(it) } }
        vistaBurbuja?.let { runCatching { windowManager.removeView(it) } }
        vistaResumen = null; vistaManija = null; vistaBurbuja = null
        super.onDestroy()
    }

    private fun iniciarViaje(anunciar: Boolean) {
        if (enViaje) return
        enViaje = true; viajesContados += 1; inicioViajeMs = System.currentTimeMillis(); kmAcumulados = 0.0; ultimaUbicacion = null
        solicitarGps(); handler.removeCallbacks(reloj); handler.post(reloj)
        if (anunciar) hablar("Viaje iniciado")
        actualizarTextos("0.0", "0m")
    }

    private fun finalizarViaje(anunciar: Boolean) {
        if (!enViaje) return
        val finMs = System.currentTimeMillis(); val duracionMs = (finMs - inicioViajeMs).coerceAtLeast(0L); val kmFinal = kmAcumulados; val inicioMs = inicioViajeMs
        enViaje = false; detenerGps(); handler.removeCallbacks(reloj)
        if (anunciar) hablar("Viaje finalizado")
        actualizarTextos(formatearKm(kmFinal), formatearTiempo(duracionMs))
        getSharedPreferences("noah-burbuja", MODE_PRIVATE).edit()
            .putFloat("viaje_km", kmFinal.toFloat()).putLong("viaje_inicio", inicioMs)
            .putLong("viaje_fin", finMs).putLong("viaje_tiempo", duracionMs).apply()
        if (anunciar) BurbujaPlugin.instanciaActiva?.notificarAccion("terminar", kmFinal, inicioMs, finMs, duracionMs)
    }

    private fun solicitarGps() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED && ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) return
        runCatching {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000L, 5f, locationListener, Looper.getMainLooper())
        }
    }
    private fun detenerGps() { runCatching { locationManager.removeUpdates(locationListener) }; ultimaUbicacion = null }
    private fun hablar(texto: String) { tts?.speak(texto, TextToSpeech.QUEUE_FLUSH, null, "noah-viaje-${System.currentTimeMillis()}") }
    private fun crearCanalSiHaceFalta() { if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) { val nm = getSystemService(NotificationManager::class.java); if (nm.getNotificationChannel(CANAL_ID) == null) nm.createNotificationChannel(NotificationChannel(CANAL_ID, "Jornada activa", NotificationManager.IMPORTANCE_LOW)) } }
    private fun construirNotificacion(): android.app.Notification {
        val abrirApp = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        return NotificationCompat.Builder(this, CANAL_ID).setContentTitle("NOAH · jornada abierta").setContentText("La burbuja está contando el tiempo y los kilómetros.").setSmallIcon(R.mipmap.ic_launcher).setContentIntent(abrirApp).setOngoing(true).build()
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
        contenedor.setOnTouchListener { _, evento ->
            when (evento.action) {
                MotionEvent.ACTION_DOWN -> { xInicial = params.x; yInicial = params.y; toqueXInicial = evento.rawX; toqueYInicial = evento.rawY; tiempoInicioToque = System.currentTimeMillis(); fueArrastre = false; true }
                MotionEvent.ACTION_MOVE -> { val dx = (evento.rawX - toqueXInicial).toInt(); val dy = (evento.rawY - toqueYInicial).toInt(); if (abs(dx) > UMBRAL_ARRASTRE_PX || abs(dy) > UMBRAL_ARRASTRE_PX) fueArrastre = true; params.x = xInicial + dx; params.y = yInicial + dy; runCatching { windowManager.updateViewLayout(contenedor, params) }; true }
                MotionEvent.ACTION_UP -> {
                    val dx = evento.rawX - toqueXInicial; val duracion = System.currentTimeMillis() - tiempoInicioToque; val cercaDelFondo = params.y > resources.displayMetrics.heightPixels - dp(220)
                    when {
                        fueArrastre && dx < -UMBRAL_DESLIZAMIENTO_PX && tarjetaActiva -> mostrarResumen(params)
                        fueArrastre && dx > UMBRAL_DESLIZAMIENTO_PX -> ocultarResumen()
                        fueArrastre && cercaDelFondo -> { BurbujaPlugin.instanciaActiva?.notificarAccion("cerrar"); stopSelf() }
                        !fueArrastre && duracion >= UMBRAL_TOQUE_MS -> startActivity(Intent(this, MainActivity::class.java).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT) })
                        !fueArrastre -> if (enViaje) finalizarViaje(true) else { iniciarViaje(true); BurbujaPlugin.instanciaActiva?.notificarAccion("iniciar") }
                    }; true
                }
                else -> false
            }
        }
        windowManager.addView(contenedor, params); vistaBurbuja = contenedor
        ValueAnimator.ofFloat(0f, 360f).apply { duration = 9000; repeatCount = ValueAnimator.INFINITE; addUpdateListener { (contenedor.getChildAt(0) as? OrbitaView)?.angulo = it.animatedValue as Float; contenedor.getChildAt(0).invalidate() }; start() }
    }

    private fun crearManijaResumen() {
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
                MotionEvent.ACTION_MOVE -> { val dx = (event.rawX - downX).toInt(); val dy = (event.rawY - downY).toInt(); moved = moved || abs(dx) > dp(4) || abs(dy) > dp(4); params.x = (originX - dx).coerceAtLeast(0); params.y = (originY + dy).coerceIn(dp(80), resources.displayMetrics.heightPixels - dp(100)); runCatching { windowManager.updateViewLayout(manija, params) }; resumenParams?.let { panel -> panel.y = posicionResumenY(params.y, panel.height); vistaResumen?.let { panelView -> runCatching { windowManager.updateViewLayout(panelView, panel) } } }; true }
                MotionEvent.ACTION_UP -> { if (!moved) { if (vistaResumen == null) abrirResumenDesdeManija() else ocultarResumen() }; true }
                else -> false
            }
        }
        windowManager.addView(manija, params)
        vistaManija = manija
    }

    private fun abrirResumenDesdeManija() {
        val params = WindowManager.LayoutParams(dp(184), dp(174), tipoVentana(), WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE, PixelFormat.TRANSLUCENT).apply { gravity = Gravity.TOP or Gravity.END; x = dp(14); y = dp(220) }
        mostrarResumen(params)
    }

    private fun mostrarResumen(burbujaParams: WindowManager.LayoutParams) {
        if (vistaResumen != null) return
        val contenedor = FrameLayout(this)
        val decoracion = ResumenDecoracionView(this)
        decoracionResumen = decoracion
        contenedor.addView(decoracion, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        val contenido = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(10), dp(9), dp(10), dp(9)); background = ColorDrawable(Color.TRANSPARENT) }
        val pestañas = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER }
        val nombres = listOf("Hoy" to "hoy", "Semana" to "semana", "Mes" to "mes")
        etiquetasPeriodo = nombres.map { (nombre, clave) ->
            TextView(this).apply {
                text = nombre; textSize = 10f; gravity = Gravity.CENTER; setPadding(dp(7), dp(5), dp(7), dp(5))
                setOnClickListener { periodoResumen = clave; actualizarResumenSeleccionado() }
                pestañas.addView(this, LinearLayout.LayoutParams(0, dp(27), 1f))
            }
        }
        etiquetaResumen = TextView(this).apply { textSize = 12f; setPadding(dp(4), dp(8), dp(4), dp(2)); text = textoResumenSeleccionado() }
        contenido.addView(pestañas); contenido.addView(etiquetaResumen, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))
        contenedor.addView(contenido, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        val fondo = GradientDrawable().apply { shape = GradientDrawable.RECTANGLE; cornerRadii = floatArrayOf(dp(18).toFloat(), dp(18).toFloat(), dp(4).toFloat(), dp(4).toFloat(), dp(18).toFloat(), dp(18).toFloat(), dp(4).toFloat(), dp(4).toFloat()); setColor(colorSeguro(colorSurface, "#14100A")); setStroke(dp(1), colorSeguro(colorAcento, "#D4AF37")) }; contenedor.background = fondo
        val params = WindowManager.LayoutParams(dp(128), dp(154), tipoVentana(), WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE, PixelFormat.TRANSLUCENT).apply { gravity = Gravity.TOP or Gravity.END; x = dp(14); y = posicionResumenY(burbujaParams.y, dp(154)) }
        windowManager.addView(contenedor, params); vistaResumen = contenedor; resumenParams = params; actualizarResumenSeleccionado()
        resumenAnimator = ValueAnimator.ofFloat(0f, 360f).apply { duration = 9000; repeatCount = ValueAnimator.INFINITE; addUpdateListener { decoracion.fase = it.animatedValue as Float; decoracion.invalidate() }; start() }
    }
    private fun posicionResumenY(manijaY: Int, panelAlto: Int): Int {
        val altoPantalla = resources.displayMetrics.heightPixels
        val margen = dp(8)
        val debajo = manijaY + dp(64) + margen
        val encima = manijaY - panelAlto - margen
        return if (debajo + panelAlto <= altoPantalla - dp(70)) debajo else encima.coerceAtLeast(dp(70))
    }
    private fun ocultarResumen() { resumenAnimator?.cancel(); resumenAnimator = null; decoracionResumen = null; resumenParams = null; vistaResumen?.let { runCatching { windowManager.removeView(it) } }; vistaResumen = null }
    private fun textoResumenSeleccionado(): String {
        val datos = when (periodoResumen) { "semana" -> resumenSemana; "mes" -> resumenMes; else -> resumenHoy }
        val partes = datos.split(" · ")
        val viajes = partes.getOrNull(0)?.replace(" viajes", "")?.replace(" viaje", "")?.ifBlank { "0" } ?: "0"
        val dinero = partes.getOrNull(1)?.ifBlank { "$0" } ?: "$0"
        val km = partes.getOrNull(2)?.replace(" km", "")?.ifBlank { "0.0" } ?: "0.0"
        val kmLimpio = km.toDoubleOrNull()?.let { if (it % 1.0 == 0.0) it.toInt().toString() else it.toString() } ?: km
        return "Viajes  $viajes   Km  $kmLimpio\nTotal   $dinero"
    }
    private fun actualizarResumenSeleccionado() { if (::etiquetaResumen.isInitialized) etiquetaResumen.text = textoResumenSeleccionado(); etiquetasPeriodo.forEachIndexed { i, vista -> vista.setTypeface(null, if (listOf("hoy", "semana", "mes")[i] == periodoResumen) android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL) } }
    private fun aplicarColores() {
        if (::etiquetaTiempo.isInitialized) {
            etiquetaTiempo.setTextColor(colorVisible(colorFg, colorSurface)); etiquetaKm.setTextColor(colorSeguro(colorAcento, "#D4AF37")); etiquetaViajes.setTextColor(colorVisible(colorFg, colorSurface))
            (etiquetaTiempo.parent?.parent as? View)?.background = GradientDrawable().apply { shape = if (estilo == "pulso" || estilo == "marea") GradientDrawable.OVAL else GradientDrawable.RECTANGLE; cornerRadius = when (estilo) { "taller" -> dp(5).toFloat(); "editorial" -> dp(2).toFloat(); else -> dp(28).toFloat() }; setColor(colorSeguro(colorSurface, "#14100A")); setStroke(dp(if (estilo == "pulso") 3 else 2), colorSeguro(colorAcento, "#D4AF37")) }
        }
        if (::etiquetaResumen.isInitialized) { etiquetaResumen.setTextColor(colorVisible(colorFg, colorSurface)); etiquetasPeriodo.forEach { it.setTextColor(colorVisible(colorFg, colorSurface)) }; (vistaResumen?.background as? GradientDrawable)?.setColor(colorSeguro(colorSurface, "#14100A")); (vistaResumen?.background as? GradientDrawable)?.setStroke(dp(1), colorSeguro(colorAcento, "#D4AF37")) }
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
    private fun actualizarTextos(km: String, tiempo: String) { if (::etiquetaTiempo.isInitialized) { etiquetaTiempo.text = tiempo.ifBlank { "0m" }.replace(Regex("\\s+\\d{2}s"), ""); etiquetaKm.text = "Km ${km.ifBlank { "0" }}"; etiquetaViajes.text = "$viajesContados viaje${if (viajesContados == 1) "" else "s"}"; if (vistaResumen != null) actualizarResumenSeleccionado() } }
    private fun formatearTiempo(ms: Long): String { val totalMinutos = (ms / 60000).coerceAtLeast(0); val horas = totalMinutos / 60; val minutos = totalMinutos % 60; return if (horas > 0) "%dh %02dm".format(horas, minutos) else "${minutos}m" }
    private fun formatearKm(km: Double): String = kotlin.math.round(km).toInt().toString()
    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()
    private fun dp(v: Float): Int = (v * resources.displayMetrics.density).toInt()

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

    /** Escena orbital animada: volumen, brillo, profundidad y partículas sin tapar los datos. */
    private inner class ResumenDecoracionView(context: android.content.Context) : View(context) {
        var fase = 0f
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        private val particulas = listOf(.12f to .22f, .24f to .68f, .42f to .17f, .73f to .78f, .9f to .36f, .84f to .9f)

        init { setLayerType(View.LAYER_TYPE_SOFTWARE, null) }

        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            val acento = colorSeguro(colorAcento, "#D4AF37")
            val azul = Color.rgb(60, 150, 255)
            val fg = colorSeguro(colorFg, "#FFFFFF")
            val w = width.toFloat(); val h = height.toFloat(); val cx = w * .52f; val cy = h * .65f
            val radio = (w.coerceAtMost(h) * .25f)
            val giro = Math.toRadians(fase.toDouble())

            // Aura y esfera central con degradado radial para dar sensación de volumen.
            paint.style = Paint.Style.FILL
            paint.shader = RadialGradient(cx - radio * .28f, cy - radio * .35f, radio * 1.65f, intArrayOf(Color.argb(48, 80, 180, 255), Color.argb(24, Color.red(acento), Color.green(acento), Color.blue(acento)), Color.TRANSPARENT), floatArrayOf(0f, .45f, 1f), Shader.TileMode.CLAMP)
            canvas.drawCircle(cx, cy, radio * 1.65f, paint)
            paint.shader = RadialGradient(cx - radio * .35f, cy - radio * .38f, radio * 1.25f, intArrayOf(Color.argb(58, 255, 255, 255), Color.argb(44, 60, 150, 255), Color.argb(30, 8, 25, 70)), floatArrayOf(0f, .25f, 1f), Shader.TileMode.CLAMP)
            canvas.drawCircle(cx, cy, radio, paint)
            paint.shader = null

            // Tres anillos elípticos en distintos ángulos: sustituyen las líneas planas por órbitas.
            paint.style = Paint.Style.STROKE; paint.strokeWidth = dp(1).toFloat(); paint.setShadowLayer(dp(5).toFloat(), 0f, 0f, acento)
            paint.color = acento; paint.alpha = 72
            canvas.save(); canvas.rotate(18f + fase * .65f, cx, cy); canvas.drawOval(cx - radio * 2.25f, cy - radio * .52f, cx + radio * 2.25f, cy + radio * .52f, paint); canvas.restore()
            paint.color = azul; paint.alpha = 62
            canvas.save(); canvas.rotate(-28f - fase * .42f, cx, cy); canvas.drawOval(cx - radio * 1.9f, cy - radio * .42f, cx + radio * 1.9f, cy + radio * .42f, paint); canvas.restore()
            paint.color = fg; paint.alpha = 38; paint.clearShadowLayer()
            canvas.save(); canvas.rotate(72f + fase * .3f, cx, cy); canvas.drawOval(cx - radio * 1.65f, cy - radio * .26f, cx + radio * 1.65f, cy + radio * .26f, paint); canvas.restore()

            // Puntos que orbitan y cambian de profundidad con la fase.
            paint.style = Paint.Style.FILL; paint.setShadowLayer(dp(4).toFloat(), 0f, 0f, acento)
            particulas.forEachIndexed { i, (px, py) ->
                val angulo = giro + i * 1.15
                val profundidad = .72f + .28f * kotlin.math.sin(angulo).toFloat()
                paint.color = if (i % 2 == 0) acento else azul; paint.alpha = (45 + profundidad * 55).toInt()
                canvas.drawCircle(w * px + kotlin.math.cos(angulo).toFloat() * dp(5), h * py + kotlin.math.sin(angulo).toFloat() * dp(4), dp(1.5f + profundidad * 1.7f).toFloat(), paint)
            }
            paint.clearShadowLayer()
        }
    }
}
