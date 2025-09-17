// Arquivo para gerar o gráfico de comparação de saídas (veículos, produtos e gastos)

/**
 * Calcula a comparação de saídas entre veículos, produtos e gastos
 * @param {Array} cashRegisters - Array de caixas com dados de transações
 * @returns {Object} - Dados da comparação de saídas
 */
function calculateExpensesBreakdown(cashRegisters) {
  console.log('📊 Calculando comparação de saídas...');

  if (!cashRegisters || cashRegisters.length === 0) {
    console.log('⚠️ Nenhum caixa encontrado para calcular comparação');
    return {
      labels: [],
      data: [],
      summary: {
        totalVehicles: 0,
        totalProducts: 0,
        totalExpenses: 0,
        totalTransactions: 0
      }
    };
  }

  // Inicializa contadores
  let totalVehicles = 0;
  let totalProducts = 0;
  let totalExpenses = 0;

  // Percorre todos os caixas e conta as transações
  cashRegisters.forEach(cash => {
    // Conta transações de veículos
    if (cash.vehicleTransaction && Array.isArray(cash.vehicleTransaction)) {
      totalVehicles += cash.vehicleTransaction.length;
    }

    // Conta transações de produtos
    if (cash.productTransaction && Array.isArray(cash.productTransaction)) {
      totalProducts += cash.productTransaction.length;
    }

    // Conta despesas
    if (cash.outgoingExpense && Array.isArray(cash.outgoingExpense)) {
      totalExpenses += cash.outgoingExpense.length;
    }
  });

  // Prepara os dados para o gráfico
  const labels = ['Veículos', 'Produtos', 'Gastos'];
  const data = [totalVehicles, totalProducts, totalExpenses];

  // Calcula o total de transações
  const totalTransactions = totalVehicles + totalProducts + totalExpenses;

  console.log('📊 Comparação de saídas calculada:', {
    totalVehicles,
    totalProducts,
    totalExpenses,
    totalTransactions
  });

  return {
    labels,
    data,
    summary: {
      totalVehicles,
      totalProducts,
      totalExpenses,
      totalTransactions
    }
  };
}

/**
 * Gera o gráfico de comparação de saídas usando QuickChart
 * @param {Object} breakdownData - Dados da comparação
 * @returns {string} - URL do gráfico gerado
 */
function generateExpensesBreakdownChart(breakdownData) {
  console.log('📊 Gerando gráfico de comparação de saídas...');

  if (!breakdownData.labels || breakdownData.labels.length === 0) {
    console.log('⚠️ Nenhum dado disponível para gerar gráfico');
    return null;
  }

  // Configuração do gráfico Chart.js
  const chartConfig = {
    type: 'pie',
    data: {
      labels: breakdownData.labels,
      datasets: [{
        data: breakdownData.data,
        backgroundColor: [
          '#2196F3',  // Azul para veículos
          '#4CAF50',  // Verde para produtos
          '#FF9800'   // Laranja para gastos
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  };

  // Converte para JSON e codifica para URL
  const chartJson = JSON.stringify(chartConfig);
  const encodedChart = encodeURIComponent(chartJson);

  // Monta a URL do QuickChart
  const chartUrl = `https://quickchart.io/chart?c=${encodedChart}`;

  console.log('📊 URL do gráfico gerada:', chartUrl);
  console.log('📊 Tamanho da URL:', chartUrl.length, 'caracteres');

  return chartUrl;
}

module.exports = {
  calculateExpensesBreakdown,
  generateExpensesBreakdownChart
};
