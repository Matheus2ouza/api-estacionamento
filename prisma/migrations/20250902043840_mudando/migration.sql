/*
  Warnings:

  - You are about to drop the column `values` on the `billing_method` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."billing_method" DROP COLUMN "values",
ADD COLUMN     "carroValue" DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN     "motoValue" DECIMAL(10,2);
