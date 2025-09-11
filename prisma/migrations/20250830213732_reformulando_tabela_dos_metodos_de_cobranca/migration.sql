/*
  Warnings:

  - You are about to drop the column `name` on the `billing_method` table. All the data in the column will be lost.
  - You are about to drop the `billing_rule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `collection_methods` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `category` to the `billing_method` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `billing_method` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `billing_method` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."BillingMethodCategory" AS ENUM ('POR_HORA', 'POR_MINUTO', 'VALOR_FIXO');

-- DropForeignKey
ALTER TABLE "public"."billing_rule" DROP CONSTRAINT "billing_rule_billing_method_id_fkey";

-- AlterTable
ALTER TABLE "public"."billing_method" DROP COLUMN "name",
ADD COLUMN     "category" "public"."BillingMethodCategory" NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "time_minutes" INTEGER DEFAULT 0,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updated_by" TEXT,
ADD COLUMN     "values" JSONB NOT NULL DEFAULT '{}',
ALTER COLUMN "is_active" SET DEFAULT true;

-- DropTable
DROP TABLE "public"."billing_rule";

-- DropTable
DROP TABLE "public"."collection_methods";

-- DropEnum
DROP TYPE "public"."CollectionMethodCategory";
