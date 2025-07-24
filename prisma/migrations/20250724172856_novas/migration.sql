-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('carro', 'moto');

-- CreateEnum
CREATE TYPE "InputType" AS ENUM ('number', 'text', 'select');

-- CreateTable
CREATE TABLE "BillingMethod" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "vehicleSpecific" BOOLEAN NOT NULL,
    "tolerance" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingMethodInput" (
    "id" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "placeholder" TEXT NOT NULL,
    "type" "InputType" NOT NULL,

    CONSTRAINT "BillingMethodInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingRule" (
    "id" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "values" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingMethod_code_key" ON "BillingMethod"("code");

-- AddForeignKey
ALTER TABLE "BillingMethodInput" ADD CONSTRAINT "BillingMethodInput_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "BillingMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRule" ADD CONSTRAINT "BillingRule_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "BillingMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
