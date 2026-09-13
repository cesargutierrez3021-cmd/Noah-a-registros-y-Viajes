import { Router } from 'express'
import { servicioPlanes } from './service'
import { requiereAutenticacion } from '../auth/middleware'
import { async } from '../../http/asyncHandler'

export const rutasPlanes = Router()

rutasPlanes.get(
  '/',
  async(async (_req, res) => {
    res.json(await servicioPlanes.listarPlanesPublicos())
  }),
)

rutasPlanes.get(
  '/actual',
  requiereAutenticacion,
  async(async (req, res) => {
    res.json(await servicioPlanes.obtenerPlanActualDeUsuario(req.usuarioId!))
  }),
)
