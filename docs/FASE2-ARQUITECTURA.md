# MIA — Fase 2: Arquitectura limpia

> Basado en el inventario de Fase 1 (proyecto NOAH Conductor: Capacitor + React + zustand local, sin backend) y en el documento de requisitos MIA. Objetivo: una arquitectura donde cada responsabilidad tiene un único dueño, pensada desde el día 1 para publicarse en Google Play.

---

## 1. Principios que gobiernan cada decisión

1. **Una responsabilidad, un dueño.** Nunca dos módulos calculan lo mismo (km, plataforma, localidad, mantenimiento).
2. **Offline-first, backend-authoritative.** El teléfono siempre puede escribir sin internet; el backend es la verdad final cuando hay conflicto.
3. **Cliente delgado, backend con el cerebro caro.** Todo lo que cueste dinero (llamadas a IA) o requiera secretos (API keys) vive en el backend. El cliente nunca ve una clave de proveedor de IA.
4. **Nativo antes que librería.** GPS, geofencing, notificaciones, alarmas a pantalla completa → Android nativo (ya lo tienes bien resuelto en Kotlin). No se reemplaza por una librería JS que ya funciona peor.
5. **Menos módulos, no más.** Cada archivo nuevo tiene que reemplazar algo, no apilarse sobre lo anterior.

---

## 2. Mapa de capas

