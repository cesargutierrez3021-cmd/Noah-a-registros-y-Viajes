import type { ImagenMantenimiento } from '../../domain/mantenimiento/types'

import imgCambioDeAceite from '../../assets/mantenimiento/01_cambio_aceite.webp'
import imgAceiteYFiltro from '../../assets/mantenimiento/02_aceite_y_filtro.webp'
import imgCambioDeLlantas from '../../assets/mantenimiento/03_llanta.webp'
import imgMantenimientoGeneral from '../../assets/mantenimiento/04_mantenimiento_general.webp'
import imgBalanceo from '../../assets/mantenimiento/05_balanceo.webp'
import imgFiltroDeAire from '../../assets/mantenimiento/06_filtro_aire.webp'
import imgPastillasDeFreno from '../../assets/mantenimiento/07_pastillas_freno.webp'

/**
 * 2026-09-15, pedido explícito del usuario: "Paquete de tarjetas ejecutivas
 * de mantenimiento" que compartió (maintenance_cards.json + 7 imágenes) —
 * las imágenes se optimizaron de PNG 1920×1920 (3-5 MB cada una, 28 MB en
 * total) a WebP 480×480 (~230 KB en total) para no inflar el tamaño del
 * APK; transparencia verificada intacta, misma imagen visualmente.
 */
export const IMAGENES_MANTENIMIENTO: Record<ImagenMantenimiento, string> = {
  cambio_de_aceite: imgCambioDeAceite,
  aceite_y_filtro: imgAceiteYFiltro,
  cambio_de_llantas: imgCambioDeLlantas,
  mantenimiento_general: imgMantenimientoGeneral,
  balanceo: imgBalanceo,
  filtro_de_aire: imgFiltroDeAire,
  pastillas_de_freno: imgPastillasDeFreno,
}

/**
 * Paleta EXACTA de `maintenance_cards.json` ("tono: serio, elegante,
 * ejecutivo, realista-minimalista") — a propósito NO sale de `tokens.css`:
 * es la identidad visual específica de este paquete de tarjetas, igual que
 * el tema "Carbón dorado mate" usó los hex exactos de su propio documento
 * en vez de adaptarlos. Se mantiene fija sin importar el tema de la app
 * activo (Verde/Oro/Papel) — SÍ respeta la regla de "sin animaciones" del
 * tema Papel (ver `animado` en TarjetaMantenimiento.tsx).
 */
export const PALETA_TARJETA_MANTENIMIENTO = {
  fondo: '#171817',
  superficie: '#1b1d1b',
  texto: '#e6e2d8',
  textoTenue: '#85847f',
  acento: '#c9b98b',
  pistaProgreso: '#373934',
  rellenoProgreso: '#b9aa80',
}
