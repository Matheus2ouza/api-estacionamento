const PDFDocument = require('pdfkit');
const fs = require('fs');
const QRCode = require('qrcode');
const path = require('path');

/**
 * Gera comprovante de entrada em PDF (base64)
 * @param {{ id: number, plate: string, category: string, formattedDate: string, formattedTime: string }} data
 * @returns {Promise<string>} PDF em base64
 */
async function generateEntryTicketPDF({ id, plate, category, formattedDate, formattedTime }) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [226, 400], // 58mm largura ~ 2.2 polegadas em pts (72dpi)
        margins: { top: 10, bottom: 10, left: 10, right: 10 },
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData.toString('base64'));
      });

      // Logo marca d'água
      const logoPath = path.join(__dirname, '..', 'public', 'logo.png');
      try {
        doc.save();
        doc.opacity(0.15);
        doc.image(logoPath, (doc.page.width - 150) / 2, 100, { width: 150 });
        doc.restore();
      } catch (err) {
        console.warn('[PrintLayout] Falha ao carregar logo marca d\'água:', err.message);
      }

      // Título
      doc.fontSize(16).fillColor('black').font('Helvetica-Bold');
      doc.text('ESTACIONAMENTO CENTRAL', { align: 'center', lineGap: 8 });

      // Informações do veículo
      doc.moveDown();
      doc.fontSize(12).font('Helvetica');
      doc.text(`Placa: ${plate}`, { align: 'center' });
      doc.text(`Categoria: ${category}`, { align: 'center' });
      doc.text(`Entrada: ${formattedDate} ${formattedTime}`, { align: 'center' });

      // Linha separadora
      doc.moveDown(0.5);
      doc.lineWidth(1);
      doc.moveTo(10, doc.y).lineTo(doc.page.width - 10, doc.y).stroke();

      // QR Code (gera base64 PNG)
      const qrDataUrl = await QRCode.toDataURL(`${id}|${plate}`, {
        errorCorrectionLevel: 'H',
        margin: 1,
        scale: 5,
      });

      // Extrai base64 para buffer e adiciona imagem
      const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBuffer = Buffer.from(qrBase64, 'base64');

      // Posiciona QR Code no centro
      doc.image(qrBuffer, (doc.page.width - 150) / 2, doc.y + 10, { width: 150, height: 150 });

      doc.moveDown(10);
      doc.fontSize(10).text('Guarde este comprovante', { align: 'center' });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateEntryTicketPDF };
