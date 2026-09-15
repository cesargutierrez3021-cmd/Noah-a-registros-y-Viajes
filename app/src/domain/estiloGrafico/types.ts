/**
 * Dominio: Estilo de gráfico de distribución (2026-09-15, pedido explícito
 * del usuario). Balance muestra siempre la misma distribución de dinero
 * (Hogar/Deudas/Ahorro/Libre) — lo que cambia es CÓMO se dibuja. El cliente
 * elige el estilo desde Ajustes ("Diseño de estadísticas") con una muestra
 * real de cada uno, mismo patrón que domain/tema (D-18: mismo mecanismo,
 * ver domain/tema/store.ts).
 */
export type EstiloGrafico = 'anillos' | 'cristal3d' | 'prisma'

export const ESTILOS_DISPONIBLES: { valor: EstiloGrafico; nombre: string; descripcion: string }[] = [
  { valor: 'anillos', nombre: 'Anillos orbitales', descripcion: 'Un anillo de progreso por categoría, con un punto que orbita.' },
  { valor: 'cristal3d', nombre: 'Cristal 3D', descripcion: 'Tarjetas de vidrio superpuestas, una por categoría.' },
  { valor: 'prisma', nombre: 'Prisma', descripcion: 'Barras que fluyen desde el ingreso, cada una con su propio color.' },
]

/** Una porción de la distribución de dinero — la misma forma la consumen los 3 estilos. */
export interface ItemDistribucion {
  clave: string
  etiqueta: string
  monto: number
  porcentaje: number
  color: string
}
