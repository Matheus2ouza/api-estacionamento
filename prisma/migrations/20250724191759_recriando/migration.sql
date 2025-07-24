/*
  Warnings:

  - You are about to drop the column `code` on the `billing_method` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `billing_method` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `billing_method` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleSpecific` on the `billing_method` table. All the data in the column will be lost.
  - The `tolerance` column on the `billing_method` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `billing_method_input` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `billing_rule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "billing_method_input" DROP CONSTRAINT "billing_method_input_methodId_fkey";

-- DropForeignKey
ALTER TABLE "billing_rule" DROP CONSTRAINT "billing_rule_methodId_fkey";

-- DropIndex
DROP INDEX "billing_method_code_key";

-- AlterTable
ALTER TABLE "billing_method" DROP COLUMN "code",
DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
DROP COLUMN "vehicleSpecific",
DROP COLUMN "tolerance",
ADD COLUMN     "tolerance" DOUBLE PRECISION;

-- DropTable
DROP TABLE "billing_method_input";

-- DropTable
DROP TABLE "billing_rule";

-- DropEnum
DROP TYPE "VehicleType";
