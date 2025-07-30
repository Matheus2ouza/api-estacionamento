const PDFDocument = require('pdfkit');
const path = require('path');

async function generateVehicleReceiptPDF(operator, paymentMethod, plate, amountReceived, discountValue, changeGiven, finalPrice, originalAmount) {
  return new Promise(async (resolve, reject) => {
    try {
      // Altura fixa pois não temos itens variáveis
      const docHeight = 280; 

      const doc = new PDFDocument({
        size: [137, docHeight],
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
        console.warn('[VehicleReceipt] Falha ao carregar logo:', err.message);
      }

      doc.moveDown(0.5);

      // --- Título do recibo (SAÍDA) ---
      doc.registerFont('OpenSans-SemiBold', path.join(__dirname, '..', 'public', 'fonts', 'OpenSans_SemiCondensed', 'normal', 'OpenSans_SemiCondensed-Bold.ttf'));
      doc.font('OpenSans-SemiBold').fontSize(8).fillColor('black');

      doc.text('COMPROVANTE DE SAÍDA', doc.page.margins.left, doc.y, {
        align: 'center',
        width: printWidth,
      });

      doc.moveDown(1);

      // --- Informações principais ---
      const leftX = doc.page.margins.left;

      doc.registerFont('OpenSans_Condensed-Regular', path.join(__dirname, '..', 'public', 'fonts', 'OpenSans_Condensed', 'normal', 'OpenSans_Condensed-Regular.ttf'))
      doc.font('OpenSans_Condensed-Regular').fontSize(7).fillColor('black');

      doc.text(`Operador: ${operator}`, leftX, doc.y, { width: printWidth, align: 'left' });
      doc.text(`Pagamento: ${paymentMethod}`, leftX, doc.y, { width: printWidth, align: 'left' });
      
      // Placa em destaque
      doc.moveDown(0.7);
      doc.font('OpenSans_Condensed-SemiBold').fontSize(9);
      doc.text(`PLACA: ${plate.toUpperCase()}`, leftX, doc.y, {
        width: printWidth,
        align: 'center',
        underline: true
      });
      doc.moveDown(0.7);

      // ========== Linha separadora ==========
      doc.lineWidth(0.5);
      doc.dash(3, { space: 2 });
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.undash();
      doc.moveDown(0.5);

      // ========== Valores ==========
      doc.font('Helvetica-Bold').fontSize(7);

      // Valor Original
      doc.text('Valor Original R$:', doc.page.margins.left, doc.y, {
        width: printWidth,
        align: 'left',
        continued: true,
      });
      doc.text(`R$ ${Number(originalAmount).toFixed(2)}`, {
        width: printWidth,
        align: 'right',
      });

      // Desconto
      doc.text('Desconto R$:', doc.page.margins.left, doc.y, {
        width: printWidth,
        align: 'left',
        continued: true,
      });
      doc.text(`- R$ ${Number(discountValue).toFixed(2)}`, {
        width: printWidth,
        align: 'right',
      });

      // Linha mais espessa para total
      doc.moveDown(0.3);
      doc.lineWidth(1);
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.moveDown(0.3);

      // Total a Pagar (em destaque)
      doc.fontSize(8);
      doc.text('TOTAL R$:', doc.page.margins.left, doc.y, {
        width: printWidth,
        align: 'left',
        continued: true,
      });
      doc.text(`R$ ${Number(finalPrice).toFixed(2)}`, {
        width: printWidth,
        align: 'right',
      });

      doc.moveDown(0.5);

      // Valor Recebido
      doc.fontSize(7);
      doc.text('Valor Recebido R$:', doc.page.margins.left, doc.y, {
        width: printWidth,
        align: 'left',
        continued: true,
      });
      doc.text(`R$ ${Number(amountReceived).toFixed(2)}`, {
        width: printWidth,
        align: 'right',
      });
      
      // Troco
      doc.text('Troco R$:', doc.page.margins.left, doc.y, {
        width: printWidth,
        align: 'left',
        continued: true,
      });
      doc.text(`R$ ${Number(changeGiven).toFixed(2)}`, {
        width: printWidth,
        align: 'right',
      });

      doc.moveDown(1);

      // ========== Mensagem final ==========
      doc.registerFont('OpenSans_Condensed-SemiBold', path.join(__dirname, '..', 'public', 'fonts', 'OpenSans_Condensed', 'normal', 'OpenSans_Condensed-SemiBold.ttf'));
      doc.font('OpenSans_Condensed-SemiBold').fontSize(7)
      doc.text('HORÁRIO DE FUNCIONAMENTO: 8h às 17h', 0, doc.y, {
        align: 'center',
        width: doc.page.width
      });
      
      // Contato WhatsApp
      const whatsappIconPath = path.join(__dirname, '..', 'public', 'img', 'png', 'whatsapp.png');
      const contactText = 'CONTATO: (91) 9 8564-6187';
      const iconSize = 10;
      const gap = 4;

      doc.font('OpenSans_Condensed-SemiBold').fontSize(7);
      const textWidth = doc.widthOfString(contactText);
      const printableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const blockWidth = iconSize + gap + textWidth;
      const startX = doc.page.margins.left + (printableWidth - blockWidth) / 2;
      const y = doc.y;

      try {
        doc.image(whatsappIconPath, startX, y, { width: iconSize });
      } catch (e) {
        console.warn('Erro no ícone WhatsApp:', e.message);
      }

      doc.text(contactText, startX + iconSize + gap, y, { width: textWidth, align: 'left' });
      
      const lineH = Math.max(iconSize, doc.currentLineHeight());
      doc.y = y + lineH + 2;

      // Mensagem final
      doc.font('Helvetica-Oblique').fontSize(6);
      doc.text('Obrigado pela preferência!', 0, doc.y, {
        align: 'center',
        width: doc.page.width
      });
      
      doc.end();

    } catch (error) {
      console.error('Erro ao gerar recibo de veículo:', error);
      reject(error);
    }
  });
}

module.exports = { generateVehicleReceiptPDF };