-- AlterTable
ALTER TABLE "public"."vehicle_entries" ADD COLUMN     "cash_register_id" TEXT;

-- AddForeignKey
ALTER TABLE "public"."vehicle_entries" ADD CONSTRAINT "vehicle_entries_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "public"."cash_register"("id") ON DELETE SET NULL ON UPDATE CASCADE;
