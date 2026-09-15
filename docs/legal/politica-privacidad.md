# Política de Privacidad — MIA

**Última actualización: [completar antes de publicar].**

> **Nota para quien publique esto (borrar antes de publicar):** este documento describe con precisión lo que el código de MIA hace hoy con los datos del usuario, verificado contra `app/src/domain/` y `server/src/modules/` al momento de escribirlo. No es asesoría legal — antes de publicar en Google Play, hace falta que un abogado (idealmente con experiencia en la Ley 1581 de 2012 de Colombia, "habeas data", ya que la app está pensada para conductores colombianos) lo revise, y hay que completar los datos de contacto/empresa marcados como `[completar]`. También hay que subir esta política a una URL pública real (no un archivo suelto en GitHub) — Play Console exige un link, no un PDF.

## 1. Quiénes somos

MIA es una aplicación para conductores (de plataformas como Uber y similares, y para uso particular) que ayuda a registrar viajes, jornadas, gastos, mantenimiento del vehículo y finanzas del hogar, con un asistente por voz.

Responsable del tratamiento de datos: **[completar: nombre de la persona o empresa que opera MIA]**, contacto: **[completar: email de contacto]**.

## 2. Qué datos recogemos

| Dato | Para qué | Dónde se guarda |
|---|---|---|
| Email y contraseña (hasheada, nunca en texto plano) | Crear tu cuenta, iniciar sesión | Backend (base de datos PostgreSQL en Neon) |
| Ubicación GPS — incluida en segundo plano mientras dura un viaje activo | Calcular la distancia real recorrida en cada viaje, e identificar la localidad/zona donde ocurrió | Se guarda localmente en el teléfono; el recorrido de cada viaje se sube al backend al sincronizar |
| Datos de viajes (plataforma, ingreso reportado, duración, distancia, zona) | Mostrarte tus estadísticas y ayudarte a decidir dónde/cuándo te conviene trabajar | Local + backend (asociado a tu cuenta) |
| Gastos, deudas y datos del hogar que ingreses (montos, conceptos, fechas) | Darte tu balance financiero completo dentro de la app | Local + backend (asociado a tu cuenta) |
| Mantenimiento del vehículo (kilometraje, fechas de servicio) | Recordarte cuándo toca el próximo mantenimiento | Local + backend (asociado a tu cuenta) |
| Voz (cuando usas el asistente MIA) | Reconocer lo que dices y responderte por voz | Se procesa con un plugin de reconocimiento de voz del propio sistema operativo — MIA no graba ni guarda audio |
| Preguntas que le haces al asistente MIA + un resumen de tus datos relevantes para responderla | Generar una respuesta analítica cuando la pregunta lo requiere | Se envía al backend, y de ahí a un proveedor externo de inteligencia artificial (ver sección 4) — no se guarda el historial de conversación en el backend |
| Recibo de compra de Google Play (`purchaseToken`) | Confirmar tu suscripción y activar el plan correspondiente | Backend, y se verifica contra los servidores de Google |

**Lo que MIA nunca ve:** tu número de tarjeta ni ningún dato de pago — todo el cobro de suscripciones lo procesa Google Play directamente.

## 3. Ubicación en segundo plano — por qué la pedimos

MIA usa el permiso de ubicación en segundo plano (`ACCESS_BACKGROUND_LOCATION` en Android) exclusivamente para seguir grabando el recorrido de un viaje activo cuando guardas el teléfono o se apaga la pantalla — es el caso normal de un conductor trabajando. El GPS solo se activa mientras tienes un viaje en curso: no rastreamos tu ubicación fuera de un viaje, ni cuando la app está cerrada sin un viaje activo.

## 4. Con quién compartimos datos

- **Google Play**: para procesar pagos de suscripción y verificar que una compra sea real.
- **Proveedor de inteligencia artificial (OpenAI)**: cuando le haces una pregunta a MIA que requiere análisis, se le envía la pregunta junto con un resumen compacto de tus datos relevantes (por ejemplo, tus ingresos de la semana) para que genere la respuesta. No se envían tus credenciales ni tu historial completo, solo lo necesario para esa pregunta puntual.
- **Render** y **Neon**: son los proveedores de hosting donde corre el backend y vive la base de datos — alojan los datos, no los usan para ningún fin propio.

MIA no vende tus datos a nadie, ni los usa para publicidad de terceros.

## 5. Cuánto tiempo guardamos tus datos

Mientras tu cuenta esté activa. Si eliminas tu cuenta, tus datos se eliminan del backend salvo que la ley exija conservar algún registro (por ejemplo, registros de pagos por obligaciones fiscales).

*(Nota para quien complete esto: hoy el backend no tiene todavía un endpoint de "eliminar mi cuenta" — ver auditoría técnica del [15/09/2026]. Antes de publicar esta política tal cual, hay que construir ese endpoint o ajustar esta sección para reflejar el proceso real de solicitud de borrado.)*

## 6. Tus derechos

Como usuario, en cualquier momento puedes pedirnos:
- Acceder a los datos que tenemos sobre ti.
- Corregir datos incorrectos.
- Eliminar tu cuenta y tus datos.
- Revocar el permiso de ubicación en segundo plano desde los ajustes de tu teléfono (esto desactiva el registro automático de recorrido; podrás seguir usando la app registrando viajes manualmente).

Para ejercer estos derechos, escríbenos a **[completar: email de contacto]**.

## 7. Menores de edad

MIA no está dirigida a menores de edad. No recogemos deliberadamente datos de personas menores de 18 años.

## 8. Cambios a esta política

Si cambiamos esta política de forma importante, te avisaremos dentro de la app antes de que el cambio entre en vigencia.

## 9. Contacto

**[completar: email de contacto y, si aplica, dirección de la empresa]**
