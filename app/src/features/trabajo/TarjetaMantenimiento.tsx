import type { EstadoAlerta } from '../../domain/mantenimiento/types'
import { MARGEN_SEGURIDAD_TEXTO } from '../../domain/mantenimiento/reglas'
import { IMAGENES_MANTENIMIENTO, PALETA_TARJETA_MANTENIMIENTO as PALETA } from './tarjetasMantenimiento'

function textoFaltante(kmFaltantes: number | null, diasFaltantes: number | null): string {
  const partes: string[] = []
  if (kmFaltantes !== null) partes.push(kmFaltantes <= 0 ? `${Math.abs(Math.round(kmFaltantes))} km pasado` : `${Math.round(kmFaltantes)} km`)
  if (diasFaltantes !== null) partes.push(diasFaltantes <= 0 ? `${Math.abs(diasFaltantes)} días pasado` : `${diasFaltantes} días`)
  return partes.join(' · ') || '—'
}

function textoEstado(vencido: boolean, proximo: boolean): string {
  if (vencido) return 'Vencido'
  if (proximo) return 'Próximo'
  return 'Programado'
}

/**
 * 2026-09-15, pedido explícito del usuario: "tarjeta ejecutiva" con la
 * imagen real del ítem (paquete que compartió), barra/porcentaje de
 * progreso que sube según lo registrado, y editable desde el momento en
 * que se agrega (ver SeccionMantenimiento.tsx — esta tarjeta solo MUESTRA,
 * no decide los valores).
 *
 * Paleta fija del paquete (`tarjetasMantenimiento.ts`), no la del tema
 * activo de la app — es la identidad visual de este paquete en particular
 * (mismo criterio que el tema "Carbón dorado mate": hex exactos de un
 * documento de especificación). `animado` sí respeta el tema "Papel" (ver
 * SeccionMantenimiento.tsx) — la "respiración" de la imagen y el llenado
 * suave de la barra se apagan ahí, como en el resto de la app.
 */
export function TarjetaMantenimiento({
  estado,
  animado,
  onMarcarRealizado,
  onEliminar,
}: {
  estado: EstadoAlerta
  animado: boolean
  onMarcarRealizado: () => void
  onEliminar?: () => void
}) {
  const { item, kmFaltantes, diasFaltantes, vencido, proximoAVencer, progresoPorcentaje } = estado
  const imagen = item.imagen ? IMAGENES_MANTENIMIENTO[item.imagen] : null

  const colorEstado = vencido ? '#c8756b' : proximoAVencer ? PALETA.acento : PALETA.rellenoProgreso

  return (
    <div
      style={{
        background: PALETA.superficie,
        border: `1px solid ${PALETA.pistaProgreso}`,
        borderRadius: 16,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        color: PALETA.texto,
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {imagen && (
          <img
            src={imagen}
            alt=""
            className={animado ? 'tarjeta-mantenimiento__imagen tarjeta-mantenimiento__imagen--animada' : 'tarjeta-mantenimiento__imagen'}
            style={{ width: 64, height: 64, objectFit: 'contain', flex: 'none' }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: 'block', fontSize: '1rem' }}>{item.nombre}</strong>
          <span style={{ color: PALETA.textoTenue, fontSize: '0.78rem' }}>{textoFaltante(kmFaltantes, diasFaltantes)}</span>
        </div>
        <span
          style={{
            flex: 'none',
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 999,
            color: PALETA.fondo,
            background: colorEstado,
          }}
        >
          {textoEstado(vencido, proximoAVencer)}
        </span>
      </div>

      <div style={{ height: 6, borderRadius: 999, background: PALETA.pistaProgreso, overflow: 'hidden' }}>
        <div
          className={animado ? 'tarjeta-mantenimiento__barra tarjeta-mantenimiento__barra--animada' : 'tarjeta-mantenimiento__barra'}
          style={{ height: '100%', width: `${Math.round(progresoPorcentaje)}%`, background: colorEstado, borderRadius: 999 }}
        />
      </div>
      <span style={{ color: PALETA.textoTenue, fontSize: '0.72rem' }}>{Math.round(progresoPorcentaje)}% usado</span>

      {kmFaltantes !== null && (
        <span style={{ color: PALETA.textoTenue, fontSize: '0.68rem' }}>{MARGEN_SEGURIDAD_TEXTO}</span>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button type="button" onClick={onMarcarRealizado}>Marcar realizado hoy</button>
        {onEliminar && (
          <button type="button" onClick={onEliminar} style={{ background: 'transparent', color: PALETA.textoTenue }}>
            Eliminar
          </button>
        )}
      </div>
    </div>
  )
}
