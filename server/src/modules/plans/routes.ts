import { Router } from 'express'
import type { Request, Response } from 'express'
import { servicioPlanes } from './service.js'
import { requiereAutenticacion } from '../auth/middleware.js'
import { async } from '../../http/asyncHandler.js'

export const rutasPlanes = Router()

rutasPlanes.get(
  '/',
  async(async (_req: Request, res: Response) => {
    res.json(await servicioPlanes.listarPlanesPublicos())
  }),
)

rutasPlanes.get(
  '/actual',
  requiereAutenticacion,
  async(async (req: Request, res: Response) => {
    res.json(await servicioPlanes.obtenerPlanActualDeUsuario(req.usuarioId!))
  }),
)
