@file:Suppress("UseKtx", "ObsoleteSdkInt")

package com.noah.conductor.atlas.burbuja

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/*
 * Puente entre la app web y la burbuja flotante. La burbuja de verdad vive en
 * BurbujaService (una vista dibujada con WindowManager sobre el resto de
 * apps); este plugin solo la enciende, la apaga y le pasa los números.
 */
@CapacitorPlugin(name = "Burbuja")
class BurbujaPlugin : Plugin() {

    companion object {
        // referencia estática: el servicio, que no es un componente de Capacitor,
        // usa esto para avisarle a la web que se tocó la burbuja.
        var instanciaActiva: BurbujaPlugin? = null
    }

    override fun load() {
        super.load()
        instanciaActiva = this
    }

    fun notificarAccion(accion: String, km: Double? = null, inicioMs: Long? = null, finMs: Long? = null, tiempoMs: Long? = null) {
        val datos = JSObject()
        datos.put("accion", accion)
        if (km != null) datos.put("km", km)
        if (inicioMs != null) datos.put("inicioMs", inicioMs)
        if (finMs != null) datos.put("finMs", finMs)
        if (tiempoMs != null) datos.put("tiempoMs", tiempoMs)
        notifyListeners("accion", datos)
    }

    @PluginMethod
    fun tienePermiso(call: PluginCall) {
        val concedido = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else true
        val r = JSObject()
        r.put("concedido", concedido)
        call.resolve(r)
    }

