const PDFDocument = require('pdfkit');
const path = require('path');

async function generateReceiptPDF(operator, paymentMethod, saleItems, totalAmount, discountValue, finalPrice, amountReceived, changeGiven) {
  return new Promise(async (resolve, reject) => {
    try {
      const baseHeight = 260; // já tem cabeçalho + rodapé básicos
      const extraPerItem = 20; // espaço estimado por item
      const footerHeight = -30; // estimativa para rodapé + textos finais

      const dynamicHeight = baseHeight + (saleItems.length * extraPerItem) + footerHeight;

      // Criar documento com tamanho e margens específicas
      const doc = new PDFDocument({
        size: [137, dynamicHeight],
        margins: { top: 5, bottom: 5, left: 5, right: 5 },
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData.toString('base64'));
      });

      const printWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // ========== Cabeçalho ==========
      try {
        const logoPath = path.join(__dirname, '..', 'public', 'img', 'png','logo.png');
        const logoWidth = 40;
        const logoX = doc.page.margins.left;
        const logoY = doc.y;

        doc.image(logoPath, logoX, logoY, { width: logoWidth });

        const textX = logoX + logoWidth + 5;
        const textY = logoY + 2;

        doc.registerFont('Oswald-Bold', path.join(__dirname, '..', 'public', 'fonts', 'Oswald', 'Oswald-Bold.ttf'));
        doc.font('Oswald-Bold').fillColor('black');

        doc.fontSize(18);
        doc.text('LEÃO', textX, textY, { align: 'left' });

        doc.fontSize(10);
        doc.text('ESTACIONAMENTO', textX, doc.y - 5, { align: 'left' });

        doc.moveDown(0.5);
      } catch (err) {
        console.warn('[PrintLayout] Falha ao carregar logo ou título:', err.message);
      }

      // --- Espaço após o cabeçalho (importante para não colar no título) ---
      doc.moveDown(0.5);

      // --- Título do recibo ---
      doc.registerFont('OpenSans-SemiBold', path.join(__dirname, '..', 'public', 'fonts', 'OpenSans_SemiCondensed', 'normal', 'OpenSans_SemiCondensed-Bold.ttf'));
      doc.font('OpenSans-SemiBold').fontSize(8).fillColor('black');

      doc.text('COMPROVANTE DE COMPRA', doc.page.margins.left, doc.y, {
        align: 'center',
        width: printWidth,
      });

      doc.moveDown(1)

      // --- Informações do operador e pagamento ---
      const leftX = doc.page.margins.left;

      doc.registerFont('OpenSans_Condensed-Regular', path.join(__dirname, '..', 'public', 'fonts', 'OpenSans_Condensed', 'normal', 'OpenSans_Condensed-Regular.ttf'))
      doc.font('OpenSans_Condensed-Regular').fontSize(7).fillColor('black');

      doc.text(`Operador: ${operator}`, leftX, doc.y, {
        width: printWidth,
        align: 'left',
      });

      doc.text(`Pagamento: ${paymentMethod}`, leftX, doc.y, {
        width: printWidth,
        align: 'left',
      });

      doc.moveDown(0.7);

      // ========== Itens ==========
      doc.fontSize(7);
      doc.text('Itens:', { underline: true });
      doc.moveDown(0.3);

      const colQtyWidth = printWidth * 0.5;
      const colTotalWidth = printWidth * 0.5;

      saleItems.forEach(item => {
        const name = (item.productName?.toUpperCase() || 'PRODUTO').slice(0, 30);
        const qty = item.soldQuantity.toString();
        const unitPrice = Number(item.unitPrice).toFixed(2);
        const totalItemValue = (item.unitPrice * item.soldQuantity).toFixed(2);

        const startX = doc.page.margins.left;
        const startY = doc.y;

        doc.font('Helvetica-Bold').fontSize(6).text(name, startX, startY, {
          width: printWidth,
          align: 'left',
        });

        const line2Y = doc.y;

        doc.font('Helvetica').fontSize(6).text(`${qty} x R$ ${unitPrice}`, startX, line2Y, {
          width: colQtyWidth,
          align: 'left',
        });

        doc.text(`R$ ${totalItemValue}`, startX + colQtyWidth, line2Y, {
          width: colTotalWidth,
          align: 'right',
        });

        doc.moveDown(0.6);
      });

      // ========== Linha separadora ==========
      doc.moveDown(0.2);
      doc.lineWidth(0.5);
      doc.dash(3, { space: 2 });
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.undash();
      doc.moveDown(0.3);

      // ========== Totais ==========
      doc.font('Helvetica-Bold').fontSize(6);

      const totalItems = saleItems.reduce((sum, item) => sum + item.soldQuantity, 0);

      doc.text('Qtde. Total Itens:', doc.page.margins.left, doc.y, {
        width: printWidth,
        align: 'left',
        continued: true,
      });
      doc.text(`${totalItems}`, {
        width: printWidth,
        align: 'right',
      });

      doc.text('Valor Total R$:', doc.page.margins.left, doc.y, {
        width: printWidth,
        align: 'left',
        continued: true,
      });
      doc.text(`R$ ${Number(totalAmount).toFixed(2)}`, {
        width: printWidth,
        align: 'right',
      });

      doc.text('Desconto R$:', doc.page.margins.left, doc.y, {
        width: printWidth,
        align: 'left',
        continued: true,
      });
      doc.text(`- R$ ${Number(discountValue).toFixed(2)}`, {
        width: printWidth,
        align: 'right',
      });

      doc.text('Total a Pagar R$:', doc.page.margins.left, doc.y, {
        width: printWidth,
        align: 'left',
        continued: true,
      });
      doc.text(`R$ ${Number(finalPrice).toFixed(2)}`, {
        width: printWidth,
        align: 'right',
      });
      
      doc.text('Valor Recebido R$:', doc.page.margins.left, doc.y, {
        width: printWidth,
        align: 'left',
        continued: true,
      });
      doc.text(`R$ ${Number(amountReceived).toFixed(2)}`, {
        width: printWidth,
        align: 'right',
      });
      
      doc.text('Troco R$:', doc.page.margins.left, doc.y, {
        width: printWidth,
        align: 'left',
        continued: true,
      });
      doc.text(`R$ ${Number(changeGiven).toFixed(2)}`, {
        width: printWidth,
        align: 'right',
      });

      doc.moveDown(0.7);

      // ========== Mensagem final ==========
      doc.registerFont('OpenSans_Condensed-SemiBold', path.join(__dirname, '..', 'public', 'fonts', 'OpenSans_Condensed', 'normal', 'OpenSans_Condensed-SemiBold.ttf'));
      doc.font('OpenSans_Condensed-SemiBold').fontSize(7)
      doc.text('HORÁRIO DE FUNCIONAMENTO: 8h às 17h', 0, doc.y, {
        align: 'center',
        width: doc.page.width
      });
      // ======= Contato com ícone do WhatsApp =======
      const whatsappIconPath = path.join(__dirname, '..', 'public', 'img', 'png', 'whatsapp.png');
      const contactText = 'CONTATO: (91) 9 8825-3139';
      const iconSize = 10;          // ajuste se precisar
      const gap = 4;                // espaço entre ícone e texto

      // define fonte e tamanho antes de medir
      doc.font('OpenSans_Condensed-SemiBold').fontSize(7);
      const textWidth = doc.widthOfString(contactText);

      // largura disponível para centralizar (respeitando margens)
      const printableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // largura total do bloco ícone+gap+texto
      const blockWidth = iconSize + gap + textWidth;

      // calcula X de início do bloco
      const startX = doc.page.margins.left + (printableWidth - blockWidth) / 2;
      const y = doc.y;

      // desenha ícone
      try {
        doc.image(whatsappIconPath, startX, y, { width: iconSize });
      } catch (e) {
        console.warn('Não encontrou ícone do WhatsApp:', e.message);
      }

      // desenha texto ao lado
      doc.text(contactText, startX + iconSize + gap, y, {
        width: textWidth,
        align: 'left'
      });

      // ajusta cursor para a próxima linha (avança pela maior altura)
      const lineH = Math.max(iconSize, doc.currentLineHeight());
      doc.y = y + lineH + 2;
      // ======= fim bloco WhatsApp =======

      doc.registerFont('OpenSans_Condensed-MediumItalic', path.join(__dirname, '..', 'public', 'fonts', 'OpenSans_Condensed', 'italic', 'OpenSans_Condensed-MediumItalic.ttf'));
      doc.font('OpenSans_Condensed-MediumItalic').fontSize(6);
      doc.text('Obrigado pela preferência', 0, doc.y, {
        align: 'center',
        width: doc.page.width
      });
      
      doc.end();

    } catch (error) {
      console.error('Erro ao gerar recibo:', error);
      reject(error);
    }
  });
}

module.exports = { generateReceiptPDF };
