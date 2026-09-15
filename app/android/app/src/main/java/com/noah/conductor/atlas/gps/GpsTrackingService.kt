package com.noah.conductor.atlas.gps

import com.noah.conductor.atlas.burbuja.BurbujaService
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import org.json.JSONArray
import org.json.JSONObject
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority

/**
 * Foreground service tipo "location" para capturar el recorrido del viaje
 * aunque la app esté minimizada o la pantalla apagada.
 *
 * Mismo patrón que BurbujaService/AlarmaReceiver (D-9): servicio en primer
 * plano con notificación persistente, para que Android no lo mate.
 *
 * Este servicio NO decide nada de dominio (no sabe qué es un "viaje" ni una
 * "jornada"): solo emite puntos GPS crudos. La capa de dominio
 * (app/src/domain/viajes) es la que interpreta esos puntos. Eso se hace
 * a través de GpsTrackingPlugin, que reenvía cada punto al lado JS.
 */
class GpsTrackingService : Service() {

    companion object {
        const val CHANNEL_ID = "mia_gps_tracking"
        const val NOTIFICATION_ID = 8801
        const val ACTION_START = "com.noah.conductor.atlas.gps.action.START"
        const val ACTION_STOP = "com.noah.conductor.atlas.gps.action.STOP"

        // Referencia estática al plugin activo para reenviar ubicaciones.
        // Se setea/limpia desde GpsTrackingPlugin en su ciclo de vida.
        var listener: GpsLocationListener? = null

        // Intervalo de actualización. Ajustable luego según consumo de batería real.
        private const val INTERVAL_MS = 5_000L
        private const val MIN_INTERVAL_MS = 3_000L
    }

    interface GpsLocationListener {
        fun onLocation(lat: Double, lng: Double, accuracyMeters: Float, timestampMs: Long)
    }

    private lateinit var fusedClient: FusedLocationProviderClient
    private var callback: LocationCallback? = null
    private val prefs by lazy { getSharedPreferences("mia-gps", MODE_PRIVATE) }

    override fun onCreate() {
        super.onCreate()
        fusedClient = LocationServices.getFusedLocationProviderClient(this)
        createChannelIfNeeded()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopTracking()
                return START_NOT_STICKY
            }
            else -> startTracking()
        }
        // START_STICKY: si el sistema mata el proceso, Android intenta
        // recrear el servicio. El viaje puede durar horas, así que interesa
        // que se recupere solo.
        return START_STICKY
    }

    private fun startTracking() {
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        if (callback != null) return // ya está corriendo

        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, INTERVAL_MS)
            .setMinUpdateIntervalMillis(MIN_INTERVAL_MS)
            .build()

        callback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val loc = result.lastLocation ?: return
                guardarPunto(loc.latitude, loc.longitude, loc.accuracy, loc.time)
                listener?.onLocation(loc.latitude, loc.longitude, loc.accuracy, loc.time)
                // 2026-09-15, pedido explícito del usuario: "en la burbuja a veces no me hace
                // el conteo de los kilómetros" — además de reenviar al JS (`listener`, que
                // depende de que el WebView siga viva), se avisa DIRECTO a BurbujaService
                // (mismo proceso, nativo a nativo) para que el km de la burbuja no dependa de
                // que la app siga corriendo. Ver el comentario completo en
                // BurbujaService.actualizarKmDesdeGps().
                BurbujaService.instanciaActiva?.actualizarKmDesdeGps(loc.latitude, loc.longitude, loc.accuracy, loc.time)
            }
        }

        try {
            fusedClient.requestLocationUpdates(request, callback as LocationCallback, mainLooper)
        } catch (e: SecurityException) {
            // Sin permisos de ubicación en background. El lado JS debe haber
            // verificado esto antes de llamar a startTracking en el plugin;
            // si llega aquí igual, se detiene el servicio para no quedar
            // "vivo" sin poder capturar nada.
            stopTracking()
        }
    }

    private fun stopTracking() {
        callback?.let { fusedClient.removeLocationUpdates(it) }
        callback = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun buildNotification(): Notification {
        val stopIntent = Intent(this, GpsTrackingService::class.java).apply { action = ACTION_STOP }
        val stopPending = PendingIntent.getService(
            this, 0, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("MIA está registrando tu viaje")
            .setContentText("Toca para volver a la app")
            .setSmallIcon(applicationInfo.icon)
            .setOngoing(true)
            .addAction(Notification.Action.Builder(null, "Detener", stopPending).build())
            .build()
    }

    private fun createChannelIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return

        val channel = NotificationChannel(
            CHANNEL_ID,
            "Registro de viaje en curso",
            NotificationManager.IMPORTANCE_LOW
        )
        manager.createNotificationChannel(channel)
    }


    private fun guardarPunto(lat: Double, lng: Double, accuracy: Float, timestampMs: Long) {
        val puntos = runCatching { JSONArray(prefs.getString("puntos", "[]")) }.getOrElse { JSONArray() }
        puntos.put(JSONObject().apply { put("lat", lat); put("lng", lng); put("precisionMetros", accuracy); put("timestampMs", timestampMs) })
        // Mantener solo la traza activa; un viaje normal no debería crecer indefinidamente.
        while (puntos.length() > 5000) puntos.remove(0)
        prefs.edit().putString("puntos", puntos.toString()).apply()
    }

    fun obtenerPuntosPersistidos(): String = prefs.getString("puntos", "[]") ?: "[]"
    fun limpiarPuntosPersistidos() { prefs.edit().remove("puntos").apply() }

    override fun onDestroy() {
        callback?.let { fusedClient.removeLocationUpdates(it) }
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
