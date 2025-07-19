/*
  Warnings:

  - You are about to alter the column `discount_amount` on the `product_transaction` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to alter the column `discount_amount` on the `vehicle_transaction` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "product_transaction" ALTER COLUMN "discount_amount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "vehicle_transaction" ALTER COLUMN "discount_amount" SET DATA TYPE DECIMAL(10,2);
