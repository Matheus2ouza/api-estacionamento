const { validationResult } = require('express-validator');
const parkingService = require('../services/parkingService');
const { DateTime } = require("luxon");

exports.parkingConfig = async (req, res) => {
  try {
    const parkingConfig = await parkingService.parkingConfigService()

    if (!parkingConfig) {
      return res.status(404).json({
        success: false,
        message: 'Configuração de pátio não encontrada'
      });
    }

    return res.status(200).json({
      success: true,
      data: parkingConfig
    });

  } catch (error) {
    console.error(`[ParkingController] Erro ao buscar configuração de pátio: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar configuração de pátio'
    });
  };
};

exports.parkingConfigSave = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log("Erros de validação:", errors.array());
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { maxCars, maxMotorcycles } = req.body;

  try {
    const parkingConfig = await parkingService.parkingConfigSaveService(maxCars, maxMotorcycles)

    return res.status(200).json({
      success: true,
      message: 'Configuração de pátio salva com sucesso',
      data: parkingConfig
    });
  } catch (error) {
    console.error(`[ParkingController] Erro ao salvar configuração de pátio: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Erro ao salvar configuração de pátio'
    });
  }
}

exports.capacityParking = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { cashId } = req.params;

  try {
    const capacityParking = await parkingService.capacityParkingService(cashId);

    const capacityMax = capacityParking.maxCars + capacityParking.maxMotorcycles;

    const percentage = capacityMax > 0
      ? parseFloat(((capacityParking.quantityVehicles / capacityMax) * 100).toFixed(1))
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        capacityMax,
        quantityVehicles: capacityParking.quantityVehicles,
        quantityMotorcycles: capacityParking.quantityMotorcycles,
        quantityCars: capacityParking.quantityCars,
        maxCars: capacityParking.maxCars,
        maxMotorcycles: capacityParking.maxMotorcycles,
        percentage
      }
    });
  } catch (error) {
    console.error(`[ParkingController] Erro ao buscar capacidade de pátio: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar capacidade de pátio'
    });
  }
}
