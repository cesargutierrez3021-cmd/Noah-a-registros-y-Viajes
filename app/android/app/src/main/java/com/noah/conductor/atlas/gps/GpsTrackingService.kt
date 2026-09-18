package com.noah.conductor.atlas.gps

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
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource

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
    private var cancellationSource: CancellationTokenSource? = null

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

        // BUG REAL (auditoría): requestLocationUpdates con PRIORITY_HIGH_ACCURACY
        // necesita un fix de GPS "en frío" — si el conductor arranca el viaje
        // detenido (auto recién prendido, en un parqueadero, señal débil), ese
        // primer fix puede tardar bastante. Si el viaje es corto o el conductor
        // ya terminó de moverse antes de que llegue ese primer punto, `recorrido`
        // queda con 0 o 1 puntos y `distanciaRecorridoKm()` (distancia.ts) da 0 —
        // exactamente el síntoma "a veces marca 0.0 km" reportado.
        // Fix: pedir un fix inmediato con getCurrentLocation (mezcla GPS+red,
        // llega mucho más rápido aunque sea menos preciso) como PRIMER punto,
        // mientras requestLocationUpdates sigue trayendo el stream de precisión
        // real para el resto del recorrido.
        try {
            cancellationSource = CancellationTokenSource()
            fusedClient.getCurrentLocation(Priority.PRIORITY_BALANCED_POWER_ACCURACY, cancellationSource!!.token)
                .addOnSuccessListener { loc ->
                    loc?.let { listener?.onLocation(it.latitude, it.longitude, it.accuracy, it.time) }
                }
        } catch (e: SecurityException) {
            // Sin permisos — el catch de requestLocationUpdates de abajo ya
            // detiene el servicio en ese caso, acá no hay nada más que hacer.
        }

        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, INTERVAL_MS)
            .setMinUpdateIntervalMillis(MIN_INTERVAL_MS)
            .build()

        callback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val loc = result.lastLocation ?: return
                listener?.onLocation(loc.latitude, loc.longitude, loc.accuracy, loc.time)
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
        cancellationSource?.cancel()
        cancellationSource = null
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

    override fun onDestroy() {
        cancellationSource?.cancel()
        callback?.let { fusedClient.removeLocationUpdates(it) }
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
