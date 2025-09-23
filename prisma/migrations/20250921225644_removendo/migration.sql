/*
  Warnings:

  - The values [POR_HORA_FRAÇÃO] on the enum `BillingMethodCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."BillingMethodCategory_new" AS ENUM ('POR_HORA', 'POR_MINUTO', 'VALOR_FIXO');
ALTER TABLE "public"."billing_method" ALTER COLUMN "category" TYPE "public"."BillingMethodCategory_new" USING ("category"::text::"public"."BillingMethodCategory_new");
ALTER TYPE "public"."BillingMethodCategory" RENAME TO "BillingMethodCategory_old";
ALTER TYPE "public"."BillingMethodCategory_new" RENAME TO "BillingMethodCategory";
DROP TYPE "public"."BillingMethodCategory_old";
COMMIT;
