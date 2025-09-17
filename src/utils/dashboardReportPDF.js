const PDFDocument = require('pdfkit');
const axios = require('axios');

/**
 * Baixa uma imagem de uma URL e retorna como Buffer (trabalha apenas em memória)
 * @param {string} url - URL da imagem
 * @returns {Promise<Buffer>} - Buffer da imagem
 */
async function downloadImage(url) {
  try {
    console.log('📊 Tentando baixar imagem de:', url);

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000, // 10 segundos de timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const buffer = Buffer.from(response.data);
    console.log('📊 Imagem baixada com sucesso, tamanho:', buffer.length, 'bytes');

    return buffer;
  } catch (error) {
    console.error('❌ Erro ao baixar imagem:', error.message);
    if (error.response) {
      console.error('❌ Status:', error.response.status);
      console.error('❌ Headers:', error.response.headers);
    }
    return null;
  }
}

/**
 * Traduz o status do caixa para português
 * @param {string} status - Status em inglês
 * @returns {string} - Status em português
 */
function translateStatus(status) {
  const statusMap = {
    'OPEN': 'Aberto',
    'CLOSED': 'Fechado',
  };

  return statusMap[status?.toLowerCase()] || status;
}

/**
 * Retorna a cor para cada método de pagamento
 * @param {string} method - Método de pagamento
 * @returns {string} - Cor hexadecimal
 */
function getPaymentMethodColor(method) {
  const colorMap = {
    'PIX': '#00C851',        // Verde
    'DINHEIRO': '#FF8800',   // Laranja
    'CREDITO': '#2196F3',    // Azul
    'DEBITO': '#FF5722',     // Vermelho
    'CARTAO': '#9C27B0',     // Roxo
    'TRANSFERENCIA': '#607D8B', // Azul acinzentado
    'BOLETO': '#795548',     // Marrom
    'CHEQUE': '#FFC107',     // Amarelo
  };

  return colorMap[method?.toUpperCase()] || '#6c757d'; // Cinza padrão
}

/**
 * Gera PDF de relatório do dashboard
 * @param {Object} reportData - Dados do relatório
 * @returns {Promise<Buffer>} - Buffer do PDF gerado
 */
