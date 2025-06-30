const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function vehicleEntry(plate, category, operatorUsername) {
  try {
    // Verifica se o veículo já está no pátio
    const checkPlate = await prisma.vehicleEntry.findUnique({
      where: { plate },
    });

    if (checkPlate) {
      console.warn(`[vehicleService] Veículo com placa ${plate} já está no pátio.`);
      throw new Error("Veículo já registrado no pátio.");
    }

    // Busca o operador pelo username
    const operator = await prisma.account.findUnique({
      where: { username: operatorUsername },
    });

    if (!operator) {
      console.warn(`[vehicleService] Operador ${operatorUsername} não encontrado.`);
      throw new Error("Operador inválido para essa ação.");
    }

    // Registra a entrada do veículo
    const vehicle = await prisma.vehicleEntry.create({
      data: { 
        plate,
        category,
        operatorId: operator.id,
      },
    });

    console.log(`[vehicleService] Entrada registrada com sucesso. ID: ${vehicle.id}`);
    return vehicle;

  } catch (err) {
    console.error(`[vehicleService] Erro ao registrar entrada: ${err.message}`);
    throw new Error(err.message || "Erro interno ao registrar a entrada do veículo.");
  }
}


async function configParking(maxCars, maxMotorcycles, maxLargeVehicles) {
  try{
    const configParking = await prisma.PatioConfig.upsert({
      where: {id: "singleton"},
      update: {
        maxCars,
        maxMotorcycles,
        maxLargeVehicles
      },
      create: {
        id: "singleton",
        maxCars,
        maxMotorcycles,
        maxLargeVehicles
      },
    });

    return configParking
  } catch (error) {
    console.error("Erro ao configurar pátio:", error);
    throw error;
  }
}

async function getParkedVehicles() {
  try {
    const vehicles = await prisma.vehicleEntry.findMany({
      select: {
        plate: true,
        entryTime: true
      },
      orderBy: {
        entryTime: 'asc'
      }
    });

    const adjustedVehicles = vehicles.map(vehicle => ({
      ...vehicle,
      entryTime: new Date(
        new Date(vehicle.entryTime).getTime() - 3 * 60 * 60 * 1000
      ).toISOString()
    }));

    return adjustedVehicles;

  } catch (err) {
    console.error(`[vehicleService] Erro ao buscar veículos no pátio: ${err.message}`);
    throw new Error("Erro ao buscar veículos estacionados.");
  }
}

async function hasNewVehicleEntries(lastCheck) {
  try {
    const parsedDate = new Date(lastCheck);

    if (isNaN(parsedDate)) {
      throw new Error("Formato de data inválido.");
    }

    const newEntries = await prisma.vehicleEntry.findFirst({
      where: {
        entryTime: {
          gt: parsedDate
        }
      },
      select: {
        id: true
      }
    });

    return !!newEntries;

  } catch (err) {
    console.error(`[vehicleService] Erro ao verificar novas entradas: ${err.message}`);
    throw err;
  }
}


module.exports = {
  vehicleEntry,
  configParking,
  getParkedVehicles,
  hasNewVehicleEntries
};
