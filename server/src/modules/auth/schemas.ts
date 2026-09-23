import { z } from 'zod'

export const esquemaCredenciales = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido'),
  // 8 caracteres mínimo por ahora; reglas más finas (mayúscula, número, etc.)
  // se agregan si el usuario las pide — no hay que inventarlas sin necesidad.
  contrasena: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export const esquemaTokenRefresco = z.object({
  tokenRefresco: z.string().min(1, 'Falta el token de refresco'),
})

export const esquemaSolicitarRecuperacion = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido'),
})

export const esquemaRestablecerContrasena = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido'),
  codigo: z.string().regex(/^\d{6}$/, 'El código debe tener 6 dígitos'),
  contrasenaNueva: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})
