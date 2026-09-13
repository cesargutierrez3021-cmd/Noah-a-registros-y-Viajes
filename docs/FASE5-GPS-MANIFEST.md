# Fase 5 — cambios manuales pendientes en AndroidManifest.xml

Este zip no incluye `AndroidManifest.xml` ni `MainActivity`, así que estos
cambios hay que aplicarlos a mano sobre el proyecto real antes de compilar.

## 1. Permisos (dentro de `<manifest>`, junto a los que ya tenga la app)

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
```

`ACCESS_BACKGROUND_LOCATION` en Android 10+ Google Play lo revisa con más
cuidado (requiere justificación en Play Console — declarar uso para
"registro de viajes con la app en segundo plano").

## 2. Declarar el servicio (dentro de `<application>`)

```xml
<service
    android:name="com.noah.conductor.atlas.gps.GpsTrackingService"
    android:foregroundServiceType="location"
    android:exported="false" />
```

## 3. Registrar el plugin en MainActivity

**RESUELTO DE VERDAD (antes decía "confirmar contra el proyecto real" y
nunca se confirmó — ver PLAN-MAESTRO, pendiente crítico de Fase 5):** sí
hace falta registro manual. `GpsTrackingPlugin`, `BurbujaPlugin` y
`AlarmaPantallaPlugin` viven directamente en el módulo de la app (no son
paquetes npm, D-1), y el auto-registro de Capacitor solo aplica a plugins
npm procesados por `npx cap sync`. `MainActivity.java` ya tiene esto
aplicado (revisar ese archivo, no copiar el snippet de abajo a mano):

```java
@Override
public void onCreate(Bundle savedInstanceState) {
    registerPlugin(GpsTrackingPlugin.class);
    registerPlugin(BurbujaPlugin.class);
    registerPlugin(AlarmaPantallaPlugin.class);
    super.onCreate(savedInstanceState);
}
```

## 4. Dependencia de Google Play Services Location

En `app/android/app/build.gradle` (módulo), confirmar que existe:

```gradle
implementation 'com.google.android.gms:play-services-location:21.3.0'
```

(no se tocó ningún `build.gradle` en esta sesión porque no venía en el zip).

## No sé nada del build.gradle / MainActivity reales

Estas notas se escribieron sin leer el resto del código del proyecto
(instrucción explícita del usuario en esta sesión). Antes de compilar,
revisar que estos nombres/paquetes coincidan con la estructura real.
