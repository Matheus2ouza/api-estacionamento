/*
  Warnings:

  - Added the required column `paymentMethod` to the `financial_movement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentMethod` to the `transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('DINHEIRO', 'PIX', 'CREDITO', 'DEBITO');

-- AlterTable
ALTER TABLE "cash_register" ADD COLUMN     "general_sale_total" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "vehicle_entry_total" DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE "financial_movement" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL;

-- AlterTable
ALTER TABLE "transaction" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL;
