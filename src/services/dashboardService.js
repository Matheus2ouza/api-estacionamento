const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calculateRevenueGrowth, generateRevenueGrowthChart } = require('../graphics/revenueGrowth');
const { calculateBestProducts, generateBestProductsChart } = require('../graphics/bestProducts');
const { calculateExpensesBreakdown, generateExpensesBreakdownChart } = require('../graphics/expensesBreakdown');
const { calculateHourlyAnalysis, generateHourlyAnalysisChart } = require('../graphics/hourlyAnalysis');

// Estrutura para mensagens
const createMessage = (userMessage, logMessage) => ({
  userMessage,
  logMessage
});

// Função auxiliar para determinar o período baseado no tipo ou datas personalizadas
function getDateRange(type, startDate, endDate) {
  // Se type for fornecido, usa a data atual como base e calcula para trás
  if (type) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    switch (type) {
      case 'daily':
        // Dia atual (hoje)
        const dailyStart = new Date(todayStr);
        const dailyEnd = new Date(todayStr);
        dailyEnd.setHours(23, 59, 59, 999); // Inclui todo o dia atual
        return { startPeriod: dailyStart, endPeriod: dailyEnd };

      case 'weekly':
        // Semana atual (7 dias atrás até hoje)
        const weeklyStart = new Date(todayStr);
        weeklyStart.setDate(weeklyStart.getDate() - 7);
        const weeklyEnd = new Date(todayStr);
        weeklyEnd.setHours(23, 59, 59, 999); // Inclui todo o dia atual
        return { startPeriod: weeklyStart, endPeriod: weeklyEnd };

      case 'monthly':
        // Mês atual (30 dias atrás até hoje)
        const monthlyStart = new Date(todayStr);
        monthlyStart.setDate(monthlyStart.getDate() - 30);
        const monthlyEnd = new Date(todayStr);
        monthlyEnd.setHours(23, 59, 59, 999); // Inclui todo o dia atual
        return { startPeriod: monthlyStart, endPeriod: monthlyEnd };

      case 'full':
        // Para full, busca todos os caixas (sem limite de data)
        return { startPeriod: null, endPeriod: null };
    }
  }

  // Se type não for fornecido, usa datas personalizadas
  if (startDate && endDate) {
    return {
      startPeriod: new Date(startDate),
      endPeriod: new Date(endDate)
    };
  }

  // Se não há type nem datas, usa a data atual como padrão
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const startPeriod = new Date(todayStr);
  const endPeriod = new Date(todayStr);
  endPeriod.setHours(23, 59, 59, 999); // Inclui todo o dia atual
  return {
    startPeriod,
    endPeriod
  };
}