async function generateDashboardReportPDF(reportData) {
  return new Promise(async (resolve, reject) => {
    try {
      // Debug: Log dos dados recebidos
      console.log('📊 Dados do relatório recebidos:');
      console.log('- Total de caixas:', reportData.summary?.totalCashRegisters);
      console.log('- Valor total:', reportData.summary?.totals?.finalValue);
      console.log('- Incluir detalhes:', reportData.includeDetails);
      console.log('- Primeiro caixa tem transações:', reportData.cashRegisters?.[0]?.transactions ? 'Sim' : 'Não');
      if (reportData.cashRegisters?.[0]?.transactions) {
        console.log('- Transações do primeiro caixa:', {
          vehicle: reportData.cashRegisters[0].transactions.vehicle?.length || 0,
          product: reportData.cashRegisters[0].transactions.product?.length || 0,
          outgoing: reportData.cashRegisters[0].transactions.outgoing?.length || 0
        });
      }

      // Cria o documento PDF com configurações otimizadas
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        compress: true, // Comprime o PDF para reduzir tamanho
        autoFirstPage: true
      });
      const chunks = [];

      doc.on('data', (chunk) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          console.log(`📄 PDF gerado com sucesso, tamanho: ${pdfBuffer.length} bytes`);

          // Validação do tamanho do PDF (limite de 10MB)
          const maxSize = 10 * 1024 * 1024; // 10MB
          if (pdfBuffer.length > maxSize) {
            console.warn(`⚠️ PDF muito grande: ${pdfBuffer.length} bytes (limite: ${maxSize} bytes)`);
          }

          resolve(pdfBuffer);
        } catch (error) {
          console.error('❌ Erro ao concatenar chunks do PDF:', error);
          reject(error);
        }
      });

      doc.on('error', (error) => {
        console.error('❌ Erro no documento PDF:', error);
        reject(error);
      });

      // Cabeçalho
      doc.fillColor('#2c3e50')
        .rect(0, 0, 595, 100)
        .fill();

      doc.fillColor('white')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('RELATÓRIO Leão Estacionamento', 0, 30, { align: 'center', width: 595 });

      // Usa as datas dos caixas encontrados (primeiro e último)
      if (reportData.cashRegisters && reportData.cashRegisters.length > 0) {
        const firstCash = reportData.cashRegisters[0];
        const lastCash = reportData.cashRegisters[reportData.cashRegisters.length - 1];

        // Extrai apenas a parte da data sem conversão de timezone
        const startDateStr = new Date(firstCash.openingDate).toISOString().split('T')[0];
        const endDateStr = new Date(lastCash.openingDate).toISOString().split('T')[0];

        // Converte para formato brasileiro (DD/MM/AAAA)
        const startDate = startDateStr.split('-').reverse().join('/');
        const endDate = endDateStr.split('-').reverse().join('/');

        doc.fontSize(14)
          .text(`Período: ${startDate} a ${endDate}`, 0, 70, { align: 'center', width: 595 });
      } else {
        doc.fontSize(14)
          .text('Período: Todos os registros', 0, 70, { align: 'center', width: 595 });
      }

      // Volta para cor preta
      doc.fillColor('black');

      // Resumo executivo
      const summaryY = doc.y + 20;
      doc.fillColor('#34495e')
        .rect(50, summaryY, 495, 30)
        .fill();

      doc.fillColor('white')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('RESUMO EXECUTIVO', 60, summaryY + 8);

      doc.moveDown(1);

      // Cards de resumo executivo em layout 3x2
      const cardWidth = 120; // 150 - 20% = 120
      const cardHeight = 64; // 80 - 20% = 64
      const cardSpacing = 15;
      const totalCardsWidth = (cardWidth * 3) + (cardSpacing * 2); // 3 cards + 2 espaços
      const startX = (doc.page.width - totalCardsWidth) / 2; // Centraliza os cards
      const cardY = doc.y;

      // Calcula o lucro total
      const totalProfit = reportData.summary.totals.finalValue - reportData.summary.totals.initialValue;

      // Primeira linha (3 cards)
      // Card 1: Total de Caixas
      doc.fillColor('#3498db')
        .rect(startX, cardY, cardWidth, cardHeight)
        .fill();

      doc.fillColor('white')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('CAIXAS', startX + 8, cardY + 8);

      doc.fontSize(20)
        .text(reportData.summary.totalCashRegisters.toString(), startX + 8, cardY + 25);

      // Card 2: Valor Total
      doc.fillColor('#27ae60')
        .rect(startX + cardWidth + cardSpacing, cardY, cardWidth, cardHeight)
        .fill();

      doc.fillColor('white')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('VALOR TOTAL', startX + cardWidth + cardSpacing + 8, cardY + 8);

      doc.fontSize(16)
        .text(`R$ ${reportData.summary.totals.finalValue.toFixed(2)}`, startX + cardWidth + cardSpacing + 8, cardY + 25);

      // Card 3: Lucro
      doc.fillColor('#e74c3c')
        .rect(startX + (cardWidth + cardSpacing) * 2, cardY, cardWidth, cardHeight)
        .fill();

      doc.fillColor('white')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('LUCRO', startX + (cardWidth + cardSpacing) * 2 + 8, cardY + 8);

      doc.fontSize(16)
        .text(`R$ ${totalProfit.toFixed(2)}`, startX + (cardWidth + cardSpacing) * 2 + 8, cardY + 25);

      // Segunda linha (3 cards)
      const secondRowY = cardY + cardHeight + 15;

      // Card 4: Veículos
      doc.fillColor('#9b59b6')
        .rect(startX, secondRowY, cardWidth, cardHeight)
        .fill();

      doc.fillColor('white')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('VEÍCULOS', startX + 8, secondRowY + 8);

      doc.fontSize(16)
        .text(`R$ ${reportData.summary.totals.vehicleEntryTotal.toFixed(2)}`, startX + 8, secondRowY + 25);

      // Card 5: Produtos
      doc.fillColor('#f39c12')
        .rect(startX + cardWidth + cardSpacing, secondRowY, cardWidth, cardHeight)
        .fill();

      doc.fillColor('white')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('PRODUTOS', startX + cardWidth + cardSpacing + 8, secondRowY + 8);

      doc.fontSize(16)
        .text(`R$ ${reportData.summary.totals.generalSaleTotal.toFixed(2)}`, startX + cardWidth + cardSpacing + 8, secondRowY + 25);

      // Card 6: Despesas
      doc.fillColor('#e67e22')
        .rect(startX + (cardWidth + cardSpacing) * 2, secondRowY, cardWidth, cardHeight)
        .fill();

      doc.fillColor('white')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('DESPESAS', startX + (cardWidth + cardSpacing) * 2 + 8, secondRowY + 8);

      doc.fontSize(16)
        .text(`R$ ${reportData.summary.totals.outgoingExpenseTotal.toFixed(2)}`, startX + (cardWidth + cardSpacing) * 2 + 8, secondRowY + 25);

      // Terceira linha (2 cards) - Análise de Tempo
      const thirdRowY = secondRowY + cardHeight + 15;

      // Card 7: Tempo Total
      doc.fillColor('#8e44ad')
        .rect(startX, thirdRowY, cardWidth, cardHeight)
        .fill();

      doc.fillColor('white')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('TEMPO TOTAL', startX + 8, thirdRowY + 8);

      const totalTimeText = reportData.summary.timeAnalysis?.totalOpenTime ?
        `${reportData.summary.timeAnalysis.totalOpenTime.hours}h ${reportData.summary.timeAnalysis.totalOpenTime.minutes}min` :
        'N/A';

      doc.fontSize(14)
        .text(totalTimeText, startX + 8, thirdRowY + 25);

      // Card 8: Tempo Médio
      doc.fillColor('#16a085')
        .rect(startX + cardWidth + cardSpacing, thirdRowY, cardWidth, cardHeight)
        .fill();

      doc.fillColor('white')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('TEMPO MÉDIO', startX + cardWidth + cardSpacing + 8, thirdRowY + 8);

      const avgTimeText = reportData.summary.timeAnalysis?.averageOpenTime ?
        `${reportData.summary.timeAnalysis.averageOpenTime.hours}h ${reportData.summary.timeAnalysis.averageOpenTime.minutes}min` :
        'N/A';

      doc.fontSize(14)
        .text(avgTimeText, startX + cardWidth + cardSpacing + 8, thirdRowY + 25);

      doc.fillColor('black');
      doc.y = thirdRowY + cardHeight + 20;

      doc.moveDown(1);

      // Detalhes dos caixas no resumo
      if (reportData.cashRegisters && Array.isArray(reportData.cashRegisters) && reportData.cashRegisters.length > 0) {
        // Cabeçalho da seção de detalhes
        const detailsHeaderY = doc.y - 10;
        doc.fillColor('#34495e')
          .rect(50, detailsHeaderY, 495, 25)
          .fill();

        doc.fillColor('white')
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('DETALHES DOS CAIXAS', 60, detailsHeaderY + 6);

        doc.fillColor('black');
        doc.y = detailsHeaderY + 35;

        // Tabela de detalhes dos caixas
        const tableStartY = doc.y;
        const colWidths = [50, 100, 80, 80, 80, 80];
        const rowHeight = 20;

        // Cabeçalho da tabela
        doc.fillColor('#95a5a6')
          .rect(60, tableStartY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
          .fill();

        doc.fillColor('white')
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('Caixa', 65, tableStartY + 5)
          .text('Data', 65 + colWidths[0], tableStartY + 5)
          .text('Valor Final', 65 + colWidths[0] + colWidths[1], tableStartY + 5)
          .text('Veículos', 65 + colWidths[0] + colWidths[1] + colWidths[2], tableStartY + 5)
          .text('Produtos', 65 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], tableStartY + 5)
          .text('Despesas', 65 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], tableStartY + 5);

        // Dados dos caixas com paginação
        let currentPageStartY = tableStartY;
        let currentRowIndex = 0;
        const maxRowsPerPage = Math.floor((doc.page.height - 100 - currentPageStartY) / rowHeight) - 1; // -1 para o cabeçalho

        reportData.cashRegisters.forEach((cash, index) => {
          // Verifica se precisa de nova página
          if (currentRowIndex >= maxRowsPerPage) {
            doc.addPage();
            currentPageStartY = 50;
            currentRowIndex = 0;

            // Redesenha o cabeçalho na nova página
            doc.fillColor('#95a5a6')
              .rect(60, currentPageStartY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
              .fill();

            doc.fillColor('white')
              .fontSize(9)
              .font('Helvetica-Bold')
              .text('Caixa', 65, currentPageStartY + 5)
              .text('Data', 65 + colWidths[0], currentPageStartY + 5)
              .text('Valor Final', 65 + colWidths[0] + colWidths[1], currentPageStartY + 5)
              .text('Veículos', 65 + colWidths[0] + colWidths[1] + colWidths[2], currentPageStartY + 5)
              .text('Produtos', 65 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], currentPageStartY + 5)
              .text('Despesas', 65 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], currentPageStartY + 5);
          }

          const rowY = currentPageStartY + (currentRowIndex + 1) * rowHeight;

          // Alterna cor de fundo
          if (index % 2 === 0) {
            doc.fillColor('#f8f9fa')
              .rect(60, rowY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
              .fill();
          }

          // Formata a data do caixa
          let cashDate = 'Data não disponível';
          try {
            if (cash.openingDate) {
              const openingDate = new Date(cash.openingDate);
              if (!isNaN(openingDate.getTime())) {
                cashDate = openingDate.toLocaleDateString('pt-BR');
              }
            }
          } catch (error) {
            console.warn('Erro ao formatar data do caixa:', error.message);
          }

          doc.fillColor('black')
            .fontSize(8)
            .font('Helvetica')
            .text(`Caixa ${index + 1}`, 65, rowY + 5)
            .text(cashDate, 65 + colWidths[0], rowY + 5)
            .text(`R$ ${cash.finalValue.toFixed(2)}`, 65 + colWidths[0] + colWidths[1], rowY + 5)
            .text(`R$ ${cash.vehicleEntryTotal.toFixed(2)}`, 65 + colWidths[0] + colWidths[1] + colWidths[2], rowY + 5)
            .text(`R$ ${cash.generalSaleTotal.toFixed(2)}`, 65 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowY + 5)
            .text(`R$ ${cash.outgoingExpenseTotal.toFixed(2)}`, 65 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], rowY + 5);

          currentRowIndex++;
        });

        // Ajusta a posição Y final considerando a paginação
        const totalPages = Math.ceil(reportData.cashRegisters.length / maxRowsPerPage);
        if (totalPages > 1) {
          // Se houve paginação, posiciona no final da última página
          doc.y = 50 + ((reportData.cashRegisters.length % maxRowsPerPage) + 1) * rowHeight + 20;
        } else {
          // Se não houve paginação, usa o cálculo original
          doc.y = tableStartY + (reportData.cashRegisters.length + 1) * rowHeight + 20;
        }
        console.log('✅ Detalhes dos caixas adicionados ao resumo');
      }

      // Seção de gráficos solicitados - NOVA PÁGINA
      if (reportData.charts && Object.keys(reportData.charts).length > 0) {
        // Força nova página para os gráficos
        doc.addPage();

        // Cabeçalho da seção
        const chartSectionY = doc.y - 10;
        doc.fillColor('#8e44ad')
          .rect(50, chartSectionY, 495, 25)
          .fill();

        doc.fillColor('white')
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('GRÁFICOS E ANÁLISES', 60, chartSectionY + 6);

        doc.fillColor('black');
        doc.y = chartSectionY + 30;

        // Processa cada gráfico solicitado
        for (const [chartType, chartData] of Object.entries(reportData.charts)) {
          try {
            console.log(`📊 Processando gráfico: ${chartType}`);

            // Título do gráfico
            const chartTitle = getChartTitle(chartType);
            doc.fontSize(12)
              .font('Helvetica-Bold')
              .text(chartTitle, 60, doc.y);

            doc.y += 15;

            // Gera e baixa o gráfico (trabalha apenas em memória)
            if (chartData.chartUrl) {
              console.log(`📊 Gerando gráfico ${chartType}:`, chartData.chartUrl);

              // Baixa a imagem do QuickChart diretamente em memória
              const imageBuffer = await downloadImage(chartData.chartUrl);

              if (imageBuffer) {
                // Adiciona o gráfico ao PDF
                const chartWidth = 300;
                const chartHeight = 150;
                const chartX = (doc.page.width - chartWidth) / 2;

                doc.image(imageBuffer, chartX, doc.y, {
                  width: chartWidth,
                  height: chartHeight
                });

                doc.y += chartHeight + 20;
                console.log(`✅ Gráfico ${chartType} adicionado ao PDF`);
              } else {
                console.log(`⚠️ Falha ao baixar gráfico ${chartType}, continuando sem gráfico`);
              }
            } else {
              console.log(`⚠️ URL do gráfico ${chartType} não disponível`);
            }

            // Adiciona descrição específica do gráfico
            const chartDescription = getChartDescription(chartType, chartData);
            if (chartDescription) {
              doc.fontSize(10)
                .font('Helvetica-Bold')
                .text('DESCRIÇÃO:', 60, doc.y);

              doc.y += 8;

              doc.fontSize(9)
                .font('Helvetica')
                .text(chartDescription, 60, doc.y, {
                  width: 475,
                  align: 'left'
                });

              doc.y += 20;
            }

            // Adiciona tabela de dados se disponível
            if (chartData.groups && Array.isArray(chartData.groups)) {
              doc.fontSize(12)
                .font('Helvetica-Bold')
                .text('RESUMO DOS DADOS:', 60, doc.y);

              doc.moveDown(0.5);

              // Tabela com dados
              const tableStartY = doc.y;
              const colWidths = [80, 100, 120, 100];
              const rowHeight = 20;

              // Cabeçalho da tabela
              doc.fillColor('#95a5a6')
                .rect(60, tableStartY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
                .fill();

              doc.fillColor('white')
                .fontSize(10)
                .font('Helvetica-Bold')
                .text('Grupo', 65, tableStartY + 5)
                .text('Caixas', 65 + colWidths[0], tableStartY + 5)
                .text('Lucro Total', 65 + colWidths[0] + colWidths[1], tableStartY + 5)
                .text('Lucro Médio', 65 + colWidths[0] + colWidths[1] + colWidths[2], tableStartY + 5);

              // Dados dos grupos
              chartData.groups.forEach((group, index) => {
                const rowY = tableStartY + (index + 1) * rowHeight;

                // Alterna cor de fundo
                if (index % 2 === 0) {
                  doc.fillColor('#f8f9fa')
                    .rect(60, rowY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
                    .fill();
                }

                // Formata o nome do grupo com as datas
                const startDate = new Date(group.startDate);
                const endDate = new Date(group.endDate);
                const startStr = startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                const endStr = endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                const groupName = `${startStr} - ${endStr}`;

                doc.fillColor('black')
                  .fontSize(9)
                  .font('Helvetica')
                  .text(groupName, 65, rowY + 5)
                  .text(group.cashCount.toString(), 65 + colWidths[0], rowY + 5)
                  .text(`R$ ${group.totalProfit.toFixed(2)}`, 65 + colWidths[0] + colWidths[1], rowY + 5)
                  .text(`R$ ${group.averageProfit.toFixed(2)}`, 65 + colWidths[0] + colWidths[1] + colWidths[2], rowY + 5);
              });

              doc.y = tableStartY + (chartData.groups.length + 1) * rowHeight + 20;
            }

            // Tabela específica para produtos mais vendidos
            if (chartType === 'bestProducts' && chartData.products && Array.isArray(chartData.products)) {
              doc.fontSize(12)
                .font('Helvetica-Bold')
                .text('RANKING DOS PRODUTOS:', 60, doc.y);

              doc.moveDown(0.5);

              // Tabela com dados dos produtos
              const tableStartY = doc.y;
              const colWidths = [50, 200, 100];
              const rowHeight = 20;

              // Cabeçalho da tabela
              doc.fillColor('#95a5a6')
                .rect(60, tableStartY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
                .fill();

              doc.fillColor('white')
                .fontSize(10)
                .font('Helvetica-Bold')
                .text('Pos.', 65, tableStartY + 5)
                .text('Produto', 65 + colWidths[0], tableStartY + 5)
                .text('Quantidade', 65 + colWidths[0] + colWidths[1], tableStartY + 5);

              // Dados dos produtos
              chartData.products.forEach((product, index) => {
                const rowY = tableStartY + (index + 1) * rowHeight;

                // Alterna cor de fundo
                if (index % 2 === 0) {
                  doc.fillColor('#f8f9fa')
                    .rect(60, rowY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
                    .fill();
                }

                doc.fillColor('black')
                  .fontSize(9)
                  .font('Helvetica')
                  .text(`${index + 1}º`, 65, rowY + 5)
                  .text(product.name, 65 + colWidths[0], rowY + 5)
                  .text(product.quantity.toString(), 65 + colWidths[0] + colWidths[1], rowY + 5);
              });

              doc.y = tableStartY + (chartData.products.length + 1) * rowHeight + 20;
            }

            // Tabela específica para comparação de saídas
            if (chartType === 'expensesBreakdown' && chartData.summary) {
              doc.fontSize(12)
                .font('Helvetica-Bold')
                .text('RESUMO DAS SAÍDAS:', 60, doc.y);

              doc.moveDown(0.5);

              // Tabela com dados das saídas
              const tableStartY = doc.y;
              const colWidths = [150, 100, 100, 100];
              const rowHeight = 20;

              // Cabeçalho da tabela
              doc.fillColor('#95a5a6')
                .rect(60, tableStartY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
                .fill();

              doc.fillColor('white')
                .fontSize(10)
                .font('Helvetica-Bold')
                .text('Tipo de Transação', 65, tableStartY + 5)
                .text('Quantidade', 65 + colWidths[0], tableStartY + 5)
                .text('Percentual', 65 + colWidths[0] + colWidths[1], tableStartY + 5)
                .text('Cor no Gráfico', 65 + colWidths[0] + colWidths[1] + colWidths[2], tableStartY + 5);

              // Dados das saídas
              const breakdownData = [
                {
                  type: 'Veículos',
                  quantity: chartData.summary.totalVehicles || 0,
                  color: 'Azul'
                },
                {
                  type: 'Produtos',
                  quantity: chartData.summary.totalProducts || 0,
                  color: 'Verde'
                },
                {
                  type: 'Gastos',
                  quantity: chartData.summary.totalExpenses || 0,
                  color: 'Laranja'
                }
              ];

              const totalTransactions = chartData.summary.totalTransactions || 1; // Evita divisão por zero

              breakdownData.forEach((item, index) => {
                const rowY = tableStartY + (index + 1) * rowHeight;
                const percentage = ((item.quantity / totalTransactions) * 100).toFixed(1);

                // Alterna cor de fundo
                if (index % 2 === 0) {
                  doc.fillColor('#f8f9fa')
                    .rect(60, rowY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
                    .fill();
                }

                doc.fillColor('black')
                  .fontSize(9)
                  .font('Helvetica')
                  .text(item.type, 65, rowY + 5)
                  .text(item.quantity.toString(), 65 + colWidths[0], rowY + 5)
                  .text(`${percentage}%`, 65 + colWidths[0] + colWidths[1], rowY + 5)
                  .text(item.color, 65 + colWidths[0] + colWidths[1] + colWidths[2], rowY + 5);
              });

              // Linha de total
              const totalRowY = tableStartY + (breakdownData.length + 1) * rowHeight;
              doc.fillColor('#e9ecef')
                .rect(60, totalRowY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
                .fill();

              doc.fillColor('black')
                .fontSize(9)
                .font('Helvetica-Bold')
                .text('TOTAL', 65, totalRowY + 5)
                .text(totalTransactions.toString(), 65 + colWidths[0], totalRowY + 5)
                .text('100.0%', 65 + colWidths[0] + colWidths[1], totalRowY + 5)
                .text('-', 65 + colWidths[0] + colWidths[1] + colWidths[2], totalRowY + 5);

              doc.y = totalRowY + rowHeight + 20;
            }

            // Tabela específica para análise por horário
            if (chartType === 'hourlyAnalysis' && chartData.summary) {
              doc.fontSize(12)
                .font('Helvetica-Bold')
                .text('ANÁLISE POR PERÍODO:', 60, doc.y);

              doc.moveDown(0.5);

              // Tabela com dados dos períodos
              const tableStartY = doc.y;
              const colWidths = [100, 100, 150, 100];
              const rowHeight = 20;

              // Cabeçalho da tabela
              doc.fillColor('#95a5a6')
                .rect(60, tableStartY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
                .fill();

              doc.fillColor('white')
                .fontSize(10)
                .font('Helvetica-Bold')
                .text('Período', 65, tableStartY + 5)
                .text('Horário', 65 + colWidths[0], tableStartY + 5)
                .text('Entradas', 65 + colWidths[0] + colWidths[1], tableStartY + 5)
                .text('Tempo Médio', 65 + colWidths[0] + colWidths[1] + colWidths[2], tableStartY + 5);

              // Dados dos períodos
              const hourlyData = [
                {
                  period: 'Manhã',
                  timeRange: '9h às 12h',
                  entries: chartData.summary.morning?.entries || 0,
                  avgTime: chartData.summary.morning?.averageTime || 0
                },
                {
                  period: 'Tarde',
                  timeRange: '12h às 15h',
                  entries: chartData.summary.afternoon?.entries || 0,
                  avgTime: chartData.summary.afternoon?.averageTime || 0
                },
                {
                  period: 'Noite',
                  timeRange: '15h às 18h',
                  entries: chartData.summary.night?.entries || 0,
                  avgTime: chartData.summary.night?.averageTime || 0
                }
              ];

              hourlyData.forEach((item, index) => {
                const rowY = tableStartY + (index + 1) * rowHeight;

                // Alterna cor de fundo
                if (index % 2 === 0) {
                  doc.fillColor('#f8f9fa')
                    .rect(60, rowY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
                    .fill();
                }

                // Formata o tempo médio
                const avgTimeFormatted = item.avgTime > 0 ? `${item.avgTime} min` : 'N/A';

                doc.fillColor('black')
                  .fontSize(9)
                  .font('Helvetica')
                  .text(item.period, 65, rowY + 5)
                  .text(item.timeRange, 65 + colWidths[0], rowY + 5)
                  .text(item.entries.toString(), 65 + colWidths[0] + colWidths[1], rowY + 5)
                  .text(avgTimeFormatted, 65 + colWidths[0] + colWidths[1] + colWidths[2], rowY + 5);
              });

              // Linha de total
              const totalRowY = tableStartY + (hourlyData.length + 1) * rowHeight;
              doc.fillColor('#e9ecef')
                .rect(60, totalRowY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
                .fill();

              doc.fillColor('black')
                .fontSize(9)
                .font('Helvetica-Bold')
                .text('TOTAL', 65, totalRowY + 5)
                .text('-', 65 + colWidths[0], totalRowY + 5)
                .text(chartData.summary.totalEntries?.toString() || '0', 65 + colWidths[0] + colWidths[1], totalRowY + 5)
                .text('-', 65 + colWidths[0] + colWidths[1] + colWidths[2], totalRowY + 5);

              doc.y = totalRowY + rowHeight + 20;
            }

            doc.y += 60; // Espaço entre gráficos (aumentado)

          } catch (error) {
            console.error(`❌ Erro ao processar gráfico ${chartType}:`, error.message);
          }
        }

        console.log('✅ Seção de gráficos adicionada ao PDF');
      }

      // Força nova página para os detalhes dos caixas
      doc.addPage();

      // Detalhes por caixa - NOVA ESTRUTURA COM PAGINAÇÃO
      if (reportData.cashRegisters && Array.isArray(reportData.cashRegisters) && reportData.cashRegisters.length > 0) {
        // Cabeçalho da seção
        const detailsY = doc.y - 10;
        doc.fillColor('#34495e')
          .rect(50, detailsY, 495, 30)
          .fill();

        doc.fillColor('white')
          .fontSize(18)
          .font('Helvetica-Bold')
          .text('DETALHES POR CAIXA', 60, detailsY + 5);

        doc.fillColor('black');
        doc.y = detailsY + 40;

        // Processa cada caixa individualmente
        reportData.cashRegisters.forEach((cash, index) => {
          // Verifica se precisa de nova página baseado no espaço disponível
          const cashBoxHeight = reportData.includeDetails ? 420 : 175; // Altura estimada: 420 com detalhes, 175 sem detalhes (com tempo de funcionamento)
          const availableHeight = doc.page.height - doc.y - 50; // Espaço disponível na página

          // Se não é o primeiro caixa e não há espaço suficiente, adiciona nova página
          if (index > 0 && availableHeight < cashBoxHeight) {
            doc.addPage();
          }

          // Cabeçalho do caixa
          const cashHeaderY = doc.y - 10;
          doc.fillColor('#8e44ad')
            .rect(50, cashHeaderY, 495, 30)
            .fill();

          // Formata a data do caixa
          let cashDate = 'Data não disponível';
          let openingTime = 'Horário não disponível';
          let closingTime = 'Não registrado';

          try {
            if (cash.openingDate) {
              const openingDate = new Date(cash.openingDate);
              if (!isNaN(openingDate.getTime())) {
                cashDate = openingDate.toLocaleDateString('pt-BR');
                openingTime = openingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              }
            }
          } catch (error) {
            console.warn('Erro ao formatar data de abertura:', error.message);
          }

          try {
            if (cash.closingDate) {
              const closingDate = new Date(cash.closingDate);
              if (!isNaN(closingDate.getTime())) {
                closingTime = closingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              }
            }
          } catch (error) {
            console.warn('Erro ao formatar data de fechamento:', error.message);
          }

          doc.fillColor('white')
            .fontSize(16)
            .font('Helvetica-Bold')
            .text(`CAIXA ${index + 1} - ${cashDate}`, 60, cashHeaderY + 5);

          doc.fillColor('black');
          doc.y = cashHeaderY + 40;

          // Informações principais do caixa com melhor estilização
          const infoY = doc.y;
          const infoBoxWidth = 475;
          const infoBoxHeight = 80; // Aumentado para acomodar a segunda linha
          const infoBoxX = 60;

          // Fundo da caixa de informações
          doc.fillColor('#f8f9fa')
            .rect(infoBoxX, infoY, infoBoxWidth, infoBoxHeight)
            .fill();

          doc.strokeColor('#dee2e6')
            .lineWidth(1)
            .rect(infoBoxX, infoY, infoBoxWidth, infoBoxHeight)
            .stroke();

          // Título da seção
          doc.fillColor('#495057')
            .fontSize(11)
            .font('Helvetica-Bold')
            .text('INFORMAÇÕES DO CAIXA', infoBoxX + 10, infoY + 8);

          // Linha separadora
          doc.strokeColor('#dee2e6')
            .lineWidth(0.5)
            .moveTo(infoBoxX + 10, infoY + 20)
            .lineTo(infoBoxX + infoBoxWidth - 10, infoY + 20)
            .stroke();

          // Informações em grid
          const gridY = infoY + 25;
          const col1X = infoBoxX + 15;
          const col2X = infoBoxX + 150;
          const col3X = infoBoxX + 300;
          const rowHeight = 12;

          // Coluna 1: Operador
          doc.fillColor('#6c757d')
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('OPERADOR:', col1X, gridY);

          doc.fillColor('#212529')
            .fontSize(10)
            .font('Helvetica')
            .text(cash.operator || 'N/A', col1X, gridY + rowHeight);

          // Coluna 2: Abertura
          doc.fillColor('#6c757d')
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('ABERTURA:', col2X, gridY);

          doc.fillColor('#212529')
            .fontSize(10)
            .font('Helvetica')
            .text(openingTime, col2X, gridY + rowHeight);

          // Coluna 3: Fechamento
          doc.fillColor('#6c757d')
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('FECHAMENTO:', col3X, gridY);

          doc.fillColor('#212529')
            .fontSize(10)
            .font('Helvetica')
            .text(closingTime, col3X, gridY + rowHeight);

          // Segunda linha: Tempo de funcionamento
          const secondRowY = gridY + rowHeight + 8;

          // Tempo de funcionamento
          doc.fillColor('#6c757d')
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('TEMPO DE FUNCIONAMENTO:', col1X, secondRowY);

          doc.fillColor('#212529')
            .fontSize(10)
            .font('Helvetica')
            .text(cash.openTime?.formatted || 'Não fechado', col1X, secondRowY + rowHeight);

          doc.y = infoY + infoBoxHeight + 20;

          // Cards de valores do caixa (centralizados)
          const valueCardWidth = 120;
          const valueCardHeight = 50;
          const valueCardSpacing = 15;
          const totalCardsWidth = (valueCardWidth * 3) + (valueCardSpacing * 2);
          const valueStartX = (doc.page.width - totalCardsWidth) / 2; // Centraliza os cards
          const cardY = doc.y;

          // Card Valor Inicial
          doc.fillColor('#3498db')
            .rect(valueStartX, cardY, valueCardWidth, valueCardHeight)
            .fill();

          doc.strokeColor('#3498db')
            .lineWidth(1.5)
            .rect(valueStartX, cardY, valueCardWidth, valueCardHeight)
            .stroke();

          doc.fillColor('white')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('VALOR INICIAL', valueStartX + 8, cardY + 8)
            .fontSize(14)
            .text(`R$ ${cash.initialValue.toFixed(2)}`, valueStartX + 8, cardY + 25);

          // Card Valor Final
          doc.fillColor('#27ae60')
            .rect(valueStartX + valueCardWidth + valueCardSpacing, cardY, valueCardWidth, valueCardHeight)
            .fill();

          doc.strokeColor('#27ae60')
            .lineWidth(1.5)
            .rect(valueStartX + valueCardWidth + valueCardSpacing, cardY, valueCardWidth, valueCardHeight)
            .stroke();

          doc.fillColor('white')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('VALOR FINAL', valueStartX + valueCardWidth + valueCardSpacing + 8, cardY + 8)
            .fontSize(14)
            .text(`R$ ${cash.finalValue.toFixed(2)}`, valueStartX + valueCardWidth + valueCardSpacing + 8, cardY + 25);

          // Card Lucro
          const cashProfit = cash.finalValue - cash.initialValue;
          doc.fillColor('#e74c3c')
            .rect(valueStartX + (valueCardWidth + valueCardSpacing) * 2, cardY, valueCardWidth, valueCardHeight)
            .fill();

          doc.strokeColor('#e74c3c')
            .lineWidth(1.5)
            .rect(valueStartX + (valueCardWidth + valueCardSpacing) * 2, cardY, valueCardWidth, valueCardHeight)
            .stroke();

          doc.fillColor('white')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('LUCRO', valueStartX + (valueCardWidth + valueCardSpacing) * 2 + 8, cardY + 8)
            .fontSize(14)
            .text(`R$ ${cashProfit.toFixed(2)}`, valueStartX + (valueCardWidth + valueCardSpacing) * 2 + 8, cardY + 25);

          doc.y = cardY + valueCardHeight + 20; // Aumenta o espaçamento entre os cards e o resumo das transações

          // Se não incluir detalhes, mostra apenas um resumo compacto
          if (!reportData.includeDetails) {
            // Resumo compacto das transações
            const summaryY = doc.y;
            const summaryHeight = 40;

            // Fundo do resumo
            doc.fillColor('#f8f9fa')
              .rect(60, summaryY, 475, summaryHeight)
              .fill();

            doc.strokeColor('#dee2e6')
              .lineWidth(1)
              .rect(60, summaryY, 475, summaryHeight)
              .stroke();

            // Título do resumo
            doc.fillColor('#495057')
              .fontSize(10)
              .font('Helvetica-Bold')
              .text('RESUMO DAS TRANSAÇÕES', 70, summaryY + 8);

            // Dados do resumo
            const vehicleCount = typeof cash.transactions.vehicle === 'number' ? cash.transactions.vehicle : (cash.transactions.vehicle?.length || 0);
            const productCount = typeof cash.transactions.product === 'number' ? cash.transactions.product : (cash.transactions.product?.length || 0);
            const outgoingCount = typeof cash.transactions.outgoing === 'number' ? cash.transactions.outgoing : (cash.transactions.outgoing?.length || 0);

            doc.fillColor('#212529')
              .fontSize(9)
              .font('Helvetica')
              .text(`Veículos: ${vehicleCount}`, 70, summaryY + 20)
              .text(`Produtos: ${productCount}`, 200, summaryY + 20)
              .text(`Despesas: ${outgoingCount}`, 330, summaryY + 20);

            doc.y = summaryY + summaryHeight + 2; // Espaçamento mínimo após o resumo
          } else if (cash.transactions) {
            // Transações detalhadas - só mostra se includeDetails for true
            // Cabeçalho da seção de transações
            const transactionsHeaderY = doc.y - 10;
            doc.fillColor('#6c757d')
              .rect(50, transactionsHeaderY, 495, 25)
              .fill();

            doc.fillColor('white')
              .fontSize(14)
              .font('Helvetica-Bold')
              .text('TRANSAÇÕES DO CAIXA', 60, transactionsHeaderY + 6);

            doc.fillColor('black');
            doc.y = transactionsHeaderY + 35;

            // Transações de Veículos
            if (cash.transactions.vehicle && Array.isArray(cash.transactions.vehicle) && cash.transactions.vehicle.length > 0) {
              // Subtítulo simples para veículos
              doc.fillColor('#212529')
                .fontSize(11)
                .font('Helvetica-Bold')
                .text('VEÍCULOS', 60, doc.y);

              doc.y += 15;

              cash.transactions.vehicle.forEach((transaction, transIndex) => {
                // Verifica se precisa de nova página ANTES de definir a posição
                if (doc.y > 750) {
                  doc.addPage();
                  doc.y = 50;
                }

                const transactionY = doc.y;
                const paymentMethod = transaction.method || 'N/A';

                // Alterna cor de fundo para melhor legibilidade
                if (transIndex % 2 === 0) {
                  doc.fillColor('#f8f9fa')
                    .rect(60, transactionY, 475, 20)
                    .fill();
                }

                // Borda sutil
                doc.strokeColor('#dee2e6')
                  .lineWidth(0.5)
                  .rect(60, transactionY, 475, 20)
                  .stroke();

                // Texto simples em preto
                doc.fillColor('#212529')
                  .fontSize(9)
                  .font('Helvetica')
                  .text(`${transIndex + 1}.`, 65, transactionY + 6);

                doc.fillColor('#6c757d')
                  .fontSize(8)
                  .text(new Date(transaction.transactionDate).toLocaleString('pt-BR'), 85, transactionY + 6);

                doc.fillColor('#212529')
                  .fontSize(9)
                  .text(`${transaction.vehicle?.plate || 'N/A'}`, 200, transactionY + 6);

                doc.fillColor('#212529')
                  .fontSize(9)
                  .font('Helvetica-Bold')
                  .text(`R$ ${transaction.finalAmount.toFixed(2)}`, 300, transactionY + 6);

                doc.fillColor('#6c757d')
                  .fontSize(8)
                  .text(`(${paymentMethod})`, 400, transactionY + 6);

                doc.y = transactionY + 25;
              });

              doc.y += 10;
            }

            // Transações de Produtos
            if (cash.transactions.product && Array.isArray(cash.transactions.product) && cash.transactions.product.length > 0) {
              // Subtítulo simples para produtos
              doc.fillColor('#212529')
                .fontSize(11)
                .font('Helvetica-Bold')
                .text('PRODUTOS', 60, doc.y);

              doc.y += 15;

              cash.transactions.product.forEach((transaction, transIndex) => {
                // Verifica se precisa de nova página ANTES de definir a posição
                if (doc.y > 750) {
                  doc.addPage();
                  doc.y = 50;
                }

                const transactionY = doc.y;
                const paymentMethod = transaction.method || 'N/A';

                // Alterna cor de fundo para melhor legibilidade
                if (transIndex % 2 === 0) {
                  doc.fillColor('#f8f9fa')
                    .rect(60, transactionY, 475, 20)
                    .fill();
                }

                // Borda sutil
                doc.strokeColor('#dee2e6')
                  .lineWidth(0.5)
                  .rect(60, transactionY, 475, 20)
                  .stroke();

                // Texto simples em preto
                doc.fillColor('#212529')
                  .fontSize(9)
                  .font('Helvetica')
                  .text(`${transIndex + 1}.`, 65, transactionY + 6);

                doc.fillColor('#6c757d')
                  .fontSize(8)
                  .text(new Date(transaction.transactionDate).toLocaleString('pt-BR'), 85, transactionY + 6);

                doc.fillColor('#212529')
                  .fontSize(9)
                  .font('Helvetica-Bold')
                  .text(`R$ ${transaction.finalAmount.toFixed(2)}`, 250, transactionY + 6);

                doc.fillColor('#6c757d')
                  .fontSize(8)
                  .text(`(${paymentMethod})`, 350, transactionY + 6);

                doc.y = transactionY + 25;
              });

              doc.y += 10;
            }

            // Despesas
            if (cash.transactions.outgoing && Array.isArray(cash.transactions.outgoing) && cash.transactions.outgoing.length > 0) {
              // Subtítulo simples para despesas
              doc.fillColor('#212529')
                .fontSize(11)
                .font('Helvetica-Bold')
                .text('DESPESAS', 60, doc.y);

              doc.y += 15;

              cash.transactions.outgoing.forEach((expense, expenseIndex) => {
                // Verifica se precisa de nova página ANTES de definir a posição
                if (doc.y > 750) {
                  doc.addPage();
                  doc.y = 50;
                }

                const transactionY = doc.y;
                const paymentMethod = expense.method || 'N/A';

                // Alterna cor de fundo para melhor legibilidade
                if (expenseIndex % 2 === 0) {
                  doc.fillColor('#f8f9fa')
                    .rect(60, transactionY, 475, 20)
                    .fill();
                }

                // Borda sutil
                doc.strokeColor('#dee2e6')
                  .lineWidth(0.5)
                  .rect(60, transactionY, 475, 20)
                  .stroke();

                // Texto simples em preto
                doc.fillColor('#212529')
                  .fontSize(9)
                  .font('Helvetica')
                  .text(`${expenseIndex + 1}.`, 65, transactionY + 6);

                doc.fillColor('#6c757d')
                  .fontSize(8)
                  .text(new Date(expense.transactionDate).toLocaleString('pt-BR'), 85, transactionY + 6);

                doc.fillColor('#212529')
                  .fontSize(8)
                  .text(expense.description, 200, transactionY + 6);

                doc.fillColor('#212529')
                  .fontSize(9)
                  .font('Helvetica-Bold')
                  .text(`R$ ${expense.amount.toFixed(2)}`, 350, transactionY + 6);

                doc.fillColor('#6c757d')
                  .fontSize(8)
                  .text(`(${paymentMethod})`, 450, transactionY + 6);

                doc.y = transactionY + 25;
              });

              doc.y += 10;
            }
          }

          // Espaçamento entre caixas - menor quando não há detalhes
          if (reportData.includeDetails) {
            doc.moveDown(1);
          } else {
            doc.y += 20; // Espaçamento menor entre caixas
          }
        });

        console.log('✅ Detalhes dos caixas adicionados ao PDF com paginação');
      } else {
        // Quando não há caixas
        const noDataY = doc.y - 10;
        doc.fillColor('#34495e')
          .rect(50, noDataY, 495, 30)
          .fill();

        doc.fillColor('white')
          .fontSize(18)
          .font('Helvetica-Bold')
          .text('DETALHES POR CAIXA', 60, noDataY + 5);

        doc.fillColor('black');
        doc.y = noDataY + 40;

        const messageY = doc.y;
        doc.fillColor('#f8f9fa')
          .rect(50, messageY, 495, 60)
          .fill();

        doc.fillColor('black')
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('Nenhum caixa encontrado para o período selecionado', 60, messageY + 20);

        doc.fontSize(12)
          .font('Helvetica')
          .text('Verifique se há dados cadastrados para o período especificado.', 60, messageY + 40);
      }

      // Rodapé otimizado - só se houver espaço suficiente
      if (doc.y < 720) {
        const footerY = Math.max(doc.y + 10, 750);
        doc.rect(0, footerY, 595, 40)
          .fill('#2c3e50');

        doc.fillColor('white')
          .fontSize(9)
          .font('Helvetica')
          .text('Relatório gerado automaticamente pelo Sistema de Estacionamento', 0, footerY + 8, { align: 'center', width: 595 })
          .text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 0, footerY + 20, { align: 'center', width: 595 })
          .text('Sistema de Gestão de Estacionamento - Todos os direitos reservados', 0, footerY + 32, { align: 'center', width: 595 });
      }

      // Finaliza o documento
      doc.end();

    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      reject(error);
    }
  });
}

/**
 * Retorna o título do gráfico baseado no tipo
 * @param {string} chartType - Tipo do gráfico
 * @returns {string} - Título do gráfico
 */
function getChartTitle(chartType) {
  const titles = {
    'revenueGrowth': 'CRESCIMENTO DE RECEITA',
    'bestProducts': 'PRODUTOS MAIS VENDIDOS',
    'expensesBreakdown': 'COMPARAÇÃO DE SAÍDAS',
    'hourlyAnalysis': 'ANÁLISE POR HORÁRIO',
    'parkingUsage': 'USO DO ESTACIONAMENTO',
    'vehicleMethods': 'MÉTODOS DE PAGAMENTO - VEÍCULOS',
    'productMethods': 'MÉTODOS DE PAGAMENTO - PRODUTOS',
    'dailyTrends': 'TENDÊNCIAS DIÁRIAS'
  };

  return titles[chartType] || chartType.toUpperCase();
}

/**
 * Retorna a descrição do gráfico baseado no tipo
 * @param {string} chartType - Tipo do gráfico
 * @param {Object} chartData - Dados do gráfico
 * @returns {string} - Descrição do gráfico
 */
function getChartDescription(chartType, chartData) {
  const descriptions = {
    'revenueGrowth': 'Este gráfico mostra o crescimento de lucro dividido em 6 grupos de caixas, ordenados cronologicamente. A linha azul representa o lucro total de cada grupo (valor final - valor inicial dos caixas). A linha verde representa o número de caixas em cada grupo. Os grupos são formados dividindo todos os caixas em 6 partes iguais, mantendo a ordem cronológica.',
    'bestProducts': 'Este gráfico apresenta os 5 produtos mais vendidos no período analisado. Cada fatia representa um produto, com a cor correspondente e a quantidade vendida. O número no centro mostra o total de unidades vendidas dos 5 produtos. Os produtos são ordenados do menor para o maior volume de vendas.',
    'expensesBreakdown': `Este gráfico compara a distribuição das saídas entre veículos, produtos e gastos. A fatia azul representa as transações de veículos (${chartData.summary?.totalVehicles || 0} transações), a fatia verde representa as vendas de produtos (${chartData.summary?.totalProducts || 0} transações), e a fatia laranja representa os gastos/despesas (${chartData.summary?.totalExpenses || 0} transações). O total de transações analisadas foi de ${chartData.summary?.totalTransactions || 0}.`,
    'hourlyAnalysis': 'Este gráfico analisa o movimento de veículos dividido em três períodos do dia: manhã (9h às 12h), tarde (12h às 15h) e noite (15h às 18h). O gráfico de barras mostra a quantidade de entradas de veículos em cada período, permitindo identificar qual horário tem maior movimento no estacionamento. Cada barra representa o número de veículos que entraram naquele período, com cores distintas para facilitar a visualização.',
    'parkingUsage': 'Este gráfico mostra a utilização do estacionamento ao longo do tempo, indicando os horários de maior movimento e os períodos de menor atividade.',
    'vehicleMethods': 'Este gráfico mostra a distribuição dos métodos de pagamento utilizados nas transações de veículos, permitindo identificar as preferências dos clientes.',
    'productMethods': 'Este gráfico apresenta a distribuição dos métodos de pagamento nas vendas de produtos, auxiliando na análise de preferências de pagamento.',
    'dailyTrends': 'Este gráfico mostra as tendências diárias de movimento e receita, permitindo identificar padrões semanais e sazonais.'
  };

  return descriptions[chartType] || null;
}

module.exports = {
  generateDashboardReportPDF
};
