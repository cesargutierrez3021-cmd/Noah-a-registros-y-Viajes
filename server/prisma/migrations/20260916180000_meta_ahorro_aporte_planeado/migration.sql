ALTER TABLE "metas_ahorro" DROP COLUMN "aporte_mensual_objetivo";
ALTER TABLE "metas_ahorro" ADD COLUMN "aporte_planeado" JSONB;
