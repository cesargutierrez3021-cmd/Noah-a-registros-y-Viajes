import type { NextFunction, Request, Response } from 'express'
import { logEventoSeguridad } from '../lib/logSeguridad.js'

/**
 * Fase 12 — Seguridad: rate limiting. Se escribe a mano (ventana fija, en
 * memoria) en vez de agregar `express-rate-limit` — es una lógica de 15
 * líneas, no vale la pena una dependencia nueva para algo que se puede
 * escribir y verificar directo con `node`, sobre todo en este entorno donde
 * no se puede ni instalar ni confirmar la versión exacta de un paquete.
 *
 * LÍMITE REAL A TENER EN CUENTA ANTES DE PRODUCCIÓN: esto vive en memoria
 * del proceso. Si el backend corre en más de una instancia (varias réplicas
 * detrás de un load balancer), cada instancia cuenta por separado — el
 * límite efectivo termina siendo `limite × cantidad de instancias`. Para un
 * backend de una sola instancia (que es probablemente el caso al arrancar,
 * ver "Qué falta decidir" sobre dónde se despliega) esto alcanza. Si más
 * adelante hay varias instancias, esto tiene que migrar a un store
 * compartido (Redis es lo típico) — no se adelantó esa complejidad sin
 * necesidad confirmada.
 */

interface Contador {
  cantidad: number
  reiniciaEnMs: number
}

/**
 * Crea un middleware de rate limiting por IP. `ventanaMs` es el tamaño de la
 * ventana (ej. 60_000 = 1 minuto), `maximo` cuántas requests se permiten por
 * IP dentro de esa ventana. Cada llamada a esta función crea su PROPIO mapa
 * de contadores — así se puede tener un límite más estricto para
 * `/auth/login` que para el resto, sin que se pisen entre sí.
 */
export function crearLimitadorDeTasa(ventanaMs: number, maximo: number, mensaje = 'Demasiadas solicitudes, intenta de nuevo en un momento.') {
  const contadores = new Map<string, Contador>()

  return function limitarTasa(req: Request, res: Response, next: NextFunction) {
    const clave = req.ip ?? 'desconocida'
    const ahora = Date.now()
    const contador = contadores.get(clave)

    if (!contador || ahora >= contador.reiniciaEnMs) {
      contadores.set(clave, { cantidad: 1, reiniciaEnMs: ahora + ventanaMs })
      next()
      return
    }

    if (contador.cantidad >= maximo) {
      // Fase 12, pendiente #4: antes esto bloqueaba en silencio. Ahora queda
      // registrado — varios bloqueos seguidos desde la misma IP en /auth/*
      // es la señal más simple de un intento de fuerza bruta.
      logEventoSeguridad({ tipo: 'rate_limit_bloqueado', ip: clave, detalle: req.originalUrl })
      res.status(429).json({ error: mensaje })
      return
    }

    contador.cantidad += 1
    next()
  }
}
