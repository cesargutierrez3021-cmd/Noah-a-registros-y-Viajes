import { useEstiloGrafico } from '../../domain/estiloGrafico/store'
import { useTema } from '../../domain/tema/store'
import type { ItemDistribucion } from '../../domain/estiloGrafico/types'
import { AnillosOrbitales } from './AnillosOrbitales'
import { Cristal3D } from './Cristal3D'
import { Prisma } from './Prisma'

/**
 * Despachador único (D-18): Balance (y, si hace falta más adelante,
 * cualquier otra pantalla) pide "la distribución de dinero" sin saber cuál
 * de los 3 estilos está activo — eso lo decide domain/estiloGrafico, elegido
 * desde Ajustes → "Diseño de estadísticas" (2026-09-15, pedido explícito).
 *
 * `animado` no es un prop que decida cada pantalla: sale directo del tema
 * activo (`useTema`) — el tema "Papel" pide explícitamente "nada de
 * animaciones", así que ningún estilo debe animarse mientras esté activo,
 * sea cual sea el estilo elegido.
 */
export function GraficoDistribucion({ items, total }: { items: ItemDistribucion[]; total: number }) {
  const { estilo } = useEstiloGrafico()
  const { tema } = useTema()
  const animado = tema !== 'papel'

  if (estilo === 'cristal3d') return <Cristal3D items={items} total={total} animado={animado} />
  if (estilo === 'cristal3d_ejecutivo') return <Cristal3D items={items} total={total} animado={animado} variante="ejecutivo" />
  if (estilo === 'prisma') return <Prisma items={items} total={total} animado={animado} />
  if (estilo === 'prisma_ejecutivo') return <Prisma items={items} total={total} animado={animado} variante="ejecutivo" />
  return <AnillosOrbitales items={items} animado={animado} />
}
