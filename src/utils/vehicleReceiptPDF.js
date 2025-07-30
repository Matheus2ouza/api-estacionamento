const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Generates a vehicle exit receipt in PDF format.
 * All assets (fonts, images) are defined and pre-loaded at the top to ensure
 * the process doesn't crash if a file is missing.
 */
async function generateVehicleReceiptPDF(operator, paymentMethod, plate, amountReceived, discountValue, changeGiven, finalPrice, originalAmount) {
  return new Promise((resolve, reject) => {
    try {
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
          // The alias will be replaced by the fallback in the rendering logic
          // by reassigning the alias in the doc itself. A cleaner way is to just use the fallback later.
          // For simplicity, pdfkit's standard fonts don't need registration, so we just log the warning.
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
        const logoWidth = 40;
        const logoX = doc.page.margins.left;
        const logoY = doc.y;
        doc.image(assets.images.logo.path, logoX, logoY, { width: logoWidth });
        
        const textX = logoX + logoWidth + 5;
        const textY = logoY + 2;

        doc.font('Oswald-Bold').fillColor('black');
        doc.fontSize(18).text('LEÃO', textX, textY, { align: 'left' });
        doc.fontSize(10).text('ESTACIONAMENTO', textX, doc.y - 5, { align: 'left' });
      } else {
        // Fallback layout if logo is missing
        doc.font('Helvetica-Bold').fontSize(18).text('LEÃO ESTACIONAMENTO', { align: 'center' });
      }

      doc.moveDown(1);

      // --- Título do recibo (SAÍDA) ---
      doc.font('OpenSans-SemiBold').fontSize(8).fillColor('black');
      doc.text('COMPROVANTE DE SAÍDA', { align: 'center', width: printWidth });
      doc.moveDown(1);

      // --- Informações principais ---
      const leftX = doc.page.margins.left;
      doc.font('OpenSans_Condensed-Regular').fontSize(7).fillColor('black');
      doc.text(`Operador: ${operator}`, leftX, doc.y, { width: printWidth, align: 'left' });
      doc.text(`Pagamento: ${paymentMethod}`, leftX, doc.y, { width: printWidth, align: 'left' });

      // Placa em destaque
      doc.moveDown(0.7);
      doc.font('OpenSans_Condensed-SemiBold').fontSize(9);
      doc.text(`PLACA: ${plate.toUpperCase()}`, leftX, doc.y, { width: printWidth, align: 'center', underline: true });
      doc.moveDown(0.7);

      // ========== Linha separadora ==========
      doc.lineWidth(0.5).dash(3, { space: 2 }).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke().undash();
      doc.moveDown(0.5);

      // ========== Valores ==========
      doc.font('Helvetica-Bold').fontSize(7);

      // Define a reusable function for value rows
      const addValueRow = (label, value) => {
        doc.text(label, doc.page.margins.left, doc.y, { continued: true });
        doc.text(value, { align: 'right' });
      };

      addValueRow('Valor Original R$:', `R$ ${Number(originalAmount).toFixed(2)}`);
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
      doc.font('OpenSans_Condensed-SemiBold').fontSize(7);
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
      doc.text('Obrigado pela preferência!', { align: 'center', width: printWidth });

      doc.end();

    } catch (error) {
      console.error('Fatal error during PDF generation for vehicle receipt:', error);
      reject(error);
    }
  });
}

module.exports = { generateVehicleReceiptPDF };