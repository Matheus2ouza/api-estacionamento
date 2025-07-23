const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function vehicleEntry(plate, category, operatorId, date, formattedDate) {
  try {
    const verifyPlate = await prisma.vehicleEntry.findFirst({
      where: {
        plate: plate,
        status: "INSIDE"
      }
    });

    if (verifyPlate) {
      throw new Error('Já existe um veiculo com essa placa dentro do estacionamento');
    }

    const operator = await prisma.account.findUnique({
      where: { id: operatorId },
      select: { username: true }
    })

    if (!operator) {
      throw new Error('Operador não encontrado');
    }

    const newEntry = await prisma.vehicleEntry.create({
      data: {
        plate: plate,
        category: category,
        operator: operator.username,
        entryTime: date,
        description: `Registro criado pelo operador ${operator.username} em ${formattedDate}`
      }
    })
    return newEntry
  } catch (error) {
    throw error
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
  try {
    const configParking = await prisma.patioConfig.upsert({
      where: { id: "singleton" },
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

async function getvehicle(id) {
  try{
    const result = await prisma.vehicleEntry.findUnique({
      where: {
        id: id,
        status: 'INSIDE'
      },
      select: {
        plate: true,
        entryTime: true,
        operator: true,
        category: true,
      }
    })

    return result
  } catch (err) {
    throw err
  }
}

async function getUniqueVehicleService(id, plate) {
  try{
    const result = await prisma.vehicleEntry.findUnique({
      where: {id: id, plate: plate, status: 'INSIDE'},
      select: {
        category: true,
        entryTime: true,
      }
    })

    return result
  } catch (err) {
    throw err
  }
}

async function getParkedVehicles() {
  try {
    const vehicles = await prisma.vehicleEntry.findMany({
      where: {status: 'INSIDE'},
      select: {
        id: true,
        plate: true,
        entryTime: true,
        operator: true,
        category: true,
        description: true
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
      description: vehicle.description
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

async function editVehicleService(id, category, plate, formattedDate, user) {
  const verifyPlate = await prisma.vehicleEntry.findFirst({
    where: {
      id: id,
      status: "INSIDE"
    }
  })

  if (!verifyPlate) {
    console.log(`[VehicleService] Tentativa de atualizar os dados de um veículo, mas ele não foi encontrado`);
    throw new Error('Veiculo não encontrado no patio')
  }

  const updatedDescription = `${verifyPlate.description || ""}
  \nRegistro editado por ${user.username} em ${formattedDate}`

  try {
    const result = await prisma.vehicleEntry.update({
      where: { id: id },
      data: {
        plate: plate,
        category: category,
        description: updatedDescription.trim()
      }
    })

    return result
  } catch (error) {
    throw error
  }
}

async function deleteVehicleService(id, date, formattedDate, user) {
  try {
    const verifyPlate = await prisma.vehicleEntry.findFirst({
      where: { id: id }
    })

    if (!verifyPlate) {
      console.log(`[VehicleService] Tentativa de excluir os dados de um veículo, mas ele não foi encontrado`);
      throw new Error('Veiculo não encontrado no patio')
    }

    const updatedDescription = `${verifyPlate.description}
    \nRegistro apagado por ${user.username} em ${formattedDate}`

    const result = await prisma.vehicleEntry.update({
      where: {id: id},
      data: {
        status : "DELETED",
        deletedAt: date,
        description: updatedDescription.trim()
      }
    })

    return result
  } catch (error) {
    throw error
  }
}

module.exports = {
  vehicleEntry,
  getConfigParking,
  getvehicle,
  getUniqueVehicleService,
  configParking,
  getParkedVehicles,
  editVehicleService,
  deleteVehicleService,
  hasNewVehicleEntries
};
