import type { ImagenMantenimiento } from '../../domain/mantenimiento/types'

import imgCambioDeAceite from '../../assets/mantenimiento/01_cambio_aceite.webp'
import imgAceiteYFiltro from '../../assets/mantenimiento/02_aceite_y_filtro.webp'
import imgCambioDeLlantas from '../../assets/mantenimiento/03_llanta.webp'
import imgMantenimientoGeneral from '../../assets/mantenimiento/04_mantenimiento_general.webp'
import imgBalanceo from '../../assets/mantenimiento/05_balanceo.webp'
import imgFiltroDeAire from '../../assets/mantenimiento/06_filtro_aire.webp'
import imgPastillasDeFreno from '../../assets/mantenimiento/07_pastillas_freno.webp'
import imgLiquidoDeFrenos from '../../assets/mantenimiento/moto-brake-fluid.webp'
import imgAceiteYRetenesHorquilla from '../../assets/mantenimiento/moto-fork-service.webp'
import imgReglajeDeValvulas from '../../assets/mantenimiento/moto-valves.webp'
import imgRodamientosDeDireccion from '../../assets/mantenimiento/moto-steering-bearing.webp'
import imgRodamientosDeRueda from '../../assets/mantenimiento/moto-wheel-bearing.webp'
import imgCarroCambioDeAceite from '../../assets/mantenimiento/car-oil.webp'
import imgCarroFiltroDeAire from '../../assets/mantenimiento/car-air-filter.webp'
import imgCarroCambioDeLlantas from '../../assets/mantenimiento/car-tire.webp'
import imgCarroFrenos from '../../assets/mantenimiento/car-brakes.webp'
import imgCarroMantenimientoGeneral from '../../assets/mantenimiento/car-general-service.webp'
import imgCarroBateria from '../../assets/mantenimiento/car-battery.webp'
import imgCarroSuspension from '../../assets/mantenimiento/car-suspension.webp'
import imgCarroRefrigerante from '../../assets/mantenimiento/car-coolant.webp'
import imgCarroBujias from '../../assets/mantenimiento/car-spark-plugs.webp'
import imgCarroLimpiaparabrisas from '../../assets/mantenimiento/car-wipers.webp'

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
  liquido_de_frenos: imgLiquidoDeFrenos,
  aceite_y_retenes_horquilla: imgAceiteYRetenesHorquilla,
  reglaje_de_valvulas: imgReglajeDeValvulas,
  rodamientos_de_direccion: imgRodamientosDeDireccion,
  rodamientos_de_rueda: imgRodamientosDeRueda,
  carro_cambio_de_aceite: imgCarroCambioDeAceite,
  carro_filtro_de_aire: imgCarroFiltroDeAire,
  carro_cambio_de_llantas: imgCarroCambioDeLlantas,
  carro_frenos: imgCarroFrenos,
  carro_mantenimiento_general: imgCarroMantenimientoGeneral,
  carro_bateria: imgCarroBateria,
  carro_suspension: imgCarroSuspension,
  carro_refrigerante: imgCarroRefrigerante,
  carro_bujias: imgCarroBujias,
  carro_limpiaparabrisas: imgCarroLimpiaparabrisas,
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
