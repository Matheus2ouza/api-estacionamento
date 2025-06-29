const { validationResult } = require('express-validator');
const vehicleService = require('../services/vehicleService');

exports.vehicleEntry = async (req, res) => {
  const errors = validationResult(req);

  // Retorna erro de validação no formato esperado
  if (!errors.isEmpty()) {
    const mappedErrors = errors.array().reduce((acc, err) => {
      acc[err.path] = err.msg;
      return acc;
    }, {});

    
    return res.status(400).json({
      success: false,
      message: 'Erro de validação',
      fields: mappedErrors
    });
  }
  
  // Normalizar placa removendo não-alfanuméricos
  const plate = req.body.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();

  // Verificar padrões específicos
  const isOldPattern = /^[A-Z]{3}[0-9]{4}$/.test(plate);
  const isMercosulPattern = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(plate);

  if (!(isOldPattern || isMercosulPattern)) {
    return res.status(400).json({
      success: false,
      message: 'Placa inválida após normalização'
    });
  }

  try {
    const vehicle = await vehicleService.vehicleEntry(plate);

    return res.status(201).json({
      success: true,
      message: 'Entrada do veículo registrada com sucesso',
      vehicleId: vehicle.id,
      entryTime: vehicle.entry_time // Adicione esta linha
    });

  } catch (error) {
    console.warn(`[VehicleController] Erro ao tentar registrar a entrada do veículo: ${error.message}`);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getParkedVehicles = async (req, res) => {
  try {
    const vehicles = await vehicleService.getParkedVehicles();

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
