const QRCode = require('qrcode');

async function generateQRCode(id, plate) {
  try {
    const data = JSON.stringify({ id, plate });
    const base64 = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 1,
      scale: 5,
    });
    return base64;
  } catch (error) {
    console.error("[QRCode Generator] Erro ao gerar QR Code:", error.message);
    throw new Error("Erro ao gerar QR Code");
  }
}

module.exports = {
  generateQRCode,
};
