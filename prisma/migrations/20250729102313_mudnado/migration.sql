/*
  Warnings:

  - You are about to drop the column `photo_url` on the `vehicle_entries` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "vehicle_entries" DROP COLUMN "photo_url",
ADD COLUMN     "photo" BYTEA,
ADD COLUMN     "photo_type" TEXT;
