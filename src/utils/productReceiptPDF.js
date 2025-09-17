const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { DateTime } = require("luxon");

/**
 * Generates a product sale receipt in PDF format with supermarket-style layout.
 * All assets (fonts, images) are defined and pre-loaded at the top to ensure
 * the process doesn't crash if a file is missing.
 */
async function generateProductReceiptPDF({
  operator,
  paymentMethod,
  saleItems,
  totalAmount,
  discountValue,
  finalPrice,
  amountReceived,
  changeGiven,
  transactionDate
}) {

  // Funções auxiliares para formatação de data e hora
  const formatDateTime = (dateTime) => {
    if (!dateTime) return { date: '--/--/----', time: '--:--:--' };

    const dt = DateTime.fromJSDate(dateTime).setZone("America/Belem");
    return {
      date: dt.toFormat('dd/MM/yyyy'),
      time: dt.toFormat('HH:mm:ss')
    };
  };

  const transactionFormatted = formatDateTime(transactionDate);

  return new Promise((resolve, reject) => {
    try {
      // Calcular altura dinâmica baseada na quantidade de produtos
      const baseHeight = 260; // Altura base (cabeçalho + rodapé + informações básicas)
      const productHeight = 30; // Altura por produto (nome + detalhes + espaçamento) - aumentado mais
      const dynamicHeight = baseHeight + (saleItems.length * productHeight);

      // Limitar altura mínima e máxima
      const minHeight = 250;
      const maxHeight = 5000;
      const docHeight = Math.max(minHeight, Math.min(maxHeight, dynamicHeight));

      const doc = new PDFDocument({
        size: [137, docHeight],
        margins: { top: 8, bottom: 8, left: 8, right: 8 },
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData.toString('base64'));
      });

      // ========== 1. ASSET DEFINITION & SAFE LOADING ==========

      // Define all asset paths and fallbacks in one place
      const assets = {
        fonts: {
          'Oswald-Bold': {
            path: path.join(__dirname, '..', 'public', 'fonts', 'Oswald', 'Oswald-Bold.ttf'),
            fallback: 'Helvetica-Bold',
          },
          'OpenSans-SemiBold': {
            path: path.join(__dirname, '..', 'public', 'fonts', 'OpenSans_SemiCondensed', 'normal', 'OpenSans_SemiCondensed-Bold.ttf'),
            fallback: 'Helvetica-Bold',
          },
          'OpenSans_Condensed-Regular': {
            path: path.join(__dirname, '..', 'public', 'fonts', 'OpenSans_Condensed', 'normal', 'OpenSans_Condensed-Regular.ttf'),
            fallback: 'Helvetica',
          },
          'OpenSans_Condensed-SemiBold': {
            path: path.join(__dirname, '..', 'public', 'fonts', 'OpenSans_Condensed', 'normal', 'OpenSans_Condensed-SemiBold.ttf'),
            fallback: 'Helvetica-Bold',
          },
        },
        images: {
          logo: { path: path.join(__dirname, '..', 'public', 'img', 'png', 'logo.png') },
          whatsapp: { path: path.join(__dirname, '..', 'public', 'img', 'png', 'whatsapp.png') },
        },
      };

      // Safely register all fonts
      for (const alias in assets.fonts) {
        try {
          const font = assets.fonts[alias];
          if (fs.existsSync(font.path)) {
            doc.registerFont(alias, font.path);
          } else {
            throw new Error(`Font file not found at ${font.path}`);
          }
        } catch (err) {
          console.warn(`[PDF Generation] Could not load font '${alias}'. Using fallback '${assets.fonts[alias].fallback}'. Error: ${err.message}`);
        }
      }

      // Check for image existence
      const logoExists = fs.existsSync(assets.images.logo.path);
      if (!logoExists) console.warn(`[PDF Generation] Logo image not found at: ${assets.images.logo.path}`);

      const whatsappIconExists = fs.existsSync(assets.images.whatsapp.path);
      if (!whatsappIconExists) console.warn(`[PDF Generation] WhatsApp icon not found at: ${assets.images.whatsapp.path}`);

      // ========== 2. PDF CONTENT GENERATION ==========

      const printWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // ========== Cabeçalho ==========
      if (logoExists) {
        const logoWidth = 25;
        const logoX = doc.page.margins.left;
        const logoY = doc.y;
        doc.image(assets.images.logo.path, logoX, logoY, { width: logoWidth });

        const textX = logoX + logoWidth + 5;
        const textY = logoY + 2;

        doc.font('Oswald-Bold').fillColor('black');
        doc.fontSize(16).text('LEÃO', textX, textY, { align: 'left' });
        doc.fontSize(9).text('ESTACIONAMENTO', textX, doc.y - 3, { align: 'left' });
      } else {
        // Fallback layout if logo is missing
        doc.font('Helvetica-Bold').fillColor('black').fontSize(16)
          .text('LEÃO ESTACIONAMENTO', doc.page.margins.left, doc.y, { align: 'center', width: printWidth });
      }

      doc.moveDown(1);

      // --- Título do recibo (VENDAS) ---
      doc.font('Helvetica-Bold').fontSize(8).fillColor('black');
      doc.text('COMPROVANTE DE VENDA', doc.page.margins.left, doc.y, { align: 'center', width: printWidth });
      doc.moveDown(1);

      // --- Informações da transação ---
      const leftX = doc.page.margins.left;

      // Define a reusable function for info rows
      const addInfoRow = (label, value) => {
        doc.font('Helvetica-Bold').fontSize(7).fillColor('black');
        doc.text(label, doc.page.margins.left, doc.y, { continued: true });
        doc.font('Helvetica').fontSize(7).fillColor('black');
        doc.text(value, { align: 'right' });
        doc.moveDown(0.3);
      };

      // Informações da venda
      addInfoRow('Operador:', operator);
      addInfoRow('Pagamento:', paymentMethod);
      addInfoRow('Data:', transactionFormatted.date);
      addInfoRow('Hora:', transactionFormatted.time);
      doc.moveDown(0.5);

      // ========== Linha separadora ==========
      doc.lineWidth(0.5).dash(3, { space: 2 }).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke().undash();
      doc.moveDown(0.5);

      // ========== Lista de Produtos ==========
      doc.font('Helvetica-Bold').fontSize(7).fillColor('black');
      doc.text('PRODUTOS VENDIDOS:', doc.page.margins.left, doc.y);
      doc.moveDown(0.3);

      // Lista de produtos (formato simples, sem tabela)
      doc.font('Helvetica').fontSize(6);
      saleItems.forEach((item, index) => {
        const itemNumber = index + 1;
        const productName = item.productName || 'Produto';
        const quantity = item.soldQuantity || 0;
        const unitPrice = Number(item.unitPrice || 0);
        const itemTotal = quantity * unitPrice;

        // Nome do produto
        doc.text(`${itemNumber}. ${productName}`, doc.page.margins.left, doc.y);
        doc.moveDown(0.4);

        // Detalhes do produto (quantidade, preço, total)
        doc.text(`   Qtd: ${quantity} x R$ ${unitPrice.toFixed(2)} = R$ ${itemTotal.toFixed(2)}`, doc.page.margins.left, doc.y);
        doc.moveDown(0.5);
      });

      doc.moveDown(0.5);

      // ========== Linha separadora ==========
      doc.lineWidth(0.5).dash(3, { space: 2 }).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke().undash();
      doc.moveDown(0.5);

      // ========== Resumo dos Valores ==========
      doc.font('Helvetica-Bold').fontSize(7);

      // Define a reusable function for value rows
      const addValueRow = (label, value) => {
        doc.text(label, doc.page.margins.left, doc.y, { continued: true });
        doc.text(value, { align: 'right' });
      };

      addValueRow('Subtotal R$:', `R$ ${Number(totalAmount).toFixed(2)}`);
      addValueRow('Desconto R$:', `- R$ ${Number(discountValue).toFixed(2)}`);

      doc.moveDown(0.3);
      doc.lineWidth(1).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.moveDown(0.3);

      doc.fontSize(8);
      addValueRow('TOTAL R$:', `R$ ${Number(finalPrice).toFixed(2)}`);
      doc.moveDown(0.5);

      doc.fontSize(7);
      addValueRow('Valor Recebido R$:', `R$ ${Number(amountReceived).toFixed(2)}`);
      addValueRow('Troco R$:', `R$ ${Number(changeGiven).toFixed(2)}`);
      doc.moveDown(1);

      // ========== Mensagem final ==========
      doc.font('Helvetica-Bold').fontSize(7);
      doc.text('HORÁRIO DE FUNCIONAMENTO: 8h às 17h', { align: 'center', width: printWidth });

      // Contato WhatsApp
      const contactText = 'CONTATO: (91) 9 8564-6187';
      const iconSize = 10;
      const gap = 4;
      const textWidth = doc.widthOfString(contactText);
      const blockWidth = (whatsappIconExists ? iconSize + gap : 0) + textWidth;
      const startX = doc.page.margins.left + (printWidth - blockWidth) / 2;
      const contactY = doc.y;

      if (whatsappIconExists) {
        doc.image(assets.images.whatsapp.path, startX, contactY, { height: iconSize });
        doc.text(contactText, startX + iconSize + gap, contactY + 1);
      } else {
        doc.text(contactText, { align: 'center', width: printWidth });
      }

      const lineH = Math.max(iconSize, doc.currentLineHeight());
      doc.y = contactY + lineH + 2;

      // Mensagem final
      doc.font('Helvetica-Oblique').fontSize(6);
      doc.text('Obrigado pela preferência!', doc.page.margins.left, doc.y, { align: 'center', width: printWidth });

      doc.end();

    } catch (error) {
      console.error('Fatal error during PDF generation for product receipt:', error);
      reject(error);
    }
  });
}

module.exports = { generateProductReceiptPDF };
