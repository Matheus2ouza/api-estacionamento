/*
  Warnings:

  - You are about to drop the column `operator_id` on the `vehicle_entries` table. All the data in the column will be lost.
  - Added the required column `operator` to the `vehicle_entries` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "vehicle_entries" DROP CONSTRAINT "vehicle_entries_operator_id_fkey";

-- AlterTable
ALTER TABLE "vehicle_entries" DROP COLUMN "operator_id",
ADD COLUMN     "operator" TEXT NOT NULL;
