/**
 * Processador de dados para gráfico de lucro semanal
 * Fornece dados sobre o lucro diário da semana atual, mostrando apenas dias úteis que já passaram
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Função auxiliar para criar data com horário específico
 */
function createDateWithTime(date, time) {
  // Converte para formato ISO (YYYY-MM-DD) para evitar problemas de locale
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const isoDate = `${year}-${month}-${day}`;

  return new Date(isoDate + ' ' + time);
}

/**
 * Função auxiliar para formatar números com duas casas decimais
 */
function formatToTwoDecimals(value) {
  return Math.round(parseFloat(value) * 100) / 100;
}

/**
 * Função auxiliar para verificar se uma data é dia útil (segunda a sexta)
 */
function isWeekday(date) {
  const dayOfWeek = date.getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5; // 1 = segunda, 5 = sexta
}

/**
 * Função auxiliar para calcular range de datas da semana atual
 */
function getWeeklyDateRange() {
  console.log(`[getWeeklyDateRange] Calculando range da semana atual`);
  const now = new Date();
  console.log(`[getWeeklyDateRange] Data atual: ${now}`);

  const dayOfWeek = now.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
  console.log(`[getWeeklyDateRange] Dia da semana atual: ${dayOfWeek} (0=domingo, 1=segunda, etc.)`);

  let startDate, endDate;

  if (dayOfWeek === 0) {
    console.log(`[getWeeklyDateRange] Hoje é domingo - calculando semana anterior`);
    // Se hoje é domingo, calcular a semana anterior completa (segunda a sexta)
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - 6);
    startDate = createDateWithTime(lastMonday, '00:00:00');

    const lastFriday = new Date(lastMonday);
    lastFriday.setDate(lastMonday.getDate() + 4);
    endDate = createDateWithTime(lastFriday, '23:59:59');
    console.log(`[getWeeklyDateRange] SEMANAL (domingo) - Início: ${startDate}, Fim: ${endDate}`);
  } else if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    console.log(`[getWeeklyDateRange] Hoje é dia útil (${dayOfWeek}) - calculando segunda até hoje`);
    // Se hoje é dia útil (segunda a sexta)
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek - 1));
    startDate = createDateWithTime(monday, '00:00:00');
    endDate = createDateWithTime(now, '23:59:59');
    console.log(`[getWeeklyDateRange] SEMANAL (dia útil) - Início: ${startDate}, Fim: ${endDate}`);
  } else {
    console.log(`[getWeeklyDateRange] Hoje é sábado - calculando segunda a sexta da semana atual`);
    // Se hoje é sábado, calcular segunda a sexta da semana atual
    const monday = new Date(now);
    monday.setDate(now.getDate() - 5);
    startDate = createDateWithTime(monday, '00:00:00');

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    endDate = createDateWithTime(friday, '23:59:59');
    console.log(`[getWeeklyDateRange] SEMANAL (sábado) - Início: ${startDate}, Fim: ${endDate}`);
  }

  console.log(`[getWeeklyDateRange] Range final calculado - Início: ${startDate}, Fim: ${endDate}`);
  return { startDate, endDate };
}

/**
 * Processa dados para o gráfico de lucro semanal
 * @param {string} goalPeriod - Período da meta (deve ser SEMANAL)
 * @param {Object} goalConfig - Configuração da meta semanal
 * @returns {Object} Dados formatados para o gráfico de lucro
 */
