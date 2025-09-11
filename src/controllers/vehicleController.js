const { validationResult } = require('express-validator');
const vehicleService = require('../services/vehicleService');
const { DateTime } = require("luxon");
const { generateEntryTicketPDF } = require('../utils/entryTicketGenerator');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateVehicleReceiptPDFImproved } = require('../utils/vehicleReceiptPDFImproved');
const { getCurrentBelemTime, formatBelemTime, convertToBelemTime } = require('../utils/timeConverter');


exports.vehicleEntry = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  //Dados recebidos pelo body
  const { plate, category, observation, billingMethod, cashRegisterId } = req.body;

  //Dados recebidos pelo file
  const photoBuffer = req.file ? req.file.buffer : null;
  const photoMimeType = req.file ? req.file.mimetype : null;

  //Dados recebidos pelo middleware
  const user = req.user;

  // Gerar a hora de entrada em formato HH:mm:ss local de Belém
  const formattedEntryTime = formatBelemTime(getCurrentBelemTime());

  // Gerar a hora de entrada em formato ISO
  const entryTime = getCurrentBelemTime();

  // Extrair apenas a data (dd/MM/yyyy)
  const formattedDateOnly = formatBelemTime(getCurrentBelemTime(), "dd/MM/yyyy");

  // Extrair apenas a hora (HH:mm:ss)
  const formattedTimeOnly = formatBelemTime(getCurrentBelemTime(), "HH:mm:ss");

  try {
    const entry = await vehicleService.registerVehicleEntryService({
      plate: plate,
      entryTime: entryTime,
      formattedEntryTime: formattedEntryTime,
      category: category,
      billingMethodId: billingMethod,
      cashRegisterId: cashRegisterId,
      user: user,
      observation: observation,
      photoBuffer: photoBuffer,
      photoMimeType: photoMimeType,
    })

    let amount = 0;

    if (entry.category === 'carro') {
      amount = entry.billingMethod.carroValue;
    } else {
      amount = entry.billingMethod.motoValue;
    }

    // Gerar o ticket de entrada com timeout de 6 segundos
    const ticketPromise = generateEntryTicketPDF({
      id: entry.id,
      plate: entry.plate,
      operator: entry.operator,
      category: entry.category,
      formattedDate: formattedDateOnly,
      formattedTime: formattedTimeOnly,
      tolerance: entry.billingMethod.tolerance,
      description: entry.billingMethod.description,
      price: amount,
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 6000)
    );

    let ticket = null;
    let ticketError = false;

    try {
      ticket = await Promise.race([ticketPromise, timeoutPromise]);
    } catch (err) {
      if (err.message === 'timeout') {
        console.warn('Geração do ticket excedeu o tempo limite de 6 segundos');
        ticketError = true;
      } else {
        console.error('Erro ao gerar ticket:', err.message);
        ticketError = true;
      }
    }

    return res.status(201).json({
      success: true,
      message: ticketError
        ? 'Entrada do veículo registrada com sucesso, mas houve erro ao gerar o ticket'
        : 'Entrada do veículo registrada com sucesso',
      ticket: ticket || null,
    })
  } catch (error) {
    console.error(`[vehicleController] Erro ao registrar entrada de veículo: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

exports.listVehicleEntries = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { cashId } = req.params;
  const { cursor, limit } = req.query;

  try {
    const result = await vehicleService.listVehicleEntriesService(cashId, cursor, limit);

    // Adiciona formattedEntryTime para cada entrada
    if (result && result.vehicles) {
      result.vehicles = result.vehicles.map(entry => ({
        ...entry,
        formattedEntryTime: formatBelemTime(entry.entryTime, "dd/MM/yyyy HH:mm:ss")
      }));
    }

    return res.status(200).json({
      success: true,
      data: {
        vehicles: result.vehicles,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore
      }
    });
  } catch (error) {
    console.error(`[vehicleController] Erro ao buscar entradas de veículos: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

exports.vehicleEntryPhoto = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { vehicleId } = req.params;

  try {
    const photo = await vehicleService.vehicleEntryPhotoService(vehicleId);

    return res.status(200).json({
      success: true,
      data: photo
    })
  } catch (error) {
    console.error(`[vehicleController] Erro ao buscar foto do veículo: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

exports.vehicleEntryDuplicate = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { vehicleId } = req.params;

  // Extrair apenas a data (dd/MM/yyyy)
  const formattedDateOnly = formatBelemTime(getCurrentBelemTime(), "dd/MM/yyyy");

  // Extrair apenas a hora (HH:mm:ss)
  const formattedTimeOnly = formatBelemTime(getCurrentBelemTime(), "HH:mm:ss");

  try {
    const vehicle = await vehicleService.searchVehicleEntryService(vehicleId)

    if (!vehicle) {
      return res.status(401).json({
        success: false,
        message: `Veículo não encontrado`,
      })
    }

    let amount = 0;

    if (vehicle.category === 'carro') {
      amount = vehicle.billingMethod.carroValue;
    } else {
      amount = vehicle.billingMethod.motoValue;
    }

    const ticket = await generateEntryTicketPDF({
      id: vehicle.id,
      plate: vehicle.plate,
      operator: vehicle.operator,
      category: vehicle.category,
      formattedDate: formattedDateOnly,
      formattedTime: formattedTimeOnly,
      tolerance: vehicle.billingMethod.tolerance,
      description: vehicle.billingMethod.description,
      price: amount,
    })

    return res.status(200).json({
      success: true,
      ticket: ticket
    })
  } catch (error) {
    console.error(`[vehicleController] Erro ao buscar veículo: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

exports.vehicleEntryDesactivate = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { vehicleId } = req.params;
  const user = req.user;

  try {
    await vehicleService.desactivateVehicleEntryService(vehicleId, user)

    return res.status(200).json({
      success: true,
      message: "Veículo desativado com sucesso.",
    });

  } catch (error) {
    console.error(`[vehicleController] Erro ao desativar veículo: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

exports.vehicleEntryActivate = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { vehicleId } = req.params;
  const user = req.user;

  try {
    await vehicleService.activateVehicleEntryService(vehicleId, user)

    return res.status(200).json({
      success: true,
      message: "Veículo reativado com sucesso.",
    });
  } catch (error) {
    console.error(`[vehicleController] Erro ao reativar veículo: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

exports.vehicleEntryUpdate = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { plate, category, observation, billingMethod, requiredTicket } = req.body;
  const { vehicleId } = req.params;
  const user = req.user;

  try {
    const vehicle = await vehicleService.vehicleEntryUpdateService(vehicleId, plate, category, observation, billingMethod, user);

    const formattedDateOnly = formatBelemTime(vehicle.entryTime, "dd/MM/yyyy");
    const formattedTimeOnly = formatBelemTime(vehicle.entryTime, "HH:mm:ss");

    let amount = 0;
    let ticket = null;

    if (vehicle.category === 'carro') {
      amount = vehicle.billingMethod.carroValue;
    } else {
      amount = vehicle.billingMethod.motoValue;
    }

    if (Boolean(requiredTicket)) {
      ticket = await generateEntryTicketPDF({
        id: vehicle.id,
        plate: vehicle.plate,
        operator: vehicle.operator,
        category: vehicle.category,
        formattedDate: formattedDateOnly,
        formattedTime: formattedTimeOnly,
        tolerance: vehicle.billingMethod.tolerance,
        description: vehicle.billingMethod.description,
        price: amount,
      })
    }

    return res.status(200).json({
      success: true,
      message: "Veículo atualizado com sucesso.",
      ticket: ticket
    });
  } catch (error) {
    console.error(`[vehicleController] Erro ao atualizar veículo: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

exports.vehicleEntryUpdatePhoto = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { vehicleId } = req.params;
  const user = req.user;

  const photoBuffer = req.file ? req.file.buffer : null;
  const photoMimeType = req.file ? req.file.mimetype : null;

  try {

    await vehicleService.vehicleEntryUpdatePhotoService(vehicleId, photoBuffer, photoMimeType, user);

    return res.status(200).json({
      success: true,
      message: "Foto do veículo atualizada com sucesso.",
    });
  } catch (error) {
    console.error(`[vehicleController] Erro ao atualizar foto do veículo: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

exports.vehicleEntryDeletePhoto = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { vehicleId } = req.params;
  const user = req.user;

  try {
    await vehicleService.vehicleEntryDeletePhotoService(vehicleId, user);

    return res.status(200).json({
      success: true,
      message: "Foto do veículo deletada com sucesso.",
    });
  } catch (error) {
    console.error(`[vehicleController] Erro ao deletar foto do veículo: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

exports.fetchVehicleEntry = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { vehicleId, plateId } = req.params;

  try {
    const vehicle = await vehicleService.fetchVehicleEntryService(vehicleId, plateId);

    // Calcula o tempo de permanência no horário de Belém
    const entryTimeBelem = convertToBelemTime(vehicle.entryTime);
    const currentTimeBelem = getCurrentBelemTime();
    const permanenceDuration = currentTimeBelem.diff(entryTimeBelem);

    // Formata o tempo de permanência como string (HH:mm:ss)
    const permanenceTimeString = permanenceDuration.toFormat("hh:mm:ss");

    // Formata a data de entrada como string
    const entryTimeString = formatBelemTime(vehicle.entryTime, "yyyy-MM-dd'T'HH:mm:ss");

    // Monta o objeto Vehicle conforme a interface esperada
    const vehicleResponse = {
      id: vehicle.id,
      plate: vehicle.plate,
      category: vehicle.category,
      entryTime: entryTimeString,
      permanenceTime: permanenceTimeString,
      observation: vehicle.observation,
      billingMethod: vehicle.billingMethod,
      photoType: vehicle.photoType
    };

    return res.status(200).json({
      success: true,
      data: vehicleResponse
    });
  } catch (error) {
    console.error(`[vehicleController] Erro ao buscar veículo: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

exports.calculateOutstanding = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array())
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { vehicleId, plateId } = req.params;

  try {
    const vehicle = await vehicleService.calculateOutstandingService(vehicleId, plateId);

    if (!vehicle.billingMethod) {
      return res.status(400).json({
        success: false,
        message: 'Veículo não possui método de cobrança associado.'
      });
    }

    // Importa a função de cálculo
    const { calculateOutstandingAmount } = require('../utils/billingMethodUtils');

    // Calcula o valor a ser cobrado
    const calculation = calculateOutstandingAmount(
      vehicle.entryTime,
      vehicle.category,
      vehicle.billingMethod
    );

    // Verifica se houve erro na validação
    if (calculation.error) {
      return res.status(400).json(calculation.error);
    }

    return res.status(200).json({
      success: true,
      amount: calculation.amount
    });
  } catch (error) {
    console.error(`[vehicleController] Erro ao calcular dívida de veículo: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.exitsRegisterConfirm = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { cashId, vehicleId } = req.params;
  const { amountReceived, changeGiven, discountAmount, finalAmount, originalAmount, method } = req.body;
  const user = req.user;

  const photoBuffer = req.file ? req.file.buffer : null;
  const photoMimeType = req.file ? req.file.mimetype : null;

  // Gerar a hora de entrada em formato ISO
  const exitTime = getCurrentBelemTime();

  // Gerar a hora de entrada em formato HH:mm:ss local de Belém
  const formattedExitTime = formatBelemTime(getCurrentBelemTime());

  try {
    console.log(`[VehicleController] Caixa ID: ${cashId}`);
    console.log(`[VehicleController] Confirmando saída do veículo ID: ${vehicleId}`);
    console.log(`[VehicleController] Dados recebidos:`, {
      amountReceived: parseFloat(amountReceived),
      changeGiven: parseFloat(changeGiven),
      discountAmount: parseFloat(discountAmount),
      finalAmount: parseFloat(finalAmount),
      originalAmount: parseFloat(originalAmount),
      method,
      exitTime,
      formattedExitTime,
      user: user,
      username: user.username
    });

    // Validação: verificar se não está faltando dinheiro
    const amountReceivedNum = parseFloat(amountReceived);
    const finalAmountNum = parseFloat(finalAmount);
    const changeGivenNum = parseFloat(changeGiven);

    // Validação: verificar se não está faltando dinheiro
    if (amountReceivedNum < finalAmountNum) {
      return res.status(400).json({
        success: false,
        message: `Valor recebido (R$ ${amountReceivedNum.toFixed(2)}) é menor que o valor final (R$ ${finalAmountNum.toFixed(2)}).`
      });
    }

    console.log(`[VehicleController] Validações de pagamento aprovadas, chamando service...`);

    const exitRegister = await vehicleService.exitsRegisterConfirmService({
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
    });

    // Agora exitRegister contém { transaction, vehicleUpdated }
    const { transaction, vehicleUpdated } = exitRegister;

    console.log(`[VehicleController] Transaction:`, transaction);
    console.log(`[VehicleController] VehicleUpdated:`, vehicleUpdated);

    const pdf = await generateVehicleReceiptPDFImproved({
      operator: user.username,
      paymentMethod: transaction.method.toUpperCase(),
      plate: vehicleUpdated.plate,
      amountReceived: transaction.amountReceived,
      discountValue: transaction.discountAmount,
      changeGiven: transaction.changeGiven,
      finalPrice: transaction.finalAmount,
      originalAmount: transaction.originalAmount,
      category: vehicleUpdated.category,
      entryTime: vehicleUpdated.entryTime,
      exitTime: vehicleUpdated.exitTime
    })

    return res.status(200).json({
      success: true,
      message: 'Saída registrada com sucesso.',
      data: pdf
    });

  } catch (error) {
    console.error(`[VehicleController] Erro ao confirmar saída do veículo: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro interno ao registrar saída do veículo.'
    });
  }
}

exports.vehicleExitDuplicate = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { transactionId } = req.params;

  try {
    const transaction = await vehicleService.vehicleExitDuplicateService(transactionId);

    const pdf = await generateVehicleReceiptPDFImproved({
      operator: transaction.operator,
      paymentMethod: transaction.method,
      plate: transaction.vehicleEntries.plate,
      amountReceived: transaction.amountReceived,
      discountValue: transaction.discountAmount,
      changeGiven: transaction.changeGiven,
      finalPrice: transaction.finalAmount,
      originalAmount: transaction.originalAmount,
      category: transaction.vehicleEntries.category,
      entryTime: transaction.vehicleEntries.entryTime,
      exitTime: transaction.vehicleEntries.exitTime
    });

    return res.status(200).json({
      success: true,
      data: pdf
    });
  } catch (error) {
    console.error(`[vehicleController] Erro ao gerar segunda via do recibo: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
