-- CreateTable
CREATE TABLE "consultas_ia" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultas_ia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consultas_ia_usuario_id_fecha_idx" ON "consultas_ia"("usuario_id", "fecha");

-- AddForeignKey
ALTER TABLE "consultas_ia" ADD CONSTRAINT "consultas_ia_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
