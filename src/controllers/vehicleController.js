const { validationResult } = require('express-validator');
const vehicleService = require('../services/vehicleService');
const { DateTime } = require("luxon");
const { generateEntryTicketPDF } = require('../utils/entryTicketGenerator');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateVehicleReceiptPDF } = require('../utils/vehicleReceiptPDF')

exports.vehicleEntry = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
      errors: errors.array(),
    });
  }

  let { plate, category, operatorId, observation } = req.body;
  const user = req.user

  const photoBuffer = req.file ? req.file.buffer : null;
  const photoMimeType = req.file ? req.file.mimetype : null;

  plate = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();

  const belemDateTime = DateTime.now().setZone("America/Belem");
  const formattedDate = belemDateTime.toFormat("dd/MM/yyyy HH:mm:ss");

  const isOldPattern = /^[A-Z]{3}[0-9]{4}$/.test(plate);
  const isMercosulPattern = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(plate);

  if (!(isOldPattern || isMercosulPattern)) {
    return res.status(400).json({
      success: false,
      message: 'Placa fora do formato esperado'
    });
  }

  try {
    const result = await vehicleService.vehicleEntry(
      plate,
      category,
      user.id,
      belemDateTime,
      formattedDate,
      observation || null,
      photoBuffer,
      photoMimeType
    );

    console.log('[Entrada Registrada]', {
      id: result.id,
      plate: result.plate,
      operator: result.operator,
      category: result.category,
      entryTime: result.entry_time
    });

    const dt = DateTime.fromJSDate(result.entry_time).setZone("America/Belem");
    const formattedDateOnly = dt.toFormat("dd/MM/yyyy");
    const formattedTimeOnly = dt.toFormat("HH:mm:ss");

    const rules = await prisma.billingMethod.findFirst({
      where: { is_active: true },
      select: {
        name: true,
        description: true,
        tolerance: true,
        billing_rule: {
          where: { vehicle_type: result.category },
          select: {
            price: true
          }
        }
      }
    })

    const name = rules.name.toLowerCase();
    const tolerance = rules.tolerance;
    const description = rules.description;
    const price = rules.billing_rule[0].price;

    const ticketPromise = generateEntryTicketPDF(
      result.id,
      result.plate,
      result.operator,
      result.category,
      formattedDateOnly,
      formattedTimeOnly,
      name,
      tolerance,
      description,
      price
    );

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 15000)
    );

    let ticket = null;
    try {
      ticket = await Promise.race([ticketPromise, timeoutPromise]);
    } catch (err) {
      if (err.message === 'timeout') {
        console.warn('⏰ Geração do ticket excedeu o tempo limite de 15s');
      } else {
        console.error('❌ Erro ao gerar ticket:', err.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: ticket
        ? 'Entrada do veículo registrada com sucesso'
        : 'Entrada registrada, mas o ticket não pôde ser gerado a tempo',
      ticket: ticket || null
    });

  } catch (error) {
    console.warn(`[VehicleController] Erro ao tentar registrar a entrada do veículo: ${error.message}`);
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.generateTicketDuplicate = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { id } = req.params;

  try {
    const vehicle = await vehicleService.getvehicle(id)
    console.log(vehicle);

    if (!vehicle) {
      return res.status(401).json({
        success: false,
        message: `vehiculo não encontrodo no patio`
      })
    }

    console.log(`Hora de entrada: ${vehicle.entry_time}`)
    const dt = DateTime.fromJSDate(vehicle.entry_time).setZone('America/Belem');

    const dataFormatada = dt.toFormat('dd/MM/yyyy');
    const horaFormatada = dt.toFormat('HH:mm:ss');

    console.log(`Data formatada: ${dataFormatada}`);
    console.log(`Hora formatada: ${horaFormatada}`);

    const rules = await prisma.billingMethod.findFirst({
      where: { is_active: true },
      select: {
        name: true,
        description: true,
        tolerance: true,
        billing_rule: {
          where: { vehicle_type: vehicle.category },
          select: {
            price: true
          }
        }
      }
    })

    const name = rules.name.toLowerCase();
    const tolerance = rules.tolerance;
    const description = rules.description;
    const price = rules.billing_rule[0].price;

    const secondTicket = await generateEntryTicketPDF(
      id,
      vehicle.plate,
      vehicle.operator,
      vehicle.category,
      dataFormatada,
      horaFormatada,
      name,
      tolerance,
      description,
      price
    );

    return res.status(201).json({
      success: true,
      ticket: secondTicket
    })
  } catch (error) {
    console.log(`[VehicleController] Erro ao tentar gerar a segunda via do ticket: ${error}`);
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

exports.getParkingConfig = async (req, res) => {
  try {
    const config = await vehicleService.getConfigParking();

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Os dados do patio ainda não foi configurado'
      });
    }

    return res.status(200).json({
      success: true,
      config
    });

  } catch (error) {
    console.error(`[VehicleController] Erro ao buscar os dados do pátio: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar configuração do pátio'
    });
  }
};

exports.ConfigurationParking = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.warn('[ConfigurationParking] Dados inválidos na requisição:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Erro de validação',
      fields: errors.array().reduce((acc, err) => {
        acc[err.path] = err.msg;
        return acc;
      }, {}),
    });
  }

  const { maxCars, maxMotorcycles } = req.body;

  try {
    const result = await vehicleService.configParking(maxCars, maxMotorcycles);

    return res.status(200).json({
      success: true,
      message: 'Configuração do pátio atualizada com sucesso',
      config: result,
    });

  } catch (error) {
    console.error(`[ConfigurationParking] Erro ao atualizar configuração do pátio: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar configuração do pátio',
    });
  }
};

