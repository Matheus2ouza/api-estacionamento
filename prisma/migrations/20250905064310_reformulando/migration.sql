/*
  Warnings:

  - You are about to drop the column `carroValue` on the `billing_method` table. All the data in the column will be lost.
  - You are about to drop the column `motoValue` on the `billing_method` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."billing_method" DROP COLUMN "carroValue",
DROP COLUMN "motoValue",
ADD COLUMN     "carro_value" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "moto_value" DECIMAL(10,2);
