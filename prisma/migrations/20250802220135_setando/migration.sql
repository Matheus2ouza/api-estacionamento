/*
  Warnings:

  - Changed the type of `goal_period` on the `goal_configs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."Period" AS ENUM ('DIARIA', 'SEMANAL', 'MENSAL');

-- AlterTable
ALTER TABLE "public"."goal_configs" DROP COLUMN "goal_period",
ADD COLUMN     "goal_period" "public"."Period" NOT NULL;