async function processWeeklyProfitData(goalPeriod, goalConfig) {
  try {
    console.log(`[processWeeklyProfitData] Iniciando processamento para período: ${goalPeriod}`);
    console.log(`[processWeeklyProfitData] Configuração da meta:`, goalConfig);

    // Validar período: permitido para SEMANAL e MENSAL (bloqueia DIARIA)
    if (goalPeriod !== 'SEMANAL' && goalPeriod !== 'MENSAL') {
      throw new Error('processWeeklyProfitData só é permitido para períodos SEMANAL ou MENSAL');
    }

    const { goalValue } = goalConfig;
    console.log(`[processWeeklyProfitData] Valor da meta semanal: ${goalValue}`);

    // Calcular datas da semana atual (segunda a sexta)
    console.log(`[processWeeklyProfitData] Calculando range de datas da semana atual`);
    const { startDate, endDate } = getWeeklyDateRange();
    console.log(`[processWeeklyProfitData] Data inicial: ${startDate}`);
    console.log(`[processWeeklyProfitData] Data final: ${endDate}`);

    // Buscar todos os caixas da semana
    console.log(`[processWeeklyProfitData] Buscando caixas da semana...`);
    const allCashRegisters = await prisma.cashRegister.findMany({
      where: {
        openingDate: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        finalValue: true,
        initialValue: true,
        openingDate: true
      }
    });
    console.log(`[processWeeklyProfitData] Total de caixas encontrados: ${allCashRegisters.length}`);

    // Filtrar apenas caixas de dias úteis
    console.log(`[processWeeklyProfitData] Filtrando caixas de dias úteis...`);
    const weekdayCashRegisters = allCashRegisters.filter(cashRegister =>
      isWeekday(cashRegister.openingDate)
    );
    console.log(`[processWeeklyProfitData] Caixas de dias úteis: ${weekdayCashRegisters.length}`);

    // Calcular lucro total da semana
    const finalValueSum = weekdayCashRegisters.reduce((sum, cr) => sum + parseFloat(cr.finalValue), 0);
    const initialValueSum = weekdayCashRegisters.reduce((sum, cr) => sum + parseFloat(cr.initialValue), 0);
    const currentValue = finalValueSum - initialValueSum;
    const targetValue = parseFloat(goalValue);
    const progress = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;

    console.log(`[processWeeklyProfitData] Valores calculados:`);
    console.log(`  - Soma valor final: ${finalValueSum}`);
    console.log(`  - Soma valor inicial: ${initialValueSum}`);
    console.log(`  - Valor atual (final - inicial): ${currentValue}`);
    console.log(`  - Valor da meta: ${targetValue}`);
    console.log(`  - Progresso: ${progress}%`);

    // Calcular dados diários
    console.log(`[processWeeklyProfitData] Calculando dados diários...`);
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
    const currentWeekday = currentDayOfWeek >= 1 && currentDayOfWeek <= 5 ? currentDayOfWeek : 0; // 0 se não for dia útil

    console.log(`[processWeeklyProfitData] Dia atual da semana: ${currentDayOfWeek}, Dia útil atual: ${currentWeekday}`);

    // Criar array com os 5 dias úteis
    const weekdays = [
      { number: 1, name: 'Segunda' },
      { number: 2, name: 'Terça' },
      { number: 3, name: 'Quarta' },
      { number: 4, name: 'Quinta' },
      { number: 5, name: 'Sexta' }
    ];

    // Calcular lucro por dia
    const dailyData = weekdays.map(day => {
      // Filtrar caixas do dia específico
      const dayCashRegisters = weekdayCashRegisters.filter(cashRegister => {
        const cashDay = new Date(cashRegister.openingDate).getDay();
        return cashDay === day.number; // 1 = segunda, 2 = terça, etc.
      });

      // Calcular lucro do dia
      const dayFinalSum = dayCashRegisters.reduce((sum, cr) => sum + parseFloat(cr.finalValue), 0);
      const dayInitialSum = dayCashRegisters.reduce((sum, cr) => sum + parseFloat(cr.initialValue), 0);
      const dayProfit = dayFinalSum - dayInitialSum;

      // Se o dia ainda não passou, lucro é zero
      const profit = (day.number <= currentWeekday) ? dayProfit : 0;

      console.log(`[processWeeklyProfitData] ${day.name} (${day.number}): ${dayCashRegisters.length} caixas, lucro: ${profit}`);

      return {
        dayNumber: day.number,
        dayName: day.name,
        profit: formatToTwoDecimals(profit)
      };
    });

    const result = {
      weeklyGoal: {
        targetValue: formatToTwoDecimals(targetValue), // Meta semanal
        currentValue: formatToTwoDecimals(currentValue), // Valor atual
        progress: formatToTwoDecimals(progress), // Progresso percentual
        currentDay: currentWeekday // Dia atual (1-5, ou 0 se não for dia útil)
      },
      dailyData: dailyData
    };

    console.log(`[processWeeklyProfitData] Resultado final:`, result);
    return result;

  } catch (error) {
    console.error("Erro em processWeeklyProfitData:", error);
    throw error;
  }
}

module.exports = {
  processWeeklyProfitData
};