// Função para processar os dados do relatório
function processReportData(cashRegisters, type, includeDetails = false, requestedCharts = [], originalStartDate = null, originalEndDate = null) {
  const totalCashRegisters = cashRegisters.length;

  // Calcula totais consolidados
  const totals = cashRegisters.reduce((acc, cash) => {
    acc.initialValue += Number(cash.initialValue);
    acc.finalValue += Number(cash.finalValue);
    acc.generalSaleTotal += Number(cash.generalSaleTotal);
    acc.vehicleEntryTotal += Number(cash.vehicleEntryTotal);
    acc.outgoingExpenseTotal += Number(cash.outgoingExpenseTotal);
    acc.vehicleTransactions += cash.vehicleTransaction?.length || 0;
    acc.productTransactions += cash.productTransaction?.length || 0;
    acc.outgoingExpenses += cash.outgoingExpense?.length || 0;
    return acc;
  }, {
    initialValue: 0,
    finalValue: 0,
    generalSaleTotal: 0,
    vehicleEntryTotal: 0,
    outgoingExpenseTotal: 0,
    vehicleTransactions: 0,
    productTransactions: 0,
    outgoingExpenses: 0
  });

  // Calcula o tempo total que os caixas ficaram abertos
  let totalOpenTimeMinutes = 0;
  let caixasComTempoCalculado = 0;

  cashRegisters.forEach(cash => {
    if (cash.openingDate && cash.closingDate) {
      const openingTime = new Date(cash.openingDate);
      const closingTime = new Date(cash.closingDate);

      // Calcula a diferença em minutos
      const timeDiffMinutes = Math.floor((closingTime - openingTime) / (1000 * 60));

      if (timeDiffMinutes > 0) {
        totalOpenTimeMinutes += timeDiffMinutes;
        caixasComTempoCalculado++;
      }
    }
  });

  // Converte para horas e minutos
  const totalHours = Math.floor(totalOpenTimeMinutes / 60);
  const remainingMinutes = totalOpenTimeMinutes % 60;
  const averageTimeMinutes = caixasComTempoCalculado > 0 ? Math.floor(totalOpenTimeMinutes / caixasComTempoCalculado) : 0;
  const averageHours = Math.floor(averageTimeMinutes / 60);
  const averageRemainingMinutes = averageTimeMinutes % 60;

  // Gera gráficos solicitados apenas se atender aos critérios
  const charts = {};

  // Validação para geração de gráficos:
  // 1. Não gera gráficos para relatórios diários
  // 2. Para datas personalizadas, precisa de pelo menos 7 dias de intervalo OU pelo menos 7 caixas
  const shouldGenerateCharts = () => {
    // Não gera gráficos para relatórios diários
    if (type === 'daily') {
      console.log('[processReportData] Gráficos não gerados: relatório diário');
      return false;
    }

    // Para datas personalizadas, verifica intervalo mínimo
    if (originalStartDate && originalEndDate) {
      const daysDifference = Math.ceil((originalEndDate - originalStartDate) / (1000 * 60 * 60 * 24));
      const hasMinimumCaixas = totalCashRegisters >= 7;

      if (daysDifference < 7 && !hasMinimumCaixas) {
        console.log(`[processReportData] Gráficos não gerados: intervalo de ${daysDifference} dias e apenas ${totalCashRegisters} caixas (mínimo: 7 dias OU 7 caixas)`);
        return false;
      }

      console.log(`[processReportData] Gráficos permitidos: intervalo de ${daysDifference} dias e ${totalCashRegisters} caixas`);
    }

    return true;
  };

  if (shouldGenerateCharts()) {
    if (requestedCharts.includes('revenueGrowth')) {
      const revenueGrowth = calculateRevenueGrowth(cashRegisters);
      const chartUrl = generateRevenueGrowthChart(revenueGrowth);
      charts.revenueGrowth = {
        ...revenueGrowth,
        chartUrl
      };
    }

    if (requestedCharts.includes('bestProducts')) {
      const bestProducts = calculateBestProducts(cashRegisters);
      const chartUrl = generateBestProductsChart(bestProducts);
      charts.bestProducts = {
        ...bestProducts,
        chartUrl
      };
    }

    if (requestedCharts.includes('expensesBreakdown')) {
      const expensesBreakdown = calculateExpensesBreakdown(cashRegisters);
      const chartUrl = generateExpensesBreakdownChart(expensesBreakdown);
      charts.expensesBreakdown = {
        ...expensesBreakdown,
        chartUrl
      };
    }

    if (requestedCharts.includes('hourlyAnalysis')) {
      const hourlyAnalysis = calculateHourlyAnalysis(cashRegisters);
      const chartUrl = generateHourlyAnalysisChart(hourlyAnalysis);
      charts.hourlyAnalysis = {
        ...hourlyAnalysis,
        chartUrl
      };
    }
  } else {
    console.log('[processReportData] Nenhum gráfico será gerado devido aos critérios de validação');
  }


  // TODO: Implementar outros gráficos
  // if (requestedCharts.includes('parkingUsage')) {
  //   charts.parkingUsage = generateParkingUsageChart(cashRegisters);
  // }
  // if (requestedCharts.includes('expensesBreakdown')) {
  //   charts.expensesBreakdown = generateExpensesBreakdownChart(cashRegisters);
  // }
  // if (requestedCharts.includes('vehicleMethods')) {
  //   charts.vehicleMethods = generateVehicleMethodsChart(cashRegisters);
  // }

  return {
    type,
    period: {
      startDate: originalStartDate || (cashRegisters.length > 0 ? cashRegisters[0].openingDate : null),
      endDate: originalEndDate || (cashRegisters.length > 0 ? cashRegisters[cashRegisters.length - 1].openingDate : null)
    },
    summary: {
      totalCashRegisters,
      totals,
      timeAnalysis: {
        totalOpenTime: {
          hours: totalHours,
          minutes: remainingMinutes,
          totalMinutes: totalOpenTimeMinutes
        },
        averageOpenTime: {
          hours: averageHours,
          minutes: averageRemainingMinutes,
          totalMinutes: averageTimeMinutes
        },
        caixasComTempoCalculado,
        caixasSemFechamento: totalCashRegisters - caixasComTempoCalculado
      }
    },
    charts,
    cashRegisters: cashRegisters.map(cash => {
      // Calcula o tempo que o caixa ficou aberto
      let openTimeMinutes = 0;
      let openTimeFormatted = 'Não fechado';

      if (cash.openingDate && cash.closingDate) {
        const openingTime = new Date(cash.openingDate);
        const closingTime = new Date(cash.closingDate);
        openTimeMinutes = Math.floor((closingTime - openingTime) / (1000 * 60));

        if (openTimeMinutes > 0) {
          const hours = Math.floor(openTimeMinutes / 60);
          const minutes = openTimeMinutes % 60;
          openTimeFormatted = `${hours}h ${minutes}min`;
        }
      }

      const baseCashData = {
        id: cash.id,
        operator: cash.operator,
        openingDate: cash.openingDate,
        closingDate: cash.closingDate,
        status: cash.status,
        initialValue: Number(cash.initialValue),
        finalValue: Number(cash.finalValue),
        generalSaleTotal: Number(cash.generalSaleTotal),
        vehicleEntryTotal: Number(cash.vehicleEntryTotal),
        outgoingExpenseTotal: Number(cash.outgoingExpenseTotal),
        openTime: {
          minutes: openTimeMinutes,
          formatted: openTimeFormatted
        }
      };

      if (includeDetails) {
        // Inclui transações detalhadas
        return {
          ...baseCashData,
          transactions: {
            vehicle: cash.vehicleTransaction?.map(transaction => ({
              id: transaction.id,
              operator: transaction.operator,
              transactionDate: transaction.transactionDate,
              amountReceived: Number(transaction.amountReceived),
              changeGiven: Number(transaction.changeGiven),
              discountAmount: Number(transaction.discountAmount),
              finalAmount: Number(transaction.finalAmount),
              originalAmount: Number(transaction.originalAmount),
              method: transaction.method,
              vehicle: {
                plate: transaction.vehicleEntries?.plate,
                category: transaction.vehicleEntries?.category
              }
            })) || [],
            product: cash.productTransaction?.map(transaction => ({
              id: transaction.id,
              operator: transaction.operator,
              transactionDate: transaction.transactionDate,
              amountReceived: Number(transaction.amountReceived),
              changeGiven: Number(transaction.changeGiven),
              discountAmount: Number(transaction.discountAmount),
              finalAmount: Number(transaction.finalAmount),
              originalAmount: Number(transaction.originalAmount),
              method: transaction.method,
              items: transaction.saleItems?.map(item => ({
                productName: item.productName,
                soldQuantity: item.soldQuantity,
                unitPrice: Number(item.unitPrice)
              })) || []
            })) || [],
            outgoing: cash.outgoingExpense?.map(expense => ({
              id: expense.id,
              description: expense.description,
              amount: Number(expense.amount),
              transactionDate: expense.transactionDate,
              operator: expense.operator,
              method: expense.method
            })) || []
          }
        };
      } else {
        // Apenas contadores de transações
        return {
          ...baseCashData,
          transactions: {
            vehicle: cash.vehicleTransaction?.length || 0,
            product: cash.productTransaction?.length || 0,
            outgoing: cash.outgoingExpense?.length || 0
          }
        };
      }
    })
  };
}

