const PDFDocument = require('pdfkit');
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

      // Logo marca d'água centralizada vertical e horizontalmente
      const logoPath = path.join(__dirname, '..', 'public', 'logo.png');
      try {
        const logoWidth = 80;
        const logoHeight = 80;
        const logoX = (doc.page.width - logoWidth) / 2;
        const logoY = (doc.page.height - logoHeight) / 2;
        
        doc.save();
        doc.opacity(0.1);
        doc.image(logoPath, logoX, logoY, { 
          width: logoWidth,
          height: logoHeight
        });
        doc.restore();
      } catch (err) {
        console.warn('[PrintLayout] Falha ao carregar logo marca d\'água:', err.message);
      }

      // Título
      doc.fontSize(12)
        .fillColor('black')
        .font('Helvetica-Bold')
        .text('Leão Estacionamento', { align: 'center', lineGap: 4 });

      // Informações do veículo com layout de duas colunas
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica');
      
      // Configurações das colunas
      const col1 = 15;   // Largura da primeira coluna (rótulos)
      const col2 = 100;  // Posição inicial da segunda coluna (valores)
      const lineHeight = 15;
      
      // Função para adicionar linha formatada
      const addInfoLine = (label, value) => {
        doc.text(label + ':', 10, doc.y)
          .font('Helvetica-Bold')
          .text(value, col2, doc.y)
          .font('Helvetica')
          .moveDown(0.2);
      };

      // Adiciona informações
      addInfoLine('Placa', plate);
      addInfoLine('Categoria', category);
      addInfoLine('Operador', operator);
      
      // Data e hora em linha única
      doc.text('Entrada:', 10, doc.y)
        .font('Helvetica-Bold')
        .text(`${formattedDate} ${formattedTime}`, col2, doc.y)
        .font('Helvetica');

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
      const qrSize = 90;
      const qrX = (doc.page.width - qrSize) / 2;
      const qrY = doc.y + 10;

      doc.image(qrBuffer, qrX, qrY, { width: qrSize });

      // Texto abaixo do QR Code
      doc.fontSize(8)
        .moveDown(1.5)
        .text('Guarde este comprovante', { align: 'center' });

      // Finaliza o documento
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateEntryTicketPDF };