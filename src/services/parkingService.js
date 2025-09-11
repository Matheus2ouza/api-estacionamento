const { PrismaClient } = require('@prisma/client');
const { DateTime } = require('luxon');
const prisma = new PrismaClient();

// Estrutura para mensagens
const createMessage = (userMessage, logMessage) => ({
  userMessage,
  logMessage
});

async function parkingConfigService() {
  try {
    const config = await prisma.parkingConfig.findUnique({
      where: { id: "singleton" },
      select: {
        maxCars: true,
        maxMotorcycles: true
      }
    })

    if (!config) {
      console.warn('[ParkingService] Tentativa de buscar configuração de pátio, mas não foi encontrada')
      return null;
    }

    return config;
  } catch (error) {
    console.error("[ParkingService] Erro ao buscar configuração de pátio:", error);
    throw error;
  }
}

async function parkingConfigSaveService(maxCars, maxMotorcycles) {
  try {
    const result = await prisma.parkingConfig.upsert({
      where: { id: "singleton" },
      update: {
        maxCars: maxCars,
        maxMotorcycles: maxMotorcycles
      },
      create: {
        id: "singleton",
        maxCars: maxCars,
        maxMotorcycles: maxMotorcycles
      }
    })

    if (!result) {
      const message = createMessage(
        'Erro ao salvar configuração de pátio',
        '[ParkingService] Tentativa de salvar configuração de pátio, mas não foi salvo'
      );
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    return result;
  } catch (error) {
    console.error("[ParkingService] Erro ao salvar configuração de pátio:", error);
    throw error;
  }
}

async function capacityParkingService(cashId) {
  try {
    const verifyCash = await prisma.cashRegister.findFirst({
      where: { id: cashId, status: "OPEN" },
    })

    if (!verifyCash) {
      const message = createMessage(
        'Caixa não encontrado ou fechado',
        '[ParkingService] Tentativa de buscar capacidade de pátio, mas caixa não encontrado ou fechado'
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    const parkingConfig = await prisma.parkingConfig.findUnique({
      where: { id: "singleton" },
      select: {
        maxCars: true,
        maxMotorcycles: true
      }
    });

    if (!parkingConfig) {
      const message = createMessage(
        'Configuração de pátio não encontrada. Configurar pátio primeiro.',
        '[ParkingService] Tentativa de buscar capacidade de pátio, mas configuração de pátio não encontrada'
      )
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    const quantityVehicles = await prisma.vehicleEntries.count({
      where: {
        status: { in: ["INSIDE"] },
        cashRegisterId: cashId,
      },
    });

    const quantityMotorcycles = await prisma.vehicleEntries.count({
      where: {
        status: { in: ["INSIDE"] },
        cashRegisterId: cashId,
        category: "moto"
      },
    });

    const quantityCars = await prisma.vehicleEntries.count({
      where: {
        status: { in: ["INSIDE"] },
        cashRegisterId: cashId,
        category: "carro"
      },
    });

    return {
      ...parkingConfig,
      quantityVehicles,
      quantityMotorcycles,
      quantityCars
    };
  } catch (error) {
    console.error("[ParkingService] Erro ao buscar capacidade de pátio:", error);
    throw error;
  }
}

module.exports = {
  parkingConfigService,
  parkingConfigSaveService,
  capacityParkingService
}
