import { PrismaClient } from '@prisma/client'

/**
 * Un solo PrismaClient para todo el proceso. Ningún módulo crea el suyo —
 * evita agotar el pool de conexiones a Postgres.
 */
export const prisma = new PrismaClient()
