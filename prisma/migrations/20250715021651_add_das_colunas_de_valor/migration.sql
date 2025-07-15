/*
  Warnings:

  - Added the required column `final_amount` to the `transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `original_amount` to the `transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "transaction" ADD COLUMN     "discount_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "final_amount" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "original_amount" DECIMAL(65,30) NOT NULL;
