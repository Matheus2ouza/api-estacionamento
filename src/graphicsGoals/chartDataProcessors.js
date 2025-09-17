/**
 * Processadores de dados para gráficos
 * Cada função recebe os dados necessários e retorna os dados formatados para o frontend
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
 * Função auxiliar para calcular range de datas baseado no período
 */
function getDateRangeByPeriod(period) {
  console.log(`[getDateRangeByPeriod] Calculando range para período: ${period}`);
  const now = new Date();
  console.log(`[getDateRangeByPeriod] Data atual: ${now}`);
  let startDate, endDate;

  switch (period) {
    case 'DIARIA':
      console.log(`[getDateRangeByPeriod] Processando período DIARIA`);
      // Dia atual
      startDate = createDateWithTime(now, '00:00:00');
      endDate = createDateWithTime(now, '23:59:59');
      console.log(`[getDateRangeByPeriod] DIARIA - Início: ${startDate}, Fim: ${endDate}`);
      break;

    case 'SEMANAL':
      console.log(`[getDateRangeByPeriod] Processando período SEMANAL`);
      // Segunda-feira até sexta-feira (apenas dias úteis)
      const dayOfWeek = now.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
      console.log(`[getDateRangeByPeriod] Dia da semana atual: ${dayOfWeek} (0=domingo, 1=segunda, etc.)`);

      if (dayOfWeek === 0) {
        console.log(`[getDateRangeByPeriod] Hoje é domingo - calculando semana anterior`);
        // Se hoje é domingo, calcular a semana anterior completa (segunda a sexta)
        const lastMonday = new Date(now);
        lastMonday.setDate(now.getDate() - 6);
        startDate = createDateWithTime(lastMonday, '00:00:00');

        const lastFriday = new Date(lastMonday);
        lastFriday.setDate(lastMonday.getDate() + 4);
        endDate = createDateWithTime(lastFriday, '23:59:59');
        console.log(`[getDateRangeByPeriod] SEMANAL (domingo) - Início: ${startDate}, Fim: ${endDate}`);
      } else if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        console.log(`[getDateRangeByPeriod] Hoje é dia útil (${dayOfWeek}) - calculando segunda até hoje`);
        // Se hoje é dia útil (segunda a sexta)
        const monday = new Date(now);
        monday.setDate(now.getDate() - (dayOfWeek - 1));
        startDate = createDateWithTime(monday, '00:00:00');
        endDate = createDateWithTime(now, '23:59:59');
        console.log(`[getDateRangeByPeriod] SEMANAL (dia útil) - Início: ${startDate}, Fim: ${endDate}`);
      } else {
        console.log(`[getDateRangeByPeriod] Hoje é sábado - calculando segunda a sexta da semana atual`);
        // Se hoje é sábado, calcular segunda a sexta da semana atual
        const monday = new Date(now);
        monday.setDate(now.getDate() - 5);
        startDate = createDateWithTime(monday, '00:00:00');

        const friday = new Date(monday);
        friday.setDate(monday.getDate() + 4);
        endDate = createDateWithTime(friday, '23:59:59');
        console.log(`[getDateRangeByPeriod] SEMANAL (sábado) - Início: ${startDate}, Fim: ${endDate}`);
      }
      break;

    case 'MENSAL':
      console.log(`[getDateRangeByPeriod] Processando período MENSAL`);
      // Todos os dias úteis (segunda a sexta) do mês atual
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      console.log(`[getDateRangeByPeriod] Primeiro dia do mês: ${firstDay}`);
      console.log(`[getDateRangeByPeriod] Último dia do mês: ${lastDay}`);

      startDate = createDateWithTime(firstDay, '00:00:00');
      endDate = createDateWithTime(lastDay, '23:59:59');
      console.log(`[getDateRangeByPeriod] MENSAL - Início: ${startDate}, Fim: ${endDate}`);
      break;

    default:
      console.error(`[getDateRangeByPeriod] Período não reconhecido: ${period}`);
      throw new Error(`Período não reconhecido: ${period}`);
  }

  console.log(`[getDateRangeByPeriod] Range final calculado - Início: ${startDate}, Fim: ${endDate}`);
  return { startDate, endDate };
}

/**
 * Função auxiliar para verificar se uma data é dia útil (segunda a sexta)
 */
function isWeekday(date) {
  const dayOfWeek = date.getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5; // 1 = segunda, 5 = sexta
}

/**
 * Processa dados para o gráfico de progresso da meta
 * @param {string} goalPeriod - Período da meta (DIARIA, SEMANAL, MENSAL)
 * @param {Object} goalConfig - Configuração da meta
 * @returns {Object} Dados formatados para o gráfico
 */
