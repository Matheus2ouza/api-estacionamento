/*
  Warnings:

  - You are about to drop the column `amount` on the `vehicle_transaction` table. All the data in the column will be lost.
  - Added the required column `final_amount` to the `vehicle_transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `original_amount` to the `vehicle_transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "product_transaction" ADD COLUMN     "amount_received" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "change_given" DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE "vehicle_transaction" DROP COLUMN "amount",
ADD COLUMN     "amount_received" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "change_given" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "discount_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "final_amount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "original_amount" DECIMAL(10,2) NOT NULL;
