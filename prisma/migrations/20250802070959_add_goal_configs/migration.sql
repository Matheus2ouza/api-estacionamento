-- CreateTable
CREATE TABLE "public"."goal_configs" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "daily_goal_value" DECIMAL(10,2) NOT NULL,
    "vehicle_goal_quantity" INTEGER NOT NULL,
    "product_goal_quantity" INTEGER NOT NULL,
    "goal_period" TEXT NOT NULL,
    "notifications_enabled" BOOLEAN NOT NULL,
    "category_goals_active" BOOLEAN NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goal_configs_pkey" PRIMARY KEY ("id")
);
