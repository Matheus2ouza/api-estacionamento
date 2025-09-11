const { generateVehicleReceiptPDFImproved } = require('../src/utils/vehicleReceiptPDFImproved');
const fs = require('fs');
const path = require('path');

// Criar pasta de testes se não existir
const testDir = path.join(__dirname, 'output');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

async function testMotoPdf() {
  console.log('🏍️ Testando PDF com moto...\n');

  try {
    // Dados de teste para uma moto
    const entryTime = new Date('2024-09-10T10:15:00.000Z'); // 10:15:00 UTC
    const exitTime = new Date('2024-09-10T16:30:45.000Z');  // 16:30:45 UTC

    const pdfBase64 = await generateVehicleReceiptPDFImproved({
      operator: 'Maria Santos',
      paymentMethod: 'PIX',
      plate: 'XYZ-9876',
      amountReceived: 15.00,
      discountValue: 0.00,
      changeGiven: 0.00,
      finalPrice: 15.00,
      originalAmount: 15.00,
      category: 'moto',
      entryTime: entryTime,
      exitTime: exitTime
    });

    // Salvar PDF
    const pdfPath = path.join(testDir, 'teste-pdf-moto.pdf');
    fs.writeFileSync(pdfPath, pdfBase64, 'base64');

    console.log('✅ PDF gerado com sucesso para moto!');
    console.log(`📁 Salvo em: ${pdfPath}`);

    // Verificar tamanho do arquivo
    const stats = fs.statSync(pdfPath);
    console.log(`📊 Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);

    console.log('\n📋 Informações incluídas no PDF:');
    console.log('   • Operador: Maria Santos');
    console.log('   • Método de Pagamento: PIX');
    console.log('   • Placa: XYZ-9876');
    console.log('   • Categoria: MOTO');
    console.log('   • Entrada: 10/09/2024 às 07:15:00 (horário de Belém)');
    console.log('   • Saída: 10/09/2024 às 13:30:45 (horário de Belém)');
    console.log('   • Valor Original: R$ 15,00');
    console.log('   • Desconto: R$ 0,00');
    console.log('   • Total: R$ 15,00');
    console.log('   • Valor Recebido: R$ 15,00');
    console.log('   • Troco: R$ 0,00');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  }
}

testMotoPdf();
