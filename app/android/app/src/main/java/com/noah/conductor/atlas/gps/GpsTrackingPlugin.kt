package com.noah.conductor.atlas.gps

import android.Manifest
import android.content.Intent
import android.os.Build
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

/**
 * Plugin Capacitor que expone el foreground service de GPS al lado JS.
 *
 * Uso desde TypeScript (ver app/src/domain/viajes/gpsBackground.ts):
 *   GpsTracking.startTracking()
 *   GpsTracking.stopTracking()
 *   GpsTracking.addListener('locationUpdate', (punto) => { ... })
 *
 * Ya está conectado a domain/viajes/gps.ts (delega aquí en Android nativo).
 * Este comentario decía antes "no está conectado todavía, próxima sesión" —
 * quedó desactualizado de antes de que se hiciera esa integración; se
 * corrigió al revisar el pendiente crítico de Fase 5 (ver MainActivity.java
 * — el bug real era que este plugin nunca se registraba en el bridge de
 * Capacitor, no que le faltara conectarse del lado TS).
 */
@CapacitorPlugin(
    name = "GpsTracking",
    permissions = [
        Permission(
            alias = "location",
            strings = [Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION]
        ),
        Permission(
            alias = "backgroundLocation",
            strings = [Manifest.permission.ACCESS_BACKGROUND_LOCATION]
        )
    ]
)
class GpsTrackingPlugin : Plugin(), GpsTrackingService.GpsLocationListener {

    override fun load() {
        super.load()
        GpsTrackingService.listener = this
    }

    @PluginMethod
    fun startTracking(call: PluginCall) {
        if (!hasRequiredPermissions()) {
            requestPermissionForAlias("location", call, "locationPermsCallback")
            return
        }
        beginService(call)
    }

    @PermissionCallback
    private fun locationPermsCallback(call: PluginCall) {
        if (getPermissionState("location") != com.getcapacitor.PermissionState.GRANTED) {
            call.reject("Permiso de ubicación denegado")
            return
        }
        // El permiso de background (ACCESS_BACKGROUND_LOCATION) en Android 10+
        // se debe pedir por separado, después de tener el de foreground.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
            getPermissionState("backgroundLocation") != com.getcapacitor.PermissionState.GRANTED
        ) {
            requestPermissionForAlias("backgroundLocation", call, "backgroundPermsCallback")
            return
        }
        beginService(call)
    }

    @PermissionCallback
    private fun backgroundPermsCallback(call: PluginCall) {
        // Si el usuario niega el permiso de segundo plano, igual arrancamos
        // en primer plano: mejor tener el registro mientras la app está
        // visible que no tener nada. El lado JS debe avisar al usuario
        // que sin ese permiso el viaje se puede cortar al minimizar.
        beginService(call)
    }

    private fun beginService(call: PluginCall) {
        val intent = Intent(context, GpsTrackingService::class.java).apply {
            action = GpsTrackingService.ACTION_START
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
        call.resolve()
    }

    @PluginMethod
    fun getPersistedTrack(call: PluginCall) {
        val r = JSObject()
        // El servicio puede estar vivo aunque el WebView haya muerto; consultamos su prefs directamente.
        val prefs = context.getSharedPreferences("mia-gps", android.content.Context.MODE_PRIVATE)
        r.put("pointsJson", prefs.getString("puntos", "[]"))
        call.resolve(r)
    }

    @PluginMethod
    fun clearPersistedTrack(call: PluginCall) {
        context.getSharedPreferences("mia-gps", android.content.Context.MODE_PRIVATE).edit().remove("puntos").apply()
        call.resolve()
    }

    @PluginMethod
    fun stopTracking(call: PluginCall) {
        val intent = Intent(context, GpsTrackingService::class.java).apply {
            action = GpsTrackingService.ACTION_STOP
        }
        context.startService(intent)
        call.resolve()
    }

    override fun onLocation(lat: Double, lng: Double, accuracyMeters: Float, timestampMs: Long) {
        val data = JSObject().apply {
            put("lat", lat)
            put("lng", lng)
            put("precisionMetros", accuracyMeters)
            put("timestampMs", timestampMs)
        }
        notifyListeners("locationUpdate", data)
    }

    override fun handleOnDestroy() {
        if (GpsTrackingService.listener === this) {
            GpsTrackingService.listener = null
        }
        super.handleOnDestroy()
    }
}
