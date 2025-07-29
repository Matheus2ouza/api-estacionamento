const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { DateTime } = require("luxon");

async function statusCashService(date) {
  try {
    // Usa a data no fuso "America/Belem" corretamente
    const local = DateTime.fromJSDate(date, { zone: "America/Belem" });

    const startOfDay = local.startOf("day").toUTC().toJSDate();
    const endOfDay = local.endOf("day").toUTC().toJSDate();

    console.log("Início do dia (UTC):", startOfDay);
    console.log("Fim do dia (UTC):", endOfDay);

    const result = await prisma.cash_register.findFirst({
      where: {
        opening_date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    return result;
  } catch (error) {
    console.error(`[CashService] Erro ao verificar caixa aberto: ${error}`);
    throw error;
  }
}

async function openCashService(user, initialValue, localDateTime) {
  console.log("[opencashService] Data recebida como DateTime:", localDateTime.toISO());

  const startOfDay = localDateTime.startOf('day').toJSDate(); // convertido em UTC
  const endOfDay = localDateTime.endOf('day').toJSDate();

  console.log("[opencashService] Intervalo UTC - startOfDay:", startOfDay);
  console.log("[opencashService] Intervalo UTC - endOfDay:", endOfDay);

  const existingCash = await prisma.cash_register.findFirst({
    where: {
      opening_date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: 'OPEN',
    },
  });

  if (existingCash) {
    console.log("[opencashService] Já existe um caixa aberto:", existingCash);
    return false;
  }

  const newCash = await prisma.cash_register.create({
    data: {
      opening_date: localDateTime.toJSDate(), // armazena em UTC
      operator: user.username,
      initial_value: initialValue,
      final_value: initialValue,
      status: 'OPEN',
      closing_date: null,
    },
  });

  console.log("[opencashService] Caixa criado com sucesso:", newCash);
  return newCash;
}

async function closeCashService(id, finalValue, date) {
  const verifyCash = await prisma.cash_register.findUnique({
    where: { id: id }
  })

  if (!verifyCash) {
    return false
  }

  try {
    const closeCash = await prisma.cash_register.update({
      where: { id: id },
      data: {
        closing_date: date,
        status: 'CLOSED',
        final_value: finalValue
      },
      select: {
        id: true,
        status: true
      }
    })

    return closeCash
  } catch (error) {
    throw error
  }
}

async function geralCashDataService(id) {
  const verifyCash = await prisma.cash_register.findUnique({
    where: { id: id }
  })

  if (!verifyCash) {
    return false
  }

  try {
    const result = await prisma.cash_register.findFirst({
      where: { id: id }
    })

    return result
  } catch (error) {
    throw error
  }
}

async function BillingMethodService() {
  try {
    const methods = await prisma.billing_method.findMany({
      select: {
        name: true,
        description: true,
        tolerance: true,
        billing_rule: {
          select: {
            billing_method_id: true,
            vehicle_type: true,
            price: true
          }
        }
      }
    });

    return methods;
  } catch (error) {
    console.error('Erro ao buscar métodos de cobrança:', error);
    throw error;
  }
}

async function cashDataService(id) {
  try {
    // Busca os dados principais do caixa
    const baseData = await prisma.cash_register.findFirst({
      where: {
        id,
        status: "OPEN"
      },
      select: {
        id: true,
        initial_value: true,
        final_value: true,
        outgoing_expense_total: true
      }
    });

    if (!baseData) throw new Error("Caixa não encontrado ou fechado.");

    // Busca transações de produtos
    const productTransactions = await prisma.product_transaction.findMany({
      where: {cash_register_id: baseData.id },
      select: {
        method: true,
        final_amount: true,
      }
    })

    // Busca transações de veículos
    const vehicleTransactions = await prisma.vehicle_transaction.findMany({
      where: { cash_register_id: baseData.id },
      select: {
        method: true,
        final_amount: true
      }
    });

    // Função de somatório por tipo de pagamento
    const sumByPayment = (list, type) => {
      return list
        .filter(t => t.method === type)
        .reduce((acc, t) => acc + parseFloat(t.final_amount), 0);
    };

    const totalCash = sumByPayment(vehicleTransactions, "DINHEIRO") +
                      sumByPayment(productTransactions, "DINHEIRO");

    const totalCredit = sumByPayment(vehicleTransactions, "CREDITO") +
                        sumByPayment(productTransactions, "CREDITO");

    const totalDebit = sumByPayment(vehicleTransactions, "DEBITO") +
                       sumByPayment(productTransactions, "DEBITO");

    const totalPix = sumByPayment(vehicleTransactions, "PIX") +
                     sumByPayment(productTransactions, "PIX");

    return {
      initialValue: parseFloat(baseData.initial_value),
      totalCash,
      totalCredit,
      totalDebit,
      totalPix,
      outgoingExpenseTotal: parseFloat(baseData.outgoing_expense_total),
      finalValue: parseFloat(baseData.final_value)
    };
  } catch (error) {
    console.error("Erro em cashDataService:", error);
    throw error;
  }
}

async function parkingSpaces() {
  try {
    const parkingConfig = await prisma.patio_configs.findUnique({
      where: { id: 'singleton' },
      select: {
        max_cars: true,
        max_motorcycles: true
      }
    })

    const vehicles = await prisma.vehicle_entries.findMany({
      where: {status: 'INSIDE'},
      select: {
        category: true
      }
    })

    const totalCarsInside = vehicles.filter(v => v.category === 'carro').length;
    const totalMotosInside = vehicles.filter(v => v.category === 'moto').length;

    const carVacancies = Math.max(0, Number(parkingConfig.max_cars) - totalCarsInside);
    const motorcycleVacancies = Math.max(0, Number(parkingConfig.max_motorcycles) - totalMotosInside);

    return {
      carVacancies,
      motorcycleVacancies,
      totalCarsInside,
      totalMotosInside,
    };
  } catch (err) {
    throw err
  }
}

module.exports = {
  statusCashService,
  openCashService,
  closeCashService,
  geralCashDataService,
  BillingMethodService,
  cashDataService,
  parkingSpaces
}