const { PrismaClient } = require('@prisma/client');
const { formatBelemTime, getCurrentBelemTime } = require('../utils/timeConverter');
const prisma = new PrismaClient();

// Estrutura para mensagens
const createMessage = (userMessage, logMessage) => ({
  userMessage,
  logMessage
});


/**
 * Registra uma entrada de veículo
 * @param {Object} params - Parâmetros para registrar uma entrada de veículo
 * @param {string} params.plate - Placa do veículo
 * @param {Date} params.entryTime - Data e hora de entrada do veículo
 * @param {string} params.formattedEntryTime - Data e hora de entrada do veículo formatada
 * @param {string} params.category - Categoria do veículo
 * @param {string} params.cashRegisterId - ID do caixa
 * @param {string} params.billingMethodId - ID do método de cobrança
 * @param {Object} params.user - Usuário que registrou a entrada
 * @param {string} params.observation - Observação da entrada do veículo
 * @param {Buffer} params.photoBuffer - Buffer da foto do veículo
 * @param {string} params.photoMimeType - Tipo de mídia da foto do veículo
 */
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
        `[vehicleService] Tentativa de registrar entrada de veículo com placa já existente`
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
        `[vehicleService] Tentativa de registrar entrada de veículo com método de cobrança não encontrado`
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    const description = `Registro da entrada do veículo: ${user.id} em ${formattedEntryTime}`;

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
    const message = createMessage(
      'Erro ao registrar entrada de veículo',
      `[vehicleService] Erro ao registrar entrada de veículo`
    );
    console.error(message.logMessage);
    throw new Error(message.userMessage);
  }
}

/**
 * Lista entradas de veículos
 * @param {string} cashId - ID do caixa
 * @param {string} cursor - Cursor para paginacao
 * @param {number} limit - Limite de entradas de veículos
 * @returns {Promise<Object>} - Lista de entradas de veículos
 */
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
    const message = createMessage(
      'Erro ao buscar entradas de veículos',
      `[vehicleService] Erro ao buscar entradas de veículos`
    );
    console.error(message.logMessage);
    throw new Error(message.userMessage);
  }
}

/**
 * Busca foto de um veículo
 * @param {string} vehicleId - ID do veículo
 * @returns {Promise<Object>} - Foto do veículo
 */
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
    const message = createMessage(
      'Erro ao buscar foto do veículo',
      `[vehicleService] Erro ao buscar foto do veículo`
    );
    console.error(message.logMessage);
    throw new Error(message.userMessage);
  }
}

/**
 * Busca um veículo
 * @param {string} vehicleId - ID do veículo
 * @returns {Promise<Object>} - Veículo
 */
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
    const message = createMessage(
      'Erro ao buscar veículo',
      `[vehicleService] Erro ao buscar veículo`
    );
    console.error(message.logMessage);
    throw new Error(message.userMessage);
  }
}

/**
 * Desativa um veículo
 * @param {string} vehicleId - ID do veículo
 * @param {Object} user - Usuário que desativou o veículo
 * @returns {Promise<Object>} - Veículo desativado
 */
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
    \nRegistro de desativação do veículo: ${user.id} em ${formattedEntryTime}`;


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
    const message = createMessage(
      'Erro ao desativar veículo',
      `[vehicleService] Erro ao desativar veículo`
    );
    console.error(message.logMessage);
    throw new Error(message.userMessage);
  }
}

/**
 * Reativa um veículo
 * @param {string} vehicleId - ID do veículo
 * @param {Object} user - Usuário que reativou o veículo
 * @returns {Promise<Object>} - Veículo reativado
 */
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
    \nRegistro de reativação do veículo: ${user.id} em ${formattedEntryTime}`;

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
    const message = createMessage(
      'Erro ao reativar veículo',
      `[vehicleService] Erro ao reativar veículo`
    );
    console.error(message.logMessage);
    throw new Error(message.userMessage);
  }
}

