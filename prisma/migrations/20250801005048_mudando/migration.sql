/*
  Warnings:

  - A unique constraint covering the columns `[product_id]` on the table `general_sale` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "general_sale_product_id_key" ON "public"."general_sale"("product_id");
