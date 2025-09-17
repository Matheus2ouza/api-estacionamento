const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { DateTime } = require("luxon");
const { getCurrentBelemTime } = require('../utils/timeConverter');

async function historicService(filter = "day") {
  const now = getCurrentBelemTime();
  let startDate;

  if (filter === "day") {
    startDate = now.startOf("day");
  } else if (filter === "week") {
    startDate = now.startOf("week");
  } else if (filter === "month") {
    startDate = now.startOf("month");
  } else {
    throw new Error("Filtro inválido. Use 'day', 'week' ou 'month'.");
  }

  const [vehicleTransactions, productTransactions] = await Promise.all([
    prisma.vehicle_transaction.findMany({
      where: {
        transaction_date: {
          gte: startDate.toJSDate()
        }
      },
      include: {
        vehicle_entries: {
          select: { plate: true }
        }
      },
      orderBy: { transaction_date: 'desc' }
    }),
    prisma.product_transaction.findMany({
      where: {
        transaction_date: {
          gte: startDate.toJSDate()
        }
      },
      include: {
        sale_items: {
          select: {
            product_name: true,
            sold_quantity: true,
            unit_price: true
          }
        }
      },
      orderBy: { transaction_date: 'desc' }
    })
  ]);

  const vehicles = vehicleTransactions.map(v => ({
    id: v.id,
    type: 'vehicle',
    plate: v.vehicle_entries.plate,
    operator: v.operator,
    transaction_date: v.transaction_date,
    cash_register_id: v.cash_register_id,
    original_amount: v.original_amount,
    discount_amount: v.discount_amount,
    final_amount: v.final_amount,
    amount_received: v.amount_received,
    change_given: v.change_given,
    method: v.method,
    photo: v.photo,
    photo_type: v.photo_type
  }));

  const products = productTransactions.map(p => ({
    id: p.id,
    type: 'product',
    operator: p.operator,
    transaction_date: p.transaction_date,
    cash_register_id: p.cash_register_id,
    original_amount: p.original_amount,
    discount_amount: p.discount_amount,
    final_amount: p.final_amount,
    amount_received: p.amount_received,
    change_given: p.change_given,
    method: p.method,
    photo: p.photo,
    photo_type: p.photo_type,
    items: p.sale_items.map(item => ({
      product_name: item.product_name,
      sold_quantity: item.sold_quantity,
      unit_price: item.unit_price
    }))
  }));

  return { vehicles, products };
}

async function historicCashService(id) {
  // Verifica se o caixa existe
  const verifyCash = await prisma.cash_register.findUnique({
    where: { id }
  });

  if (!verifyCash) {
    throw new Error("Nenhum caixa encontrado");
  }

  const result = await prisma.cash_register.findMany({
    where: { id },
    select: {
      product_transaction: {
        select: {
          id: true,
          operator: true,
          transaction_date: true,
          final_amount: true,
          method: true,
          sale_items: {
            select: {
              product_name: true,
            }
          }
        }
      },
      vehicle_transaction: {
        select: {
          id: true,
          vehicle_entries: {
            select: {
              plate: true
            }
          },
          operator: true,
          transaction_date: true,
          final_amount: true,
          method: true,
        }
      }
    }
  });

  const data = result[0]; // resultado é um array com um item só, pois `id` é único

  const vehicles = data.vehicle_transaction.map(v => ({
    id: v.id,
    type: 'vehicle',
    plate: v.vehicle_entries.plate,
    operator: v.operator,
    transaction_date: v.transaction_date,
    final_amount: v.final_amount,
    method: v.method
  }));

  const products = data.product_transaction.map(p => ({
    id: p.id,
    type: 'product',
    operator: p.operator,
    transaction_date: p.transaction_date,
    final_amount: p.final_amount,
    method: p.method,
    items: p.sale_items.map(item => ({
      product_name: item.product_name
    }))
  }));

  return { vehicles, products };
}

async function secondCopyProduct(id) {
  try {
    const transaction = await prisma.product_transaction.findUnique({
      where: { id },
      select: {
        operator: true,
        method: true,
        original_amount: true,
        discount_amount: true,
        final_amount: true,
        amount_received: true,
        change_given: true,
        sale_items: {
          select: {
            product_name: true,
            sold_quantity: true,
            unit_price: true,
          }
        }
      }
    });

    if (!transaction) throw new Error("Transação não encontrada.");

    return transaction;

  } catch (error) {
    throw error;
  }
}

async function secondCopyVehicle(id) {
  try {
    const transaction = await prisma.vehicle_transaction.findUnique({
      where: { id },
      select: {
        operator: true,
        method: true,
        vehicle_entries: {
          select: {
            plate: true
          }
        },
        amount_received: true,
        discount_amount: true,
        change_given: true,
        final_amount: true,
        original_amount: true,
      }
    })

    if (!transaction) throw new Error("Transação não encontrada.");

    return transaction;

  } catch (error) {
    throw error;
  }
}

async function getTransactionPhoto(id, type) {
  if (type === 'product') {
    return await prisma.product_transaction.findUnique({
      where: { id },
      select: {
        photo: true,
        photo_type: true
      }
    });
  } else if (type === 'vehicle') {
    return await prisma.vehicle_transaction.findUnique({
      where: { id },
      select: {
        photo: true,
        photo_type: true
      }
    });
  }
  return null;
}

async function getGoalConfigService() {
  return await prisma.goal_configs.findUnique({
    where: { id: "singleton" },
  });
}

async function saveGoalConfigService(data) {
  const {
    daily_goal_value,
    vehicle_goal_quantity,
    product_goal_quantity,
    goal_period,
    notifications_enabled,
    category_goals_active,
    week_start_day,
    week_end_day,
  } = data;

  return await prisma.goal_configs.upsert({
    where: { id: "singleton" },
    update: {
      daily_goal_value,
      vehicle_goal_quantity,
      product_goal_quantity,
      goal_period,
      notifications_enabled,
      category_goals_active,
      week_start_day,
      week_end_day,
    },
    create: {
      id: "singleton",
      daily_goal_value,
      vehicle_goal_quantity,
      product_goal_quantity,
      goal_period,
      notifications_enabled,
      category_goals_active,
      week_start_day,
      week_end_day,
    },
  });
}

async function detailsCash(id) {
  try {
    const cash = await prisma.cash_register.findUnique({
      where: { id },
      select: {
        id: true,
        opening_date: true,
        closing_date: true,
        status: true,
        operator: true,
        initial_value: true,
        final_value: true,
        general_sale_total: true,
        vehicle_entry_total: true,
        outgoing_expense: true,
        vehicle_transaction: {
          select: {
            id: true,
            vehicle_entries: {
              select: {
                plate: true,
                category: true,
              }
            },
            final_amount: true,
            method: true,

          }
        },
        product_transaction: {
          select: {
            id: true,
            operator: true,
            final_amount: true,
            method: true,
            sale_items: {
              select: {
                product_name: true,
                sold_quantity: true,
                unit_price: true,
              }
            }
          }
        },
        outgoing_expense: {
          select: {
            id: true,
            description: true,
            amount: true,
            method: true,
            operator: true
          }
        },
        _count: {
          select: {
            vehicle_transaction: true,
            product_transaction: true
          }
        }
      }
    })

    return cash

  } catch (error) {
    throw error
  }
}

module.exports = {
  historicService,
  historicCashService,
  secondCopyProduct,
  secondCopyVehicle,
  getTransactionPhoto,
  getGoalConfigService,
  saveGoalConfigService,
  detailsCash
}
