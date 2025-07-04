const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function vehicleEntry(plate, category, operatorId) {
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
      where: { id: operatorId },
    });

    if (!operator) {
      console.warn(`[vehicleService] O id ${operatorId} não foi encontrado`);
      throw new Error("Operador invalido.");
    }

    // Registra a entrada do veículo
    const vehicle = await prisma.vehicleEntry.create({
      data: { 
        plate,
        category,
        operator: operator.username,
      },
    });

    console.log(`[vehicleService] Entrada registrada com sucesso. ID: ${vehicle.id}`);
    return vehicle;

  } catch (err) {
    console.error(`[vehicleService] Erro ao registrar entrada: ${err.message}`);
    throw new Error(err.message || "Erro interno ao registrar a entrada do veículo.");
  }
}

async function getConfigParking() {
  try {
    return await prisma.patioConfig.findUnique({
      where: { id: "singleton" }
    });
  } catch (err) {
    console.error("[vehicleService] Erro ao buscar os dados do pátio:", err);
    throw err;
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
  } catch (err) {
    console.error("[vehicleService] Erro ao configurar pátio:", err);
    throw err;
  }
}

async function getParkedVehicles() {
  try {
    const vehicles = await prisma.vehicleEntry.findMany({
      select: {
        id: true,
        plate: true,
        entryTime: true,
        operator: true,
        category: true
      },
      orderBy: {
        entryTime: 'asc',
      },
    });

    const formattedVehicles = vehicles.map(vehicle => ({
      id: vehicle.id,
      plate: vehicle.plate,
      entryTime: vehicle.entryTime.toISOString(),
      operator: vehicle.operator.toUpperCase(),
      category: vehicle.category.toUpperCase(),
    }));

    return formattedVehicles;

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

async function editVehicleService(id, category, plate) {
  const verifyPlate = prisma.vehicleEntry.findFirst({
    where: {id: id}
  })

  if(!verifyPlate) {
    console.log(`[VheicleService] Tentativa de atualizar os dados de um veiculo mas ele nao foi encontrado`)
    throw new Error('Veiculo não encontrado no patio')
  }

  try{
    const result = await prisma.vehicleEntry.update({
      where: {id: id},
      data: {
        plate: plate,
        category: category
      }
    })

    return result
  }catch (error) {
    throw error
  }
}

module.exports = {
  vehicleEntry,
  getConfigParking,
  configParking,
  getParkedVehicles,
  editVehicleService,
  hasNewVehicleEntries
};
