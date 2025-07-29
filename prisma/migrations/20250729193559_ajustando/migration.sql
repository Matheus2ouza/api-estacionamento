/*
  Warnings:

  - You are about to drop the column `is_active` on the `billing_rule` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "billing_rule_billing_method_id_vehicle_type_is_active_key";

-- AlterTable
ALTER TABLE "billing_method" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "billing_rule" DROP COLUMN "is_active";
