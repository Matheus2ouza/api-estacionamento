const { PrismaClient } = require('@prisma/client');
const { formatBelemTime, getCurrentBelemTime } = require('../utils/timeConverter');
const prisma = new PrismaClient();

// Estrutura para mensagens
const createMessage = (userMessage, logMessage) => ({
  userMessage,
  logMessage
});

async function registerVehicleEntryService({
  plate,
  entryTime,
  formattedEntryTime,
  category,
  cashRegisterId,
  billingMethodId,
  user,
  observation,
  photoBuffer,
  photoMimeType,
}) {
  try {
    const verifyVehicle = await prisma.vehicleEntries.findFirst({
      where: { plate: plate, status: 'INSIDE' },
    })

    if (verifyVehicle) {
      const message = createMessage(
        'Já existe um veículo com essa placa dentro do estacionamento',
        `[vehicleService] Tentativa de registrar entrada de veículo com placa já existente: ${plate}`
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    const verifyBillingMethod = await prisma.billingMethod.findUnique({
      where: { id: billingMethodId }
    })

    if (!verifyBillingMethod) {
      const message = createMessage(
        'Método de cobrança não encontrado',
        `[vehicleService] Tentativa de registrar entrada de veículo com método de cobrança não encontrado: ${billingMethodId}`
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    const description = `Registro da entrada do veículo: ${user.username} em ${formattedEntryTime}`;

    const entry = await prisma.vehicleEntries.create({
      data: {
        plate: plate,
        entryTime: entryTime,
        category: category,
        billingMethodId: billingMethodId,
        cashRegisterId: cashRegisterId,
        operator: user.username,
        description: description,
        observation: observation,
        photo: photoBuffer,
        photoType: photoMimeType,
      },
      select: {
        id: true,
        plate: true,
        operator: true,
        category: true,
        billingMethod: {
          select: {
            tolerance: true,
            description: true,
            carroValue: true,
            motoValue: true,
          }
        }
      }
    })

    return entry;
  } catch (error) {
    console.error(`[vehicleService] Erro ao registrar entrada de veículo: ${error.message}`);
    throw error;
  }
}

async function listVehicleEntriesService(cashId, cursor, limit) {
  try {
    const verifyCash = await prisma.cashRegister.findFirst({
      where: { id: cashId, status: "OPEN" },
    })

    if (!verifyCash) {
      const message = createMessage(
        'Caixa não encontrado ou fechado',
        '[vehicleService] Tentativa de buscar entradas de veículos, mas caixa não encontrado ou fechado'
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    const whereQuery = {
      status: { in: ["INSIDE", "DELETED"] },
      cashRegisterId: cashId,
      ...(cursor ? { entryTime: { gt: new Date(cursor) } } : {})
    }

    const limitNumber = Number(limit) || 5;
    const takeLimit = limitNumber + 1; // Busca 1 a mais para verificar se há mais registros

    const vehicles = await prisma.vehicleEntries.findMany({
      where: whereQuery,
      orderBy: {
        entryTime: 'asc',
      },
      take: takeLimit,
      select: {
        id: true,
        plate: true,
        entryTime: true,
        category: true,
        billingMethodId: true,
        cashRegisterId: true,
        operator: true,
        deletedAt: true,
        description: true,
        exitTime: true,
        status: true,
        observation: true,
        billingMethod: {
          select: {
            title: true,
          }
        },
        photoType: true,
      }
    })

    // Verifica se há mais registros
    const hasMore = vehicles.length > limitNumber;

    // Remove o registro extra se existir
    const finalVehicles = hasMore ? vehicles.slice(0, limitNumber) : vehicles;

    const nextCursor = finalVehicles.length > 0 ? finalVehicles[finalVehicles.length - 1].entryTime.toISOString() : null;

    return {
      vehicles: finalVehicles,
      nextCursor,
      hasMore
    }
  } catch (error) {
    console.error(`[vehicleService] Erro ao buscar entradas de veículos: ${error.message}`);
    throw error;
  }
}

async function vehicleEntryPhotoService(vehicleId) {
  try {
    const photo = await prisma.vehicleEntries.findUnique({
      where: { id: vehicleId },
      select: {
        photo: true,
        photoType: true
      }
    })

    if (!photo) {
      const message = createMessage(
        'Foto não encontrada',
        '[vehicleService] Tentativa de buscar foto do veículo, mas foto não encontrada'
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    // Converte Uint8Array para base64
    const photoBase64 = photo.photo ? Buffer.from(photo.photo).toString('base64') : null;

    return {
      photo: photoBase64,
      photoType: photo.photoType
    };
  } catch (error) {
    console.error(`[vehicleService] Erro ao buscar foto do veículo: ${error.message}`);
    throw error;
  }
}

async function searchVehicleEntryService(vehicleId) {
  try {
    const vehicle = await prisma.vehicleEntries.findUnique({
      where: { id: vehicleId },
      select: {
        id: true,
        plate: true,
        operator: true,
        category: true,
        billingMethod: {
          select: {
            tolerance: true,
            description: true,
            carroValue: true,
            motoValue: true,
          }
        }
      }
    })

    if (!vehicle) {
      const message = createMessage(
        'Veículo não encontrado',
        '[vehicleService] Tentativa de buscar veículo, mas veículo não encontrado'
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    return vehicle;
  } catch (error) {
    console.error(`[vehicleService] Erro ao buscar veículo: ${error.message}`);
    throw error;
  }
}

async function desactivateVehicleEntryService(vehicleId, user) {
  try {
    const vehicle = await prisma.vehicleEntries.findUnique({
      where: { id: vehicleId },
    })

    if (!vehicle) {
      const message = createMessage(
        'Veículo não encontrado',
        '[vehicleService] Tentativa de desativar veículo, mas veículo não encontrado'
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    const formattedEntryTime = formatBelemTime(getCurrentBelemTime());

    const updatedDescription = `${vehicle.description || ""}
    \nRegistro de desativação do veículo: ${user.username} em ${formattedEntryTime}`;


    const desactivatedVehicle = await prisma.vehicleEntries.update({
      where: { id: vehicleId },
      data: {
        deletedAt: new Date(),
        status: 'DELETED',
        description: updatedDescription
      }
    })

    return desactivatedVehicle;
  } catch (error) {
    console.error(`[vehicleService] Erro ao desativar veículo: ${error.message}`);
    throw error;
  }
}

async function activateVehicleEntryService(vehicleId, user) {
  try {
    const vehicle = await prisma.vehicleEntries.findUnique({
      where: { id: vehicleId },
    })

    if (!vehicle) {
      const message = createMessage(
        'Veículo não encontrado',
        '[vehicleService] Tentativa de reativar veículo, mas veículo não encontrado'
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    const formattedEntryTime = formatBelemTime(getCurrentBelemTime());

    const updatedDescription = `${vehicle.description || ""}
    \nRegistro de reativação do veículo: ${user.username} em ${formattedEntryTime}`;

    const activatedVehicle = await prisma.vehicleEntries.update({
      where: { id: vehicleId },
      data: {
        deletedAt: null,
        status: 'INSIDE',
        description: updatedDescription
      }
    })

    return activatedVehicle;
  } catch (error) {
    console.error(`[vehicleService] Erro ao reativar veículo: ${error.message}`);
    throw error;
  }
}

async function vehicleEntryUpdateService(vehicleId, plate, category, observation, billingMethod, user) {
  try {
    const verifyVehicle = await prisma.vehicleEntries.findUnique({
      where: { id: vehicleId },
    })

    if (!verifyVehicle) {
      const message = createMessage(
        'Veículo não encontrado',
        '[vehicleService] Tentativa de atualizar veículo, mas veículo não encontrado'
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    const formattedEntryTime = formatBelemTime(getCurrentBelemTime());

    const updatedDescription = `${verifyVehicle.description || ""}
    \nRegistro da atualização do veículo: ${user.username} em ${formattedEntryTime}`;

    const updatedVehicle = await prisma.vehicleEntries.update({
      where: { id: vehicleId },
      data: {
        plate: plate,
        category: category,
        observation: observation,
        billingMethod: {
          connect: {
            id: billingMethod
          }
        },
        description: updatedDescription,
      },
      select: {
        id: true,
        plate: true,
        operator: true,
        category: true,
        entryTime: true,
        billingMethod: {
          select: {
            tolerance: true,
            description: true,
            carroValue: true,
            motoValue: true,
          }
        }
      }
    });

    return updatedVehicle;
  } catch (error) {
    console.error(`[vehicleService] Erro ao atualizar veículo: ${error.message}`);
    throw error;
  }
};

async function vehicleEntryUpdatePhotoService(vehicleId, photoBuffer, photoMimeType, user) {
  try {
    const vehicle = await prisma.vehicleEntries.findUnique({
      where: { id: vehicleId },
    })

    if (!vehicle) {
      const message = createMessage(
        'Veículo não encontrado',
        '[vehicleService] Tentativa de atualizar foto do veículo, mas veículo não encontrado'
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    const formattedEntryTime = formatBelemTime(getCurrentBelemTime());

    const updatedDescription = `${vehicle.description || ""}
    \nRegistro da atualização da foto do veículo: ${user.username} em ${formattedEntryTime}`;

    const updatedVehicle = await prisma.vehicleEntries.update({
      where: { id: vehicleId },
      data: {
        photo: photoBuffer,
        photoType: photoMimeType,
        description: updatedDescription
      }
    })

    return updatedVehicle;
  } catch (error) {
    console.error(`[vehicleService] Erro ao atualizar foto do veículo: ${error.message}`);
    throw error;
  }
}

async function vehicleEntryDeletePhotoService(vehicleId, user) {
  try {
    const vehicle = await prisma.vehicleEntries.findUnique({
      where: { id: vehicleId },
    })

    if (!vehicle) {
      const message = createMessage(
        'Veículo não encontrado',
        '[vehicleService] Tentativa de deletar foto do veículo, mas veículo não encontrado'
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    const formattedEntryTime = formatBelemTime(getCurrentBelemTime());

    const updatedDescription = `${vehicle.description || ""}
    \nRegistro da deleção da foto do veículo: ${user.username} em ${formattedEntryTime}`;

    const updatedVehicle = await prisma.vehicleEntries.update({
      where: { id: vehicleId },
      data: {
        photo: null,
        photoType: null,
        description: updatedDescription
      }
    })

    return updatedVehicle;
  }
  catch (error) {
    console.error(`[vehicleService] Erro ao deletar foto do veículo: ${error.message}`);
    throw error;
  }
}

async function fetchVehicleEntryService(vehicleId, plateId) {
  try {
    const vehicle = await prisma.vehicleEntries.findFirst({
      where: { id: vehicleId, plate: plateId, status: "INSIDE" },
      select: {
        id: true,
        plate: true,
        entryTime: true,
        category: true,
        observation: true,
        photoType: true,
        billingMethod: {
          select: {
            title: true,
            description: true,
            tolerance: true,
            timeMinutes: true,
            carroValue: true,
            motoValue: true,
          }
        }
      }
    });

    if (!vehicle) {
      const message = createMessage(
        'Veículo não encontrado',
        '[vehicleService] Tentativa de buscar veículo, mas veículo não encontrado'
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    // Adiciona o campo value baseado na categoria do veículo
    const value = vehicle.category === 'carro'
      ? vehicle.billingMethod.carroValue
      : vehicle.billingMethod.motoValue;

    // Adiciona o campo value ao billingMethod
    const vehicleWithValue = {
      ...vehicle,
      billingMethod: {
        ...vehicle.billingMethod,
        value: value
      }
    };

    return vehicleWithValue;
  } catch (error) {
    console.error(`[vehicleService] Erro ao buscar veículo: ${error.message}`);
    throw error;
  }
}

async function calculateOutstandingService(vehicleId, plateId) {
  try {
    const vehicle = await prisma.vehicleEntries.findFirst({
      where: { id: vehicleId, plate: plateId, status: "INSIDE" },
      select: {
        entryTime: true,
        category: true,
        billingMethod: {
          select: {
            tolerance: true,
            timeMinutes: true,
            carroValue: true,
            motoValue: true,
          }
        }
      }
    });

    if (!vehicle) {
      const message = createMessage(
        'Veículo não encontrado',
        '[vehicleService] Tentativa de calcular dívida de veículo, mas veículo não encontrado'
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    return vehicle;
  }
  catch (error) {
    console.error(`[vehicleService] Erro ao calcular dívida de veículo: ${error.message}`);
    throw error;
  }
}

async function exitsRegisterConfirmService({
  cashId,
  vehicleId,
  exitTime,
  formattedExitTime,
  amountReceived,
  changeGiven,
  discountAmount,
  finalAmount,
  originalAmount,
  method,
  user,
  photoBuffer,
  photoMimeType,
}) {
  const vehicle = await prisma.vehicleEntries.findFirst({
    where: { id: vehicleId, status: 'INSIDE' },
  })

  if (!vehicle) {
    const message = createMessage(
      'Veículo não encontrado',
      '[vehicleService] Tentativa de confirmar saída de veículo, mas veículo não encontrado'
    )
    console.warn(message.logMessage);
    throw new Error(message.userMessage);
  }

  const verifyCash = await prisma.cashRegister.findFirst({
    where: { id: cashId, status: 'OPEN' },
  })

  if (!verifyCash) {
    const message = createMessage(
      'Caixa não encontrada',
      '[vehicleService] Tentativa de confirmar saída de veículo, mas caixa não encontrada'
    )
    console.warn(message.logMessage);
    throw new Error(message.userMessage);
  }

  const updatedDescription = `${vehicle.description || ""}
  \nRegistro de confirmação da saída do veículo: ${user.username} em ${formattedExitTime}`;

  try {
    const transactionExit = await prisma.$transaction(async (tx) => {
      const vehicleUpdated = await tx.vehicleEntries.update({
        where: { id: vehicleId },
        data: {
          description: updatedDescription,
          exitTime: exitTime,
          status: 'EXITED'
        },
        select: {
          id: true,
          plate: true,
          category: true,
          entryTime: true,
          exitTime: true,
        }
      })

      const transaction = await tx.vehicleTransaction.create({
        data: {
          vehicleId: vehicleUpdated.id,
          operator: user.username,
          transactionDate: exitTime,
          cashRegisterId: cashId,
          amountReceived: amountReceived,
          changeGiven: changeGiven,
          discountAmount: discountAmount,
          finalAmount: finalAmount,
          originalAmount: originalAmount,
          method: method,
          photo: photoBuffer,
          photoType: photoMimeType,
        }, select: {
          id: true,
          method: true,
          amountReceived: true,
          discountAmount: true,
          changeGiven: true,
          finalAmount: true,
          originalAmount: true,
        }
      })

      await tx.cashRegister.update({
        where: { id: cashId },
        data: {
          finalValue: {
            increment: transaction.finalAmount
          },
          vehicleEntryTotal: {
            increment: transaction.finalAmount
          }
        }
      })

      return {
        transaction,
        vehicleUpdated
      };
    })

    return transactionExit;
  } catch (error) {
    console.error(`[vehicleService] Erro ao confirmar saída de veículo: ${error.message}`);
    throw error;
  }
}

async function vehicleExitDuplicateService(transactionId) {
  try {
    const transaction = await prisma.vehicleTransaction.findFirst({
      where: { id: transactionId },
      select: {
        vehicleEntries: {
          select: {
            plate: true,
            category: true,
            entryTime: true,
            exitTime: true,
          },
        },
        method: true,
        operator: true,
        amountReceived: true,
        discountAmount: true,
        changeGiven: true,
        finalAmount: true,
        originalAmount: true,
      }
    });

    if (!transaction) {
      const message = createMessage(
        'Dados para gerar segunda via do recibo não encontrados',
        '[vehicleService] Tentativa de buscar dados para gerar segunda via do recibo, mas dados não encontrados'
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    return transaction;
  } catch (error) {
    console.error(`[vehicleService] Erro ao buscar dados para gerar segunda via do recibo: ${error.message}`);
    throw error;
  }
}

module.exports = {
  registerVehicleEntryService,
  listVehicleEntriesService,
  vehicleEntryPhotoService,
  searchVehicleEntryService,
  desactivateVehicleEntryService,
  activateVehicleEntryService,
  vehicleEntryUpdateService,
  vehicleEntryUpdatePhotoService,
  vehicleEntryDeletePhotoService,
  fetchVehicleEntryService,
  calculateOutstandingService,
  exitsRegisterConfirmService,
  vehicleExitDuplicateService,
};
