const { DateTime } = require('luxon');

/**
 * Calcula o crescimento de lucro dividindo os caixas em 6 grupos
 * @param {Array} cashRegisters - Array de caixas
 * @returns {Object} - Objeto com grupos e seus lucros
 */
function calculateRevenueGrowth(cashRegisters) {
  if (!cashRegisters || cashRegisters.length === 0) {
    return {
      groups: [],
      totalProfit: 0,
      averageProfit: 0
    };
  }

  // Calcula o lucro de cada caixa (valor final - valor inicial)
  const cashWithProfit = cashRegisters.map(cash => ({
    ...cash,
    profit: Number(cash.finalValue) - Number(cash.initialValue)
  }));

  // Ordena por data de abertura para manter ordem cronológica
  cashWithProfit.sort((a, b) => new Date(a.openingDate) - new Date(b.openingDate));

  const totalCash = cashWithProfit.length;
  const groupSize = Math.floor(totalCash / 6);
  const remainder = totalCash % 6;

  const groups = [];
  let currentIndex = 0;

  // Divide em 6 grupos
  for (let i = 0; i < 6; i++) {
    // Calcula o tamanho do grupo atual
    let currentGroupSize = groupSize;

    // Distribui os caixas restantes nos primeiros grupos
    if (i < remainder) {
      currentGroupSize += 1;
    }

    // Se não há mais caixas para distribuir, para o loop
    if (currentIndex >= totalCash) {
      break;
    }

    // Pega os caixas do grupo atual
    const groupCash = cashWithProfit.slice(currentIndex, currentIndex + currentGroupSize);

    // Calcula o lucro total do grupo
    const groupProfit = groupCash.reduce((sum, cash) => sum + cash.profit, 0);

    // Calcula a data média do grupo
    const groupDates = groupCash.map(cash => new Date(cash.openingDate));
    const averageDate = new Date(groupDates.reduce((sum, date) => sum + date.getTime(), 0) / groupDates.length);

    groups.push({
      groupNumber: i + 1,
      cashCount: groupCash.length,
      totalProfit: Number(groupProfit.toFixed(2)),
      averageProfit: Number((groupProfit / groupCash.length).toFixed(2)),
      startDate: groupCash[0]?.openingDate,
      endDate: groupCash[groupCash.length - 1]?.openingDate,
      averageDate: averageDate.toISOString(),
      cashRegisters: groupCash.map(cash => ({
        id: cash.id,
        operator: cash.operator,
        profit: cash.profit,
        openingDate: cash.openingDate
      }))
    });

    currentIndex += currentGroupSize;
  }

  // Calcula totais
  const totalProfit = groups.reduce((sum, group) => sum + group.totalProfit, 0);
  const averageProfit = groups.length > 0 ? totalProfit / groups.length : 0;

  return {
    groups,
    totalProfit: Number(totalProfit.toFixed(2)),
    averageProfit: Number(averageProfit.toFixed(2)),
    totalCashRegisters: totalCash
  };
}

/**
 * Gera URL do gráfico de crescimento de lucro usando QuickChart
 * @param {Object} revenueData - Dados de crescimento de receita
 * @returns {string} - URL do gráfico
 */
function generateRevenueGrowthChart(revenueData) {
  if (!revenueData.groups || revenueData.groups.length === 0) {
    return null;
  }

  // Prepara os dados para o gráfico
  const labels = revenueData.groups.map(group => {
    const startDate = new Date(group.startDate);
    const endDate = new Date(group.endDate);
    const startStr = startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const endStr = endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `${startStr} - ${endStr}`;
  });
  const profits = revenueData.groups.map(group => group.totalProfit);
  const cashCounts = revenueData.groups.map(group => group.cashCount);

  // Configuração simples seguindo o exemplo do QuickChart
  const chartConfig = {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Lucro Total',
          data: profits,
          fill: false,
          borderColor: 'blue'
        },
        {
          label: 'Caixas',
          data: cashCounts,
          fill: false,
          borderColor: 'green'
        }
      ]
    }
  };

  // Converte para JSON e codifica para URL
  const chartJson = JSON.stringify(chartConfig);
  const encodedChart = encodeURIComponent(chartJson);

  // Gera URL do QuickChart usando o formato correto
  const chartUrl = `https://quickchart.io/chart?width=600&height=300&format=png&c=${encodedChart}`;

  // Log para debug (removido em produção)
  // console.log('📊 URL do gráfico gerada:', chartUrl);
  // console.log('📊 Tamanho da URL:', chartUrl.length, 'caracteres');

  return chartUrl;
}

module.exports = {
  calculateRevenueGrowth,
  generateRevenueGrowthChart
};
