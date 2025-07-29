/*
  Warnings:

  - Changed the type of `vehicle_type` on the `billing_rule` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "billing_rule" DROP COLUMN "vehicle_type",
ADD COLUMN     "vehicle_type" "VehicleCategory" NOT NULL;
