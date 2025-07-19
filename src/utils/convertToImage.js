const os = require('os');
const path = require('path');
const { promisify } = require('util');
const fs = require('fs');
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

const { fromPath } = require('pdf2pic');

async function convertPdfBase64ToImageBase64(pdfBase64) {
  const tmpDir = os.tmpdir(); // pasta temporária do sistema
  const tmpPdfPath = path.join(tmpDir, 'tmp-receipt.pdf');
  const outputDir = tmpDir;
  const outputPrefix = 'tmp-receipt';

  try {
    await writeFile(tmpPdfPath, Buffer.from(pdfBase64, 'base64'));

    const options = {
      density: 150,
      saveFilename: outputPrefix,
      savePath: outputDir,
      format: "png",
      width: 127,
      height: 0,
    };

    const storeAsImage = fromPath(tmpPdfPath, options);

    const pageToConvert = 1;
    const image = await storeAsImage(pageToConvert);

    const pngBuffer = await readFile(image.path);

    await unlink(tmpPdfPath);
    await unlink(image.path);

    return `data:image/png;base64,${pngBuffer.toString('base64')}`;
  } catch (err) {
    console.error('Erro ao converter PDF em imagem:', err);
    return null;
  }
}

module.exports = { convertPdfBase64ToImageBase64 };
