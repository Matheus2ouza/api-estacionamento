const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { generateQRCode } = require('./qrCodeGenerator');

async function generateEntryTicketPDF(id, plate, operator, category, formattedDate, formattedTime) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [137, 270],
        margins: { top: 5, bottom: 5, left: 5, right: 5 },
      });

      // === Registro das fontes (uma vez só) ===
      const fontsPath = path.join(__dirname, '..', 'public', 'fonts');
      doc.registerFont('Oswald-Bold', path.join(fontsPath, 'Oswald-Bold.ttf'));
      doc.registerFont('OpenSans-Bold', path.join(fontsPath, 'OpenSans_SemiCondensed-Bold.ttf'));
      doc.registerFont('OpenSans-Regular', path.join(fontsPath, 'OpenSans_Condensed-Regular.ttf'));
      doc.registerFont('OpenSans-SemiBold', path.join(fontsPath, 'OpenSans_Condensed-SemiBold.ttf'));
      doc.registerFont('OpenSans-Italic', path.join(fontsPath, 'OpenSans_Condensed-MediumItalic.ttf'));

      // === Cabeçalho com logo ===
      const logoPath = path.join(__dirname, '..', 'public', 'img', 'logo.png');
      try {
        const logoWidth = 40;
        const logoX = 5;
        const logoY = 5;

        doc.image(logoPath, logoX, logoY, { width: logoWidth });

        const textX = logoX + logoWidth - 2;
        const textY = logoY + 2;

        doc.font('Oswald-Bold').fillColor('black');
        doc.fontSize(18).text('LEÃO', textX, textY, { align: 'left' });
        doc.fontSize(10).text('ESTACIONAMENTO', textX, doc.y - 5, { align: 'left' });

        doc.moveDown(0.5);
      } catch (err) {
        console.warn('[PrintLayout] Falha ao carregar logo ou título:', err.message);
      }

      // === Título centralizado ===
      doc.font('OpenSans-Bold').fontSize(7);
      const entryText = 'Comprovante de Entrada';
      const entryTextWidth = doc.widthOfString(entryText);
      const centerX = (doc.page.width - entryTextWidth) / 2;
      doc.text(entryText, centerX, doc.y);
      doc.moveDown(0.5);

      doc.fontSize(8).font('Helvetica');

      function drawLabelValue(label, value) {
        const labelX = 10;
        const lineHeight = 10;
        const y = doc.y;

        doc.font('OpenSans-Bold').fontSize(8).text(label, labelX, y);
        doc.font('OpenSans-Regular').fontSize(8);
        const valueWidth = doc.widthOfString(value);
        const valueX = doc.page.width - 10 - valueWidth;
        doc.text(value, valueX, y);

        doc.y = y + lineHeight;
      }

      drawLabelValue('PLACA:', plate);
      drawLabelValue('CATEGORIA:', category);
      drawLabelValue('OPERADOR:', operator);
      drawLabelValue('ENTRADA:', `${formattedDate} ${formattedTime}`);

      doc.moveDown(0.5);
      doc.lineWidth(0.5).dash(2, { space: 2 });
      doc.moveTo(10, doc.y).lineTo(doc.page.width - 10, doc.y).stroke();
      doc.undash();

      const qrDataUrl = await generateQRCode(id, plate);
      const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBuffer = Buffer.from(qrBase64, 'base64');

      const qrX = (doc.page.width - 90) / 2;
      const qrY = doc.y + 5;
      doc.image(qrBuffer, qrX, qrY, { width: 90 });
      doc.y = qrY + 90 + 5;

      doc.moveDown(0.5);
      doc.font('OpenSans-SemiBold').fontSize(7);
      doc.text('TICKET PERDIDO R$: 20,00', 0, doc.y, { align: 'center', width: doc.page.width });
      doc.text('HORÁRIO DE FUNCIONAMENTO: 8h às 17h', 0, doc.y, { align: 'center', width: doc.page.width });

      const whatsappIconPath = path.join(__dirname, '..', 'public', 'img', 'whatsapp.png');
      const contactText = 'CONTATO: (91) 9 8825-3139';
      const iconSize = 10;
      const gap = 4;
      doc.font('OpenSans-SemiBold').fontSize(7);
      const textWidth = doc.widthOfString(contactText);
      const printableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const blockWidth = iconSize + gap + textWidth;
      const startX = doc.page.margins.left + (printableWidth - blockWidth) / 2;
      const y = doc.y;

      try {
        doc.image(whatsappIconPath, startX, y, { width: iconSize });
      } catch (e) {
        console.warn('Não encontrou ícone do WhatsApp:', e.message);
      }

      doc.text(contactText, startX + iconSize + gap, y, {
        width: textWidth,
        align: 'left'
      });

      doc.y = y + Math.max(iconSize, doc.currentLineHeight()) + 2;

      doc.font('OpenSans-Italic').fontSize(6);
      doc.text('Apresente o comprovante na saída', 0, doc.y, { align: 'center', width: doc.page.width });
      doc.text('Obrigado pela preferência', 0, doc.y, { align: 'center', width: doc.page.width });

      doc.end();

      writeStream.on('finish', () => {
        const relativePath = path.relative(process.cwd(), outputPath);
        console.log(`✅ PDF de entrada gerado com sucesso em: ${relativePath}`);
        resolve(outputPath); // Retorna o caminho para logar depois
      });

      writeStream.on('error', (err) => {
        console.error("❌ Erro ao escrever o arquivo PDF:", err.message);
        reject(err);
      });


    } catch (error) {
      console.error("Erro ao gerar PDF:", error.message);
      reject(error);
    }
  });
}

module.exports = { generateEntryTicketPDF };