    @PluginMethod
    fun solicitarPermiso(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + context.packageName)
            )
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
        }
        val r = JSObject()
        r.put("concedido", Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context))
        call.resolve(r)
    }

    @PluginMethod
    fun mostrar(call: PluginCall) {
        val i = Intent(context, BurbujaService::class.java)
        i.action = BurbujaService.ACCION_MOSTRAR
        i.putExtra(BurbujaService.EXTRA_KM, call.getString("km", "0.0"))
        i.putExtra(BurbujaService.EXTRA_TIEMPO, call.getString("tiempo", "0m"))
        i.putExtra(BurbujaService.EXTRA_EN_VIAJE, call.getBoolean("enViaje", false) ?: false)
        i.putExtra(BurbujaService.EXTRA_TOTAL_VIAJES, call.getInt("totalViajes", 0) ?: 0)
        i.putExtra(BurbujaService.EXTRA_RESUMEN_HOY, call.getString("resumenHoy", ""))
        i.putExtra(BurbujaService.EXTRA_RESUMEN_SEMANA, call.getString("resumenSemana", ""))
        i.putExtra(BurbujaService.EXTRA_RESUMEN_MES, call.getString("resumenMes", ""))
        i.putExtra(BurbujaService.EXTRA_COLOR_ACENTO, call.getString("colorAcento", "#D4AF37"))
        i.putExtra(BurbujaService.EXTRA_COLOR_FG, call.getString("colorFg", "#F3EDDD"))
        i.putExtra(BurbujaService.EXTRA_COLOR_SURFACE, call.getString("colorSurface", "#14100A"))
        i.putExtra(BurbujaService.EXTRA_TARJETA_ACTIVA, call.getBoolean("tarjetaActiva", true) ?: true)
        i.putExtra(BurbujaService.EXTRA_ESTILO, call.getString("estilo", "marea"))
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(i) else context.startService(i)
        call.resolve()
    }

    @PluginMethod
    fun actualizar(call: PluginCall) {
        val i = Intent(context, BurbujaService::class.java)
        i.action = BurbujaService.ACCION_ACTUALIZAR
        i.putExtra(BurbujaService.EXTRA_KM, call.getString("km", "0.0"))
        i.putExtra(BurbujaService.EXTRA_TIEMPO, call.getString("tiempo", "0m"))
        i.putExtra(BurbujaService.EXTRA_EN_VIAJE, call.getBoolean("enViaje", false) ?: false)
        i.putExtra(BurbujaService.EXTRA_TOTAL_VIAJES, call.getInt("totalViajes", 0) ?: 0)
        i.putExtra(BurbujaService.EXTRA_RESUMEN_HOY, call.getString("resumenHoy", ""))
        i.putExtra(BurbujaService.EXTRA_RESUMEN_SEMANA, call.getString("resumenSemana", ""))
        i.putExtra(BurbujaService.EXTRA_RESUMEN_MES, call.getString("resumenMes", ""))
        val prefs = context.getSharedPreferences("mia-burbuja", android.content.Context.MODE_PRIVATE)
        i.putExtra(BurbujaService.EXTRA_COLOR_ACENTO, call.getString("colorAcento", prefs.getString(BurbujaService.EXTRA_COLOR_ACENTO, "#D4AF37")))
        i.putExtra(BurbujaService.EXTRA_COLOR_FG, call.getString("colorFg", prefs.getString(BurbujaService.EXTRA_COLOR_FG, "#F3EDDD")))
        i.putExtra(BurbujaService.EXTRA_COLOR_SURFACE, call.getString("colorSurface", prefs.getString(BurbujaService.EXTRA_COLOR_SURFACE, "#14100A")))
        i.putExtra(BurbujaService.EXTRA_TARJETA_ACTIVA, call.getBoolean("tarjetaActiva", true) ?: true)
        i.putExtra(BurbujaService.EXTRA_ESTILO, call.getString("estilo", prefs.getString(BurbujaService.EXTRA_ESTILO, "marea")))
        context.startService(i)
        call.resolve()
    }

    @PluginMethod
    fun ocultar(call: PluginCall) {
        context.stopService(Intent(context, BurbujaService::class.java))
        call.resolve()
    }

    @PluginMethod
    fun actualizarApariencia(call: PluginCall) {
        val acento = call.getString("colorAcento", "#D4AF37") ?: "#D4AF37"
        val fg = call.getString("colorFg", "#F3EDDD") ?: "#F3EDDD"
        val surface = call.getString("colorSurface", "#14100A") ?: "#14100A"
        context.getSharedPreferences("mia-burbuja", android.content.Context.MODE_PRIVATE).edit()
            .putString(BurbujaService.EXTRA_COLOR_ACENTO, acento)
            .putString(BurbujaService.EXTRA_COLOR_FG, fg)
            .putString(BurbujaService.EXTRA_COLOR_SURFACE, surface)
            .apply()
        val activo = BurbujaService.activo
        if (activo) {
            val i = Intent(context, BurbujaService::class.java)
            i.action = BurbujaService.ACCION_ACTUALIZAR
            i.putExtra(BurbujaService.EXTRA_SOLO_ESTILO, true)
            i.putExtra(BurbujaService.EXTRA_COLOR_ACENTO, acento)
            i.putExtra(BurbujaService.EXTRA_COLOR_FG, fg)
            i.putExtra(BurbujaService.EXTRA_COLOR_SURFACE, surface)
            runCatching { context.startService(i) }
        }
        call.resolve()
    }

    @PluginMethod
    fun viajePendiente(call: PluginCall) {
        val prefs = context.getSharedPreferences("mia-burbuja", android.content.Context.MODE_PRIVATE)
        val inicio = prefs.getLong("viaje_inicio", 0L)
        if (inicio == 0L) { call.resolve(JSObject()); return }
        val r = JSObject()
        r.put("km", prefs.getFloat("viaje_km", 0f).toDouble())
        r.put("inicioMs", inicio)
        r.put("finMs", prefs.getLong("viaje_fin", inicio))
        r.put("tiempoMs", prefs.getLong("viaje_tiempo", 0L))
        call.resolve(r)
    }

    @PluginMethod
    fun limpiarViajePendiente(call: PluginCall) {
        context.getSharedPreferences("mia-burbuja", android.content.Context.MODE_PRIVATE).edit().clear().apply()
        call.resolve()
    }
}
