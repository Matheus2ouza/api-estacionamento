const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function vehicleEntry(plate, category, operatorId, date, formattedDate, observation, photoBuffer, photoMimeType) {
  try {
    const verifyPlate = await prisma.vehicle_entries.findFirst({
      where: {
        plate: plate,
        status: "INSIDE"
      }
    });

    if (verifyPlate) {
      throw new Error('Já existe um veículo com essa placa dentro do estacionamento');
    }

    const operator = await prisma.accounts.findUnique({
      where: { id: operatorId },
      select: { username: true }
    });

    if (!operator) {
      throw new Error('Operador não encontrado');
    }

    const newEntry = await prisma.vehicle_entries.create({
      data: {
        plate: plate,
        category: category,
        operator: operator.username,
        entry_time: date,
        description: `Registro criado pelo operador ${operator.username} em ${formattedDate}`,
        observation: observation || null,
        photo: photoBuffer || null,
        photo_type: photoMimeType || null,
      }
    });

    return newEntry;
  } catch (error) {
    throw error;
  }
}

async function getConfigParking() {
  try {
    return await prisma.patio_configs.findUnique({
      where: { id: "singleton" }
    });
  } catch (err) {
    console.error("[vehicleService] Erro ao buscar os dados do pátio:", err);
    throw err;
  }
}

async function configParking(maxCars, maxMotorcycles, maxLargeVehicles) {
  try {
    const configParking = await prisma.patio_configs.upsert({
      where: { id: "singleton" },
      update: {
        max_cars: maxCars,
        max_motorcycles: maxMotorcycles,
        max_large_vehicles: maxLargeVehicles
      },
      create: {
        id: "singleton",
        max_cars: maxCars,
        max_motorcycles: maxMotorcycles,
        max_large_vehicles: maxLargeVehicles
      },
    });

    return configParking;
  } catch (err) {
    console.error("[vehicleService] Erro ao configurar pátio:", err);
    throw err;
  }
}

async function getvehicle(id) {
  try {
    const result = await prisma.vehicle_entries.findUnique({
      where: {
        id: id,
        status: 'INSIDE'
      },
      select: {
        plate: true,
        entry_time: true,
        operator: true,
        category: true,
      }
    });

    return result;
  } catch (err) {
    throw err;
  }
}

async function getUniqueVehicleService(id, plate) {
  try {
    const result = await prisma.vehicle_entries.findUnique({
      where: { id: id, plate: plate, status: 'INSIDE' },
      select: {
        category: true,
        entry_time: true,
      }
    });

    return result;
  } catch (err) {
    throw err;
  }
}

async function getParkedVehicles(role) {
  try {
    const whereClause = role === 'ADMIN'
      ? { OR: [{ status: 'INSIDE' }, { status: 'DELETED' }] }
      : { status: 'INSIDE' };
    
    const vehicles = await prisma.vehicle_entries.findMany({
      where: whereClause,
      select: {
        id: true,
        plate: true,
        status: true,
        entry_time: true,
        operator: true,
        category: true,
        description: true
      },
      orderBy: {
        entry_time: 'asc',
      },
    });

    const formattedVehicles = vehicles.map(vehicle => ({
      id: vehicle.id,
      plate: vehicle.plate,
      status: vehicle.status,
      entryTime: vehicle.entry_time.toISOString(),
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

    const newEntries = await prisma.vehicle_entries.findFirst({
      where: {
        entry_time: {
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
  const verifyPlate = await prisma.vehicle_entries.findFirst({
    where: {
      id: id,
      status: "INSIDE"
    }
  });

  if (!verifyPlate) {
    console.log(`[VehicleService] Tentativa de atualizar os dados de um veículo, mas ele não foi encontrado`);
    throw new Error('Veículo não encontrado no pátio');
  }

  const updatedDescription = `${verifyPlate.description || ""}
  \nRegistro editado por ${user.username} em ${formattedDate}`;

  try {
    const result = await prisma.vehicle_entries.update({
      where: { id: id },
      data: {
        plate: plate,
        category: category,
        description: updatedDescription.trim()
      }
    });

    return result;
  } catch (error) {
    throw error;
  }
}

async function deleteVehicleService(id, date, formattedDate, user) {
  try {
    const verifyPlate = await prisma.vehicle_entries.findFirst({
      where: { id: id }
    });

    if (!verifyPlate) {
      console.log(`[VehicleService] Tentativa de excluir os dados de um veículo, mas ele não foi encontrado`);
      throw new Error('Veículo não encontrado no pátio');
    }

    const updatedDescription = `${verifyPlate.description}
    \nRegistro apagado por ${user.username} em ${formattedDate}`;

    const result = await prisma.vehicle_entries.update({
      where: { id: id },
      data: {
        status: "DELETED",
        deleted_at: date,
        description: updatedDescription.trim()
      }
    });

    return result;
  } catch (error) {
    throw error;
  }
}

async function reactivateVehicleService(id, plate, user, formattedDate) {
  const verifyPlate = await prisma.vehicle_entries.findFirst({
    where: {
      id: id,
      plate: plate
    },
    select: { description: true }
  });

  if (!verifyPlate) {
    throw new Error("Veículo não encontrado");
  }

  const updatedDescription = `${verifyPlate.description}
  \nRegistro reativado por ${user.username} em ${formattedDate}`;

  try {
    const result = await prisma.vehicle_entries.update({
      where: {
        id: id,
        plate: plate
      },
      data: {
        status: 'INSIDE',
        description: updatedDescription
      },
      select: {
        plate: true,
        status: true,
      }
    });

    return result;
  } catch (err) {
    throw err;
  }
}

async function parkingSpaces() {
  try {
    const parkingConfig = await prisma.patio_configs.findUnique({
      where: { id: 'singleton' },
      select: {
        max_cars: true,
        max_motorcycles: true
      }
    })

    const vehicles = await prisma.vehicle_entries.findMany({
      where: {status: 'INSIDE'},
      select: {
        category: true
      }
    })

    const totalCarsInside = vehicles.filter(v => v.category === 'carro').length;
    const totalMotosInside = vehicles.filter(v => v.category === 'moto').length;

    const carVacancies = Math.max(0, Number(parkingConfig.max_cars) - totalCarsInside);
    const motorcycleVacancies = Math.max(0, Number(parkingConfig.max_motorcycles) - totalMotosInside);

    return {
      carVacancies,
      motorcycleVacancies,
      totalCarsInside,
      totalMotosInside,
    };
  } catch (err) {
    throw err
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
  reactivateVehicleService,
  hasNewVehicleEntries,
  parkingSpaces
};