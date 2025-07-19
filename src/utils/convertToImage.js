const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

const { PdfConverter } = require('pdf-poppler');

async function convertPdfBase64ToImageBase64(pdfBase64) {
  const tmpPdfPath = path.join(__dirname, 'tmp-receipt.pdf');
  const tmpPngPath = path.join(__dirname, 'tmp-receipt-1.png'); // página 1

  try {
    await writeFile(tmpPdfPath, Buffer.from(pdfBase64, 'base64'));

    const converter = new PdfConverter(tmpPdfPath);
    await converter.convert({
      format: 'png',
      out_dir: path.dirname(tmpPdfPath),
      out_prefix: 'tmp-receipt',
      page: 1,
      resolution: 150,
    });

    const pngBuffer = await readFile(tmpPngPath);
    await unlink(tmpPdfPath);
    await unlink(tmpPngPath);

    return `data:image/png;base64,${pngBuffer.toString('base64')}`;
  } catch (err) {
    console.error('Erro ao converter PDF em imagem:', err);
    return null;
  }
}

module.exports = { convertPdfBase64ToImageBase64 }