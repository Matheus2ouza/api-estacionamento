// Arquivo para gerar o gráfico de produtos mais vendidos

/**
 * Calcula os produtos mais vendidos
 * @param {Array} cashRegisters - Array de caixas com transações de produtos
 * @returns {Object} - Dados dos produtos mais vendidos
 */
function calculateBestProducts(cashRegisters) {
  console.log('📊 Calculando produtos mais vendidos...');

  // Objeto para acumular as vendas por produto
  const productSales = {};

  // Percorre todos os caixas e suas transações de produtos
  cashRegisters.forEach(cash => {
    if (cash.productTransaction && Array.isArray(cash.productTransaction)) {
      cash.productTransaction.forEach(transaction => {
        if (transaction.saleItems && Array.isArray(transaction.saleItems)) {
          transaction.saleItems.forEach(item => {
            const productName = item.productName;
            const quantity = Number(item.soldQuantity) || 0;

            if (productSales[productName]) {
              productSales[productName] += quantity;
            } else {
              productSales[productName] = quantity;
            }
          });
        }
      });
    }
  });

  // Converte para array e ordena por quantidade vendida (maior para menor)
  const sortedProducts = Object.entries(productSales)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity);

  // Pega os 5 primeiros
  const top5Products = sortedProducts.slice(0, 5);

  // Calcula o total de vendas
  const totalSales = top5Products.reduce((sum, product) => sum + product.quantity, 0);

  console.log('📊 Top 5 produtos mais vendidos:', top5Products);
  console.log('📊 Total de vendas:', totalSales);

  return {
    products: top5Products,
    totalSales,
    totalProducts: sortedProducts.length
  };
}

/**
 * Gera o gráfico de produtos mais vendidos usando QuickChart
 * @param {Object} bestProductsData - Dados dos produtos mais vendidos
 * @returns {string} - URL do gráfico gerado
 */
function generateBestProductsChart(bestProductsData) {
  console.log('📊 Gerando gráfico de produtos mais vendidos...');

  if (!bestProductsData.products || bestProductsData.products.length === 0) {
    console.log('⚠️ Nenhum produto encontrado para gerar gráfico');
    return null;
  }

  // Prepara os dados para o gráfico
  const labels = bestProductsData.products.map(product => product.name);
  const data = bestProductsData.products.map(product => product.quantity);

  // Configuração do gráfico Chart.js
  const chartConfig = {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF'
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      plugins: {
        doughnutlabel: {
          labels: [
            {
              text: bestProductsData.totalSales.toString(),
              font: { size: 20 }
            },
            {
              text: 'total'
            }
          ]
        }
      },
      responsive: true,
      maintainAspectRatio: false
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
  calculateBestProducts,
  generateBestProductsChart
};
