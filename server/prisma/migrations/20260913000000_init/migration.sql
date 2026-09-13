-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contrasenaHash" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_refresco" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "revocado_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_refresco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planes" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "limite_consultas_ia" INTEGER,
    "producto_id_google_play" TEXT,

    CONSTRAINT "planes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planes_de_usuario" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fin" TIMESTAMP(3),
    "purchase_token" TEXT,

    CONSTRAINT "planes_de_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viajes" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "plataforma" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3),
    "recorrido" JSONB NOT NULL,
    "km_hasta_recoger" DOUBLE PRECISION NOT NULL,
    "km_con_pasajero" DOUBLE PRECISION NOT NULL,
    "km_totales_reales" DOUBLE PRECISION NOT NULL,
    "distancia_reportada_plataforma" DOUBLE PRECISION,
    "ingreso" DOUBLE PRECISION NOT NULL,
    "localidad" TEXT,
    "zona" TEXT,
    "sincronizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jornadas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3),
    "viajes_ids" JSONB NOT NULL,
    "sincronizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jornadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_mantenimiento" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "km" DOUBLE PRECISION NOT NULL,
    "costo" DOUBLE PRECISION,
    "notas" TEXT,
    "sincronizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_mantenimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_refresco_token_hash_key" ON "tokens_refresco"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "planes_clave_key" ON "planes"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "planes_producto_id_google_play_key" ON "planes"("producto_id_google_play");

-- CreateIndex
CREATE UNIQUE INDEX "planes_de_usuario_purchase_token_key" ON "planes_de_usuario"("purchase_token");

-- CreateIndex
CREATE INDEX "viajes_usuario_id_idx" ON "viajes"("usuario_id");

-- CreateIndex
CREATE INDEX "jornadas_usuario_id_idx" ON "jornadas"("usuario_id");

-- CreateIndex
CREATE INDEX "registros_mantenimiento_usuario_id_idx" ON "registros_mantenimiento"("usuario_id");

-- AddForeignKey
ALTER TABLE "tokens_refresco" ADD CONSTRAINT "tokens_refresco_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_de_usuario" ADD CONSTRAINT "planes_de_usuario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_de_usuario" ADD CONSTRAINT "planes_de_usuario_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "planes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornadas" ADD CONSTRAINT "jornadas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_mantenimiento" ADD CONSTRAINT "registros_mantenimiento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
