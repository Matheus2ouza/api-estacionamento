/*
  Warnings:

  - Added the required column `category` to the `vehicle_entries` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VehicleCategory" AS ENUM ('carro', 'moto', 'carroGrande');

-- AlterTable
ALTER TABLE "vehicle_entries" ADD COLUMN     "category" "VehicleCategory" NOT NULL;

-- CreateTable
CREATE TABLE "patio_configs" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "maxCars" INTEGER NOT NULL,
    "maxMotorcycles" INTEGER NOT NULL,
    "maxLargeVehicles" INTEGER NOT NULL,

    CONSTRAINT "patio_configs_pkey" PRIMARY KEY ("id")
);
