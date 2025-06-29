-- CreateTable
CREATE TABLE "vehicle_entries" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "entry_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_histories" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "exit_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_entries_plate_key" ON "vehicle_entries"("plate");
