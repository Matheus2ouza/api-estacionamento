/*
  Warnings:

  - A unique constraint covering the columns `[billing_method_id,vehicle_type,is_active]` on the table `billing_rule` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "billing_rule" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "billing_rule_billing_method_id_vehicle_type_is_active_key" ON "billing_rule"("billing_method_id", "vehicle_type", "is_active");
