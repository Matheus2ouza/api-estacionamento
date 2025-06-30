/*
  Warnings:

  - Added the required column `operator_id` to the `vehicle_entries` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "vehicle_entries" ADD COLUMN     "operator_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "vehicle_entries" ADD CONSTRAINT "vehicle_entries_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
