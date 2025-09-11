/*
  Warnings:

  - You are about to drop the `patio_configs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."patio_configs";

-- CreateTable
CREATE TABLE "public"."parking_configs" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "max_cars" INTEGER NOT NULL,
    "max_motorcycles" INTEGER NOT NULL,

    CONSTRAINT "parking_configs_pkey" PRIMARY KEY ("id")
);
