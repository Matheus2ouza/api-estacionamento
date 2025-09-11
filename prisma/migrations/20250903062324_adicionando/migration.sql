-- AlterEnum
ALTER TYPE "public"."AccountRole" ADD VALUE 'MANAGER';

-- AlterTable
ALTER TABLE "public"."accounts" ADD COLUMN     "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3);
