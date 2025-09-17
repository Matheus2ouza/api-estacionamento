/**
 * Processador de dados para gráfico dailyTotals (nível DIARIA)
 * Retorna os totais do dia atual: generalSaleTotal, vehicleEntryTotal, outgoingExpenseTotal
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function createDateWithTime(date, time) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const isoDate = `${year}-${month}-${day}`;
  return new Date(isoDate + ' ' + time);
}

function formatToTwoDecimals(value) {
  return Math.round(parseFloat(value || 0) * 100) / 100;
}

async function processDailyTotalsData(goalPeriod) {
  console.log(`[processDailyTotalsData] Iniciando - período: ${goalPeriod}`);

  if (goalPeriod !== 'DIARIA') {
    // Permitimos que períodos superiores também solicitem o gráfico diário?
    // Por regra de níveis, sim. Então não bloqueamos aqui.
  }

  const now = new Date();
  const startDate = createDateWithTime(now, '00:00:00');
  const endDate = createDateWithTime(now, '23:59:59');

  const cashes = await prisma.cashRegister.findMany({
    where: {
      openingDate: { gte: startDate, lte: endDate }
    },
    select: {
      generalSaleTotal: true,
      vehicleEntryTotal: true,
      outgoingExpenseTotal: true
    }
  });

  const totals = cashes.reduce((acc, c) => {
    acc.generalSaleTotal += Number(c.generalSaleTotal || 0);
    acc.vehicleEntryTotal += Number(c.vehicleEntryTotal || 0);
    acc.outgoingExpenseTotal += Number(c.outgoingExpenseTotal || 0);
    return acc;
  }, { generalSaleTotal: 0, vehicleEntryTotal: 0, outgoingExpenseTotal: 0 });

  const result = {
    period: 'DIARIA',
    totals: {
      generalSaleTotal: formatToTwoDecimals(totals.generalSaleTotal),
      vehicleEntryTotal: formatToTwoDecimals(totals.vehicleEntryTotal),
      outgoingExpenseTotal: formatToTwoDecimals(totals.outgoingExpenseTotal)
    }
  };

  console.log('[processDailyTotalsData] Resultado:', result);
  return result;
}

module.exports = {
  processDailyTotalsData
};


