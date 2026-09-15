/**
 * Dominio: Tema visual.
 *
 * Dos temas reales (2026-09-15, pedido explícito del usuario): "verde"
 * (el que la app ya traía) y "oro" (Carbón dorado mate, tokens exactos del
 * documento que compartió el usuario — ver app/src/design/tokens.css,
 * bloque `[data-tema='oro']`). El nombre del tema es lo único que este
 * dominio guarda — todo el resto (colores, fuentes, radios) vive en CSS,
 * nunca en JS (D-8: una sola fuente de verdad por responsabilidad).
 */
export type Tema = 'verde' | 'oro'

export const TEMAS_DISPONIBLES: { valor: Tema; nombre: string; descripcion: string }[] = [
  { valor: 'verde', nombre: 'Verde', descripcion: 'Menta y oro sobre negro verdoso — el tema original de MIA.' },
  { valor: 'oro', nombre: 'Carbón dorado mate', descripcion: 'Negro carbón con acentos bronce y dorado mate, sobrio y editorial.' },
]
