/*
  Warnings:

  - The values [carroGrande] on the enum `VehicleCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "VehicleCategory_new" AS ENUM ('carro', 'moto');
ALTER TABLE "vehicle_entries" ALTER COLUMN "category" TYPE "VehicleCategory_new" USING ("category"::text::"VehicleCategory_new");
ALTER TYPE "VehicleCategory" RENAME TO "VehicleCategory_old";
ALTER TYPE "VehicleCategory_new" RENAME TO "VehicleCategory";
DROP TYPE "VehicleCategory_old";
COMMIT;

-- CreateTable
CREATE TABLE "billing_rule" (
    "id" TEXT NOT NULL,
    "billingMethodId" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "baseTime" INTEGER,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_rule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "billing_rule" ADD CONSTRAINT "billing_rule_billingMethodId_fkey" FOREIGN KEY ("billingMethodId") REFERENCES "billing_method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
