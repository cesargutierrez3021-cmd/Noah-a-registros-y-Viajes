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

Si el proyecto registra plugins manualmente (Capacitor >= 3 normalmente
los detecta solo por el `@CapacitorPlugin`, pero confirmar contra cómo
están registrados `BurbujaPlugin`/`AlarmaPantallaPlugin` en el proyecto real):

```kotlin
// Si hace falta registro manual:
registerPlugin(GpsTrackingPlugin::class.java)
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
