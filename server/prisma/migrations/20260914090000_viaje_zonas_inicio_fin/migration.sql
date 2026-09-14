ALTER TABLE "viajes" ADD COLUMN "localidad_inicio" TEXT;
ALTER TABLE "viajes" ADD COLUMN "zona_inicio" TEXT;
ALTER TABLE "viajes" ADD COLUMN "localidad_fin" TEXT;
ALTER TABLE "viajes" ADD COLUMN "zona_fin" TEXT;
UPDATE "viajes" SET "localidad_inicio" = "localidad", "zona_inicio" = "zona", "localidad_fin" = "localidad", "zona_fin" = "zona";
