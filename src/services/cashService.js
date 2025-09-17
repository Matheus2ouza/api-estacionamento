const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { DateTime } = require("luxon");

// Estrutura para mensagens
const createMessage = (userMessage, logMessage) => ({
  userMessage,
  logMessage
});

async function statusCashService(date) {
  try {
    console.log("[CashService] Iniciando verificação de status do caixa");
    console.log("[CashService] Data recebida:", date);

    // Usa a data no fuso "America/Belem" corretamente
    const local = DateTime.fromJSDate(date, { zone: "America/Belem" });
    console.log("[CashService] Data convertida para fuso Belém:", local.toISO());

    const startOfDay = local.startOf("day").toUTC().toJSDate();
    const endOfDay = local.endOf("day").toUTC().toJSDate();
    console.log("[CashService] Intervalo de busca - Início:", startOfDay, "Fim:", endOfDay);

    const result = await prisma.cashRegister.findFirst({
      where: {
        openingDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        id: true,
        status: true,
        operator: true,
        openingDate: true,
      }
    });

    console.log("[CashService] Resultado da busca no banco:", result);

    // Se não encontrou nenhum caixa para o dia
    if (!result) {
      console.log("[CashService] Nenhum caixa encontrado para o dia - retornando not_created");
      return {
        cashStatus: 'not_created',
        cash: null
      };
    }

    // Se encontrou um caixa, retorna o status baseado no campo status
    const cashStatus = result.status === 'OPEN' ? 'open' : 'closed';
    console.log("[CashService] Caixa encontrado com status:", result.status, "-> cashStatus:", cashStatus);

    // Sempre retorna os dados do caixa quando ele existe (aberto ou fechado)
    const response = {
      cashStatus,
      cash: {
        id: result.id,
        operator: result.operator,
        status: result.status,
        opening_date: result.openingDate.toISOString()
      }
    };

    console.log("[CashService] Resposta final do service:", JSON.stringify(response, null, 2));
    return response;
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
      initialValue: initialValue,
      finalValue: initialValue,
      status: 'OPEN',
      closingDate: null,
    },
    select: {
      id: true,
      status: true,
      operator: true,
      openingDate: true,
    }
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
    const closeCash = await prisma.cashRegister.update({
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
  try {
    console.log("[reopenCashService] Tentando reabrir caixa:", cashId);

  const cash = await prisma.cashRegister.findUnique({
    where: { id: cashId },
  });

    if (!cash) {
      console.log("[reopenCashService] Caixa não encontrado:", cashId);
      return false;
    }

    const now = DateTime.now().setZone("America/Belem");
    const openedAt = DateTime.fromJSDate(cash.opening_date).setZone("America/Belem");

    console.log("[reopenCashService] Data atual:", now.toISODate(), "| Caixa aberto em:", openedAt.toISODate());

    const sameDay = now.hasSame(openedAt, "day") &&
      now.hasSame(openedAt, "month") &&
      now.hasSame(openedAt, "year");

    if (!sameDay) {
      console.log("[reopenCashService] Caixa não pertence ao dia atual.");
      return false;
    }

    if (cash.status === 'OPEN') {
      console.log("[reopenCashService] Caixa já está aberto.");
      return false;
    }
    
    const updated = await prisma.cash_register.update({
      where: { id: cashId },
      data: {
        status: 'OPEN',
        closing_date: null
      },
      select: {
        id: true,
        status: true,
        operator: true,
        opening_date: true,
      }
    });

    console.log("[reopenCashService] Caixa reaberto com sucesso:", updated);
    return updated;
  } catch (error) {
    console.error("[reopenCashService] Erro ao reabrir caixa:", error);
    throw error;
  }
}

async function geralCashDataService(id) {
  const verifyCash = await prisma.cashRegister.findUnique({
    where: { id: id }
  })
  
async function saveBillingMethodService({ title, description, category, tolerance, timeMinutes, carroValue, motoValue }) {

  try {
    
    const result = await prisma.billingMethod.create({
      data: {
        title,
        description,
        category,
        tolerance,
        timeMinutes: timeMinutes,
        carroValue,
        motoValue
      },
      select: {
        id: true,
        isActive: true
      }
    })

    return result;
  } catch (error) {
    throw error;
  }
}

async function listBillingMethodService() {
  try {
    const methods = await prisma.billingMethod.findMany({
      select: {
        id: true,
        title: true,
        category: true,
        isActive: true,
        tolerance: true,
        timeMinutes: true,
        carroValue: true,
        motoValue: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return methods
  } catch (error) {
    console.error('Erro ao buscar métodos de cobrança:', error);
    throw error;
  }
}

async function deleteBillingMethodService(id, user) {
  try {
    const method = await prisma.billingMethod.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
        updatedBy: user.username
      }
    })

    return method
  } catch (error) {
    throw error
  }
}

async function updateBillingMethodService(id, user) {
  try {
    const method = await prisma.billingMethod.update({
      where: { id },
      data: {
        isActive: true,
        updatedAt: new Date(),
        updatedBy: user.username
      }
    })

    return method
  } catch (error) {
    throw error
  }
}

async function updateBillingMethodPutService(id, user, { title, description, category, tolerance, timeMinutes, carroValue, motoValue }) {
  try {
    const method = await prisma.billingMethod.update({
      where: { id },
      data: {
        title,
        description,
        category,
        tolerance,
        timeMinutes,
        carroValue,
        motoValue,
        updatedAt: new Date(),
        updatedBy: user.username
      }
    })

    return method
  } catch (error) {
    throw error
  }
}

async function cashDataService(id) {
  try {
    // Busca os dados principais do caixa
    const baseData = await prisma.cashRegister.findFirst({
      where: {
        id: id,
      },
      select: {
        id: true,
        initialValue: true,
        finalValue: true,
        outgoingExpenseTotal: true
      }
    });

    console.log("[cashDataService] Dados principais do caixa:", baseData);

    if (!baseData) throw new Error("Caixa não encontrado ou fechado.");

    // Busca transações de produtos
    const productTransactions = await prisma.productTransaction.findMany({

      where: { cashRegisterId: baseData.id },
      select: {
        method: true,
        finalAmount: true,
      }
    })

    // Busca transações de veículos
    const vehicleTransactions = await prisma.vehicleTransaction.findMany({

      where: { cashRegisterId: baseData.id },
      select: {
        method: true,
        finalAmount: true
      }
    });

    // Função de somatório por tipo de pagamento
    const sumByPayment = (list, type) => {
      return list
        .filter(t => t.method === type)
        .reduce((acc, t) => acc + parseFloat(t.finalAmount), 0);
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
      initialValue: parseFloat(baseData.initialValue),
      totalCash,
      totalCredit,
      totalDebit,
      totalPix,
      outgoingExpenseTotal: parseFloat(baseData.outgoingExpenseTotal),
      finalValue: parseFloat(baseData.finalValue)
    };
  } catch (error) {
    console.error("Erro em cashDataService:", error);
    throw error;
  }
}

async function OutgoingExpenseService(id) {
  try {
    const verifyCash = await prisma.cashRegister.findUnique({
      where: { id }
    });

    // Se o caixa não existir, retorne null
    if (!verifyCash) {
      return null;
    }

    const outgoing = await prisma.outgoingExpense.findMany({
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
  const verifyCash = await prisma.cashRegister.findUnique({
    where: { id: openCashId },
  });

  if (!verifyCash) {
    throw new Error("Nenhum caixa encontrado");
  }

  try {
    const outgoing = await prisma.outgoingExpense.create({
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
    await prisma.cashRegister.update({
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

async function generalCashDataService(cashId) {
  try {
    const cash = await prisma.cashRegister.findUnique({
      where: { id: cashId },
      select: {
        id: true,
        initialValue: true,
        finalValue: true,
        operator: true,
        openingDate: true,
        closingDate: true,
        status: true,
        vehicleEntryTotal: true,
        generalSaleTotal: true,
        outgoingExpenseTotal: true,
      }
    })

    if (!cash) {
      const message = createMessage(
        'Caixa não encontrado',
        '[cashService] Tentativa de buscar dados gerais do caixa, mas caixa não encontrado'
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    // Dados gerais do caixa
    const generalDetails = {
      initialValue: parseFloat(cash.initialValue),
      finalValue: parseFloat(cash.finalValue),
      operator: cash.operator,
      openingDate: cash.openingDate.toISOString(),
      closingDate: cash.closingDate ? cash.closingDate.toISOString() : null,
      status: cash.status
    }

    // Dados dos veículos
    const vehicleTransactions = await prisma.vehicleTransaction.findMany({
      where: { cashRegisterId: cashId },
      select: {
        finalAmount: true,
        method: true,
      }
    })

    const vehicleEntries = await prisma.vehicleEntries.findMany({
      where: { cashRegisterId: cashId, status: { in: ["INSIDE", "EXITED"] } },
      select: {
        status: true,
      }
    })

    const exitVehicles = vehicleEntries.filter(v => v.status === 'EXITED').length;
    const inVehicles = vehicleEntries.filter(v => v.status === 'INSIDE').length;

    const amountTotal = vehicleTransactions.reduce((sum, t) => sum + parseFloat(t.finalAmount), 0);
    const amountCash = vehicleTransactions.filter(t => t.method === 'DINHEIRO').reduce((sum, t) => sum + parseFloat(t.finalAmount), 0);
    const amountCredit = vehicleTransactions.filter(t => t.method === 'CREDITO').reduce((sum, t) => sum + parseFloat(t.finalAmount), 0);
    const amountDebit = vehicleTransactions.filter(t => t.method === 'DEBITO').reduce((sum, t) => sum + parseFloat(t.finalAmount), 0);
    const amountPix = vehicleTransactions.filter(t => t.method === 'PIX').reduce((sum, t) => sum + parseFloat(t.finalAmount), 0);

    const vehicleDetails = {
      exitVehicle: exitVehicles,
      inVehicle: inVehicles,
      amountTotal: amountTotal,
      amountCash: amountCash,
      amountCredit: amountCredit,
      amountDebit: amountDebit,
      amountPix: amountPix
    }

    // Dados dos produtos
    const productTransactions = await prisma.productTransaction.findMany({
      where: { cashRegisterId: cashId },
      select: {
        finalAmount: true,
        method: true,
        saleItems: {
          select: {
            productName: true,
            soldQuantity: true,
            unitPrice: true,
          }
        },
      }
    })

    const amountSold = productTransactions.reduce((sum, t) => sum + parseFloat(t.finalAmount), 0);

    // Produto mais vendido
    const productCounts = {};
    productTransactions.forEach(transaction => {
      transaction.saleItems.forEach(item => {
        if (productCounts[item.productName]) {
          productCounts[item.productName] += item.soldQuantity;
        } else {
          productCounts[item.productName] = item.soldQuantity;
        }
      });
    });

    const productMostSold = Object.keys(productCounts).reduce((a, b) =>
      productCounts[a] > productCounts[b] ? a : b, 'Nenhum produto vendido'
    );

    const amountSoldInCash = productTransactions.filter(t => t.method === 'DINHEIRO').reduce((sum, t) => sum + parseFloat(t.finalAmount), 0);
    const amountSoldInPix = productTransactions.filter(t => t.method === 'PIX').reduce((sum, t) => sum + parseFloat(t.finalAmount), 0);
    const amountSoldInDebit = productTransactions.filter(t => t.method === 'DEBITO').reduce((sum, t) => sum + parseFloat(t.finalAmount), 0);
    const amountSoldInCredit = productTransactions.filter(t => t.method === 'CREDITO').reduce((sum, t) => sum + parseFloat(t.finalAmount), 0);

    const productDetails = {
      amountTotal: amountSold,
      amountSold: amountSold,
      productMostSold: productMostSold,
      amountSoldInCash: amountSoldInCash,
      amountSoldInPix: amountSoldInPix,
      amountSoldInDebit: amountSoldInDebit,
      amountSoldInCredit: amountSoldInCredit
    }

    // Dados das despesas
    const outgoingExpenses = await prisma.outgoingExpense.findMany({
      where: { cashRegisterId: cashId },
      select: {
        description: true,
        amount: true,
        method: true,
        transactionDate: true,
      },
      orderBy: { transactionDate: 'desc' }
    })

    const amountTotalExpenses = outgoingExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const outputQuantity = outgoingExpenses.length;

    const outputMostSold = outgoingExpenses.reduce((max, expense) =>
      parseFloat(expense.amount) > parseFloat(max.amount) ? expense : max,
      { description: 'Nenhuma despesa', amount: 0 }
    ).description;

    const outputLast = outgoingExpenses.length > 0 ? outgoingExpenses[0].description : 'Nenhuma despesa';
    const outputLastAmount = outgoingExpenses.length > 0 ? parseFloat(outgoingExpenses[0].amount) : 0;

    const outputCredit = outgoingExpenses.filter(e => e.method === 'CREDITO').reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const outputDebit = outgoingExpenses.filter(e => e.method === 'DEBITO').reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const outputPix = outgoingExpenses.filter(e => e.method === 'PIX').reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const outputCash = outgoingExpenses.filter(e => e.method === 'DINHEIRO').reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const outgoingExpenseDetails = {
      amountTotal: amountTotalExpenses,
      outputQuantity: outputQuantity,
      outputMostSold: outputMostSold,
      outputLast: outputLast,
      outputLastAmount: outputLastAmount,
      outputCredit: outputCredit,
      outputDebit: outputDebit,
      outputPix: outputPix,
      outputCash: outputCash
    }

    return {
      generalDetails,
      vehicleDetails,
      productDetails,
      outgoingExpenseDetails
    }
  } catch (error) {
    console.error("Erro ao buscar dados gerais do caixa:", error);
    throw error;
  }
}

module.exports = {
  statusCashService,
  openCashService,
  closeCashService,
  reopenCashService,
  saveBillingMethodService,
  listBillingMethodService,
  deleteBillingMethodService,
  updateBillingMethodService,
  updateBillingMethodPutService,
  cashDataService,
  registerOutgoingService,
  generalCashDataService
}
