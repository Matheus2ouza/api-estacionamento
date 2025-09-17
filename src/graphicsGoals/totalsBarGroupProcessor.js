/**
 * Processador de dados para gráfico totalsBarGroup
 * Retorna totais por dia (generalSaleTotal, vehicleEntryTotal, outgoingExpenseTotal)
 * - Para SEMANAL: de segunda até o dia útil atual (somente dias úteis)
 * - Para MENSAL: últimos 5 dias úteis (dentro do mês atual), em ordem cronológica
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

function isWeekday(date) {
  const d = date.getDay();
  return d >= 1 && d <= 5;
}

function formatToTwoDecimals(value) {
  return Math.round(parseFloat(value || 0) * 100) / 100;
}

function getWeeklyDateRange() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  let startDate, endDate;

  if (dayOfWeek === 0) {
    // domingo -> semana anterior (seg a sex)
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - 6);
    startDate = createDateWithTime(lastMonday, '00:00:00');
    const lastFriday = new Date(lastMonday);
    lastFriday.setDate(lastMonday.getDate() + 4);
    endDate = createDateWithTime(lastFriday, '23:59:59');
  } else if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    // dia útil -> segunda até hoje
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek - 1));
    startDate = createDateWithTime(monday, '00:00:00');
    endDate = createDateWithTime(now, '23:59:59');
  } else {
    // sábado -> segunda a sexta atuais
    const monday = new Date(now);
    monday.setDate(now.getDate() - 5);
    startDate = createDateWithTime(monday, '00:00:00');
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    endDate = createDateWithTime(friday, '23:59:59');
  }

  return { startDate, endDate };
}

function getLast5BusinessDaysOfCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayToConsider = now; // até hoje

  const days = [];
  const cursor = new Date(lastDayToConsider);
  cursor.setHours(0, 0, 0, 0);

  while (days.length < 5) {
    if (cursor.getMonth() !== month) break; // saiu do mês atual
    if (isWeekday(cursor)) {
      // prepend depois, então coletamos e ao final inverteremos
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  // ordenar cronologicamente ascendente
  days.sort((a, b) => a - b);
  return days;
}

async function sumTotalsForDay(date) {
  const dayStart = createDateWithTime(date, '00:00:00');
  const dayEnd = createDateWithTime(date, '23:59:59');

  const cashes = await prisma.cashRegister.findMany({
    where: {
      openingDate: { gte: dayStart, lte: dayEnd }
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

  return {
    generalSaleTotal: formatToTwoDecimals(totals.generalSaleTotal),
    vehicleEntryTotal: formatToTwoDecimals(totals.vehicleEntryTotal),
    outgoingExpenseTotal: formatToTwoDecimals(totals.outgoingExpenseTotal)
  };
}

/**
 * Processa dados para o gráfico totalsBarGroup
 * @param {string} goalPeriod - SEMANAL ou MENSAL
 * @returns {Object} Dados com dias e totais por dia
 */
async function processTotalsBarGroupData(goalPeriod) {
  console.log(`[processTotalsBarGroupData] Iniciando - período: ${goalPeriod}`);

  if (goalPeriod !== 'SEMANAL' && goalPeriod !== 'MENSAL') {
    throw new Error('totalsBarGroup é permitido apenas para períodos SEMANAL ou MENSAL');
  }

  const weekdaysMeta = [
    { number: 1, name: 'Segunda' },
    { number: 2, name: 'Terça' },
    { number: 3, name: 'Quarta' },
    { number: 4, name: 'Quinta' },
    { number: 5, name: 'Sexta' }
  ];

  if (goalPeriod === 'SEMANAL') {
    const { startDate, endDate } = getWeeklyDateRange();
    // construir lista de dias úteis de startDate até endDate
    const days = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      if (isWeekday(cursor)) days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    const data = [];
    for (const date of days) {
      const dow = date.getDay();
      const meta = weekdaysMeta.find(w => w.number === dow);
      const totals = await sumTotalsForDay(date);
      data.push({
        dayNumber: meta?.number || dow,
        dayName: meta?.name || String(dow),
        ...totals
      });
    }

    return { period: 'SEMANAL', dailyTotals: data };
  }

  // MENSAL: últimos 5 dias úteis do mês atual
  const last5 = getLast5BusinessDaysOfCurrentMonth();
  const data = [];
  for (const date of last5) {
    const dow = date.getDay();
    const meta = weekdaysMeta.find(w => w.number === dow);
    const totals = await sumTotalsForDay(date);
    data.push({
      dayNumber: meta?.number || dow,
      dayName: meta?.name || String(dow),
      ...totals
    });
  }
  return { period: 'MENSAL', dailyTotals: data };
}

module.exports = {
  processTotalsBarGroupData
};


