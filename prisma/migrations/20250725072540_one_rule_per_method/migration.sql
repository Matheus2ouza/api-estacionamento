/*
  Warnings:

  - A unique constraint covering the columns `[billingMethodId]` on the table `billing_rule` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "billing_rule_billingMethodId_key" ON "billing_rule"("billingMethodId");
