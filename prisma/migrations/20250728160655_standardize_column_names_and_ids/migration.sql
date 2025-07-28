/*
  Warnings:

  - You are about to drop the column `baseTime` on the `billing_rule` table. All the data in the column will be lost.
  - You are about to drop the column `billingMethodId` on the `billing_rule` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `billing_rule` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `billing_rule` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleType` on the `billing_rule` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `financial_movement` table. All the data in the column will be lost.
  - You are about to drop the column `maxCars` on the `patio_configs` table. All the data in the column will be lost.
  - You are about to drop the column `maxLargeVehicles` on the `patio_configs` table. All the data in the column will be lost.
  - You are about to drop the column `maxMotorcycles` on the `patio_configs` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `product_transaction` table. All the data in the column will be lost.
  - You are about to drop the column `expirationDate` on the `sale_items` table. All the data in the column will be lost.
  - You are about to drop the column `productName` on the `sale_items` table. All the data in the column will be lost.
  - You are about to drop the column `soldQuantity` on the `sale_items` table. All the data in the column will be lost.
  - You are about to drop the column `unitPrice` on the `sale_items` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `vehicle_transaction` table. All the data in the column will be lost.
  - Added the required column `billing_method_id` to the `billing_rule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `billing_rule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehicle_type` to the `billing_rule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment_method` to the `financial_movement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `max_cars` to the `patio_configs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `max_large_vehicles` to the `patio_configs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `max_motorcycles` to the `patio_configs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment_method` to the `product_transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_name` to the `sale_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sold_quantity` to the `sale_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit_price` to the `sale_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment_method` to the `vehicle_transaction` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "billing_rule" DROP CONSTRAINT "billing_rule_billingMethodId_fkey";

-- AlterTable
ALTER TABLE "billing_rule" DROP COLUMN "baseTime",
DROP COLUMN "billingMethodId",
DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
DROP COLUMN "vehicleType",
ADD COLUMN     "base_time" INTEGER,
ADD COLUMN     "billing_method_id" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "vehicle_type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "financial_movement" DROP COLUMN "paymentMethod",
ADD COLUMN     "payment_method" "PaymentMethod" NOT NULL;

-- AlterTable
ALTER TABLE "patio_configs" DROP COLUMN "maxCars",
DROP COLUMN "maxLargeVehicles",
DROP COLUMN "maxMotorcycles",
ADD COLUMN     "max_cars" INTEGER NOT NULL,
ADD COLUMN     "max_large_vehicles" INTEGER NOT NULL,
ADD COLUMN     "max_motorcycles" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "product_transaction" DROP COLUMN "paymentMethod",
ADD COLUMN     "payment_method" "PaymentMethod" NOT NULL;

-- AlterTable
ALTER TABLE "sale_items" DROP COLUMN "expirationDate",
DROP COLUMN "productName",
DROP COLUMN "soldQuantity",
DROP COLUMN "unitPrice",
ADD COLUMN     "expiration_date" TIMESTAMP(3),
ADD COLUMN     "product_name" TEXT NOT NULL,
ADD COLUMN     "sold_quantity" INTEGER NOT NULL,
ADD COLUMN     "unit_price" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "vehicle_transaction" DROP COLUMN "paymentMethod",
ADD COLUMN     "payment_method" "PaymentMethod" NOT NULL;

-- AddForeignKey
ALTER TABLE "billing_rule" ADD CONSTRAINT "billing_rule_billing_method_id_fkey" FOREIGN KEY ("billing_method_id") REFERENCES "billing_method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