exports.getUniqueVehicle = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { id, plate } = req.params;

  try {
    const vehicle = await vehicleService.getUniqueVehicleService(id, plate);

    if (!vehicle) {
      console.log(`[vehicleController] tentativa de busca da placa: ${plate}, mas não estava no patio`);
      return res.status(401).json({
        success: false,
        message: `O veículo não se encontra no pátio`
      });
    }

    // Formata o entryTime para horário de Belém
    if (vehicle.entryTime) {
      const dt = DateTime.fromJSDate(vehicle.entryTime).setZone('America/Belem');
      vehicle.entryTime = dt.toFormat('dd/MM/yyyy HH:mm:ss');
    }

    return res.status(201).json({
      success: true,
      car: vehicle
    });
  } catch (error) {
    console.log(`[vehicleController] Erro ao tentar buscar o veículo: ${error}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao tentar buscar o veículo: ${error}`
    });
  }
};

exports.getParkedVehicles = async (req, res) => {
  try {
    const user = req.user

    const vehicles = await vehicleService.getParkedVehicles(user.role);

    return res.status(200).json({
      success: true,
      data: vehicles
    });

  } catch (error) {
    console.error(`[VehicleController] Erro ao buscar veículos no pátio: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar veículos estacionados'
    });
  }
};

exports.getParkedVehiclesExit = async (req, res) => {
  try {
    const vehicles = await vehicleService.getParkedVehiclesOnly();

    return res.status(200).json({
      success: true,
      data: vehicles
    });

  } catch (error) {
    console.error(`[VehicleController] Erro ao buscar veículos no pátio: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar veículos estacionados'
    });
  }
}

exports.checkForUpdates = async (req, res) => {
  const lastCheck = req.query.lastCheck;

  if (!lastCheck) {
    return res.status(400).json({
      success: false,
      message: "Parâmetro 'lastCheck' é obrigatório (ISO format)"
    });
  }

  try {
    const updated = await vehicleService.hasNewVehicleEntries(lastCheck);

    return res.status(200).json({
      success: true,
      updated
    });

  } catch (error) {
    console.error(`[VehicleController] Erro ao verificar atualizações: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Erro ao verificar atualizações"
    });
  }
};

exports.editVehicle = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { id, category, plate } = req.body;
  const user = req.user

  const belemDateTime = DateTime.now().setZone("America/Belem");
  const formattedDate = belemDateTime.toFormat("dd/MM/yyyy HH:mm:ss");

  console.log(id)
  try {
    await vehicleService.editVehicleService(String(id), category, plate, formattedDate, user);

    console.log(`[VehicleController] Dados do veículo atualizados com sucesso`);
    return res.status(201).json({
      success: true,
      message: 'Dados do veículo atualizados com sucesso',
    });
  } catch (error) {
    console.log(`[VehicleController] Erro ao atualizar os dados do veículo: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao atualizar os dados',
    });
  }
};

