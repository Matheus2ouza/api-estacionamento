const { validationResult } = require('express-validator');
const vehicleService = require('../services/vehicleService');

exports.vehicleEntry = async (req, res) => {
  const errors = validationResult(req);

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

  let { plate, category, operatorId } = req.body;

  plate = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();

  // Verificar padrões específicos de placas brasileiras
  const isOldPattern = /^[A-Z]{3}[0-9]{4}$/.test(plate);
  const isMercosulPattern = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(plate);

  if (!(isOldPattern || isMercosulPattern)) {
    console.log(`[VehicleController] A placa esta fora do formato esperado ${plate}`)
    return res.status(400).json({
      success: false,
      message: 'Placa inválida após normalização'
    });
  }

  try {
    const vehicle = await vehicleService.vehicleEntry(plate, category, operatorId);

    return res.status(201).json({
      success: true,
      message: 'Entrada do veículo registrada com sucesso',
      vehicleId: vehicle.id,
      entryTime: vehicle.entryTime
    });

  } catch (error) {
    console.warn(`[VehicleController] Erro ao tentar registrar a entrada do veículo: ${error.message}`);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

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

  const { maxCars, maxMotorcycles, maxLargeVehicles } = req.body;

  try {
    const result = await vehicleService.configParking(maxCars, maxMotorcycles, maxLargeVehicles);

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

exports.editVehicle = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Erro de validação',
      error: errors.array().reduce((acc, err) => {
        acc[err.path] = err.msg;
        return acc;
      }, {}),
    });
  }

  const { id, category, plate } = req.body

  try{
    await vehicleService.editVehicleService( id, category, plate)

    console.log(`[VhecleController] Dados do viculo atualizados com sucesso`)
    return res.status(201).json({
      success: true,
      message: 'Dados do veiculo atualizados com sucesso'
    })
  }catch (error) {
    console.log(`[VhecleController] Erro ao tentar ataulizar os dados do veiculo: ${error}`)
    return res.status(500).json({
      success: false,
      message: 'Erro ao tentar atualizar os dados do veiculo',
      error: error
    })
  }
}