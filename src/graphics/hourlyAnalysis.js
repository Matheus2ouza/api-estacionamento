// Arquivo para gerar o gráfico de análise por horário (manhã, tarde, noite)

/**
 * Calcula a análise por horário (manhã, tarde, noite)
 * @param {Array} cashRegisters - Array de caixas com dados de transações de veículos
 * @returns {Object} - Dados da análise por horário
 */
function calculateHourlyAnalysis(cashRegisters) {
  console.log('📊 Calculando análise por horário...');

  if (!cashRegisters || cashRegisters.length === 0) {
    console.log('⚠️ Nenhum caixa encontrado para calcular análise por horário');
    return {
      labels: [],
      data: [],
      summary: {
        morning: { entries: 0, averageTime: 0 },
        afternoon: { entries: 0, averageTime: 0 },
        night: { entries: 0, averageTime: 0 },
        totalEntries: 0
      }
    };
  }

  // Inicializa contadores para cada período
  const periods = {
    morning: { entries: 0, totalTime: 0, count: 0 },    // 9h às 12h
    afternoon: { entries: 0, totalTime: 0, count: 0 },  // 12h às 15h
    night: { entries: 0, totalTime: 0, count: 0 }       // 15h às 18h
  };

  // Percorre todos os caixas e suas transações de veículos
  cashRegisters.forEach(cash => {
    if (cash.vehicleTransaction && Array.isArray(cash.vehicleTransaction)) {
      cash.vehicleTransaction.forEach(transaction => {
        if (transaction.vehicleEntries) {
          const entryTime = new Date(transaction.vehicleEntries.entryTime);
          const exitTime = new Date(transaction.transactionDate);

          // Calcula o tempo de permanência em minutos
          const timeInMinutes = (exitTime - entryTime) / (1000 * 60);

          // Determina o período baseado na hora de entrada
          const hour = entryTime.getHours();
          let period;

          if (hour >= 9 && hour < 12) {
            period = 'morning';
          } else if (hour >= 12 && hour < 15) {
            period = 'afternoon';
          } else if (hour >= 15 && hour < 18) {
            period = 'night';
          } else {
            // Horários fora do período de funcionamento (antes das 9h ou depois das 18h)
            // Não contabiliza para nenhum período
            return;
          }

          // Incrementa contadores
          periods[period].entries++;
          periods[period].totalTime += timeInMinutes;
          periods[period].count++;
        }
      });
    }
  });

  // Calcula médias de tempo para cada período
  const morningAvgTime = periods.morning.count > 0 ? periods.morning.totalTime / periods.morning.count : 0;
  const afternoonAvgTime = periods.afternoon.count > 0 ? periods.afternoon.totalTime / periods.afternoon.count : 0;
  const nightAvgTime = periods.night.count > 0 ? periods.night.totalTime / periods.night.count : 0;

  // Prepara os dados para o gráfico
  const labels = ['Manhã', 'Tarde', 'Noite'];
  const data = [periods.morning.entries, periods.afternoon.entries, periods.night.entries];

  const totalEntries = periods.morning.entries + periods.afternoon.entries + periods.night.entries;

  console.log('📊 Análise por horário calculada:', {
    morning: { entries: periods.morning.entries, avgTime: morningAvgTime },
    afternoon: { entries: periods.afternoon.entries, avgTime: afternoonAvgTime },
    night: { entries: periods.night.entries, avgTime: nightAvgTime },
    totalEntries
  });

  return {
    labels,
    data,
    summary: {
      morning: {
        entries: periods.morning.entries,
        averageTime: Math.round(morningAvgTime)
      },
      afternoon: {
        entries: periods.afternoon.entries,
        averageTime: Math.round(afternoonAvgTime)
      },
      night: {
        entries: periods.night.entries,
        averageTime: Math.round(nightAvgTime)
      },
      totalEntries
    }
  };
}

/**
 * Gera o gráfico de análise por horário usando QuickChart
 * @param {Object} hourlyData - Dados da análise por horário
 * @returns {string} - URL do gráfico gerado
 */
function generateHourlyAnalysisChart(hourlyData) {
  console.log('📊 Gerando gráfico de análise por horário...');

  if (!hourlyData.labels || hourlyData.labels.length === 0) {
    console.log('⚠️ Nenhum dado disponível para gerar gráfico');
    return null;
  }

  // Configuração do gráfico Chart.js
  const chartConfig = {
    type: 'bar',
    data: {
      labels: hourlyData.labels,
      datasets: [{
        label: 'Entradas de Veículos',
        data: hourlyData.data,
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',  // Azul para manhã
          'rgba(255, 159, 64, 0.8)',  // Laranja para tarde
          'rgba(153, 102, 255, 0.8)'  // Roxo para noite
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(153, 102, 255, 1)'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${context.parsed.y} entradas`;
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
  calculateHourlyAnalysis,
  generateHourlyAnalysisChart
};
