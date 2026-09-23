CREATE TABLE "bonos" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "sincronizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bonos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bonos_usuario_id_idx" ON "bonos"("usuario_id");

ALTER TABLE "bonos" ADD CONSTRAINT "bonos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
