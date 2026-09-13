import express from 'express'

/**
 * Punto de entrada del backend MIA.
 *
 * Estado real (no inventar que esto ya funciona): esto es un esqueleto.
 * Cada carpeta bajo modules/ está vacía a propósito — se llena en su fase
 * correspondiente (ver PLAN-MAESTRO.md):
 *   - modules/auth   → Fase 7
 *   - modules/plans  → Fase 7 / 11 (Google Play Billing)
 *   - modules/sync   → Fase 13
 *   - modules/ai     → Fase 9
 */

const app = express()
app.use(express.json())

app.get('/salud', (_req, res) => {
  res.json({ estado: 'ok' })
})

const PUERTO = process.env.PUERTO ?? 3000
app.listen(PUERTO, () => {
  console.log(`MIA backend escuchando en el puerto ${PUERTO}`)
})
