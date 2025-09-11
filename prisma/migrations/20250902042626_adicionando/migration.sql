-- AlterTable
ALTER TABLE "public"."vehicle_entries" ADD COLUMN     "billing_method_id" TEXT;

-- AddForeignKey
ALTER TABLE "public"."vehicle_entries" ADD CONSTRAINT "vehicle_entries_billing_method_id_fkey" FOREIGN KEY ("billing_method_id") REFERENCES "public"."billing_method"("id") ON DELETE SET NULL ON UPDATE CASCADE;
