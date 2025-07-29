/*
  Warnings:

  - You are about to drop the column `created_at` on the `billing_method` table. All the data in the column will be lost.
  - You are about to drop the column `has_tolerance` on the `billing_method` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `billing_method` table. All the data in the column will be lost.
  - You are about to drop the column `tolerance_minutes` on the `billing_method` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `billing_method` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `billing_rule` table. All the data in the column will be lost.
  - You are about to drop the column `time_quantity` on the `billing_rule` table. All the data in the column will be lost.
  - You are about to drop the column `time_unit` on the `billing_rule` table. All the data in the column will be lost.
  - Changed the type of `vehicle_type` on the `billing_rule` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "billing_rule_billing_method_id_vehicle_type_time_unit_time__key";

-- AlterTable
ALTER TABLE "billing_method" DROP COLUMN "created_at",
DROP COLUMN "has_tolerance",
DROP COLUMN "is_active",
DROP COLUMN "tolerance_minutes",
DROP COLUMN "updated_at",
ADD COLUMN     "tolerance" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "billing_rule" DROP COLUMN "is_active",
DROP COLUMN "time_quantity",
DROP COLUMN "time_unit",
ADD COLUMN     "base_time" INTEGER,
DROP COLUMN "vehicle_type",
ADD COLUMN     "vehicle_type" TEXT NOT NULL;

-- DropEnum
DROP TYPE "TimeUnit";
