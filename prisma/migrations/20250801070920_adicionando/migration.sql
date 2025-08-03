-- AlterTable
ALTER TABLE "public"."product_transaction" ADD COLUMN     "photo" BYTEA,
ADD COLUMN     "photo_type" TEXT;

-- AlterTable
ALTER TABLE "public"."vehicle_transaction" ADD COLUMN     "photo" BYTEA,
ADD COLUMN     "photo_type" TEXT;
