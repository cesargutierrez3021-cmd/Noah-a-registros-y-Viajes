import type { CapacitorConfig } from '@capacitor/cli';

// Package mantenido como com.noah.conductor.atlas por D-1 (plugins nativos
// reutilizados del proyecto viejo sin reescribir). Renombrar a com.mia.* es
// tarea pendiente y explícita de la Fase 14 (limpieza final) — no tocar antes.
const config: CapacitorConfig = {
  appId: 'com.noah.conductor.atlas',
  appName: 'MIA',
  webDir: 'dist',
  android: {
    // El foreground service de ubicación (GpsTrackingService) necesita que
    // la Activity principal no se destruya agresivamente en background.
    allowMixedContent: false,
  },
};

export default config;
