const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { generateQRCode } = require('./qrCodeGenerator');

// Configurações centralizadas de recursos
const RESOURCES = {
  fonts: {
    oswaldBold: path.join(__dirname, '..', 'public', 'fonts', 'Oswald', 'Oswald-Bold.ttf'),
    openSansSemiCondensedBold: path.join(__dirname, '..', 'public', 'fonts', 'OpenSans_SemiCondensed', 'normal', 'OpenSans_SemiCondensed-Bold.ttf'),
    openSansCondensedSemiBold: path.join(__dirname, '..', 'public', 'fonts', 'OpenSans_Condensed', 'normal', 'OpenSans_Condensed-SemiBold.ttf'),
    openSansCondensedMedium: path.join(__dirname, '..', 'public', 'fonts', 'OpenSans_Condensed', 'normal', 'OpenSans_Condensed-Medium.ttf'),
    openSansCondensedMediumItalic: path.join(__dirname, '..', 'public', 'fonts', 'OpenSans_Condensed', 'Italic', 'OpenSans_Condensed-MediumItalic.ttf'),
    helvetica: 'Helvetica',
    helveticaBold: 'Helvetica-Bold'
  },
  images: {
    logo: path.join(__dirname, '..', 'public', 'img', 'png', 'logo.png'),
    whatsapp: path.join(__dirname, '..', 'public', 'img', 'png', 'whatsapp.png')
  }
};

