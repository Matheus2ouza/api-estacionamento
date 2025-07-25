/*
  Warnings:

  - You are about to drop the `billing_method` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "billing_rule" DROP CONSTRAINT "billing_rule_billingMethodId_fkey";

-- DropTable
DROP TABLE "billing_method";

-- CreateTable
CREATE TABLE "BillingMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tolerance" DOUBLE PRECISION,

    CONSTRAINT "BillingMethod_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "billing_rule" ADD CONSTRAINT "billing_rule_billingMethodId_fkey" FOREIGN KEY ("billingMethodId") REFERENCES "BillingMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
