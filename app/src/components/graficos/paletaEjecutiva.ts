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

/** 4 tonos de dorado apagado, uno por categoría — reemplazan `item.color` en la variante ejecutiva (sobria, monocromática, no arcoíris). */
export const TONOS_EJECUTIVOS = ['#b9aa80', '#c9b98b', '#e0d0a1', '#8b8066']

export type VarianteGrafico = 'clasico' | 'ejecutivo'
