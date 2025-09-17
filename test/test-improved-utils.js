const { generateVehicleReceiptPDFImproved } = require('../src/utils/vehicleReceiptPDFImproved');
const fs = require('fs');
const path = require('path');

// Criar pasta de testes se não existir
const testDir = path.join(__dirname, 'output');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

async function testImprovedUtils() {
  console.log('🧪 Testando o novo arquivo da pasta utils...\n');

  try {
    // Dados de teste
    const pdfBase64 = await generateVehicleReceiptPDFImproved(
      'João Silva',           // operator
      'DINHEIRO',            // paymentMethod
      'ABC-1234',            // plate
      20.00,                 // amountReceived
      2.50,                  // discountValue
      2.50,                  // changeGiven
      15.00,                 // finalPrice
      17.50                  // originalAmount
    );

    // Salvar PDF
    const pdfPath = path.join(testDir, 'teste-utils-improved.pdf');
    fs.writeFileSync(pdfPath, pdfBase64, 'base64');

    console.log('✅ PDF gerado com sucesso usando o arquivo da pasta utils!');
    console.log(`📁 Salvo em: ${pdfPath}`);

    // Verificar tamanho do arquivo
    const stats = fs.statSync(pdfPath);
    console.log(`📊 Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  }
}

testImprovedUtils();
