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

    const result = await prisma.cashRegister.findFirst({
      where: {
        openingDate: {
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

  const existingCash = await prisma.cashRegister.findFirst({
    where: {
      openingDate: {
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

  const newCash = await prisma.cashRegister.create({
    data: {
      openingDate: localDateTime.toJSDate(), // armazena em UTC
      operator: user.username,
      initialValue,
      finalValue: initialValue,
      status: 'OPEN',
      closingDate: null,
    },
  });

  console.log("[opencashService] Caixa criado com sucesso:", newCash);
  return newCash;
}

async function closeCashService(id, finalValue, date) {
  const verifyCash = await prisma.cashRegister.findUnique({
    where: { id: id }
  })

  if (!verifyCash) {
    return false
  }

  try {
    const closeCash = await prisma.cashRegister.update({
      where: { id: id },
      data: {
        closingDate: date,
        status: 'CLOSED',
        finalValue: finalValue
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
  const verifyCash = await prisma.cashRegister.findUnique({
    where: { id: id }
  })

  if (!verifyCash) {
    return false
  }

  try {
    const result = await prisma.cashRegister.findFirst({
      where: { id: id }
    })

    return result
  } catch (error) {
    throw error
  }
}

async function BillingMethodService() {
  try {
    const methods = await prisma.billingMethod.findMany({
      select: {
        name: true,
        description: true,
        tolerance: true,
        billingRules: {
          select: {
            billingMethodId: true,
            vehicleType: true,
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

export async function cashDataService(id) {
  try {
    const baseData = await prisma.cashRegister.findFirst({
      where: {
        id,
        status: "OPEN"
      },
      select: {
        initialValue: true,
        finalValue: true,
        outgoingExpenses: true,
        VehicleTransaction: {
          select: {
            paymentMethod: true,
            finalValue: true
          }
        },
        ProductTransaction: {
          select: {
            paymentMethod: true,
            finalAmount: true
          }
        }
      }
    });

    if (!baseData) throw new Error("Caixa não encontrado ou fechado.");

    const sumByPayment = (list, type) => {
      return list
        .filter(t => t.paymentMethod === type)
        .reduce((acc, t) => acc + parseFloat(t.final_amount), 0);
    };

    const totalCash = sumByPayment(baseData.VehicleTransaction, "DINHEIRO") +
                      sumByPayment(baseData.ProductTransaction, "DINHEIRO");

    const totalCredit = sumByPayment(baseData.VehicleTransaction, "CREDITO") +
                        sumByPayment(baseData.ProductTransaction, "CREDITO");

    const totalDebit = sumByPayment(baseData.VehicleTransaction, "DEBITO") +
                       sumByPayment(baseData.ProductTransaction, "DEBITO");

    const totalPix = sumByPayment(baseData.VehicleTransaction, "PIX") +
                     sumByPayment(baseData.ProductTransaction, "PIX");

    const result = {
      initialValue: parseFloat(baseData.initial_value),
      totalCash,
      totalCredit,
      totalDebit,
      totalPix,
      outgoingExpenseTotal: parseFloat(baseData.outgoing_expense_total),
      finalValue: parseFloat(baseData.final_value)
    };

    return result;
  } catch (error) {
    console.error("Erro em cashDataService:", error);
    throw error;
  }
}

module.exports = {
  statusCashService,
  openCashService,
  closeCashService,
  geralCashDataService,
  BillingMethodService,
  cashDataService
}