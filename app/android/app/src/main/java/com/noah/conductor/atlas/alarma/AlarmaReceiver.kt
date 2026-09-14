package com.noah.conductor.atlas.alarma

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Abre únicamente la pantalla completa de MIA para alarmas de un día o del momento. */
class AlarmaReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val intentPantalla = Intent(context, AlarmaActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("titulo", intent.getStringExtra("titulo") ?: "MIA")
            putExtra("detalle", intent.getStringExtra("detalle") ?: "")
            putExtra("vozId", intent.getStringExtra("vozId") ?: "voz_1")
            putExtra("tipo", intent.getStringExtra("tipo") ?: "recordatorio")
        }
        runCatching { context.startActivity(intentPantalla) }
    }
}
