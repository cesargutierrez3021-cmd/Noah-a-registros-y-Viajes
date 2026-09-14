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
    <section className="pantalla"><div className="app-panel">
      <div className="app-hero"><div className="app-eyebrow">MIA · CONTROL</div><h1 className="app-title">Casa y deudas</h1></div>

      <div className="app-tabs" style={{ marginBottom: 16 }}>
        <button type="button" onClick={() => setSubSeccion('deudas')} className={subSeccion === 'deudas' ? 'active' : ''}>
          Deudas
        </button>
        <button type="button" onClick={() => setSubSeccion('hogar')} className={subSeccion === 'hogar' ? 'active' : ''}>
          Hogar
        </button>
      </div>

      {subSeccion === 'deudas' ? <SeccionDeudas /> : <SeccionHogar />}
    </div></section>
  )
}
