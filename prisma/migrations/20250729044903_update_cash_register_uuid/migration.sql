-- CreateEnum
CREATE TYPE "AccountRole" AS ENUM ('ADMIN', 'NORMAL');

-- CreateEnum
CREATE TYPE "CashRegisterStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "InputType" AS ENUM ('number', 'text', 'select');

-- CreateEnum
CREATE TYPE "Method" AS ENUM ('DINHEIRO', 'PIX', 'CREDITO', 'DEBITO');

-- CreateEnum
CREATE TYPE "VehicleCategory" AS ENUM ('carro', 'moto');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('INSIDE', 'EXITED', 'DELETED');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "role" "AccountRole" NOT NULL,
    "username" TEXT NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authentications" (
    "account_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'bcrypt',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authentications_pkey" PRIMARY KEY ("account_id")
);

-- CreateTable
CREATE TABLE "billing_method" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tolerance" DOUBLE PRECISION,

    CONSTRAINT "billing_method_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_rule" (
    "id" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "base_time" INTEGER,
    "billing_method_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "vehicle_type" TEXT NOT NULL,

    CONSTRAINT "billing_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_register" (
    "id" TEXT NOT NULL,
    "opening_date" TIMESTAMP(3) NOT NULL,
    "closing_date" TIMESTAMP(3),
    "status" "CashRegisterStatus" NOT NULL DEFAULT 'OPEN',
    "operator" TEXT NOT NULL,
    "initial_value" DECIMAL(10,2) NOT NULL,
    "final_value" DECIMAL(10,2) NOT NULL,
    "general_sale_total" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "vehicle_entry_total" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "outgoing_expense_total" DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT "cash_register_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_movement" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_method" "Method" NOT NULL,

    CONSTRAINT "financial_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "general_sale" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "expiration_date" TIMESTAMP(3),

    CONSTRAINT "general_sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outgoing_expense" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cash_register_id" TEXT NOT NULL,
    "operator" TEXT NOT NULL,

    CONSTRAINT "outgoing_expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patio_configs" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "max_cars" INTEGER NOT NULL,
    "max_large_vehicles" INTEGER NOT NULL,
    "max_motorcycles" INTEGER NOT NULL,

    CONSTRAINT "patio_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_transaction" (
    "id" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "cash_register_id" TEXT NOT NULL,
    "original_amount" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "final_amount" DECIMAL(10,2) NOT NULL,
    "amount_received" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "change_given" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "method" "Method" NOT NULL,

    CONSTRAINT "product_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "barcode" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
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
CREATE TABLE "vehicle_entries" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "entry_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" "VehicleCategory" NOT NULL,
    "operator" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "description" TEXT DEFAULT '',
    "exit_time" TIMESTAMP(3),
    "status" "VehicleStatus" NOT NULL DEFAULT 'INSIDE',

    CONSTRAINT "vehicle_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_transaction" (
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
    "method" "Method" NOT NULL,

    CONSTRAINT "vehicle_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_username_key" ON "accounts"("username");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");

-- CreateIndex
CREATE INDEX "vehicle_entries_plate_idx" ON "vehicle_entries"("plate");

-- AddForeignKey
ALTER TABLE "authentications" ADD CONSTRAINT "authentications_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_rule" ADD CONSTRAINT "billing_rule_billing_method_id_fkey" FOREIGN KEY ("billing_method_id") REFERENCES "billing_method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_sale" ADD CONSTRAINT "general_sale_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outgoing_expense" ADD CONSTRAINT "outgoing_expense_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "cash_register"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_transaction" ADD CONSTRAINT "product_transaction_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "cash_register"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_transaction_id_fkey" FOREIGN KEY ("product_transaction_id") REFERENCES "product_transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_transaction" ADD CONSTRAINT "vehicle_transaction_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "cash_register"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_transaction" ADD CONSTRAINT "vehicle_transaction_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