```
┌─────────────────────────────────────────────────────────┐
│  APP ANDROID (Capacitor + React)                         │
│  ┌───────────────┐ ┌───────────────┐ ┌─────────────────┐ │
│  │  UI / Screens  │ │ Estado local  │ │  Plugins nativos │ │
│  │  (pantallas,   │ │ (cache        │ │  Kotlin:         │ │
│  │  componentes)  │ │  offline +    │ │  - burbuja       │ │
│  │                │ │  cola de sync)│ │  - alarma        │ │
│  │                │ │               │ │  - GPS foreground│ │
│  └───────┬────────┘ └───────┬───────┘ └────────┬─────────┘ │
│          └──────────────────┴──────────────────┘           │
│                    Repositorios (una función = una fuente) │
└───────────────────────────┬───────────────────────────────┘
                             │ HTTPS (JWT)
┌───────────────────────────┴───────────────────────────────┐
│  BACKEND MIA                                                │
│  ┌────────────┐ ┌───────────────┐ ┌───────────────────────┐│
│  │ Auth/Users │ │ Planes/permisos│ │ Sync + dedupe          ││
│  └────────────┘ └───────────────┘ └───────────────────────┘│
│  ┌────────────┐ ┌───────────────┐ ┌───────────────────────┐│
│  │Intent Router│ │ Contexto IA   │ │ Proxy proveedor IA     ││
│  │(reglas +    │ │ compacto      │ │ (clave nunca en app)   ││
│  │clasificador)│ │               │ │                        ││
│  └────────────┘ └───────────────┘ └───────────────────────┘│
│  ┌────────────┐ ┌───────────────┐                          │
│  │Play Billing│ │ Base de datos │                          │
│  │validación  │ │ (fuente final)│                          │
│  └────────────┘ └───────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Tabla de "única fuente de verdad"

| Responsabilidad | Dueño | Detalle |
|---|---|---|
| Coordenadas GPS crudas | Cliente (plugin nativo) | Se generan en el teléfono, punto. |
| Kilómetros reales del viaje | **Un solo cálculo**, en una librería compartida (`lib/distancia`) usada por cliente offline y validada por backend al sincronizar | Hoy el riesgo es tener dos fórmulas distintas (una en el store, otra "cuando llegue la IA"). Se define una sola vez. |
| Localidad/zona | Motor local de geofencing (polígonos embebidos en el cliente) | Sin llamada a API externa por viaje (requisito #7 de tu doc). El backend solo la usa como dato ya calculado, no la recalcula. |
| Estado del viaje (abierto/cerrado) | Cliente mientras hay viaje activo → backend en cuanto sincroniza | Nunca dos "viajes abiertos" simultáneos; se valida con UUID generado en el cliente para evitar duplicados al sincronizar (requisito #18). |
| Reglas de mantenimiento (km, tiempo, "lo que pase primero") | Backend define la regla; cliente la ejecuta localmente para poder avisar offline | Una tabla de reglas, no una función por pantalla. |
| Planes y permisos por feature | Backend (tabla `plan_features`) | La app solo pregunta "¿tengo permiso para X?", nunca decide localmente qué plan da qué. |
| Compra del plan | **Google Play Billing** (obligatorio, ver sección 5) | El backend valida el recibo contra la API de Google, no confía en el cliente. |
| Historial de IA / contexto | Backend arma el contexto compacto antes de cada llamada | El cliente nunca decide qué mandarle al modelo. |

---

## 4. Cliente móvil: qué se conserva, qué se reconstruye

| Módulo actual | Decisión | Por qué |
|---|---|---|
| `android/.../burbuja/`, `android/.../alarma/` (Kotlin) | **Conservar tal cual** | Ya usa las APIs correctas de Android, funciona con pantalla apagada/bloqueada. Es la parte más sólida del proyecto. |
| `store.ts` (zustand) | **Reconstruir dividido** | Hoy es un único store monolítico con todo mezclado (viajes, deudas, apuestas, rutina). Se separa en repositorios por dominio, cada uno con su cola de sync, en vez de un solo `persist()` gigante. |
| 20 archivos `atlas-*.css` | **Reconstruir como sistema único** | Un archivo de tokens + un archivo de componentes. Nada de "-extra", "-overrides", "-global-overrides". |
| `TipstersScreen.tsx` (viejo), `Header.tsx`, `GastosMotoScreen.tsx` desconectada | **Eliminar / reconectar según corresponda** | Código muerto o huérfano identificado en Fase 1. |
| `TrabajoScreen.tsx` (641 líneas) | **Reconstruir dividido** en piezas reales (registro de viaje, resumen del día, operaciones compactas) en vez de un archivo con funciones exportadas sueltas. |
| Selectors/cálculos (`selectors.ts`, `format.ts`, `geo.ts`) | **Conservar la lógica, revisar cada fórmula** | Aquí es donde vive el cálculo de "km reales" — hay que auditarla contra el requisito #8 antes de darla por buena. |
| Voz / conversación continua | **Construir nuevo** | No existe hoy nada de esto. |
| Intent Router | **Construir nuevo, en el backend** | No existe. Ver sección 6. |

---

## 5. Requisitos de Google Play que definen la arquitectura (no son detalles de después)

Estos puntos cambian decisiones de diseño *ahora*, no se pueden dejar para el final:

- **Ubicación en segundo plano:** Google exige declarar el uso de `ACCESS_BACKGROUND_LOCATION` en la Play Console con un formulario de justificación, más "divulgación destacada" dentro de la app antes de pedir el permiso. La burbuja y el seguimiento automático de viaje dependen de esto — hay que diseñar la pantalla de permisos (que ya existe parcialmente) para cumplir ese flujo, no como un simple diálogo del sistema.
- **Facturación de planes:** si los planes son contenido digital dentro de la app (quitar anuncios, más preguntas de IA, funciones extra), **Google obliga a usar Google Play Billing**, no una pasarela de pago propia. Esto define que el backend necesita un endpoint de validación de recibos de Play, no un sistema de cobro genérico.
- **Formulario de Seguridad de Datos (Data Safety):** hay que declarar qué se recolecta (ubicación, audio de voz, datos financieros) y si se comparte con terceros (el proveedor de IA, aunque sea a través de tu backend). Esto obliga a que el backend tenga política clara de retención/borrado de audio e historial.
- **Target API level vigente:** la app tiene que compilarse contra el nivel de API que Google exija en el momento de publicar (se revisa en Fase 4, al tocar `build.gradle`).
- **Política de apps financieras/de ingresos:** como la app maneja dinero (ingresos, gastos) sin ser una app bancaria, no aplica una revisión especial de Google, pero si en algún momento se agrega login social o se piden permisos sensibles adicionales, cada uno necesita su propia justificación en la consola.

---

## 6. Backend: piezas mínimas para arrancar

No hace falta construir las 14 fases de una — el backend inicial necesita, en este orden de dependencia:

1. Auth + usuarios (todo lo demás depende de esto).
2. Endpoint de sync de viajes/gastos/deudas con dedupe por UUID.
3. Tabla de planes/features + validación de Play Billing.
4. Intent Router (reglas determinísticas primero — la mayoría de preguntas del requisito #12 se resuelven sin IA).
5. Proxy de IA con contexto compacto, solo para "análisis" y "análisis profundo".
6. Voz — al final, porque depende de que el Intent Router y el proxy de IA ya funcionen bien por texto.

---

## 7. Próximo paso → Fase 3

Con esta arquitectura definida, la Fase 3 es: revisar dependencia por dependencia del `package.json` actual y del proyecto Android, marcar cuáles son necesarias, cuáles se pueden resolver con Android nativo, y cuáles son arrastre de Manus sin razón de ser.
