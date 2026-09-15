-- CreateTable
CREATE TABLE "metas_ahorro" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "monto_objetivo" DOUBLE PRECISION NOT NULL,
    "saldo_actual" DOUBLE PRECISION NOT NULL,
    "creada_en" TIMESTAMP(3) NOT NULL,
    "sincronizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metas_ahorro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abonos_ahorro" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "meta_id" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "sincronizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abonos_ahorro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "metas_ahorro_usuario_id_idx" ON "metas_ahorro"("usuario_id");

-- CreateIndex
CREATE INDEX "abonos_ahorro_usuario_id_idx" ON "abonos_ahorro"("usuario_id");

-- CreateIndex
CREATE INDEX "abonos_ahorro_meta_id_idx" ON "abonos_ahorro"("meta_id");

-- AddForeignKey
ALTER TABLE "metas_ahorro" ADD CONSTRAINT "metas_ahorro_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonos_ahorro" ADD CONSTRAINT "abonos_ahorro_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonos_ahorro" ADD CONSTRAINT "abonos_ahorro_meta_id_fkey" FOREIGN KEY ("meta_id") REFERENCES "metas_ahorro"("id") ON DELETE CASCADE ON UPDATE CASCADE;
