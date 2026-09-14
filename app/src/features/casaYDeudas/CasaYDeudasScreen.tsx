import { useState } from 'react'
import { SeccionDeudas } from './SeccionDeudas'
import { SeccionHogar } from './SeccionHogar'

type SubSeccion = 'deudas' | 'hogar'

/**
 * Bloque 4, ítem 11 (parte no-visual) — Panel "Casa y Deudas": Deudas y Hogar
 * como sub-secciones con un simple toggle (mismo patrón de sub-tabs que ya
 * tenía NOAH), no rutas separadas. Ahorro queda mencionado en el plan como
 * sub-sección futura — no existe `domain/ahorro` todavía, así que no se
 * inventa acá, solo Deudas y Hogar (los dos dominios que sí existen).
 */
export function CasaYDeudasScreen() {
  const [subSeccion, setSubSeccion] = useState<SubSeccion>('deudas')

  return (
    <section className="pantalla">
      <h1 className="titulo-pantalla">Casa y Deudas</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button type="button" onClick={() => setSubSeccion('deudas')} disabled={subSeccion === 'deudas'}>
          Deudas
        </button>
        <button type="button" onClick={() => setSubSeccion('hogar')} disabled={subSeccion === 'hogar'}>
          Hogar
        </button>
      </div>

      {subSeccion === 'deudas' ? <SeccionDeudas /> : <SeccionHogar />}
    </section>
  )
}
