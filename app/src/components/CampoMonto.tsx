import type { CSSProperties } from 'react'

/**
 * 2026-09-15, pedido explícito del usuario: "cuando yo pongo los valores en
 * gastos o en deuda o en hogar o en ahorro, me aparece en texto plano, no en
 * pesos... si paso de 500 a 5000, pues esté el punto... hay mucha gente que
 * no se ubica, le toca estar contando los ceros" — un `<input type="number">`
 * muestra los dígitos crudos mientras se escribe; esto formatea con puntos de
 * miles (es-CO) EN VIVO, en cada tecla, no solo después de guardado.
 *
 * El valor que maneja el padre (`valor`/`onValorCambia`) son los dígitos
 * CRUDOS sin formatear (ej. "500000", nunca "500.000") — así toda la
 * validación/envío existente (`Number(valor)`) sigue funcionando exactamente
 * igual que con el `<input type="number">` de antes, sin tocar esa lógica en
 * cada pantalla. Solo pesos enteros (sin decimales) — igual que el resto de
 * la app ya redondea (`formatoPesos`), así que no hace falta permitir "." ni
 * ",": se descarta cualquier caracter que no sea dígito.
 */
export function CampoMonto({
  valor,
  onValorCambia,
  placeholder,
  disabled,
  style,
}: {
  valor: string
  onValorCambia: (crudo: string) => void
  placeholder?: string
  disabled?: boolean
  style?: CSSProperties
}) {
  const formateado = valor ? Number(valor).toLocaleString('es-CO') : ''

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={formateado}
      onChange={(e) => onValorCambia(e.target.value.replace(/\D/g, ''))}
      disabled={disabled}
      style={{ display: 'block', width: '100%', ...style }}
    />
  )
}
