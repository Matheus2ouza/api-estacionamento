-- CreateEnum
CREATE TYPE "public"."AccountRole" AS ENUM ('ADMIN', 'MANAGER', 'NORMAL');

-- CreateEnum
CREATE TYPE "public"."CashRegisterStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."InputType" AS ENUM ('number', 'text', 'select');

-- CreateEnum
CREATE TYPE "public"."Method" AS ENUM ('DINHEIRO', 'PIX', 'CREDITO', 'DEBITO');

-- CreateEnum
CREATE TYPE "public"."VehicleCategory" AS ENUM ('carro', 'moto');

-- CreateEnum
CREATE TYPE "public"."VehicleStatus" AS ENUM ('INSIDE', 'EXITED', 'DELETED', 'SYSTEM_DELETED');

-- CreateEnum
CREATE TYPE "public"."Period" AS ENUM ('DIARIA', 'SEMANAL', 'MENSAL');

-- CreateEnum
CREATE TYPE "public"."BillingMethodCategory" AS ENUM ('POR_HORA', 'POR_MINUTO', 'VALOR_FIXO');

-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" TEXT NOT NULL,
    "role" "public"."AccountRole" NOT NULL,
    "username" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."authentications" (
    "account_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'bcrypt',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authentications_pkey" PRIMARY KEY ("account_id")
);

-- CreateTable
CREATE TABLE "public"."account_push_token" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_push_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."billing_method" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "public"."BillingMethodCategory",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "tolerance" DOUBLE PRECISION,
    "time_minutes" INTEGER DEFAULT 0,
    "carro_value" DECIMAL(10,2) DEFAULT 0.00,
    "moto_value" DECIMAL(10,2) DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "billing_method_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."goal_configs" (
    "id" TEXT NOT NULL,
    "goal_period" "public"."Period" NOT NULL,
    "goal_value" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "goal_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cash_register" (
    "id" TEXT NOT NULL,
    "opening_date" TIMESTAMP(3) NOT NULL,
    "closing_date" TIMESTAMP(3),
    "status" "public"."CashRegisterStatus" NOT NULL DEFAULT 'OPEN',
    "operator" TEXT NOT NULL,
    "initial_value" DECIMAL(10,2) NOT NULL,
    "final_value" DECIMAL(10,2) NOT NULL,
    "general_sale_total" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "vehicle_entry_total" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "outgoing_expense_total" DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT "cash_register_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."financial_movement" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_method" "public"."Method" NOT NULL,

    CONSTRAINT "financial_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."general_sale" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "expiration_date" TIMESTAMP(3),

    CONSTRAINT "general_sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."outgoing_expense" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cash_register_id" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "method" "public"."Method" NOT NULL,

    CONSTRAINT "outgoing_expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patio_configs" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "max_cars" INTEGER NOT NULL,
    "max_motorcycles" INTEGER NOT NULL,

    CONSTRAINT "patio_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."parking_configs" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "max_cars" INTEGER NOT NULL,
    "max_motorcycles" INTEGER NOT NULL,

    CONSTRAINT "parking_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_transaction" (
    "id" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "cash_register_id" TEXT NOT NULL,
    "original_amount" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "final_amount" DECIMAL(10,2) NOT NULL,
    "amount_received" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "change_given" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "method" "public"."Method" NOT NULL,
    "photo" BYTEA,
    "photo_type" TEXT,

    CONSTRAINT "product_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "barcode" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sale_items" (
    "id" TEXT NOT NULL,
    "product_transaction_id" TEXT NOT NULL,
    "product_id" TEXT,
    "expiration_date" TIMESTAMP(3),
    "product_name" TEXT NOT NULL,
    "sold_quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vehicle_entries" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "entry_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" "public"."VehicleCategory" NOT NULL,
    "billing_method_id" TEXT,
    "cash_register_id" TEXT,
    "operator" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "description" TEXT DEFAULT '',
    "exit_time" TIMESTAMP(3),
    "status" "public"."VehicleStatus" NOT NULL DEFAULT 'INSIDE',
    "observation" TEXT DEFAULT '',
    "photo" BYTEA,
    "photo_type" TEXT,

    CONSTRAINT "vehicle_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vehicle_transaction" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "cash_register_id" TEXT NOT NULL,
    "amount_received" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "change_given" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "final_amount" DECIMAL(10,2) NOT NULL,
    "original_amount" DECIMAL(10,2) NOT NULL,
    "method" "public"."Method" NOT NULL,
    "photo" BYTEA,
    "photo_type" TEXT,

    CONSTRAINT "vehicle_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_username_key" ON "public"."accounts"("username");

-- CreateIndex
CREATE UNIQUE INDEX "goal_configs_goal_period_key" ON "public"."goal_configs"("goal_period");

-- CreateIndex
CREATE UNIQUE INDEX "general_sale_product_id_key" ON "public"."general_sale"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "public"."products"("barcode");

-- CreateIndex
CREATE INDEX "vehicle_entries_plate_idx" ON "public"."vehicle_entries"("plate");

-- AddForeignKey
ALTER TABLE "public"."authentications" ADD CONSTRAINT "authentications_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."account_push_token" ADD CONSTRAINT "account_push_token_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."general_sale" ADD CONSTRAINT "general_sale_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."outgoing_expense" ADD CONSTRAINT "outgoing_expense_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "public"."cash_register"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_transaction" ADD CONSTRAINT "product_transaction_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "public"."cash_register"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sale_items" ADD CONSTRAINT "sale_items_product_transaction_id_fkey" FOREIGN KEY ("product_transaction_id") REFERENCES "public"."product_transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicle_entries" ADD CONSTRAINT "vehicle_entries_billing_method_id_fkey" FOREIGN KEY ("billing_method_id") REFERENCES "public"."billing_method"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicle_entries" ADD CONSTRAINT "vehicle_entries_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "public"."cash_register"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicle_transaction" ADD CONSTRAINT "vehicle_transaction_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "public"."cash_register"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicle_transaction" ADD CONSTRAINT "vehicle_transaction_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicle_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
