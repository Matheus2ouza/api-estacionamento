/*
  Warnings:

  - You are about to drop the `vehicle_histories` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('INSIDE', 'EXITED', 'DELETED');

-- DropIndex
DROP INDEX "vehicle_entries_plate_key";

-- AlterTable
ALTER TABLE "vehicle_entries" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "description" TEXT DEFAULT '',
ADD COLUMN     "exit_time" TIMESTAMP(3),
ADD COLUMN     "status" "VehicleStatus" NOT NULL DEFAULT 'INSIDE';

-- DropTable
DROP TABLE "vehicle_histories";

-- CreateIndex
CREATE INDEX "vehicle_entries_plate_idx" ON "vehicle_entries"("plate");
