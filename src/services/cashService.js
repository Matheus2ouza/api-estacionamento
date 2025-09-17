const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { DateTime } = require("luxon");
const { formatBelemTime, getCurrentBelemTime } = require('../utils/timeConverter');

// Estrutura para mensagens
const createMessage = (userMessage, logMessage) => ({
  userMessage,
  logMessage
});

async function statusCashService(date) {
  try {

    // Usa a data no fuso "America/Belem" corretamente
    const local = DateTime.fromJSDate(date, { zone: "America/Belem" });

    const startOfDay = local.startOf("day").toUTC().toJSDate();
    const endOfDay = local.endOf("day").toUTC().toJSDate();

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
        closingDate: true,
      }
    });


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

    // Sempre retorna os dados do caixa quando ele existe (aberto ou fechado)
    const response = {
      cashStatus,
      cash: {
        id: result.id,
        operator: result.operator,
        status: result.status,
        opening_date: result.openingDate.toISOString(),
        closing_date: result.closingDate ? result.closingDate.toISOString() : null
      }
    };

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

async function closeCashService(id, date) {
  try {
    // 1) Verifica se o caixa existe e está aberto
    const cash = await prisma.cashRegister.findFirst({
      where: { id, status: 'OPEN' },
      select: { id: true }
    });

    if (!cash) {
      const message = createMessage(
        'Caixa não encontrado',
        '[cashService] Tentativa de fechar caixa, mas caixa não encontrado'
      )
      console.warn(message.logMessage);
      return false;
    }

    // 2) Verifica veículos ainda no pátio
    const insideCount = await prisma.vehicleEntries.count({
      where: { cashRegisterId: id, status: 'INSIDE' },
    });

    // 3) Se houver, atualiza um a um (status e descrição)
    if (insideCount > 0) {
      const insideVehicles = await prisma.vehicleEntries.findMany({
        where: { cashRegisterId: id, status: 'INSIDE' },
        select: { id: true, description: true }
      });

      const now = date instanceof Date ? date : new Date(date || Date.now());
      const formatted = now.toLocaleString('pt-BR');

      for (const entry of insideVehicles) {
        const updatedDescription = `${entry.description || ''}\nVeículo removido pelo sistema em ${formatted}`.trim();
        await prisma.vehicleEntries.update({
          where: { id: entry.id },
          data: {
            status: 'SYSTEM_DELETED',
            description: updatedDescription
          }
        });
      }
    }

    // 4) Fecha o caixa
    const closingDate = date instanceof Date ? date : new Date(date || Date.now());
    const updatedCash = await prisma.cashRegister.update({
      where: { id },

      data: {
        status: 'CLOSED',
        closingDate: closingDate
      },
      select: {
        id: true,
        status: true,
        closingDate: true
      }
    });

    return updatedCash;
  } catch (error) {
    console.error('[closeCashService] Erro ao fechar caixa:', error);
    throw error;
  }
}

