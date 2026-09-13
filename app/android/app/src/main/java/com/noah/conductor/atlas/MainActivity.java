package com.noah.conductor.atlas;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.noah.conductor.atlas.alarma.AlarmaPantallaPlugin;
import com.noah.conductor.atlas.burbuja.BurbujaPlugin;
import com.noah.conductor.atlas.gps.GpsTrackingPlugin;

/**
 * CORRECCIÓN (investigando el "Pendiente crítico arrastrado de Fase 5" del
 * PLAN-MAESTRO: el permiso de GPS nunca se disparó ni una vez al probar el
 * APK en un dispositivo real).
 *
 * El comentario que había antes aquí ("Capacitor detecta y registra
 * automáticamente los plugins @CapacitorPlugin desde Capacitor 3+") es
 * INCORRECTO para este proyecto y quedó marcado como "resuelto" en
 * docs/FASE5-GPS-MANIFEST.md sin confirmarse de verdad contra el código real
 * (el propio archivo lo dejaba como duda abierta: "confirmar... en el
 * proyecto real"). El auto-registro de Capacitor (vía el
 * `capacitor.plugins.json` que genera `npx cap sync`) SOLO aplica a plugins
 * instalados como paquete npm. GpsTrackingPlugin, BurbujaPlugin y
 * AlarmaPantallaPlugin viven directamente en el módulo de la app (no son
 * paquetes npm, D-1) — para ese caso, Capacitor exige registro manual con
 * `registerPlugin()` en `onCreate()`, antes de `super.onCreate()`.
 *
 * Sin este registro, cualquier llamada desde JS a estos tres plugins
 * (`GpsTracking.startTracking()`, `Burbuja.*`, `AlarmaPantalla.*`) nunca
 * llega al lado nativo — coincide exactamente con el síntoma reportado
 * (ningún permiso se pidió, ni el de foreground ni el de background).
 *
 * NO SE PROBÓ EN UN DISPOSITIVO REAL — sigue siendo la limitación de
 * siempre en este entorno (sin Android SDK/emulador/dispositivo). Este es
 * el candidato más probable encontrado por revisión de código, no una
 * confirmación de que el bug queda resuelto — falta compilar el APK de
 * nuevo y volver a probar el flujo de permisos en un teléfono real antes de
 * cerrar el pendiente crítico de Fase 5.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GpsTrackingPlugin.class);
        registerPlugin(BurbujaPlugin.class);
        registerPlugin(AlarmaPantallaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
