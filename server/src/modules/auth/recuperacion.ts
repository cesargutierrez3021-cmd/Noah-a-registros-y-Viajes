import { randomInt } from 'node:crypto'
import { hashearTokenRefresco as hashearSecreto } from './refreshTokens.js'

/**
 * "Olvidé mi contraseña" — código de 6 dígitos en vez de un link: la app es
 * móvil sin deep-link configurado, así que es más simple pedirle al usuario
 * que teclee el código que le llega por email que armar universal links de
 * Android para abrir la app desde un link. Reutiliza el mismo hash sha256
 * de refreshTokens.ts (D-18: no duplicar la lógica de hashear un secreto
 * solo porque el nombre de la función menciona "refresco").
 */
export function generarCodigoRecuperacion(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

export function hashearCodigoRecuperacion(codigo: string): string {
  return hashearSecreto(codigo)
}
