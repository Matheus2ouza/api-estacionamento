const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

const { fromPath } = require('pdf2pic');

async function convertPdfBase64ToImageBase64(pdfBase64) {
  const tmpPdfPath = path.join(__dirname, 'tmp-receipt.pdf');
  const outputDir = path.dirname(tmpPdfPath);
  const outputPrefix = 'tmp-receipt';

  try {
    // Salva o PDF temporariamente
    await writeFile(tmpPdfPath, Buffer.from(pdfBase64, 'base64'));

    // Configura conversão da página 1 em PNG com resolução 150 DPI
    const options = {
      density: 150,
      saveFilename: outputPrefix,
      savePath: outputDir,
      format: "png",
      width: 600,
      height: 800,
    };

    const storeAsImage = fromPath(tmpPdfPath, options);

    // Converte a primeira página
    const pageToConvert = 1;
    const image = await storeAsImage(pageToConvert);

    // Lê o arquivo PNG gerado
    const pngBuffer = await readFile(image.path);

    // Limpa arquivos temporários
    await unlink(tmpPdfPath);
    await unlink(image.path);

    // Retorna base64 com prefixo data URI
    return `data:image/png;base64,${pngBuffer.toString('base64')}`;
  } catch (err) {
    console.error('Erro ao converter PDF em imagem:', err);
    return null;
  }
}

module.exports = { convertPdfBase64ToImageBase64 };
