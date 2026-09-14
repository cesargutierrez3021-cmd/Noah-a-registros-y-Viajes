@file:Suppress("UseKtx", "ObsoleteSdkInt")

package com.noah.conductor.atlas.alarma

import android.app.AlarmManager
import android.app.PendingIntent
import android.app.NotificationManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Alarmas que se abren a pantalla completa, incluso con el celular bloqueado:
 * vencimientos, la meta del día y los bloques de la rutina. Usa AlarmManager
 * para el disparo exacto y AlarmaReceiver + AlarmaActivity para la pantalla.
 */
@CapacitorPlugin(name = "AlarmaPantalla")
class AlarmaPantallaPlugin : Plugin() {

    @PluginMethod
    fun tienePermisoAlarmasExactas(call: PluginCall) {
        val concedido = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val am = context.getSystemService(AlarmManager::class.java)
            am.canScheduleExactAlarms()
        } else true
        val r = JSObject()
        r.put("concedido", concedido)
        call.resolve(r)
    }

    @PluginMethod
    fun solicitarPermisoAlarmasExactas(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val am = context.getSystemService(AlarmManager::class.java)
            if (!am.canScheduleExactAlarms()) {
                val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + context.packageName))
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(intent)
            }
        }
        call.resolve()
    }

    @PluginMethod
    fun tienePermisoPantallaCompleta(call: PluginCall) {
        val concedido = if (Build.VERSION.SDK_INT >= 34) {
            val nm = context.getSystemService(NotificationManager::class.java)
            nm.areNotificationsEnabled() && nm.canUseFullScreenIntent()
        } else true
        val r = JSObject()
        r.put("concedido", concedido)
        call.resolve(r)
    }

    @PluginMethod
    fun solicitarPermisoPantallaCompleta(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= 34) {
            val intent = Intent("android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT", Uri.parse("package:" + context.packageName))
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
        }
        call.resolve()
    }

    @PluginMethod
    fun programar(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("falta id")
        val fechaHoraMs = call.getLong("fechaHoraMs") ?: return call.reject("falta fechaHoraMs")
        val titulo = call.getString("titulo") ?: "MIA"
        val detalle = call.getString("detalle", "") ?: ""
        val vozId = call.getString("vozId", "voz_1") ?: "voz_1"
        val tipo = call.getString("tipo", "recordatorio") ?: "recordatorio"

        val intent = Intent(context, AlarmaReceiver::class.java).apply {
            putExtra("id", id)
            putExtra("titulo", titulo)
            putExtra("detalle", detalle)
            putExtra("vozId", vozId)
            putExtra("tipo", tipo)
        }
        val pendiente = PendingIntent.getBroadcast(
            context, idANumero(id), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val am = context.getSystemService(AlarmManager::class.java)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && am.canScheduleExactAlarms()) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fechaHoraMs, pendiente)
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fechaHoraMs, pendiente)
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, fechaHoraMs, pendiente)
            }
        } catch (e: SecurityException) {
            am.set(AlarmManager.RTC_WAKEUP, fechaHoraMs, pendiente)
        }
        call.resolve()
    }

    @PluginMethod
    fun cancelar(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("falta id")
        val intent = Intent(context, AlarmaReceiver::class.java)
        val pendiente = PendingIntent.getBroadcast(
            context, idANumero(id), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        context.getSystemService(AlarmManager::class.java).cancel(pendiente)
        call.resolve()
    }

    private fun idANumero(id: String): Int {
        var h = 0
        for (c in id) h = h * 31 + c.code
        return h and 0x7fffffff
    }
}
