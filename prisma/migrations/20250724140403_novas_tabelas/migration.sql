-- CreateTable
CREATE TABLE "VehicleType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "VehicleType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vehicleSpecific" BOOLEAN NOT NULL DEFAULT false,
    "tolerance" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BillingMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingMethodInput" (
    "id" SERIAL NOT NULL,
    "billingMethodId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "placeholder" TEXT,
    "type" TEXT NOT NULL,

    CONSTRAINT "BillingMethodInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingMethodRule" (
    "id" SERIAL NOT NULL,
    "billingMethodId" TEXT NOT NULL,
    "vehicleTypeId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "BillingMethodRule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BillingMethodInput" ADD CONSTRAINT "BillingMethodInput_billingMethodId_fkey" FOREIGN KEY ("billingMethodId") REFERENCES "BillingMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingMethodRule" ADD CONSTRAINT "BillingMethodRule_billingMethodId_fkey" FOREIGN KEY ("billingMethodId") REFERENCES "BillingMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingMethodRule" ADD CONSTRAINT "BillingMethodRule_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "VehicleType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