/**
 * Atualiza um veículo
 * @param {string} vehicleId - ID do veículo
 * @param {string} plate - Placa do veículo
 * @param {string} category - Categoria do veículo
 * @param {string} observation - Observação do veículo
 * @param {string} billingMethod - ID do método de cobrança
 * @param {Object} user - Usuário que atualizou o veículo
 * @returns {Promise<Object>} - Veículo atualizado
 */
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
    \nRegistro da atualização do veículo: ${user.id} em ${formattedEntryTime}`;

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
    const message = createMessage(
      'Erro ao atualizar veículo',
      `[vehicleService] Erro ao atualizar veículo`
    );
    console.error(message.logMessage);
    throw new Error(message.userMessage);
  }
};

/**
 * Atualiza a foto de um veículo
 * @param {string} vehicleId - ID do veículo
 * @param {Buffer} photoBuffer - Buffer da foto do veículo
 * @param {string} photoMimeType - Tipo de mídia da foto do veículo
 * @param {Object} user - Usuário que atualizou a foto do veículo
 * @returns {Promise<Object>} - Veículo atualizado
 */
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
    \nRegistro da atualização da foto do veículo: ${user.id} em ${formattedEntryTime}`;

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
    const message = createMessage(
      'Erro ao atualizar foto do veículo',
      `[vehicleService] Erro ao atualizar foto do veículo`
    );
    console.error(message.logMessage);
    throw new Error(message.userMessage);
  }
}

/**
 * Deleta a foto de um veículo
 * @param {string} vehicleId - ID do veículo
 * @param {Object} user - Usuário que deletou a foto do veículo
 * @returns {Promise<Object>} - Veículo atualizado
 */
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
    \nRegistro da deleção da foto do veículo: ${user.id} em ${formattedEntryTime}`;

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
    const message = createMessage(
      'Erro ao deletar foto do veículo',
      `[vehicleService] Erro ao deletar foto do veículo`
    );
    console.error(message.logMessage);
    throw new Error(message.userMessage);
  }
}

/**
 * Busca um veículo
 * @param {string} vehicleId - ID do veículo
 * @param {string} plateId - ID da placa do veículo
 * @returns {Promise<Object>} - Veículo
 */
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
    const message = createMessage(
      'Erro ao buscar veículo',
      `[vehicleService] Erro ao buscar veículo`
    );
    console.error(message.logMessage);
    throw new Error(message.userMessage);
  }
}

/**
 * Calcula a dívida de um veículo
 * @param {string} vehicleId - ID do veículo
 * @param {string} plateId - ID da placa do veículo
 * @returns {Promise<Object>} - Veículo
 */
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
    const message = createMessage(
      'Erro ao calcular dívida de veículo',
      `[vehicleService] Erro ao calcular dívida de veículo`
    );
    console.error(message.logMessage);
    throw new Error(message.userMessage);
  }
}

/**
 * Confirma uma saída de veículo
 * @param {Object} params - Parâmetros para confirmar uma saída de veículo
 * @param {string} params.cashId - ID do caixa
 * @param {string} params.vehicleId - ID do veículo
 * @param {Date} params.exitTime - Data e hora de saída do veículo
 * @param {string} params.formattedExitTime - Data e hora de saída do veículo formatada
 * @param {number} params.amountReceived - Valor recebido
 * @param {number} params.changeGiven - Valor do troco
 * @param {number} params.discountAmount - Valor do desconto
 * @param {number} params.finalAmount - Valor final
 * @param {number} params.originalAmount - Valor original
 * @param {string} params.method - Método de pagamento
 * @param {Object} params.user - Usuário que confirmou a saída do veículo
 * @param {Buffer} params.photoBuffer - Buffer da foto do veículo
 * @param {string} params.photoMimeType - Tipo de mídia da foto do veículo
 * @returns {Promise<Object>} - Veículo confirmado
 */
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
  \nRegistro de confirmação da saída do veículo: ${user.id} em ${formattedExitTime}`;

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
    const message = createMessage(
      'Erro ao confirmar saída de veículo',
      `[vehicleService] Erro ao confirmar saída de veículo`
    );
    console.error(message.logMessage);
    throw new Error(message.userMessage);
  }
}

/**
 * Busca dados para gerar segunda via do recibo
 * @param {string} transactionId - ID da transação
 * @returns {Promise<Object>} - Dados para gerar segunda via do recibo
 */
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
    const message = createMessage(
      'Erro ao buscar dados para gerar segunda via do recibo',
      `[vehicleService] Erro ao buscar dados para gerar segunda via do recibo`
    );
    console.error(message.logMessage);
    throw new Error(message.userMessage);
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