async function processGoalProgressData(goalPeriod, goalConfig) {
  try {
    console.log(`[processGoalProgressData] Iniciando processamento para período: ${goalPeriod}`);
    console.log(`[processGoalProgressData] Configuração da meta:`, goalConfig);

    const { goalValue } = goalConfig;
    console.log(`[processGoalProgressData] Valor da meta: ${goalValue}`);

    // Calcular datas baseado no período
    console.log(`[processGoalProgressData] Calculando range de datas para período: ${goalPeriod}`);
    const { startDate, endDate } = getDateRangeByPeriod(goalPeriod);
    console.log(`[processGoalProgressData] Data inicial: ${startDate}`);
    console.log(`[processGoalProgressData] Data final: ${endDate}`);

    let whereClause = {
      openingDate: {
        gte: startDate,
        lte: endDate
      }
    };
    console.log(`[processGoalProgressData] Where clause criado:`, whereClause);

    // Para os períodos MENSAL e SEMANAL, filtrar apenas dias úteis
    if (goalPeriod === 'MENSAL' || goalPeriod === 'SEMANAL') {
      console.log(`[processGoalProgressData] Processando período ${goalPeriod} - filtrando apenas dias úteis`);

      // Buscar todos os caixas do período e filtrar apenas os de dias úteis
      console.log(`[processGoalProgressData] Buscando todos os caixas no período...`);
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
      console.log(`[processGoalProgressData] Total de caixas encontrados: ${allCashRegisters.length}`);

      // Filtrar apenas caixas de dias úteis e somar
      console.log(`[processGoalProgressData] Filtrando caixas de dias úteis...`);
      const weekdayCashRegisters = allCashRegisters.filter(cashRegister =>
        isWeekday(cashRegister.openingDate)
      );
      console.log(`[processGoalProgressData] Caixas de dias úteis: ${weekdayCashRegisters.length}`);

      console.log(`[processGoalProgressData] Calculando somas...`);
      const finalValueSum = weekdayCashRegisters.reduce((sum, cr) => sum + parseFloat(cr.finalValue), 0);
      const initialValueSum = weekdayCashRegisters.reduce((sum, cr) => sum + parseFloat(cr.initialValue), 0);
      const currentValue = finalValueSum - initialValueSum;
      const targetValue = parseFloat(goalValue);
      const progress = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;

      console.log(`[processGoalProgressData] Valores calculados:`);
      console.log(`  - Soma valor final: ${finalValueSum}`);
      console.log(`  - Soma valor inicial: ${initialValueSum}`);
      console.log(`  - Valor atual (final - inicial): ${currentValue}`);
      console.log(`  - Valor da meta: ${targetValue}`);
      console.log(`  - Progresso: ${progress}%`);

      const result = {
        targetValue: formatToTwoDecimals(targetValue), // Valor da Meta
        currentValue: formatToTwoDecimals(currentValue), // Valor Atual Atingido
        progress: formatToTwoDecimals(progress) // Percentual de Progresso
      };

      console.log(`[processGoalProgressData] Resultado formatado:`, result);
      return result;
    }

    // Para DIARIA, usar consulta normal
    console.log(`[processGoalProgressData] Processando período DIARIA - usando consulta aggregate`);
    console.log(`[processGoalProgressData] Executando consulta aggregate no banco...`);

    const totalRevenue = await prisma.cashRegister.aggregate({
      where: whereClause,
      _sum: {
        finalValue: true,
        initialValue: true
      }
    });
    console.log(`[processGoalProgressData] Resultado da consulta aggregate:`, totalRevenue);

    const finalValueSum = totalRevenue._sum.finalValue || 0;
    const initialValueSum = totalRevenue._sum.initialValue || 0;
    const currentValue = finalValueSum - initialValueSum;
    const targetValue = parseFloat(goalValue);
    const progress = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;

    console.log(`[processGoalProgressData] Valores calculados (DIARIA):`);
    console.log(`  - Soma valor final: ${finalValueSum}`);
    console.log(`  - Soma valor inicial: ${initialValueSum}`);
    console.log(`  - Valor atual (final - inicial): ${currentValue}`);
    console.log(`  - Valor da meta: ${targetValue}`);
    console.log(`  - Progresso: ${progress}%`);

    const result = {
      targetValue: formatToTwoDecimals(targetValue), // Valor da Meta
      currentValue: formatToTwoDecimals(currentValue), // Valor Atual Atingido
      progress: formatToTwoDecimals(progress) // Percentual de Progresso
    };

    console.log(`[processGoalProgressData] Resultado formatado (DIARIA):`, result);
    return result;
  } catch (error) {
    console.error("Erro em processGoalProgressData:", error);
    throw error;
  }
}

module.exports = {
  processGoalProgressData
};
