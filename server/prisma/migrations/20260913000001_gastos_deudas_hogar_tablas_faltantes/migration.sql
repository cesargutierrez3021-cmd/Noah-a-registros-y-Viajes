-- 2026-09-22, corrección de un bug real de infraestructura encontrado en auditoría: los modelos
-- Gasto, Deuda, AbonoDeuda, ConceptoFijo y GastoHogar existen en schema.prisma y se usan en
-- producción (server/src/modules/sync/repository.ts) desde hace varias rondas, pero ninguna
-- migración anterior los CREÓ — deben haberse creado alguna vez fuera del historial de Git (ej.
-- `prisma db push` a mano). Contra la base real eso nunca se notó porque las tablas ya existen,
-- pero `prisma migrate deploy` (el comando real de arranque) rompería la cadena de migraciones
-- a mitad de camino contra una base nueva desde cero, porque una migración POSTERIOR
-- (20260915190000_deuda_fecha_limite) hace ALTER TABLE "deudas" sobre una tabla que ninguna
-- migración anterior creó.
--
-- Todo acá usa IF NOT EXISTS a propósito: contra una base nueva, crea las tablas de verdad;
-- contra la base real (donde ya existen) es un no-op seguro. "deudas" se crea SIN la columna
-- "fecha_limite" a propósito — esa migración posterior ya existe y la agrega, no hay que
-- duplicarla acá (y duplicarla rompería esa migración en una base nueva, "column already exists").
-- No se toca ningún archivo de migración ya aplicado.

CREATE TABLE IF NOT EXISTS "gastos" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "litros" DOUBLE PRECISION,
    "notas" TEXT,
    "sincronizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gastos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gastos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "gastos_usuario_id_idx" ON "gastos"("usuario_id");

CREATE TABLE IF NOT EXISTS "deudas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "saldo_inicial" DOUBLE PRECISION NOT NULL,
    "saldo_actual" DOUBLE PRECISION NOT NULL,
    "cuota_programada" JSONB,
    "creada_en" TIMESTAMP(3) NOT NULL,
    "sincronizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deudas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "deudas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "deudas_usuario_id_idx" ON "deudas"("usuario_id");

CREATE TABLE IF NOT EXISTS "abonos_deuda" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "deuda_id" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "sincronizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abonos_deuda_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "abonos_deuda_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "abonos_deuda_deuda_id_fkey" FOREIGN KEY ("deuda_id") REFERENCES "deudas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "abonos_deuda_usuario_id_idx" ON "abonos_deuda"("usuario_id");
CREATE INDEX IF NOT EXISTS "abonos_deuda_deuda_id_idx" ON "abonos_deuda"("deuda_id");

CREATE TABLE IF NOT EXISTS "conceptos_fijos" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "monto_esperado" DOUBLE PRECISION NOT NULL,
    "dia_del_mes" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL,
    "sincronizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conceptos_fijos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "conceptos_fijos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "conceptos_fijos_usuario_id_idx" ON "conceptos_fijos"("usuario_id");

CREATE TABLE IF NOT EXISTS "gastos_hogar" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "concepto_fijo_id" TEXT,
    "sincronizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gastos_hogar_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gastos_hogar_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "gastos_hogar_concepto_fijo_id_fkey" FOREIGN KEY ("concepto_fijo_id") REFERENCES "conceptos_fijos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "gastos_hogar_usuario_id_idx" ON "gastos_hogar"("usuario_id");
CREATE INDEX IF NOT EXISTS "gastos_hogar_concepto_fijo_id_idx" ON "gastos_hogar"("concepto_fijo_id");