async function generateEntryTicketPDF({ id, plate, operator, category, formattedDate, formattedTime, tolerance, description, price }) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [137, 340],
        margins: { top: 5, bottom: 5, left: 5, right: 5 },
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData.toString('base64'));
      });

      // === Registrar todas as fontes ===
      try {
        doc.registerFont('Oswald-Bold.ttf', RESOURCES.fonts.oswaldBold);
        doc.registerFont('OpenSans_SemiCondensed-Bold', RESOURCES.fonts.openSansSemiCondensedBold);
        doc.registerFont('OpenSans_Condensed-SemiBold', RESOURCES.fonts.openSansCondensedSemiBold);
        doc.registerFont('OpenSans_Condensed-Medium', RESOURCES.fonts.openSansCondensedMedium);
        doc.registerFont('OpenSans_Condensed-MediumItalic', RESOURCES.fonts.openSansCondensedMediumItalic);
      } catch (err) {
        console.warn('[PrintLayout] Falha ao registrar fontes:', err.message);
      }

      // === Cabeçalho com logo ===
      try {
        const logoWidth = 40;
        const logoX = 5;
        const logoY = 5;

        doc.image(RESOURCES.images.logo, logoX, logoY, { width: logoWidth });

        const textX = logoX + logoWidth - 2;
        const textY = logoY + 2;

        doc.font('Oswald-Bold.ttf').fillColor('black');

        doc.fontSize(18);
        doc.text('LEÃO', textX, textY, { align: 'left' });

        doc.fontSize(10);
        doc.text('ESTACIONAMENTO', textX, doc.y - 5, { align: 'left' });

        doc.moveDown(0.5);
      } catch (err) {
        console.warn('[PrintLayout] Falha ao carregar logo ou título:', err.message);
      }

      // Título centralizado
      doc.font('OpenSans_SemiCondensed-Bold').fontSize(7);
      const entryText = 'Comprovante de Entrada';
      const entryTextWidth = doc.widthOfString(entryText);
      const centerX = (doc.page.width - entryTextWidth) / 2;
      doc.text(entryText, centerX, doc.y);
      doc.moveDown(0.5);

      doc.fontSize(8).font(RESOURCES.fonts.helvetica);

      function drawLabelValue(label, value, valueFontSize = 7, labelFontSize = 8, lineHeight = 10) {
        const labelX = 10;
        const y = doc.y;

        doc.font(RESOURCES.fonts.helvetica).fontSize(valueFontSize);
        const valueWidth = doc.widthOfString(value);
        const valueX = doc.page.width - 10 - valueWidth;

        doc.font(RESOURCES.fonts.helveticaBold).fontSize(labelFontSize);
        doc.text(label, labelX, y);

        doc.font(RESOURCES.fonts.helvetica).fontSize(valueFontSize);
        doc.text(value, valueX, y);

        doc.y = y + lineHeight;
      }

      drawLabelValue('PLACA:', plate);
      drawLabelValue('CATEGORIA:', category);
      drawLabelValue('OPERADOR:', operator);
      drawLabelValue('DATA:', `${formattedDate}`);
      drawLabelValue('HORA:', `${formattedTime}`);

      doc.moveDown(0.5);
      doc.lineWidth(0.5);
      doc.dash(2, { space: 2 });
      doc.moveTo(10, doc.y).lineTo(doc.page.width - 10, doc.y).stroke();
      doc.undash();

      const qrDataUrl = await generateQRCode(id, plate);
      const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBuffer = Buffer.from(qrBase64, 'base64');

      const qrX = (doc.page.width - 90) / 2;
      const qrY = doc.y + 5;

      doc.image(qrBuffer, qrX, qrY, { width: 90 });
      doc.y = qrY + 90 + 5;

      // === Adicionando seção de cobrança no mesmo estilo ===
      doc.moveDown(0.5);
      doc.lineWidth(0.5);
      doc.dash(2, { space: 2 });
      doc.moveTo(10, doc.y).lineTo(doc.page.width - 10, doc.y).stroke();
      doc.undash();

      doc.moveDown(0.5);
      // Informações de cobrança no mesmo estilo
      drawLabelValue('VALOR:', `R$ ${price ? price.toFixed(2).replace('.', ',') : '0,00'}`);
      drawLabelValue('TOLERÂNCIA:', `${tolerance || 0} min`);

      if (description) {
        doc.moveDown(0.3);

        // Configura fonte itálica
        doc.font(RESOURCES.fonts.openSansCondensedMediumItalic)
          .fontSize(5)
          .fillColor('black');

        // Garante que description seja string
        const descText = String(description || '');

        try {
          // Usa o método text() com quebra automática de linha e centralização
          // Largura reduzida para deixar margens nas laterais
          const textWidth = doc.page.width * 0.8; // 80% da largura da página
          const textX = (doc.page.width - textWidth) / 2; // Centraliza o bloco de texto

          doc.text(descText, textX, doc.y, {
            width: textWidth,
            align: 'center',
            lineGap: 1
          });

        } catch (err) {
          console.warn('Erro ao renderizar descrição:', err);
          // Fallback: texto simples centralizado com largura reduzida
          const textWidth = doc.page.width * 0.8;
          const textX = (doc.page.width - textWidth) / 2;

          doc.text('Descrição indisponível', textX, doc.y, {
            width: textWidth,
            align: 'center'
          });
        }
      }

      doc.moveDown(0.5);
      doc.font('OpenSans_Condensed-SemiBold').fontSize(7);
      doc.text('TICKET PERDIDO R$: 20,00', 0, doc.y, { align: 'center', width: doc.page.width });
      doc.text('HORÁRIO DE FUNCIONAMENTO: 8h às 17h', 0, doc.y, { align: 'center', width: doc.page.width });

      const iconSize = 10;
      const gap = 4;
      const contactText = 'CONTATO: (91) 9 8564-6187';

      doc.fontSize(7);
      const textWidth = doc.widthOfString(contactText);
      const printableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const blockWidth = iconSize + gap + textWidth;
      const startX = doc.page.margins.left + (printableWidth - blockWidth) / 2;
      const y = doc.y;

      try {
        doc.image(RESOURCES.images.whatsapp, startX, y, { width: iconSize });
      } catch (e) {
        console.warn('Não encontrou ícone do WhatsApp:', e.message);
      }

      doc.text(contactText, startX + iconSize + gap, y, {
        width: textWidth,
        align: 'left',
      });

      const lineH = Math.max(iconSize, doc.currentLineHeight());
      doc.y = y + lineH + 2;

      doc.font('OpenSans_Condensed-MediumItalic').fontSize(6);
      doc.text('Apresente o comprovante na saída', 0, doc.y, { align: 'center', width: doc.page.width });
      doc.text('Obrigado pela preferência', 0, doc.y, { align: 'center', width: doc.page.width });

      doc.end();

    } catch (error) {
      console.error("Erro ao gerar PDF:", error.message);
      reject(error);
    }
  });
}

module.exports = { generateEntryTicketPDF };
