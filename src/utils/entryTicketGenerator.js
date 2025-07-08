const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const generateQRCode = require('./qrCodeGenerator')

async function generateEntryTicketPDF(id, plate, operator, category, formattedDate, formattedTime) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [137, 250], // Largura útil da impressora: 48mm (~137pt)
        margins: { top: 5, bottom: 5, left: 5, right: 5 },
      });

      const outputPath = path.join(__dirname, 'entrada.pdf');
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Logo marca d'água centralizada
      const logoPath = path.join(__dirname, '..', 'public', 'img', 'logo.png'); // ajuste se necessário
      try {
        doc.save();
        doc.opacity(0.1);
        doc.image(logoPath, (doc.page.width - 80) / 2, 25, { width: 80 });
        doc.restore();
      } catch (err) {
        console.warn('[PrintLayout] Falha ao carregar logo marca d\'água:', err.message);
      }

      // Título
      doc.registerFont('Oswald-Bold.ttf', path.join(__dirname, '..', 'public', 'fonts', 'Oswald-Bold.ttf'))
      doc.fontSize(17).fillColor('black').font('Oswald-Bold.ttf');
      doc.text('Leão', { align: 'center', lineGap: -6 });

      doc.fontSize(10).font('Oswald-Bold.ttf');
      doc.text('Estacionamento', { align: 'center', lineGap: -3 });

      // Frase abaixo do título
      doc.registerFont('OpenSans_Condensed-LightItalic', path.join(__dirname, '..', 'public', 'fonts', 'OpenSans_Condensed-LightItalic.ttf'));
      doc.fontSize(7).font('OpenSans_Condensed-LightItalic');
      doc.text('Comprovante de entrada', { align: 'center' });

      // Informações do veículo (rótulo à esquerda, valor à direita)
      doc.moveDown(1);
      doc.fontSize(8).font('Helvetica');

      function drawLabelValue(label, value) {
        const labelX = 10;
        const valueFontSize = 7;
        const labelFontSize = 8;

        // Use uma altura de linha base
        const lineHeight = 10;

        // Salva o Y atual para esta linha
        const y = doc.y;

        // Define fontes antes de medir texto
        doc.font('Helvetica').fontSize(valueFontSize);
        const valueWidth = doc.widthOfString(value);

        const valueX = doc.page.width - 10 - valueWidth;

        // Label
        doc.font('Helvetica-Bold').fontSize(labelFontSize);
        doc.text(label, labelX, y, { continued: false });

        // Valor (mesmo Y!)
        doc.font('Helvetica').fontSize(valueFontSize);
        doc.text(value, valueX, y);

        // Avança para a próxima linha
        doc.y = y + lineHeight;
      }


      drawLabelValue('PLACA:', plate);
      drawLabelValue('CATEGORIA:', category);
      drawLabelValue('OPERADOR:', operator);
      drawLabelValue('ENTRADA:', `${formattedDate} ${formattedTime}`);

      // Linha fina de separação
      doc.moveDown(0.5);
      doc.lineWidth(0.5);
      doc.dash(2, { space: 2 }); // <- isso define linha tracejada
      doc.moveTo(10, doc.y).lineTo(doc.page.width - 10, doc.y).stroke();
      doc.undash(); // remove o estilo tracejado para próximas linhas

      // QR Code
      const qrDataUrl = await generateQRCode(id, plate)

      const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBuffer = Buffer.from(qrBase64, 'base64');

      // Posiciona QR Code no centro
      const qrX = (doc.page.width - 90) / 2;
      const qrY = doc.y + 5;

      doc.image(qrBuffer, qrX, qrY, { width: 90 });

      doc.y = qrY + 90 + 5;

      // Texto abaixo do QR Code (centralizado e itálico)
      doc.moveDown(2)
      doc.registerFont('OpenSans_Condensed-LightItalic', path.join(__dirname, '..', 'public', 'fonts', 'OpenSans_Condensed-LightItalic.ttf'));
      doc.font('OpenSans_Condensed-LightItalic').fontSize(6);
      doc.text('Apresente o comprovante na saída', 0, doc.y, {
        align: 'center',
        width: doc.page.width
      });
      doc.text('Obrigado pela preferência', 0, doc.y, {
        align: 'center',
        width: doc.page.width
      });


      doc.end();

      writeStream.on('finish', () => {
        console.log(`✅ PDF salvo em: ${outputPath}`);
        resolve();
      });

    } catch (error) {
      console.error("Erro ao gerar PDF:", error.message);
      reject(error);
    }
  });
}
module.exports = { generateEntryTicketPDF };