/*
  Warnings:

  - You are about to drop the `transaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_cash_register_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_product_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_vehicle_id_fkey";

-- DropTable
DROP TABLE "transaction";

-- CreateTable
CREATE TABLE "vehicle_transaction" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "cash_register_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "vehicle_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_transaction" (
    "id" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "cash_register_id" TEXT NOT NULL,
    "original_amount" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "final_amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "product_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "product_transaction_id" TEXT NOT NULL,
    "product_id" TEXT,
    "soldQuantity" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "expirationDate" TIMESTAMP(3),

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "vehicle_transaction" ADD CONSTRAINT "vehicle_transaction_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_transaction" ADD CONSTRAINT "vehicle_transaction_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "cash_register"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_transaction" ADD CONSTRAINT "product_transaction_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "cash_register"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_transaction_id_fkey" FOREIGN KEY ("product_transaction_id") REFERENCES "product_transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
