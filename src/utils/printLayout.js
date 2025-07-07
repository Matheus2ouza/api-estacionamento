const PDFDocument = require('pdfkit');
const fs = require('fs');
const QRCode = require('qrcode');
const path = require('path');

async function generateEntryTicketPDF(id, plate, operator, category, formattedDate, formattedTime) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [137, 400], // Largura útil da impressora: 48mm (~137pt)
        margins: { top: 5, bottom: 5, left: 5, right: 5 },
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData.toString('base64'));
      });

      // Logo marca d'água centralizada
      const logoPath = path.join(__dirname, '..', 'public', 'logo.png');
      try {
        doc.save();
        doc.opacity(0.1);
        doc.image(logoPath, (doc.page.width - 60) / 2, 10, { width: 60 });
        doc.restore();
      } catch (err) {
        console.warn('[PrintLayout] Falha ao carregar logo marca d\'água:', err.message);
      }

      // Título
      doc.fontSize(12).fillColor('black').font('Helvetica-Bold');
      doc.text('Leão Estacionamento', { align: 'center', lineGap: 4 });

      // Informações do veículo (uma por linha, alinhadas ao centro)
      doc.moveDown(1); // Um espaço maior após o título
      doc.fontSize(10).font('Helvetica');

      doc.text(`Placa: ${plate}`, { align: 'center' });
      doc.moveDown(0.3);

      doc.text(`Categoria: ${category}`, { align: 'center' });
      doc.moveDown(0.3);

      doc.text(`Operador: ${operator}`, { align: 'center' });
      doc.moveDown(0.3);

      doc.text(`Entrada: ${formattedDate} ${formattedTime}`, { align: 'center' });

      // Linha fina de separação
      doc.moveDown(0.5);
      doc.lineWidth(1);
      doc.moveTo(10, doc.y).lineTo(doc.page.width - 10, doc.y).stroke();

      // QR Code (gera base64 PNG)
      const qrDataUrl = await QRCode.toDataURL(`${id}|${plate}`, {
        errorCorrectionLevel: 'H',
        margin: 1,
        scale: 3,
      });

      const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBuffer = Buffer.from(qrBase64, 'base64');

      // Posiciona QR Code no centro
      const qrX = (doc.page.width - 90) / 2;
      const qrY = doc.y + 5;

      doc.image(qrBuffer, qrX, qrY, { width: 90 });

      // Atualiza posição Y após o QR Code
      const qrHeight = 90;
      const spacingAfterQR = 5;
      doc.y = qrY + qrHeight + spacingAfterQR;

      // Texto abaixo do QR Code
      doc.fontSize(8).text('Guarde este comprovante', { align: 'center' });

      // Finaliza o documento sem adicionar mais páginas ou espaços extras
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateEntryTicketPDF };