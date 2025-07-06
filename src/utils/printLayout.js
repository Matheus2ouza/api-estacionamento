const path = require('path');
const { createCanvas, loadImage } = require("canvas");
const { generateQRCode } = require("./qrCodeGenerator");

async function generateEntryTicket({ id, plate, category, formattedDate, formattedTime }) {
  const width = 384;
  const height = 500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // fundo branco
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);

  const logoPath = path.join(__dirname, "..", "public", "logo.png");

  try {
    const logo = await loadImage(logoPath);

    ctx.save();
    ctx.globalAlpha = 0.15;

    const logoSize = 200;
    const x = (width - logoSize) / 2;
    const y = (height - logoSize) / 2;

    ctx.drawImage(logo, x, y, logoSize, logoSize);
    ctx.restore();
  } catch (err) {
    console.warn("[PrintLayout] Falha ao carregar logo marca d'água:", err.message);
  }

  ctx.fillStyle = "#000";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ESTACIONAMENTO CENTRAL", width / 2, 110);

  ctx.font = "16px sans-serif";
  ctx.fillText(`Placa: ${plate}`, width / 2, 150);
  ctx.fillText(`Categoria: ${category}`, width / 2, 180);
  ctx.fillText(`Entrada: ${formattedDate} ${formattedTime}`, width / 2, 210);

  ctx.beginPath();
  ctx.moveTo(20, 230);
  ctx.lineTo(width - 20, 230);
  ctx.stroke();

  const qrCodeBase64 = await generateQRCode(id, plate);
  const qrImage = await loadImage(qrCodeBase64);
  ctx.drawImage(qrImage, width / 2 - 75, 250, 150, 150);

  ctx.font = "14px sans-serif";
  ctx.fillText("Guarde este comprovante", width / 2, 430);

  return canvas.toDataURL();
}

module.exports = { generateEntryTicket };
