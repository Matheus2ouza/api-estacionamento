/*
  Warnings:

  - You are about to drop the column `base_time` on the `billing_rule` table. All the data in the column will be lost.
  - Added the required column `base_time_minutes` to the `billing_rule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "billing_rule" DROP COLUMN "base_time",
ADD COLUMN     "base_time_minutes" INTEGER NOT NULL;
