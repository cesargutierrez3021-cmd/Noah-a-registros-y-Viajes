/**
 * Única puerta de entrada a variables de entorno. Nada en el resto del
 * backend debe leer `process.env` directamente — así, si falta una variable
 * obligatoria, el server falla al arrancar (no a medio request en producción).
 */
function requerida(nombre: string): string {
  const valor = process.env[nombre]
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}. Revisa server/.env.example.`)
  }
  return valor
}

export const env = {
  // Render (y la mayoría de plataformas tipo Heroku/Railway) asignan el
  // puerto real mediante la variable estándar PORT, no la controla el
  // usuario — por eso PORT tiene prioridad. PUERTO se mantiene como fallback
  // para desarrollo local, donde no existe esa restricción.
  puerto: Number(process.env.PORT ?? process.env.PUERTO ?? 3000),
  databaseUrl: requerida('DATABASE_URL'),
  jwtSecretoAcceso: requerida('JWT_SECRETO_ACCESO'),
  jwtSecretoRefresco: requerida('JWT_SECRETO_REFRESCO'),
  jwtExpiracionAccesoMin: Number(process.env.JWT_EXPIRACION_ACCESO_MIN ?? 15),
  jwtExpiracionRefrescoDias: Number(process.env.JWT_EXPIRACION_REFRESCO_DIAS ?? 30),
  // Fase 12 — CORS. Solo importa para llamadas desde un navegador (Vite en
  // desarrollo, o un futuro dashboard web) — una app Android nativa
  // (Capacitor) no pasa por el chequeo de CORS del navegador, así que esto
  // NO es lo que protege al backend de apps no autorizadas (eso lo hace el
  // JWT). Default pensado para desarrollo local; en producción hay que
  // poner acá el dominio real si algún día hay un frontend web.
  corsOrigenes: (process.env.CORS_ORIGENES ?? 'http://localhost:5173,capacitor://localhost,http://localhost')
    .split(',')
    .map((origen) => origen.trim()),
}