async function reopenCashService(cashId) {
  try {
    console.log("[reopenCashService] Tentando reabrir caixa:", cashId);

    const cash = await prisma.cashRegister.findUnique({
      where: { id: cashId, status: 'CLOSED' },
    });

    if (!cash) {
      const message = createMessage(
        'Caixa não encontrado',
        '[cashService] Tentativa de reabrir caixa, mas caixa não encontrado'
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    const updatedCash = await prisma.cashRegister.update({
      where: { id: cashId },
      data: { status: 'OPEN', closingDate: null },
      select: {
        id: true,
        status: true
      }
    });

    return updatedCash;
  } catch (error) {
    console.error("[reopenCashService] Erro ao reabrir caixa:", error);
    throw error;
  }
}

async function updateCashService(cashId, initialValue) {
  try {
    const cash = await prisma.cashRegister.findUnique({
      where: { id: cashId }
    });

    if (!cash) {
      const message = createMessage(
        'Caixa não encontrado',
        '[cashService] Tentativa de atualizar valor inicial do caixa, mas caixa não encontrado'
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    const difference = initialValue - cash.initialValue;

    const updatedCash = await prisma.cashRegister.update({
      where: { id: cashId },
      data: {
        initialValue: initialValue, finalValue: {
          increment: difference
        }
      },
      select: {
        id: true,
        initialValue: true,
      }
    });

    return updatedCash;
  } catch (error) {
    throw error;
  }
}

async function generalCashDataService(cashId) {
  try {
    // 1. Buscar dados gerais do caixa
    const cashRegister = await prisma.cashRegister.findUnique({
      where: { id: cashId },
      include: {
        vehicleEntries: {
          where: { deletedAt: null }
        },
        vehicleTransaction: true,
        productTransaction: {
          include: {
            saleItems: true
          }
        },
        outgoingExpense: true
      }
    });

    if (!cashRegister) {
      throw new Error("Caixa não encontrado");
    }

    // 2. Calcular dados de veículos
    const exitVehicles = cashRegister.vehicleEntries.filter(vehicle => vehicle.status === 'EXITED');
    const inVehicles = cashRegister.vehicleEntries.filter(vehicle => vehicle.status === 'INSIDE');

    const vehicleAmounts = {
      cash: 0,
      credit: 0,
      debit: 0,
      pix: 0,
      total: 0
    };

    cashRegister.vehicleTransaction.forEach(transaction => {
      vehicleAmounts.total += Number(transaction.finalAmount);
      switch (transaction.method) {
        case 'DINHEIRO':
          vehicleAmounts.cash += Number(transaction.finalAmount);
          break;
        case 'CREDITO':
          vehicleAmounts.credit += Number(transaction.finalAmount);
          break;
        case 'DEBITO':
          vehicleAmounts.debit += Number(transaction.finalAmount);
          break;
        case 'PIX':
          vehicleAmounts.pix += Number(transaction.finalAmount);
          break;
      }
    });

    // 3. Calcular dados de produtos
    const productAmounts = {
      cash: 0,
      credit: 0,
      debit: 0,
      pix: 0,
      total: 0
    };

    let totalProductsSold = 0;
    const productSales = {};

    cashRegister.productTransaction.forEach(transaction => {
      productAmounts.total += Number(transaction.finalAmount);
      totalProductsSold += transaction.saleItems.reduce((sum, item) => sum + item.soldQuantity, 0);

      // Contar vendas por produto
      transaction.saleItems.forEach(item => {
        if (productSales[item.productName]) {
          productSales[item.productName] += item.soldQuantity;
        } else {
          productSales[item.productName] = item.soldQuantity;
        }
      });

      switch (transaction.method) {
        case 'DINHEIRO':
          productAmounts.cash += Number(transaction.finalAmount);
          break;
        case 'CREDITO':
          productAmounts.credit += Number(transaction.finalAmount);
          break;
        case 'DEBITO':
          productAmounts.debit += Number(transaction.finalAmount);
          break;
        case 'PIX':
          productAmounts.pix += Number(transaction.finalAmount);
          break;
      }
    });

    // Produto mais vendido
    const mostSoldProduct = Object.keys(productSales).reduce((a, b) =>
      productSales[a] > productSales[b] ? a : b, Object.keys(productSales)[0] || "Nenhum"
    );

    // 4. Calcular dados de despesas
    const expenseAmounts = {
      cash: 0,
      credit: 0,
      debit: 0,
      pix: 0,
      total: 0
    };

    const expenseDescriptions = [];
    let highestExpense = { description: "Nenhuma", amount: 0 };

    cashRegister.outgoingExpense.forEach(expense => {
      const amount = Number(expense.amount);
      expenseAmounts.total += amount;
      expenseDescriptions.push(expense.description);

      if (amount > highestExpense.amount) {
        highestExpense = { description: expense.description, amount: amount };
      }

      switch (expense.method) {
        case 'DINHEIRO':
          expenseAmounts.cash += amount;
          break;
        case 'CREDITO':
          expenseAmounts.credit += amount;
          break;
        case 'DEBITO':
          expenseAmounts.debit += amount;
          break;
        case 'PIX':
          expenseAmounts.pix += amount;
          break;
      }
    });

    // Última despesa
    const lastExpense = cashRegister.outgoingExpense
      .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))[0];

    // 5. Montar resposta
    return {
      generalDetails: {
        initialValue: Number(cashRegister.initialValue),
        finalValue: Number(cashRegister.finalValue)
      },
      vehicleDetails: {
        exitVehicle: exitVehicles.length,
        inVehicle: inVehicles.length,
        amountTotal: vehicleAmounts.total,
        amountCash: vehicleAmounts.cash,
        amountCredit: vehicleAmounts.credit,
        amountDebit: vehicleAmounts.debit,
        amountPix: vehicleAmounts.pix
      },
      productDetails: {
        amountTotal: productAmounts.total,
        amountSold: totalProductsSold,
        productMostSold: mostSoldProduct,
        amountSoldInCash: productAmounts.cash,
        amountSoldInPix: productAmounts.pix,
        amountSoldInDebit: productAmounts.debit,
        amountSoldInCredit: productAmounts.credit
      },
      outgoingExpenseDetails: {
        amountTotal: expenseAmounts.total,
        outputQuantity: cashRegister.outgoingExpense.length,
        outputMostSold: highestExpense.description,
        outputLast: lastExpense ? lastExpense.description : "Nenhuma",
        outputLastAmount: lastExpense ? Number(lastExpense.amount) : 0,
        outputCredit: expenseAmounts.credit,
        outputDebit: expenseAmounts.debit,
        outputPix: expenseAmounts.pix,
        outputCash: expenseAmounts.cash
      }
    };

  } catch (error) {
    console.error(`[cashService] Erro ao buscar dados gerais do caixa: ${error.message}`);
    throw error;
  }
}

async function cashHistoryService(cashId) {
  try {
    const cash = await prisma.cashRegister.findUnique({
      where: { id: cashId },
      select: {
        vehicleTransaction: {
          select: {
            id: true,
            operator: true,
            vehicleEntries: {
              select: {
                plate: true,
                category: true,
                entryTime: true,
                exitTime: true,
                status: true,
              }
            },
            amountReceived: true,
            changeGiven: true,
            discountAmount: true,
            finalAmount: true,
            originalAmount: true,
            method: true,
          },
        },
        productTransaction: {
          select: {
            id: true,
            operator: true,
            saleItems: {
              select: {
                productName: true,
                soldQuantity: true,
                unitPrice: true,
              }
            },
            amountReceived: true,
            changeGiven: true,
            discountAmount: true,
            finalAmount: true,
            originalAmount: true,
            method: true,
          },
        },
        outgoingExpense: {
          select: {
            id: true,
            description: true,
            amount: true,
            transactionDate: true,
            operator: true,
            method: true,
          }
        }
      }
    })

    // Count das transações
    const [vehicleCount, productCount, expenseCount] = await Promise.all([
      prisma.vehicleTransaction.count({
        where: { cashRegisterId: cashId }
      }),
      prisma.productTransaction.count({
        where: { cashRegisterId: cashId }
      }),
      prisma.outgoingExpense.count({
        where: { cashRegisterId: cashId }
      })
    ]);

    const counts = {
      vehicleTransactions: vehicleCount,
      productTransactions: productCount,
      expenseTransactions: expenseCount
    };

    return { ...cash, counts };
  } catch (error) {
    console.error(`[cashService] Erro ao buscar histórico do caixa: ${error.message}`);
    throw error;
  }
}

async function generalCashHistoryService(user, cursor = null, limit = 10) {
  console.log(`[cashService] Iniciando busca de histórico geral - User: ${user.username}, Role: ${user.role}, Cursor: ${cursor}, Limit: ${limit}`);

  try {
    const isManagerOrAbove = user.role === 'MANAGER' || user.role === 'ADMIN';
    console.log(`[cashService] Usuário tem permissão para ver valores: ${isManagerOrAbove}`);

    // Configurar filtros baseados no role
    const vehicleSelect = isManagerOrAbove ? {
      id: true,
      operator: true,
      transactionDate: true,
      amountReceived: true,
      changeGiven: true,
      discountAmount: true,
      finalAmount: true,
      originalAmount: true,
      method: true,
      photoType: true, // Apenas o tipo, não a foto
      vehicleEntries: {
        select: {
          plate: true,
          category: true,
          entryTime: true,
          exitTime: true,
          status: true,
          description: true,
          observation: true
        }
      }
    } : {
      id: true,
      operator: true,
      transactionDate: true,
      method: true,
      vehicleEntries: {
        select: {
          plate: true,
          category: true,
          entryTime: true,
          exitTime: true,
          status: true,
          description: true,
          observation: true
        }
      }
    };

    const productSelect = isManagerOrAbove ? {
      id: true,
      operator: true,
      transactionDate: true,
      originalAmount: true,
      discountAmount: true,
      finalAmount: true,
      amountReceived: true,
      changeGiven: true,
      method: true,
      photoType: true, // Apenas o tipo, não a foto
      saleItems: {
        select: {
          productName: true,
          soldQuantity: true,
          unitPrice: true,
          expirationDate: true
        }
      }
    } : {
      id: true,
      operator: true,
      transactionDate: true,
      method: true,
      saleItems: {
        select: {
          productName: true,
          soldQuantity: true,
          expirationDate: true
        }
      }
    };

    const expenseSelect = isManagerOrAbove ? {
      id: true,
      description: true,
      amount: true,
      transactionDate: true,
      operator: true,
      method: true
    } : {
      id: true,
      description: true,
      transactionDate: true,
      operator: true,
      method: true
    };

    // Buscar todas as transações misturadas com paginação
    const allTransactions = [];
    let nextCursor = null;
    let hasNextPage = false;

    // Buscar transações de veículos
    const vehicleWhere = cursor ? {
      transactionDate: {
        lt: new Date(cursor)
      }
    } : {};

    const vehicleTransactions = await prisma.vehicleTransaction.findMany({
      where: {
        ...vehicleWhere,
        vehicleEntries: {
          status: {
            not: 'SYSTEM_DELETED'
          }
        }
      },
      select: {
        ...vehicleSelect,
        transactionDate: true,
        cashRegister: {
          select: {
            id: true,
            openingDate: true,
            closingDate: true,
            status: true,
            operator: true,
            initialValue: isManagerOrAbove,
            finalValue: isManagerOrAbove,
            generalSaleTotal: isManagerOrAbove,
            vehicleEntryTotal: isManagerOrAbove,
            outgoingExpenseTotal: isManagerOrAbove
          }
        }
      },
      orderBy: {
        transactionDate: 'desc'
      },
      take: Math.ceil(limit / 3) + 1 // +1 para verificar se há mais
    });

    // Buscar transações de produtos
    const productTransactions = await prisma.productTransaction.findMany({
      where: vehicleWhere, // Mesmo filtro de data
      select: {
        ...productSelect,
        transactionDate: true,
        cashRegister: {
          select: {
            id: true,
            openingDate: true,
            closingDate: true,
            status: true,
            operator: true,
            initialValue: isManagerOrAbove,
            finalValue: isManagerOrAbove,
            generalSaleTotal: isManagerOrAbove,
            vehicleEntryTotal: isManagerOrAbove,
            outgoingExpenseTotal: isManagerOrAbove
          }
        }
      },
      orderBy: {
        transactionDate: 'desc'
      },
      take: Math.ceil(limit / 3) + 1
    });

    // Buscar despesas
    const expenses = await prisma.outgoingExpense.findMany({
      where: vehicleWhere, // Mesmo filtro de data
      select: {
        ...expenseSelect,
        transactionDate: true,
        cashRegister: {
          select: {
            id: true,
            openingDate: true,
            closingDate: true,
            status: true,
            operator: true,
            initialValue: isManagerOrAbove,
            finalValue: isManagerOrAbove,
            generalSaleTotal: isManagerOrAbove,
            vehicleEntryTotal: isManagerOrAbove,
            outgoingExpenseTotal: isManagerOrAbove
          }
        }
      },
      orderBy: {
        transactionDate: 'desc'
      },
      take: Math.ceil(limit / 3) + 1
    });

    console.log(`[cashService] Encontradas ${vehicleTransactions.length} transações de veículos, ${productTransactions.length} de produtos, ${expenses.length} despesas`);

    // Adicionar tipo às transações
    vehicleTransactions.forEach(transaction => {
      allTransactions.push({
        type: 'vehicle',
        transactionDate: transaction.transactionDate,
        data: transaction,
        cashRegister: transaction.cashRegister
      });
    });

    productTransactions.forEach(transaction => {
      allTransactions.push({
        type: 'product',
        transactionDate: transaction.transactionDate,
        data: transaction,
        cashRegister: transaction.cashRegister
      });
    });

    expenses.forEach(expense => {
      allTransactions.push({
        type: 'expense',
        transactionDate: expense.transactionDate,
        data: expense,
        cashRegister: expense.cashRegister
      });
    });

    // Ordenar todas as transações por data (mais novo para mais velho)
    allTransactions.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

    // Aplicar limite e verificar se há próxima página
    const limitedTransactions = allTransactions.slice(0, limit);
    hasNextPage = allTransactions.length > limit;

    if (hasNextPage && limitedTransactions.length > 0) {
      nextCursor = limitedTransactions[limitedTransactions.length - 1].transactionDate.toISOString();
    }

    // Agrupar por caixa para manter a estrutura original
    const cashRegistersMap = new Map();

    limitedTransactions.forEach(item => {
      const cashId = item.cashRegister.id;

      if (!cashRegistersMap.has(cashId)) {
        cashRegistersMap.set(cashId, {
          ...item.cashRegister,
          vehicleTransaction: [],
          productTransaction: [],
          outgoingExpense: []
        });
      }

      const cashRegister = cashRegistersMap.get(cashId);

      switch (item.type) {
        case 'vehicle':
          cashRegister.vehicleTransaction.push(item.data);
          break;
        case 'product':
          cashRegister.productTransaction.push(item.data);
          break;
        case 'expense':
          cashRegister.outgoingExpense.push(item.data);
          break;
      }
    });

    const cashRegisters = Array.from(cashRegistersMap.values());

    // Contar totais
    const totalCounts = await Promise.all([
      prisma.cashRegister.count(),
      prisma.vehicleTransaction.count(),
      prisma.productTransaction.count(),
      prisma.outgoingExpense.count()
    ]);

    const result = {
      cashRegisters: cashRegisters,
      pagination: {
        hasNextPage,
        nextCursor,
        limit,
        totalCashRegisters: totalCounts[0],
        totalVehicleTransactions: totalCounts[1],
        totalProductTransactions: totalCounts[2],
        totalExpenses: totalCounts[3]
      },
      userPermissions: {
        role: user.role,
        canViewValues: isManagerOrAbove,
        canViewPhotos: false // Nunca retornar fotos, apenas photoType
      }
    };

    console.log(`[cashService] Histórico geral retornado com sucesso - ${cashRegisters.length} caixas, ${limitedTransactions.length} transações, próxima página: ${hasNextPage}`);
    return result;

  } catch (error) {
    console.error(`[cashService] Erro ao buscar histórico geral: ${error.message}`);
    throw error;
  }
}

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

async function deleteProductTransactionService(cashId, transactionId) {
  console.log(`[cashService] Iniciando exclusão de transação de produto - CashId: ${cashId}, TransactionId: ${transactionId}`);

  try {
    // 1. Validar se o caixa existe
    console.log(`[cashService] Verificando se caixa existe: ${cashId}`);
    const verifyCash = await prisma.cashRegister.findUnique({
      where: { id: cashId },
    });

    if (!verifyCash) {
      const message = createMessage(
        "Nenhum caixa encontrado",
        `[cashService] Tentativa de deletar transação de produto em caixa não encontrado: ${cashId}`
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }
    console.log(`[cashService] Caixa encontrado: ${verifyCash.id}`);

    // 2. Validar se a transação de produto existe
    console.log(`[cashService] Verificando se transação de produto existe: ${transactionId}`);
    const verifyTransaction = await prisma.productTransaction.findUnique({
      where: { id: transactionId },
      include: {
        saleItems: true
      }
    });

    if (!verifyTransaction) {
      const message = createMessage(
        "Transação de produto não encontrada",
        `[cashService] Tentativa de deletar transação de produto não encontrada: ${transactionId}`
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }
    console.log(`[cashService] Transação encontrada - Valor: R$ ${verifyTransaction.finalAmount}, Itens: ${verifyTransaction.saleItems.length}`);

    // 3. Validar se a transação pertence ao caixa
    if (verifyTransaction.cashRegisterId !== cashId) {
      const message = createMessage(
        "Transação não pertence ao caixa especificado",
        `[cashService] Tentativa de deletar transação ${transactionId} que pertence ao caixa ${verifyTransaction.cashRegisterId} usando cashId ${cashId}`
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }
    console.log(`[cashService] Validação de pertencimento ao caixa: OK`);

    // 4. Executar transação: deletar transação, saleItems, restaurar estoque e atualizar caixa
    console.log(`[cashService] Iniciando transação para exclusão da transação de produto`);
    const result = await prisma.$transaction(async (tx) => {
      // Restaurar quantidade de produtos no estoque
      console.log(`[cashService] Restaurando estoque para ${verifyTransaction.saleItems.length} itens`);
      for (const saleItem of verifyTransaction.saleItems) {
        if (saleItem.productId) {
          console.log(`[cashService] Restaurando ${saleItem.soldQuantity} unidades do produto: ${saleItem.productName}`);
          // Buscar o produto no GeneralSale para restaurar a quantidade
          const generalSale = await tx.generalSale.findUnique({
            where: { productId: saleItem.productId }
          });

          if (generalSale) {
            await tx.generalSale.update({
              where: { productId: saleItem.productId },
              data: {
                quantity: {
                  increment: saleItem.soldQuantity
                }
              }
            });
            console.log(`[cashService] Estoque restaurado para produto ${saleItem.productName}`);
          } else {
            console.warn(`[cashService] GeneralSale não encontrado para produto: ${saleItem.productId}`);
          }
        }
      }

      // Deletar saleItems
      console.log(`[cashService] Deletando saleItems da transação`);
      await tx.saleItems.deleteMany({
        where: { productTransactionId: transactionId }
      });

      // Deletar a transação de produto
      console.log(`[cashService] Deletando transação de produto: ${transactionId}`);
      await tx.productTransaction.delete({
        where: { id: transactionId }
      });

      // Atualizar o caixa
      console.log(`[cashService] Atualizando caixa - removendo R$ ${verifyTransaction.finalAmount} dos totais`);
      await tx.cashRegister.update({
        where: { id: cashId },
        data: {
          generalSaleTotal: {
            decrement: Number(verifyTransaction.finalAmount)
          },
          finalValue: {
            decrement: Number(verifyTransaction.finalAmount)
          }
        }
      });

      console.log(`[cashService] Transação de produto deletada com sucesso`);
      return { success: true };
    });

    console.log(`[cashService] Transação concluída com sucesso`);
    return result;

  } catch (error) {
    console.error(`[cashService] Erro ao deletar transação de produto: ${error.message}`);
    throw error;
  }
}

async function deleteVehicleTransactionService(cashId, transactionId, permanent) {
  console.log(`[cashService] Iniciando exclusão de transação de veículo - CashId: ${cashId}, TransactionId: ${transactionId}, Permanent: ${permanent}`);

  try {
    // 1. Validar se o caixa existe
    console.log(`[cashService] Verificando se caixa existe: ${cashId}`);
    const verifyCash = await prisma.cashRegister.findUnique({
      where: { id: cashId },
    });

    if (!verifyCash) {
      const message = createMessage(
        "Nenhum caixa encontrado",
        `[cashService] Tentativa de deletar transação de veículo em caixa não encontrado: ${cashId}`
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }
    console.log(`[cashService] Caixa encontrado: ${verifyCash.id}`);

    // 2. Validar se a transação de veículo existe
    console.log(`[cashService] Verificando se transação de veículo existe: ${transactionId}`);
    const verifyTransaction = await prisma.vehicleTransaction.findUnique({
      where: { id: transactionId },
      include: {
        vehicleEntries: true
      }
    });

    if (!verifyTransaction) {
      const message = createMessage(
        "Transação de veículo não encontrada",
        `[cashService] Tentativa de deletar transação de veículo não encontrada: ${transactionId}`
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }
    console.log(`[cashService] Transação encontrada - Placa: ${verifyTransaction.vehicleEntries.plate}, Valor: R$ ${verifyTransaction.finalAmount}`);

    // 3. Validar se a transação pertence ao caixa
    if (verifyTransaction.cashRegisterId !== cashId) {
      const message = createMessage(
        "Transação não pertence ao caixa especificado",
        `[cashService] Tentativa de deletar transação ${transactionId} que pertence ao caixa ${verifyTransaction.cashRegisterId} usando cashId ${cashId}`
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }
    console.log(`[cashService] Validação de pertencimento ao caixa: OK`);

    // 4. Executar transação baseada no tipo (permanente ou não)
    console.log(`[cashService] Iniciando transação para exclusão da transação de veículo - Tipo: ${permanent ? 'PERMANENTE' : 'NÃO PERMANENTE'}`);
    const result = await prisma.$transaction(async (tx) => {
      if (permanent) {
        console.log(`[cashService] Executando exclusão PERMANENTE`);
        // Exclusão permanente: deletar transação e vehicleEntries
        console.log(`[cashService] Deletando transação de veículo: ${transactionId}`);
        await tx.vehicleTransaction.delete({
          where: { id: transactionId }
        });

        console.log(`[cashService] Deletando entrada de veículo: ${verifyTransaction.vehicleId}`);
        await tx.vehicleEntries.delete({
          where: { id: verifyTransaction.vehicleId }
        });

      } else {
        console.log(`[cashService] Executando exclusão NÃO PERMANENTE`);
        // Exclusão não permanente: deletar transação mas manter vehicleEntries
        console.log(`[cashService] Deletando transação de veículo: ${transactionId}`);
        await tx.vehicleTransaction.delete({
          where: { id: transactionId }
        });

        // Gerar a hora de entrada em formato HH:mm:ss local de Belém
        const formattedExitTime = formatBelemTime(getCurrentBelemTime());
        console.log(`[cashService] Hora formatada para descrição: ${formattedExitTime}`);

        // Atualizar vehicleEntries: status para INSIDE, exitTime null, concatenar descrição
        const currentDescription = verifyTransaction.vehicleEntries.description || '';
        const newDescription = `${currentDescription}\nTransação de saída cancelada em ${formattedExitTime}`.trim();
        console.log(`[cashService] Nova descrição: ${newDescription}`);

        console.log(`[cashService] Atualizando entrada de veículo - Status: INSIDE, ExitTime: null`);
        await tx.vehicleEntries.update({
          where: { id: verifyTransaction.vehicleId },
          data: {
            status: 'INSIDE',
            exitTime: null,
            description: newDescription
          }
        });
      }

      // Atualizar o caixa
      console.log(`[cashService] Atualizando caixa - removendo R$ ${verifyTransaction.finalAmount} dos totais`);
      await tx.cashRegister.update({
        where: { id: cashId },
        data: {
          vehicleEntryTotal: {
            decrement: Number(verifyTransaction.finalAmount)
          },
          finalValue: {
            decrement: Number(verifyTransaction.finalAmount)
          }
        }
      });

      console.log(`[cashService] Transação de veículo deletada com sucesso - Tipo: ${permanent ? 'PERMANENTE' : 'NÃO PERMANENTE'}`);
      return {
        success: true,
        permanent: permanent,
        vehicleId: verifyTransaction.vehicleId
      };
    });

    console.log(`[cashService] Transação concluída com sucesso`);
    return result;

  } catch (error) {
    console.error(`[cashService] Erro ao deletar transação de veículo: ${error.message}`);
    throw error;
  }
}

async function transactionPhotoService(transactionId, type) {
  console.log(`[cashService] Buscando foto de transação - TransactionId: ${transactionId}, Type: ${type}`);

  try {
    let transaction = null;

    if (type === 'vehicle') {
      // Buscar em VehicleTransaction
      transaction = await prisma.vehicleTransaction.findUnique({
        where: { id: transactionId },
        select: {
          photo: true,
        }
      });
    } else if (type === 'product') {
      // Buscar em ProductTransaction
      transaction = await prisma.productTransaction.findUnique({
        where: { id: transactionId },
        select: {
          photo: true,
        }
      });
    } else {
      const message = createMessage(
        "Tipo de transação inválido",
        `[cashService] Tentativa de buscar foto de transação com tipo inválido: ${type}`
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    if (!transaction) {
      const message = createMessage(
        "Transação não encontrada",
        `[cashService] Tentativa de buscar foto de transação não encontrada: ${transactionId}`
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    if (!transaction.photo) {
      const message = createMessage(
        "Transação não possui foto",
        `[cashService] Tentativa de buscar foto de transação não possui foto: ${transactionId}`
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    // Garantir que a foto seja um Buffer
    const photoBuffer = Buffer.isBuffer(transaction.photo)
      ? transaction.photo
      : Buffer.from(transaction.photo);

    console.log(`[cashService] Foto encontrada - Type: ${type}, Size: ${photoBuffer.length} bytes`);
    return { photo: photoBuffer };

  } catch (error) {
    console.error(`[cashService] Erro ao buscar foto de transação: ${error.message}`);
    throw error;
  }
}

module.exports = {
  statusCashService,
  openCashService,
  closeCashService,
  reopenCashService,
  updateCashService,
  saveBillingMethodService,
  listBillingMethodService,
  deleteBillingMethodService,
  updateBillingMethodService,
  updateBillingMethodPutService,
  cashDataService,
  generalCashDataService,
  cashHistoryService,
  generalCashHistoryService,
  deleteProductTransactionService,
  deleteVehicleTransactionService,
  transactionPhotoService,
}