exports.deleteVehicle = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { id } = req.body
  const user = req.user

  const belemDateTime = DateTime.now().setZone("America/Belem");
  const formattedDate = belemDateTime.toFormat("dd/MM/yyyy HH:mm:ss");

  try {
    await vehicleService.deleteVehicleService(String(id), belemDateTime, formattedDate, user);

    return res.status(201).json({
      success: true,
      message: 'Veiculo Excluido'
    });
  } catch (error) {
    console.error(`Erro ao tentar excluir o veiculo: ${error}`);
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

exports.reactivateVehicle = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { id, plate } = req.body
  const user = req.user

  const belemDateTime = DateTime.now().setZone("America/Belem");
  const formattedDate = belemDateTime.toFormat("dd/MM/yyyy HH:mm:ss");

  try {
    const vehicle = await vehicleService.reactivateVehicleService(id, plate, user, formattedDate);

    if (vehicle.status === 'INSIDE') {
      return res.status(200).json({
        success: true,
        message: 'Veiculo reativado'
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Erro ao tentar reativar o veiculo'
    })
  } catch (error) {
    console.log(error.message)

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    })
  }
}

exports.parkingOnly = async (req, res) => {
  try {
    const parking = await vehicleService.parkingSpaces();

    return res.status(200).json({
      success: true,
      data: parking
    });
  } catch (error) {
    console.error('Erro ao buscar vagas:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao buscar dados de vagas.'
    });
  }
};

exports.billingMethod = async (req, res) => {
  try {
    const result = await vehicleService.billingMethodService();
    console.log(result)
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.methodActive = async (req, res) => {
  try {
    const result = await vehicleService.methodActiveService();

    console.log(result)
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum método de cobrança ativo encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Erro ao buscar métodos ativos:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao buscar métodos ativos'
    });
  }
};

exports.methodSave = async (req, res) => {
  const startTime = Date.now();
  console.log('Iniciando salvamento de método', {
    methodName: req.body.methodId,
    toleranceMinutes: req.body.toleranceMinutes,
    rulesCount: req.body.rules.length
  });

  try {
    const { methodId: methodName, toleranceMinutes, rules } = req.body;

    // Validação básica
    if (!methodName || !rules) {
      console.warn('Campos obrigatórios faltando', { methodName, rules });
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios faltando: methodId (nome) e rules'
      });
    }

    // Busca o método pelo nome
    console.log('Buscando método por nome no banco de dados', { methodName });
    const billingMethod = await prisma.billing_method.findFirst({
      where: {
        name: methodName
      },
      select: {
        id: true,
        name: true
      }
    });

    if (!billingMethod) {
      console.warn('Método não encontrado', { methodName });
      return res.status(404).json({
        success: false,
        message: `Método de cobrança "${methodName}" não encontrado`
      });
    }

    console.log('Método encontrado', {
      methodId: billingMethod.id,
      methodName: billingMethod.name
    });

    // Chama o service com o ID correto
    const result = await vehicleService.methodSaveService({
      methodId: billingMethod.id,
      toleranceMinutes: toleranceMinutes || 0,
      rules
    });

    const duration = Date.now() - startTime;
    console.log('Método salvo com sucesso', {
      methodName,
      durationMs: duration,
      rulesSaved: result.length
    });

    return res.status(200).json({
      success: true,
      message: 'Configuração salva com sucesso',
      data: {
        method: billingMethod.name,
        rules: result
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Erro ao salvar método:', {
      error: error.message,
      stack: error.stack,
      durationMs: duration,
      body: req.body
    });

    return res.status(500).json({
      success: false,
      message: error.message || 'Erro ao salvar configuração'
    });
  }
};

