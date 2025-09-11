const { generateVehicleReceiptPDFImproved } = require('../src/utils/vehicleReceiptPDFImproved');
const fs = require('fs');
const path = require('path');

// Criar pasta de testes se não existir
const testDir = path.join(__dirname, 'output');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

async function testDetailedPdf() {
  console.log('🧪 Testando PDF com detalhes do veículo...\n');

  try {
    // Dados de teste com informações completas do veículo
    const entryTime = new Date('2024-09-10T08:30:15.000Z'); // 8:30:15 UTC
    const exitTime = new Date('2024-09-10T14:45:30.000Z');  // 14:45:30 UTC

    const pdfBase64 = await generateVehicleReceiptPDFImproved({
      operator: 'João Silva',
      paymentMethod: 'DINHEIRO',
      plate: 'ABC-1234',
      amountReceived: 25.00,
      discountValue: 2.50,
      changeGiven: 2.50,
      finalPrice: 20.00,
      originalAmount: 22.50,
      category: 'carro',
      entryTime: entryTime,
      exitTime: exitTime
    });

    // Salvar PDF
    const pdfPath = path.join(testDir, 'teste-pdf-detalhado.pdf');
    fs.writeFileSync(pdfPath, pdfBase64, 'base64');

    console.log('✅ PDF gerado com sucesso com detalhes do veículo!');
    console.log(`📁 Salvo em: ${pdfPath}`);

    // Verificar tamanho do arquivo
    const stats = fs.statSync(pdfPath);
    console.log(`📊 Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);

    console.log('\n📋 Informações incluídas no PDF:');
    console.log('   • Operador: João Silva');
    console.log('   • Método de Pagamento: DINHEIRO');
    console.log('   • Placa: ABC-1234');
    console.log('   • Categoria: CARRO');
    console.log('   • Entrada: 10/09/2024 às 05:30:15 (horário de Belém)');
    console.log('   • Saída: 10/09/2024 às 11:45:30 (horário de Belém)');
    console.log('   • Valor Original: R$ 22,50');
    console.log('   • Desconto: R$ 2,50');
    console.log('   • Total: R$ 20,00');
    console.log('   • Valor Recebido: R$ 25,00');
    console.log('   • Troco: R$ 2,50');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  }
}

testDetailedPdf();
