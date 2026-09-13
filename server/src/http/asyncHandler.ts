import type { NextFunction, Request, Response } from 'express'

type HandlerAsync = (req: Request, res: Response, next: NextFunction) => Promise<void>

/** Express 5 ya propaga rechazos de promesas al errorHandler, pero esto lo deja explícito y a prueba de downgrade. */
export function async(handler: HandlerAsync) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next)
  }
}
