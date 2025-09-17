const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Baixa uma imagem de uma URL e salva em arquivo
 * @param {string} url - URL da imagem
 * @param {string} outputPath - Caminho para salvar a imagem
 * @returns {Promise<Buffer>} - Buffer da imagem
 */
async function downloadImage(url, outputPath = null) {
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

    // Se um caminho foi fornecido, salva a imagem
    if (outputPath) {
      try {
        // Cria diretório se não existir
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Salva a imagem
        fs.writeFileSync(outputPath, buffer);
        console.log(`📊 Imagem salva: ${outputPath}`);
      } catch (saveError) {
        console.warn('⚠️ Erro ao salvar imagem:', saveError.message);
      }
    }

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
 * @param {string} outputPath - Caminho para salvar o PDF
 * @returns {Promise<string>} - Caminho do arquivo gerado
 */
async function generateDashboardReportPDF(reportData, outputPath) {
  return new Promise(async (resolve, reject) => {
    try {
      // Debug: Log dos dados recebidos
      console.log('📊 Dados do relatório recebidos:');
      console.log('- Total de caixas:', reportData.summary?.totalCashRegisters);
      console.log('- Valor total:', reportData.summary?.totals?.finalValue);
      console.log('- Incluir detalhes:', reportData.includeDetails);

      // Cria o documento PDF
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Cabeçalho
      doc.fillColor('#2c3e50')
        .rect(0, 0, 595, 100)
        .fill();

      doc.fillColor('white')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('RELATÓRIO DO DASHBOARD', 0, 30, { align: 'center', width: 595 });

      if (reportData.period && reportData.period.startDate && reportData.period.endDate) {
        const startDate = new Date(reportData.period.startDate).toLocaleDateString('pt-BR');
        const endDate = new Date(reportData.period.endDate).toLocaleDateString('pt-BR');
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
        .text('RESUMO EXECUTIVO', 60, summaryY + 5);

      doc.moveDown(1.5);

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

      doc.fillColor('black');
      doc.y = secondRowY + cardHeight + 20;

      doc.moveDown(1);

      // Seção de crescimento de receita (apenas descrição, sem gráfico)
      if (reportData.revenueGrowth && reportData.revenueGrowth.groups) {
        // Cabeçalho da seção
        const chartSectionY = doc.y - 10;
        doc.fillColor('#8e44ad')
          .rect(50, chartSectionY, 495, 25)
          .fill();

        doc.fillColor('white')
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('CRESCIMENTO DE RECEITA', 60, chartSectionY + 3);

        doc.fillColor('black');
        doc.y = chartSectionY + 40;

        // Adiciona descrição do gráfico
        doc.fontSize(10)
          .font('Helvetica-Bold')
          .text('DESCRIÇÃO DO GRÁFICO:', 60, doc.y);

        doc.y += 6;

        doc.fontSize(9)
          .font('Helvetica')
          .text('Este gráfico mostra o crescimento de lucro dividido em 6 grupos de caixas, ordenados cronologicamente.', 60, doc.y);

        doc.y += 8;

        doc.text('A linha azul representa o lucro total de cada grupo (valor final - valor inicial dos caixas).', 60, doc.y);

        doc.y += 8;

        doc.text('A linha verde representa o número de caixas em cada grupo.', 60, doc.y);

        doc.y += 8;

        doc.text('Os grupos são formados dividindo todos os caixas em 6 partes iguais, mantendo a ordem cronológica.', 60, doc.y);

        doc.y += 50;

        // Adiciona informações dos grupos
        doc.fontSize(12)
          .font('Helvetica-Bold')
          .text('RESUMO DOS GRUPOS:', 60, doc.y);

        doc.moveDown(0.5);

        // Tabela com dados dos grupos
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
        reportData.revenueGrowth.groups.forEach((group, index) => {
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

        doc.y = tableStartY + (reportData.revenueGrowth.groups.length + 1) * rowHeight + 20;

        // Totais
        doc.fontSize(12)
          .font('Helvetica-Bold')
          .text(`Lucro Total: R$ ${reportData.revenueGrowth.totalProfit.toFixed(2)}`, 60, doc.y)
          .text(`Lucro Médio por Grupo: R$ ${reportData.revenueGrowth.averageProfit.toFixed(2)}`, 60, doc.y + 15);

        doc.y += 20;
        console.log('✅ Seção de crescimento de receita adicionada ao PDF (sem gráfico)');
      }

      doc.moveDown(2);

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
          // Se não é o primeiro caixa, adiciona nova página
          if (index > 0) {
            doc.addPage();
          }

          // Cabeçalho do caixa
          const cashHeaderY = doc.y - 10;
          doc.fillColor('#8e44ad')
            .rect(50, cashHeaderY, 495, 30)
            .fill();

          // Formata a data do caixa
          const cashDate = new Date(cash.openingTime).toLocaleDateString('pt-BR');

          doc.fillColor('white')
            .fontSize(16)
            .font('Helvetica-Bold')
            .text(`CAIXA ${index + 1} - ${cashDate}`, 60, cashHeaderY + 5);

          doc.fillColor('black');
          doc.y = cashHeaderY + 40;

          // Informações principais do caixa
          const infoY = doc.y;
          doc.fontSize(12)
            .font('Helvetica-Bold')
            .text('OPERADOR:', 60, infoY)
            .text('ABERTURA:', 60, infoY + 20)
            .text('FECHAMENTO:', 60, infoY + 40);

          doc.fontSize(12)
            .font('Helvetica')
            .text(cash.operator || 'N/A', 150, infoY)
            .text(new Date(cash.openingTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), 150, infoY + 20)
            .text(cash.closingTime ? new Date(cash.closingTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A', 150, infoY + 40);

          doc.y = infoY + 70;

          // Cards de valores do caixa
          const valueStartX = 60;
          const valueCardWidth = 120;
          const valueCardHeight = 50;
          const valueCardSpacing = 15;

          // Card Valor Inicial
          doc.fillColor('#3498db')
            .rect(valueStartX, doc.y, valueCardWidth, valueCardHeight)
            .fill();

          doc.strokeColor('#3498db')
            .lineWidth(1.5)
            .rect(valueStartX, doc.y, valueCardWidth, valueCardHeight)
            .stroke();

          doc.fillColor('white')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('VALOR INICIAL', valueStartX + 8, doc.y + 8)
            .fontSize(14)
            .text(`R$ ${cash.initialValue.toFixed(2)}`, valueStartX + 8, doc.y + 25);

          // Card Valor Final
          doc.fillColor('#27ae60')
            .rect(valueStartX + valueCardWidth + valueCardSpacing, doc.y, valueCardWidth, valueCardHeight)
            .fill();

          doc.strokeColor('#27ae60')
            .lineWidth(1.5)
            .rect(valueStartX + valueCardWidth + valueCardSpacing, doc.y, valueCardWidth, valueCardHeight)
            .stroke();

          doc.fillColor('white')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('VALOR FINAL', valueStartX + valueCardWidth + valueCardSpacing + 8, doc.y + 8)
            .fontSize(14)
            .text(`R$ ${cash.finalValue.toFixed(2)}`, valueStartX + valueCardWidth + valueCardSpacing + 8, doc.y + 25);

          // Card Lucro
          const cashProfit = cash.finalValue - cash.initialValue;
          doc.fillColor('#e74c3c')
            .rect(valueStartX + (valueCardWidth + valueCardSpacing) * 2, doc.y, valueCardWidth, valueCardHeight)
            .fill();

          doc.strokeColor('#e74c3c')
            .lineWidth(1.5)
            .rect(valueStartX + (valueCardWidth + valueCardSpacing) * 2, doc.y, valueCardWidth, valueCardHeight)
            .stroke();

          doc.fillColor('white')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('LUCRO', valueStartX + (valueCardWidth + valueCardSpacing) * 2 + 8, doc.y + 8)
            .fontSize(14)
            .text(`R$ ${cashProfit.toFixed(2)}`, valueStartX + (valueCardWidth + valueCardSpacing) * 2 + 8, doc.y + 25);

          doc.y += valueCardHeight + 30;

          // Transações do caixa
          if (reportData.includeDetails && cash.transactions) {
            doc.fontSize(14)
              .font('Helvetica-Bold')
              .text('TRANSAÇÕES:', 60, doc.y);

            doc.y += 20;

            // Transações de Veículos
            if (cash.transactions.vehicle && Array.isArray(cash.transactions.vehicle) && cash.transactions.vehicle.length > 0) {
              doc.fontSize(12)
                .font('Helvetica-Bold')
                .text('VEÍCULOS:', 60, doc.y);

              doc.y += 15;

              cash.transactions.vehicle.forEach((transaction, transIndex) => {
                const transactionY = doc.y;

                // Verifica se precisa de nova página
                if (transactionY > 700) {
                  doc.addPage();
                  doc.y = 50;
                }

                const paymentMethod = transaction.paymentMethod || 'N/A';
                const paymentColor = getPaymentMethodColor(paymentMethod);

                doc.fillColor(paymentColor)
                  .rect(60, transactionY, 475, 20)
                  .fill();

                doc.fillColor('white')
                  .fontSize(10)
                  .font('Helvetica')
                  .text(`${transIndex + 1}. ${new Date(transaction.createdAt).toLocaleString('pt-BR')} - ${transaction.plate} - R$ ${transaction.amount.toFixed(2)} (${paymentMethod})`, 65, transactionY + 5);

                doc.y = transactionY + 25;
              });

              doc.y += 10;
            }

            // Transações de Produtos
            if (cash.transactions.product && Array.isArray(cash.transactions.product) && cash.transactions.product.length > 0) {
              doc.fontSize(12)
                .font('Helvetica-Bold')
                .text('PRODUTOS:', 60, doc.y);

              doc.y += 15;

              cash.transactions.product.forEach((transaction, transIndex) => {
                const transactionY = doc.y;

                // Verifica se precisa de nova página
                if (transactionY > 700) {
                  doc.addPage();
                  doc.y = 50;
                }

                const paymentMethod = transaction.paymentMethod || 'N/A';
                const paymentColor = getPaymentMethodColor(paymentMethod);

                doc.fillColor(paymentColor)
                  .rect(60, transactionY, 475, 20)
                  .fill();

                doc.fillColor('white')
                  .fontSize(10)
                  .font('Helvetica')
                  .text(`${transIndex + 1}. ${new Date(transaction.createdAt).toLocaleString('pt-BR')} - R$ ${transaction.amount.toFixed(2)} (${paymentMethod})`, 65, transactionY + 5);

                doc.y = transactionY + 25;
              });

              doc.y += 10;
            }

            // Despesas
            if (cash.transactions.outgoing && cash.transactions.outgoing > 0) {
              doc.fontSize(12)
                .font('Helvetica-Bold')
                .text('DESPESAS:', 60, doc.y);

              doc.y += 15;

              const transactionY = doc.y;

              // Verifica se precisa de nova página
              if (transactionY > 700) {
                doc.addPage();
                doc.y = 50;
              }

              doc.fillColor('#e67e22')
                .rect(60, transactionY, 475, 20)
                .fill();

              doc.fillColor('white')
                .fontSize(10)
                .font('Helvetica')
                .text(`Total de despesas: R$ ${cash.transactions.outgoing.toFixed(2)}`, 65, transactionY + 5);

              doc.y = transactionY + 25;
            }
          }

          doc.moveDown(1);
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

      // Rodapé melhorado - só se não estiver muito próximo do final
      if (doc.y < 700) {
        const footerY = Math.max(doc.y + 20, 750);
        doc.rect(0, footerY, 595, 50)
          .fill('#2c3e50');

        doc.fillColor('white')
          .fontSize(10)
          .font('Helvetica')
          .text('Relatório gerado automaticamente pelo Sistema de Estacionamento', 0, footerY + 10, { align: 'center', width: 595 })
          .text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 0, footerY + 25, { align: 'center', width: 595 })
          .text('Sistema de Gestão de Estacionamento - Todos os direitos reservados', 0, footerY + 40, { align: 'center', width: 595 });
      }

      // Finaliza o documento
      doc.end();

      stream.on('finish', () => {
        resolve(outputPath);
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      reject(error);
    }
  });
}

module.exports = {
  generateDashboardReportPDF
};
