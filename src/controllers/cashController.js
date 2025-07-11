const { validationResult } = require('express-validator');
const cashService = require('../services/vehicleService');
const { DateTime } = require("luxon");


exports.statusCash = async (req, res) => {
  try{
    const date = DateTime.now().setZone("America/Belem").toJSDate();
    const date2 = DateTime.now().setZone("America/Belem").toJSDate();

    console.log(`Data com toJSDate: ${date}`);
    console.log(`Data sem toJSDate: ${date2}`);
    // const status = await cashService.
  } catch (error) {
    console.log(`[CashController] Erro ao tentar buscar o status do caixa: ${error}`);
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}