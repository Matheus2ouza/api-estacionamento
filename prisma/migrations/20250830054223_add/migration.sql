-- CreateEnum
CREATE TYPE "public"."CollectionMethodCategory" AS ENUM ('POR_HORA', 'POR_MINUTO', 'VALOR_FIXO');

-- CreateTable
CREATE TABLE "public"."collection_methods" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "public"."CollectionMethodCategory" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "tolerance" DOUBLE PRECISION,
    "time_minutes" INTEGER NOT NULL DEFAULT 0,
    "values" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "collection_methods_pkey" PRIMARY KEY ("id")
);
