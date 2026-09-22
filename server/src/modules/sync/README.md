# sync

Sincronización push (`POST /sync/<recurso>`) de los 11 recursos del cliente — viajes, jornadas, registros de mantenimiento, gastos, bonos, deudas + abonos, metas de ahorro + abonos, conceptos fijos de hogar + gastos de hogar — con dedupe por id y verificación de pertenencia al usuario autenticado. `GET /sync/todo` restaura todo de una vez al iniciar sesión o registrarse.
