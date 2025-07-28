/*
  Warnings:

  - Changed the type of `payment_method` on the `financial_movement` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `method` on the `product_transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `method` on the `vehicle_transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Method" AS ENUM ('DINHEIRO', 'PIX', 'CREDITO', 'DEBITO');

-- DropForeignKey
ALTER TABLE "general_sale" DROP CONSTRAINT "general_sale_product_id_fkey";

-- DropForeignKey
ALTER TABLE "outgoing_expense" DROP CONSTRAINT "outgoing_expense_cash_register_id_fkey";

-- DropForeignKey
ALTER TABLE "product_transaction" DROP CONSTRAINT "product_transaction_cash_register_id_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_transaction" DROP CONSTRAINT "vehicle_transaction_cash_register_id_fkey";

-- DropForeignKey
ALTER TABLE "vehicle_transaction" DROP CONSTRAINT "vehicle_transaction_vehicle_id_fkey";

-- AlterTable
ALTER TABLE "financial_movement" DROP COLUMN "payment_method",
ADD COLUMN     "payment_method" "Method" NOT NULL;

-- AlterTable
ALTER TABLE "product_transaction" DROP COLUMN "method",
ADD COLUMN     "method" "Method" NOT NULL;

-- AlterTable
ALTER TABLE "vehicle_transaction" DROP COLUMN "method",
ADD COLUMN     "method" "Method" NOT NULL;

-- DropEnum
DROP TYPE "PaymentMethod";

-- AddForeignKey
ALTER TABLE "general_sale" ADD CONSTRAINT "general_sale_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outgoing_expense" ADD CONSTRAINT "outgoing_expense_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "cash_register"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_transaction" ADD CONSTRAINT "product_transaction_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "cash_register"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_transaction" ADD CONSTRAINT "vehicle_transaction_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "cash_register"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_transaction" ADD CONSTRAINT "vehicle_transaction_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
