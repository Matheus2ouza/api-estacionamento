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
      where: { status: 'INSIDE' },
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

async function billingMethodService() {
  try {
    const result = await prisma.billing_method.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        tolerance: true,
        billing_rule: {
          select: {
            id: true,
            price: true,
            base_time_minutes: true,
            vehicle_type: true,
            created_at: true,
            updated_at: true
          }
        }
      }
    });
    return result;
  } catch (error) {
    console.error('Erro ao buscar billing methods:', error);
    throw new Error('Erro ao buscar métodos de cobrança');
  }
}

async function methodActiveService() {
  try {
    // Busca o método ativo primeiro
    const activeMethod = await prisma.billing_method.findFirst({
      where: {
        is_active: true
      },
      include: {
        billing_rule: true // Isso trará todas as regras associadas
      }
    });

    if (!activeMethod) {
      return null;
    }

    // Formata a resposta para manter compatibilidade
    return {
      method: {
        id: activeMethod.id,
        name: activeMethod.name,
        description: activeMethod.description,
        tolerance: activeMethod.tolerance,
        is_active: activeMethod.is_active
      },
      rules: activeMethod.billing_rule.map(rule => ({
        id: rule.id,
        price: rule.price,
        base_time_minutes: rule.base_time_minutes,
        vehicle_type: rule.vehicle_type,
        billing_method_id: rule.billing_method_id,
        created_at: rule.created_at,
        updated_at: rule.updated_at
      }))
    };
  } catch (error) {
    console.error('Erro ao buscar método de cobrança ativo:', error);
    throw new Error('Erro ao buscar método de cobrança ativo');
  }
}

async function methodSaveService({ methodId, toleranceMinutes, rules }) {
  // Definindo os tipos de veículo válidos conforme o enum no Prisma
  const VehicleCategory = {
    CARRO: 'carro',
    MOTO: 'moto'
  };

  try {
    console.log('Iniciando transaction para salvar método', { methodId });

    return await prisma.$transaction(async (tx) => {
      // 1. Validação dos dados de entrada
      const normalizedRules = rules.map(rule => {
        const vehicleType = rule.vehicle_type?.toString().toLowerCase().trim();

        if (!Object.values(VehicleCategory).includes(vehicleType)) {
          throw new Error(`Tipo de veículo inválido: ${rule.vehicle_type}. Valores permitidos: ${Object.values(VehicleCategory).join(', ')}`);
        }

        return {
          price: rule.price,
          base_time_minutes: rule.base_time_minutes,
          vehicle_type: vehicleType
        };
      });

      // 2. Desativa todos os métodos existentes (para garantir apenas um ativo)
      console.log('Desativando todos os métodos existentes');
      await tx.billing_method.updateMany({
        data: { is_active: false }
      });

      // 3. Remove todas as regras
      console.log(`Removendo regras existentes para o método ${methodId}`);
      await tx.billing_rule.deleteMany({});

      // 4. Cria as novas regras
      console.log('Criando novas regras', { count: normalizedRules.length });
      const createdRules = await Promise.all(
        normalizedRules.map(rule =>
          tx.billing_rule.create({
            data: {
              ...rule,
              billing_method_id: methodId
            }
          })
        )
      );

      // 5. Ativa e atualiza o método principal
      console.log('Ativando método principal', { methodId });
      await tx.billing_method.update({
        where: { id: methodId },
        data: {
          tolerance: toleranceMinutes,
          is_active: true
        }
      });

      console.log('Configuração salva com sucesso', {
        methodId,
        rulesCreated: createdRules.length
      });

      return createdRules;
    });

  } catch (error) {
    console.error('Falha ao salvar método:', {
      methodId,
      error: error.message,
      stack: error.stack
    });
    throw new Error(`Erro ao salvar configuração: ${error.message}`);
  }
}

async function exitsRegisterService(plate, exit_time, openCashId, user, amount_received, change_given, discount_amount, final_amount, original_amount, normalizedMethod, local) {
  // Verificar se o caixa existe
  const verifyCash = await prisma.cash_register.findUnique({
    where: { id: openCashId },
  });

  if (!verifyCash) {
    throw new Error('Caixa não encontrado');
  }

  // Verificar se o operador existe
  const verifyOperator = await prisma.accounts.findUnique({
    where: { id: user.id },
  });

  if (!verifyOperator) {
    throw new Error('Operador não encontrado');
  }

  const verifyVehicle = await prisma.vehicle_entries.findFirst({
    where: {plate: plate, status: 'INSIDE'}
  })

  if (!verifyVehicle) {
    throw new Error('Veiculo não encontrado');
  }

  const updatedDescription = `${verifyVehicle.description || ""}
  \nRegistro da saida do veiculo: ${verifyOperator.username} em ${exit_time}`;

  try{
    const transactionId = await prisma.$transaction(async (tx) => {
      const exitVehicle = await tx.vehicle_entries.update({
        where: { id: verifyVehicle.id },
        data: {
          description: updatedDescription,
          exit_time: exit_time,
          status: 'EXITED'
        }
      });

      const transaction = await tx.vehicle_transaction.create({
        data: {
          vehicle_id: verifyVehicle.id,
          operator: verifyOperator.username,
          transaction_date: local,
          cash_register_id: verifyCash.id,
          amount_received: amount_received,
          change_given: discount_amount,
          discount_amount: change_given,
          final_amount: final_amount,
          original_amount: original_amount,
          method: normalizedMethod
        }
      });

      return transaction.id
    })

    if(transactionId) {
      await prisma.cash_register.update({
        where: {id: verifyCash.id},
        data:{
          final_value: {
            increment: final_amount
          },
          vehicle_entry_total: {
            increment: final_amount
          }
        }
      })
    }
    return transactionId;
  } catch (error) {
    throw new Error('Erro ao registrar pagamento: ' + error.message);
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
  parkingSpaces,
  billingMethodService,
  methodActiveService,
  methodSaveService,
  exitsRegisterService
};