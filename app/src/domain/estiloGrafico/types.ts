/**
 * Dominio: Estilo de gráfico de distribución (2026-09-15, pedido explícito
 * del usuario). Balance muestra siempre la misma distribución de dinero
 * (Hogar/Deudas/Ahorro/Libre) — lo que cambia es CÓMO se dibuja. El cliente
 * elige el estilo desde Ajustes ("Diseño de estadísticas") con una muestra
 * real de cada uno, mismo patrón que domain/tema (D-18: mismo mecanismo,
 * ver domain/tema/store.ts).
 *
 * `cristal3d_ejecutivo`/`prisma_ejecutivo` (misma sesión, ronda posterior
 * — paquete "prism-crystal-orbit-package"): mismos componentes, mismo
 * movimiento y datos que 'cristal3d'/'prisma', solo con la paleta
 * grafito/dorado fija de las tarjetas de mantenimiento en vez del color
 * propio de cada categoría — ver `variante` en Cristal3D.tsx/Prisma.tsx.
 */
export type EstiloGrafico = 'anillos' | 'cristal3d' | 'prisma' | 'cristal3d_ejecutivo' | 'prisma_ejecutivo'

export const ESTILOS_DISPONIBLES: { valor: EstiloGrafico; nombre: string; descripcion: string }[] = [
  { valor: 'anillos', nombre: 'Anillos orbitales', descripcion: 'Un anillo de progreso por categoría, con un punto que orbita.' },
  { valor: 'cristal3d', nombre: 'Cristal 3D', descripcion: 'Tarjetas de vidrio superpuestas, una por categoría.' },
  { valor: 'prisma', nombre: 'Prisma', descripcion: 'Barras que fluyen desde el ingreso, cada una con su propio color.' },
  { valor: 'cristal3d_ejecutivo', nombre: 'Cristal 3D ejecutivo', descripcion: 'El mismo Cristal 3D, en grafito y dorado apagado — el tono de las tarjetas de mantenimiento.' },
  { valor: 'prisma_ejecutivo', nombre: 'Prisma ejecutivo', descripcion: 'El mismo Prisma, en grafito y dorado apagado — el tono de las tarjetas de mantenimiento.' },
]

/** Una porción de la distribución de dinero — la misma forma la consumen los 3 estilos. */
export interface ItemDistribucion {
  clave: string
  etiqueta: string
  monto: number
  porcentaje: number
  color: string
}
