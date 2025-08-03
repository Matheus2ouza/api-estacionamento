/*
  Warnings:

  - Added the required column `week_end_day` to the `goal_configs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `week_start_day` to the `goal_configs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."goal_configs" ADD COLUMN     "week_end_day" INTEGER NOT NULL,
ADD COLUMN     "week_start_day" INTEGER NOT NULL;
