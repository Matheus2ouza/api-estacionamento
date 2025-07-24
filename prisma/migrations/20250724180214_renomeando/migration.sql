/*
  Warnings:

  - You are about to drop the `BillingMethod` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BillingMethodInput` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BillingRule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BillingMethodInput" DROP CONSTRAINT "BillingMethodInput_methodId_fkey";

-- DropForeignKey
ALTER TABLE "BillingRule" DROP CONSTRAINT "BillingRule_methodId_fkey";

-- DropTable
DROP TABLE "BillingMethod";

-- DropTable
DROP TABLE "BillingMethodInput";

-- DropTable
DROP TABLE "BillingRule";

-- CreateTable
CREATE TABLE "billing_method" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "vehicleSpecific" BOOLEAN NOT NULL,
    "tolerance" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_method_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_method_input" (
    "id" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "placeholder" TEXT NOT NULL,
    "type" "InputType" NOT NULL,

    CONSTRAINT "billing_method_input_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_rule" (
    "id" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "values" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_rule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_method_code_key" ON "billing_method"("code");

-- AddForeignKey
ALTER TABLE "billing_method_input" ADD CONSTRAINT "billing_method_input_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "billing_method"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_rule" ADD CONSTRAINT "billing_rule_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "billing_method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