// Função para gerar relatório
async function getReportService(type, startDate, endDate, includeDetails = false, requestedCharts = []) {
  try {
    console.log(`[getReportService] Iniciando relatório - Tipo: ${type}, StartDate: ${startDate}, EndDate: ${endDate}, IncludeDetails: ${includeDetails}, Charts: ${requestedCharts.join(', ')}`);

    // Determina o período baseado no tipo ou datas personalizadas
    const { startPeriod, endPeriod } = getDateRange(type, startDate, endDate);
    console.log(`[getReportService] Período calculado - Start: ${startPeriod}, End: ${endPeriod}`);

    // Armazena as datas originais para usar no período do relatório
    const originalStartDate = startPeriod;
    const originalEndDate = endPeriod;

    // Se há datas personalizadas, usa as datas solicitadas pelo usuário
    const userStartDate = startDate ? new Date(startDate) : null;
    const userEndDate = endDate ? new Date(endDate) : null;

    // Monta a query baseada no tipo ou datas personalizadas
    let whereClause = {};

    if (type !== 'full' && startPeriod && endPeriod) {
      whereClause = {
        openingDate: {
          gte: startPeriod,
          lte: endPeriod
        }
      };
    }

    console.log(`[getReportService] Where clause:`, whereClause);

    // Busca caixas no período
    let cashRegisters = await prisma.cashRegister.findMany({
      where: whereClause,
      include: includeDetails ? {
        vehicleTransaction: {
          select: {
            id: true,
            operator: true,
            transactionDate: true,
            amountReceived: true,
            changeGiven: true,
            discountAmount: true,
            finalAmount: true,
            originalAmount: true,
            method: true,
            vehicleEntries: {
              select: {
                plate: true,
                category: true,
                entryTime: true
              }
            }
          }
        },
        productTransaction: {
          select: {
            id: true,
            operator: true,
            transactionDate: true,
            amountReceived: true,
            changeGiven: true,
            discountAmount: true,
            finalAmount: true,
            originalAmount: true,
            method: true,
            saleItems: {
              select: {
                productName: true,
                soldQuantity: true,
                unitPrice: true
              }
            }
          }
        },
        outgoingExpense: {
          select: {
            id: true,
            description: true,
            amount: true,
            transactionDate: true,
            operator: true,
            method: true
          }
        }
      } : {
        vehicleTransaction: {
          select: { id: true }
        },
        productTransaction: {
          select: { id: true }
        },
        outgoingExpense: {
          select: { id: true }
        }
      },
      orderBy: {
        openingDate: 'asc'
      }
    });

    // Se não é 'full' e há endDate (personalizado ou calculado), busca um caixa a mais para verificar se tem a data igual ao endDate
    if (type !== 'full' && endPeriod && cashRegisters.length > 0) {
      const endDateStr = new Date(endPeriod).toISOString().split('T')[0];

      // Busca o próximo caixa após o último encontrado
      const lastCashDate = cashRegisters[cashRegisters.length - 1].openingDate;
      const nextCash = await prisma.cashRegister.findFirst({
        where: {
          openingDate: {
            gt: lastCashDate
          }
        },
        include: includeDetails ? {
          vehicleTransaction: {
            select: {
              id: true,
              operator: true,
              transactionDate: true,
              amountReceived: true,
              changeGiven: true,
              discountAmount: true,
              finalAmount: true,
              originalAmount: true,
              method: true,
              vehicleEntries: {
                select: {
                  plate: true,
                  category: true,
                  entryTime: true
                }
              }
            }
          },
          productTransaction: {
            select: {
              id: true,
              operator: true,
              transactionDate: true,
              amountReceived: true,
              changeGiven: true,
              discountAmount: true,
              finalAmount: true,
              originalAmount: true,
              method: true,
              saleItems: {
                select: {
                  productName: true,
                  soldQuantity: true,
                  unitPrice: true
                }
              }
            }
          },
          outgoingExpense: {
            select: {
              id: true,
              description: true,
              amount: true,
              transactionDate: true,
              operator: true,
              method: true
            }
          }
        } : {
          vehicleTransaction: {
            select: { id: true }
          },
          productTransaction: {
            select: { id: true }
          },
          outgoingExpense: {
            select: { id: true }
          }
        },
        orderBy: {
          openingDate: 'asc'
        }
      });

      // Se encontrou um caixa e ele tem a data de abertura igual ao endDate, inclui
      if (nextCash) {
        const nextCashDateStr = new Date(nextCash.openingDate).toISOString().split('T')[0];
        if (nextCashDateStr === endDateStr) {
          cashRegisters.push(nextCash);
          console.log(`[getReportService] Caixa adicional incluído com data ${endDateStr}`);
        } else {
          console.log(`[getReportService] Caixa adicional ignorado - data ${nextCashDateStr} diferente de ${endDateStr}`);
        }
      }
    }

    console.log(`[getReportService] Caixas encontrados: ${cashRegisters.length}`);
    if (cashRegisters.length > 0) {
      console.log(`[getReportService] Primeiro caixa:`, {
        id: cashRegisters[0].id,
        operator: cashRegisters[0].operator,
        openingDate: cashRegisters[0].openingDate,
        status: cashRegisters[0].status
      });
    }

    // Processa dados de todos os caixas
    return processReportData(cashRegisters, type, includeDetails, requestedCharts, userStartDate || originalStartDate, userEndDate || originalEndDate);

  } catch (error) {
    console.error(`[getReportService] Erro ao gerar relatório ${type}:`, error);
    throw error;
  }
}

