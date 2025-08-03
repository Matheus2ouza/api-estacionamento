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

async function reopenCashService(cashId) {
  console.log("🔍 Tentando reabrir caixa:", cashId);

  const cash = await prisma.cash_register.findUnique({
    where: { id: cashId },
  });

  if (!cash) {
    console.warn("❌ Caixa não encontrado:", cashId);
    throw new Error("Caixa não encontrado.");
  }

  const now = DateTime.now().setZone("America/Belem");
  const openedAt = DateTime.fromJSDate(cash.opening_date).setZone("America/Belem");

  console.log("🕒 Data atual:", now.toISODate(), "| Caixa aberto em:", openedAt.toISODate());

  const sameDay = now.hasSame(openedAt, "day") &&
                  now.hasSame(openedAt, "month") &&
                  now.hasSame(openedAt, "year");

  if (!sameDay) {
    console.warn("⚠️ Caixa não pertence ao dia atual.");
    throw new Error("Não há caixa aberto para o dia atual.");
  }

  if (cash.closing_date === null) {
    console.warn("⚠️ Caixa já está aberto.");
    throw new Error("O caixa já está aberto.");
  }

  const updated = await prisma.cash_register.update({
    where: { id: cashId },
    data: {
      status: 'OPEN'
    }
  });

  console.log("✅ Caixa reaberto com sucesso:", updated.id);
  return updated;
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

async function OutgoingExpenseService(id) {
  try {
    const verifyCash = await prisma.cash_register.findUnique({
      where: { id }
    });

    // Se o caixa não existir, retorne null
    if (!verifyCash) {
      return null;
    }

    const outgoing = await prisma.outgoing_expense.findMany({
      where: { cash_register_id: verifyCash.id }
    });

    // Mesmo que não tenha despesas, retornamos array vazio
    const outgoingFormatted = outgoing.map(item => ({
      id: item.id,
      amount: item.amount,
      description: item.description,
      operator: item.operator,
      method: item.method,
      date: item.transaction_date.toISOString(),
    }));

    return outgoingFormatted;

  } catch (error) {
    console.error("Erro ao buscar despesas:", error);
    throw error;
  }
}

async function registerOutgoingService(description, amount, method, openCashId, transactionDate, user) {
  const verifyCash = await prisma.cash_register.findUnique({
    where: { id: openCashId },
  });

  if (!verifyCash) {
    throw new Error("Nenhum caixa encontrado");
  }

  try {
    const outgoing = await prisma.outgoing_expense.create({
      data: {
        description: description,
        method: method,
        amount: Number(amount),
        transaction_date: transactionDate,
        cash_register_id: verifyCash.id,
        operator: user.username
      }
    });

    // Atualiza o total no caixa
    await prisma.cash_register.update({
      where: { id: verifyCash.id },
      data: {
        outgoing_expense_total: {
          increment: Number(amount)
        },
        final_value: {
          decrement: Number(amount)
        }
      }
    });

    return outgoing;

  } catch (error) {
    console.error("Erro ao registrar despesa:", error);
    throw error;
  }
}


module.exports = {
  statusCashService,
  openCashService,
  closeCashService,
  reopenCashService,
  geralCashDataService,
  BillingMethodService,
  cashDataService,
  OutgoingExpenseService,
  registerOutgoingService
}