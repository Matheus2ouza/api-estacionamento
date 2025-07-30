/*
  Warnings:

  - Added the required column `method` to the `outgoing_expense` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "outgoing_expense" ADD COLUMN     "method" "Method" NOT NULL;
