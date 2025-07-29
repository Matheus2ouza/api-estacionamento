const { validationResult } = require('express-validator');
const vehicleService = require('../services/vehicleService');
const { DateTime } = require("luxon");
const { generateEntryTicketPDF } = require('../utils/entryTicketGenerator');

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

    const ticketPromise = generateEntryTicketPDF(
      result.id,
      result.plate,
      result.operator,
      result.category,
      formattedDateOnly,
      formattedTimeOnly
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

    console.log(`Hora de entrada: ${vehicle.entryTime}`)
    const dt = DateTime.fromJSDate(vehicle.entryTime).setZone('America/Belem');

    const dataFormatada = dt.toFormat('dd/MM/yyyy');
    const horaFormatada = dt.toFormat('HH:mm:ss');

    console.log(`Data formatada: ${dataFormatada}`);
    console.log(`Hora formatada: ${horaFormatada}`);

    const secondTicket = await generateEntryTicketPDF(
      id,
      vehicle.plate,
      vehicle.operator,
      vehicle.category,
      dataFormatada,
      horaFormatada
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

  try{
    const vehicle = await vehicleService.reactivateVehicleService(id, plate, user, formattedDate);

    if(vehicle.status === 'INSIDE') {
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
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};