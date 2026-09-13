package com.noah.conductor.atlas.alarma

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Tras reiniciar el celular, Android borra las alarmas exactas programadas.
 * Este receptor solo confirma que el sistema puede despertar la app; la
 * reprogramación real ocurre en la web, apenas se abre Avisos o Rutina,
 * porque ahí es donde vive la lista de qué falta programar.
 */
class ReinicioReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        // sin acción: ver comentario de arriba.
    }
}
