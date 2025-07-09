const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { generateQRCode } = require('./qrCodeGenerator')

async function generateEntryTicketPDF(id, plate, operator, category, formattedDate, formattedTime) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [137, 270], // Largura útil da impressora: 48mm (~137pt)
        margins: { top: 5, bottom: 5, left: 5, right: 5 },
      });

      const outputPath = path.join(__dirname, 'entrada.pdf');
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Novo cabeçalho com logo à esquerda e texto ao lado
      const logoPath = path.join(__dirname, 'public', 'img', 'logo.png');
      try {
        const logoWidth = 40;
        const logoX = 5;
        const logoY = 5;

        doc.image(logoPath, logoX, logoY, { width: logoWidth });

        // Título ao lado da logo
        const textX = logoX + logoWidth - 2;
        const textY = logoY + 2;

        doc.registerFont('Oswald-Bold.ttf', path.join(__dirname, 'public', 'fonts', 'Oswald-Bold.ttf'));
        doc.font('Oswald-Bold.ttf').fillColor('black');

        doc.fontSize(18);
        doc.text('LEÃO', textX, textY, { align: 'left' });

        doc.fontSize(10);
        doc.text('ESTACIONAMENTO', textX, doc.y - 5, { align: 'left', });

        // Move Y para o próximo conteúdo
        doc.moveDown(0.5);

      } catch (err) {
        console.warn('[PrintLayout] Falha ao carregar logo ou título:', err.message);
      }


      // Frase abaixo do título
      doc.registerFont('OpenSans_SemiCondensed-Bold', path.join(__dirname, 'public', 'fonts', 'OpenSans_SemiCondensed-Bold.ttf'));
      doc.font('OpenSans_SemiCondensed-Bold').fontSize(7);

      const entryText = 'Comprovante de Entrada';
      const entryTextWidth = doc.widthOfString(entryText);
      const centerX = (doc.page.width - entryTextWidth) / 2;
      const textY = doc.y;

      doc.text(entryText, centerX, textY);

      doc.moveDown(0.5);

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
        doc.registerFont('OpenSans_SemiCondensed-Bold', path.join(__dirname, 'public', 'fonts', 'OpenSans_SemiCondensed-Bold.ttf'))
        doc.font('OpenSans_SemiCondensed-Bold').fontSize(labelFontSize);
        doc.text(label, labelX, y, { continued: false });

        // Valor (mesmo Y!)
        doc.registerFont('OpenSans_Condensed-Regular', path.join(__dirname, 'public', 'fonts', 'OpenSans_Condensed-Regular.ttf'))
        doc.font('OpenSans_Condensed-Regular').fontSize(labelFontSize);
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
      const qrDataUrl = await generateQRCode(id, plate);

      const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBuffer = Buffer.from(qrBase64, 'base64');

      // Posiciona QR Code no centro
      const qrX = (doc.page.width - 90) / 2;
      const qrY = doc.y + 5;

      doc.image(qrBuffer, qrX, qrY, { width: 90 });

      doc.y = qrY + 90 + 5;

      // Texto abaixo do QR Code (centralizado e itálico)
      doc.moveDown(0.5)
      doc.registerFont('OpenSans_Condensed-SemiBold', path.join(__dirname, 'public', 'fonts', 'OpenSans_Condensed-SemiBold.ttf'));
      doc.font('OpenSans_Condensed-SemiBold').fontSize(7)
      doc.text('TICKET PERDIDO R$: 20,00', 0, doc.y, {
        align: 'center',
        width: doc.page.width
      });
      doc.text('HORÁRIO DE FUNCIONAMENTO: 8h às 17h', 0, doc.y, {
        align: 'center',
        width: doc.page.width
      });
      // ======= Contato com ícone do WhatsApp =======
      const whatsappIconPath = path.join(__dirname, 'public', 'img', 'whatsapp.png');
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

      doc.registerFont('OpenSans_Condensed-MediumItalic', path.join(__dirname, 'public', 'fonts', 'OpenSans_Condensed-MediumItalic.ttf'));
      doc.font('OpenSans_Condensed-MediumItalic').fontSize(6);
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