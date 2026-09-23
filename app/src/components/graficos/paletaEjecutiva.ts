/**
 * 2026-09-15, pedido explícito del usuario: dos variantes "ejecutivas" de
 * Cristal 3D y Prisma (paquete "prism-crystal-orbit-package" que compartió
 * — mismo movimiento y datos que los estilos originales, pero con la
 * paleta grafito/beige/dorado de las tarjetas ejecutivas de mantenimiento).
 *
 * A propósito NO se importa desde features/trabajo/tarjetasMantenimiento.ts
 * (components/ no depende de features/, D-8) — se repiten los mismos hex
 * acá, igual que TarjetaMantenimiento ya repite los suyos en vez de salir
 * de tokens.css: es la identidad visual fija de este "lenguaje ejecutivo",
 * sin importar el tema activo de la app (Verde/Oro/Papel).
 */
export const SUPERFICIE_EJECUTIVA = '#1b1d1b'
export const BORDE_EJECUTIVO = '#373934'

/**
 * Tonos de dorado apagado, uno por categoría — reemplazan `item.color` en la
 * variante ejecutiva (sobria, monocromática, no arcoíris). 2026-09-16: se
 * agregó un 5to tono al sumar la categoría "Vehículo" a Prisma (ver
 * BalanceScreen.tsx) — antes de esto, con 4 categorías, alcanzaban los 4.
 */
export const TONOS_EJECUTIVOS = ['#b9aa80', '#c9b98b', '#e0d0a1', '#8b8066', '#a89468']

export type VarianteGrafico = 'clasico' | 'ejecutivo'