// Função para buscar os dados do caixa
async function dashboardService(cashId) {
  try {
    const cash = await prisma.cashRegister.findUnique({
      where: { id: cashId },
      select: {
        initialValue: true,
        finalValue: true,
        generalSaleTotal: true,
        vehicleEntryTotal: true,
        outgoingExpenseTotal: true,
      }
    })

    if (!cash) {
      const message = createMessage(
        'Caixa não encontrado',
        '[dashboardService] Tentativa de buscar caixa inexistente'
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    const transactionsVehicle = await prisma.vehicleTransaction.count({
      where: { cashRegisterId: cashId }
    })

    const transactionsProduct = await prisma.productTransaction.count({
      where: { cashRegisterId: cashId }
    })

    const transactionsOutgoing = await prisma.outgoingExpense.count({
      where: { cashRegisterId: cashId }
    })

    const transactionsData = {
      vehicle: transactionsVehicle,
      product: transactionsProduct,
      outgoing: transactionsOutgoing
    }

    return {
      cash,
      transactions: transactionsData
    };
  } catch (error) {
    console.error("Erro em dashboardService:", error);
    throw error;
  }
}

// Função para configurar meta
async function goalsService(goalPeriod, goalValue, isActive) {
  try {
    const goal = await prisma.goalConfigs.upsert({
      where: {
        goalPeriod: goalPeriod
      },
      update: {
        goalValue: goalValue,
        isActive: isActive
      },
      create: {
        goalPeriod: goalPeriod,
        goalValue: goalValue,
        isActive: isActive
      }
    })

    return goal;
  } catch (error) {
    console.error("Erro em goalsService:", error);
    throw error;
  }
}

// Função para buscar as metas
async function listGoalsService() {
  try {
    const goals = await prisma.goalConfigs.findMany();

    return goals;
  } catch (error) {
    console.error("Erro em listGoalsService:", error);
    throw error;
  }
}

// Função para desativar meta
async function desactivateGoalService(goalPeriod) {
  try {
    const goal = await prisma.goalConfigs.findUnique({
      where: { goalPeriod: goalPeriod }
    })

    if (!goal) {
      const message = createMessage(
        'Meta não encontrada',
        '[desactivateGoalService] Tentativa de desativar meta inexistente'
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    const updatedGoal = await prisma.goalConfigs.update({
      where: { goalPeriod: goalPeriod },
      data: { isActive: false }
    })

    return updatedGoal;
  } catch (error) {
    console.error("Erro em desactivateGoalService:", error);
    throw error;
  }
}


// Função para buscar configuração de meta específica
async function getGoalConfigService(goalPeriod) {
  try {
    const goalConfig = await prisma.goalConfigs.findUnique({
      where: {
        goalPeriod: goalPeriod
      }
    });

    console.log(`[getGoalConfigService] Configuração de meta encontrada:`, goalConfig);

    return goalConfig;
  } catch (error) {
    console.error("Erro em getGoalConfigService:", error);
    throw error;
  }
}

// Função para obter dados do progresso da meta
async function getGoalProgressDataService(goalPeriod, goalConfig) {
  try {
    const { processGoalProgressData } = require('../graphicsGoals/chartDataProcessors');
    console.log(`[getGoalProgressDataService] Iniciando processamento para período: ${goalPeriod}`);
    console.log(`[getGoalProgressDataService] Configuração de meta:`, goalConfig);
    return await processGoalProgressData(goalPeriod, goalConfig);
  } catch (error) {
    console.error("Erro em getGoalProgressDataService:", error);
    throw error;
  }
}

// Função para obter dados do lucro semanal
async function getWeeklyProfitDataService(goalPeriod, goalConfig) {
  try {
    const { processWeeklyProfitData } = require('../graphicsGoals/weeklyProfitProcessor');
    console.log(`[getWeeklyProfitDataService] Iniciando processamento para período: ${goalPeriod}`);
    console.log(`[getWeeklyProfitDataService] Configuração de meta:`, goalConfig);
    return await processWeeklyProfitData(goalPeriod, goalConfig);
  } catch (error) {
    console.error("Erro em getWeeklyProfitDataService:", error);
    throw error;
  }
}

// Função para obter dados do dailyTotals (nível DIARIA)
async function getDailyTotalsDataService(goalPeriod) {
  try {
    const { processDailyTotalsData } = require('../graphicsGoals/dailyTotalsProcessor');
    console.log(`[getDailyTotalsDataService] Iniciando processamento para período: ${goalPeriod}`);
    return await processDailyTotalsData(goalPeriod);
  } catch (error) {
    console.error("Erro em getDailyTotalsDataService:", error);
    throw error;
  }
}

// Função para obter dados do totalsBarGroup
async function getTotalsBarGroupDataService(goalPeriod) {
  try {
    const { processTotalsBarGroupData } = require('../graphicsGoals/totalsBarGroupProcessor');
    console.log(`[getTotalsBarGroupDataService] Iniciando processamento para período: ${goalPeriod}`);
    return await processTotalsBarGroupData(goalPeriod);
  } catch (error) {
    console.error("Erro em getTotalsBarGroupDataService:", error);
    throw error;
  }
}

module.exports = {
  dashboardService,
  getReportService,
  goalsService,
  listGoalsService,
  desactivateGoalService,
  getGoalConfigService,
  getGoalProgressDataService,
  getWeeklyProfitDataService,
  getTotalsBarGroupDataService,
  getDailyTotalsDataService
}
