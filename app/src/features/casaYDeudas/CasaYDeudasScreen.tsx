import { useState } from 'react'
import { SeccionDeudas } from './SeccionDeudas'
import { SeccionHogar } from './SeccionHogar'
import { SeccionAhorro } from './SeccionAhorro'

type SubSeccion = 'deudas' | 'hogar' | 'ahorro'

/**
 * Bloque 4, ítem 11 (parte no-visual) — Panel "Casa y Deudas": Deudas, Hogar
 * y Ahorro como sub-secciones con un simple toggle (mismo patrón de sub-tabs
 * que ya tenía NOAH), no rutas separadas. Ahorro (2026-09-15, pedido
 * explícito del usuario) ya no es solo la mención en el plan — domain/ahorro
 * existe, mismo patrón exacto que domain/deudas invertido (ver
 * domain/ahorro/types.ts).
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
        <button type="button" onClick={() => setSubSeccion('ahorro')} className={subSeccion === 'ahorro' ? 'active' : ''}>
          Ahorro
        </button>
      </div>

      {subSeccion === 'deudas' ? <SeccionDeudas /> : subSeccion === 'hogar' ? <SeccionHogar /> : <SeccionAhorro />}
    </div></section>
  )
}
