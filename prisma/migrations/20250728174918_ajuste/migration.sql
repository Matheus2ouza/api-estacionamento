/*
  Warnings:

  - You are about to drop the column `payment_method` on the `product_transaction` table. All the data in the column will be lost.
  - Added the required column `method` to the `product_transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "product_transaction" DROP COLUMN "payment_method",
ADD COLUMN     "method" "PaymentMethod" NOT NULL;
