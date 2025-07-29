/*
  Warnings:

  - You are about to drop the column `tolerance` on the `billing_method` table. All the data in the column will be lost.
  - You are about to drop the column `base_time` on the `billing_rule` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[billing_method_id,vehicle_type,time_unit,time_quantity]` on the table `billing_rule` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `billing_method` table without a default value. This is not possible if the table is not empty.
  - Added the required column `time_quantity` to the `billing_rule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `time_unit` to the `billing_rule` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `vehicle_type` on the `billing_rule` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TimeUnit" AS ENUM ('MINUTE', 'HOUR', 'DAY');

-- AlterTable
ALTER TABLE "billing_method" DROP COLUMN "tolerance",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "has_tolerance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tolerance_minutes" INTEGER DEFAULT 10,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "billing_rule" DROP COLUMN "base_time",
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "time_quantity" INTEGER NOT NULL,
ADD COLUMN     "time_unit" "TimeUnit" NOT NULL,
DROP COLUMN "vehicle_type",
ADD COLUMN     "vehicle_type" "VehicleCategory" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "billing_rule_billing_method_id_vehicle_type_time_unit_time__key" ON "billing_rule"("billing_method_id", "vehicle_type", "time_unit", "time_quantity");