exports.calculateOutstanding = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array())
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { stayDuration, category } = req.body;

  function convertHHMMSSToMinutes(hhmmss) {
    const [hours, minutes, seconds] = hhmmss.split(':').map(Number);
    return hours * 60 + minutes + Math.floor(seconds / 60);
  }

  const stayMinutes = convertHHMMSSToMinutes(stayDuration);

  try {
    const ruleSet = await vehicleService.methodActiveService();

    console.log(ruleSet)

    if (!ruleSet) {
      return res.status(404).json({
        success: false,
        message: "Nenhuma regra de cobrança ativa encontrada.",
      });
    }

    const { tolerance } = ruleSet.method;
    const normalizedCategory = category.toLowerCase();
    const rule = ruleSet.rules.find(r => r.vehicle_type === normalizedCategory);

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: `Regra de cobrança não encontrada para a categoria: ${category}`,
      });
    }

    const { base_time_minutes, price } = rule;

    const totalCobrado = (() => {
      if (stayMinutes <= tolerance) {
        return 0;
      }

      const excessTime = stayMinutes - tolerance;
      const slots = Math.max(1, Math.ceil(excessTime / base_time_minutes));
      return slots * price;
    })();

    return res.status(200).json({
      success: true,
      amount: totalCobrado,
      stayMinutes,
      ruleUsed: {
        base_time_minutes,
        price,
        tolerance,
        vehicle_type: normalizedCategory
      }
    });

  } catch (error) {
    console.error("Erro ao calcular cobrança:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao calcular cobrança.",
    });
  }
};

exports.exitsRegister = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log("❌ Erros de validação:", errors.array());
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

const {
  plate,
  exit_time,
  openCashId,
  method
} = req.body;

const amount_received = Number(req.body.amount_received);
const change_given = Number(req.body.change_given);
const discount_amount = Number(req.body.discount_amount);
const final_amount = Number(req.body.final_amount);
const original_amount = Number(req.body.original_amount);


  const photoBuffer = req.file ? req.file.buffer : null;
  const photoMimeType = req.file ? req.file.mimetype : null;


  console.log(photoBuffer)
  console.log(photoMimeType)
  
  const user = req.user;

  console.log("📥 Dados recebidos:", {
    plate,
    exit_time,
    openCashId,
    amount_received,
    change_given,
    discount_amount,
    final_amount,
    original_amount,
    method,
    user
  });

  try {
    const local = DateTime.now().setZone("America/Belem");
    console.log("🕒 Data/hora local:", local.toISO());

    const paymentMethodMap = {
      "Dinheiro": "DINHEIRO",
      "Pix": "PIX",
      "Crédito": "CREDITO",
      "Débito": "DEBITO",
    };

    const normalizedMethod = paymentMethodMap[method];

    if (!normalizedMethod) {
      console.error("❌ Método de pagamento inválido:", method);
      throw new Error("Método de pagamento inválido");
    }

    console.log("✅ Método de pagamento normalizado:", normalizedMethod);

    const register = await vehicleService.exitsRegisterService(
      plate,
      exit_time,
      openCashId,
      user,
      Number(amount_received.toFixed(2)),
      Number(discount_amount.toFixed(2)),
      Number(change_given.toFixed(2)),
      Number(final_amount.toFixed(2)),
      Number(original_amount.toFixed(2)),
      normalizedMethod,
      local,
      photoBuffer,
      photoMimeType
    );

    console.log("✅ Registro de saída criado:", register?.id || register);

    let receipt = null;

    try {
      receipt = await generateVehicleReceiptPDF(
        user.username,
        method,
        plate,
        Number(amount_received.toFixed(2)),
        Number(discount_amount.toFixed(2)),
        Number(change_given.toFixed(2)),
        Number(final_amount.toFixed(2)),
        Number(original_amount.toFixed(2)),
      );
      console.log("📄 Comprovante gerado com sucesso.");
    } catch (pdfError) {
      console.warn("⚠️ Falha ao gerar comprovante PDF:", pdfError.message || pdfError);
    }


    if (!receipt) {
      console.warn("⚠️ Comprovante não gerado.");
      return res.status(201).json({
        success: true,
        transactionId: register?.id || null,
        message: "Pagamento registrado com sucesso, mas o comprovante não foi gerado.",
      });
    }

    console.log("📄 Comprovante gerado com sucesso.");

    return res.status(201).json({
      success: true,
      exitData: register,
      receipt,
      message: "Pagamento registrado com sucesso.",
    });

  } catch (error) {
    console.error("❌ Erro ao registrar pagamento:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erro interno ao registrar pagamento.",
    });
  }
};
