const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function vehicleEntry(plate) {
  try {
    // Verifica se o veículo já está no pátio
    const checkPlate = await prisma.vehicleEntry.findUnique({
      where: { plate },
    });

    if (checkPlate) {
      console.warn(`[vehicleService] Veículo com placa ${plate} já está no pátio.`);
      throw new Error("Veículo já registrado no pátio.");
    }

    // Registra a entrada do veículo
    const vehicle = await prisma.vehicleEntry.create({
      data: { plate },
    });

    console.log(`[vehicleService] Entrada registrada com sucesso. ID: ${vehicle.id}`);
    return vehicle;

  } catch (err) {
    console.error(`[vehicleService] Erro ao registrar entrada: ${err.message}`);
    throw new Error(err.message || "Erro interno ao registrar a entrada do veículo.");
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = {
  vehicleEntry,
};