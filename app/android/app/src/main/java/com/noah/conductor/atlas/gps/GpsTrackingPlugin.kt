package com.noah.conductor.atlas.gps

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
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

    /**
     * 2026-09-15 — pedido explícito del usuario: pantalla de onboarding que
     * pide los 4 permisos (notificaciones, ubicación, burbuja, micrófono)
     * apenas se abre la app por primera vez, ANTES de que el conductor
     * inicie ningún viaje. `startTracking()` ya dispara el mismo diálogo de
     * permisos, pero además arranca el foreground service (y su
     * notificación persistente) — no sirve para "solo preguntar". Este
     * método es el mismo flujo de permisos exacto (foreground → background,
     * mismos alias declarados arriba en @CapacitorPlugin), sin el
     * `beginService()` final — ver domain/onboarding/permisos.ts.
     */
    @PluginMethod
    fun solicitarPermisos(call: PluginCall) {
        if (!hasRequiredPermissions()) {
            requestPermissionForAlias("location", call, "onboardingLocationCallback")
            return
        }
        onboardingBackgroundCheck(call)
    }

    @PermissionCallback
    private fun onboardingLocationCallback(call: PluginCall) {
        onboardingBackgroundCheck(call)
    }

    private fun onboardingBackgroundCheck(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
            getPermissionState("backgroundLocation") != com.getcapacitor.PermissionState.GRANTED
        ) {
            requestPermissionForAlias("backgroundLocation", call, "onboardingBackgroundCallback")
            return
        }
        resolverConcedido(call)
    }

    @PermissionCallback
    private fun onboardingBackgroundCallback(call: PluginCall) {
        resolverConcedido(call)
    }

    private fun resolverConcedido(call: PluginCall) {
        val r = JSObject()
        r.put("concedido", hasRequiredPermissions())
        call.resolve(r)
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
        // 2026-09-15, bug real reportado ("la mayoría de los viajes queda en cero
        // kilómetros"): sin esto, en varios fabricantes (Xiaomi/Samsung/Huawei/Oppo,
        // muy comunes en Colombia) el sistema puede parar en silencio la captura de
        // GPS en segundo plano aunque el foreground service siga vivo — la
        // notificación se ve, pero las ubicaciones dejan de llegar. `forzar = false`:
        // esto NO interrumpe con la pantalla de sistema en cada viaje, solo la
        // primera vez que corre en la instalación (ver el guard de SharedPreferences
        // en `solicitarIgnorarOptimizacionBateriaInterna`) — cubre tanto instalaciones
        // nuevas que no vieron el paso de Onboarding (todavía sin publicar cuando
        // este fix se hizo) como el arranque real del servicio en cualquier caso.
        solicitarIgnorarOptimizacionBateriaInterna(forzar = false)
        call.resolve()
    }

    private fun estaExentoDeOptimizacionBateria(): Boolean {
        val pm = context.getSystemService(android.content.Context.POWER_SERVICE) as PowerManager
        return pm.isIgnoringBatteryOptimizations(context.packageName)
    }

    /**
     * `forzar = true` (paso explícito de Onboarding, con explicación en pantalla antes
     * de preguntar) siempre abre la pantalla de sistema si todavía no está exenta.
     * `forzar = false` (arranque real del servicio, ver `beginService()`) solo la abre
     * la PRIMERA vez en toda la instalación — evita interrumpir con la pantalla de
     * sistema en cada viaje si el conductor ya la vio y decidió qué hacer.
     */
    private fun solicitarIgnorarOptimizacionBateriaInterna(forzar: Boolean) {
        if (estaExentoDeOptimizacionBateria()) return
        val prefs = context.getSharedPreferences("mia-gps", android.content.Context.MODE_PRIVATE)
        if (!forzar && prefs.getBoolean("bateria_solicitada", false)) return
        prefs.edit().putBoolean("bateria_solicitada", true).apply()
        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
            data = Uri.parse("package:" + context.packageName)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        runCatching { context.startActivity(intent) }
    }

    /** Paso explícito de Onboarding (domain/onboarding/permisos.ts) — con explicación en pantalla antes de preguntar. */
    @PluginMethod
    fun solicitarIgnorarOptimizacionBateria(call: PluginCall) {
        solicitarIgnorarOptimizacionBateriaInterna(forzar = true)
        val r = JSObject()
        r.put("exento", estaExentoDeOptimizacionBateria())
        call.resolve(r)
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
