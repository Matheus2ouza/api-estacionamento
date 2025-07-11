const { validationResult } = require('express-validator');
const cashService = require('../services/cashService');
const { DateTime } = require("luxon");


exports.statusCash = async (req, res) => {
  try {
    const date = DateTime.now().setZone("America/Belem").toJSDate();

    const isOpen = await cashService.statusCashService(date);

    return res.status(200).json({
      success: true,
      isOpen,
    });
  } catch (error) {
    console.log(`[CashController] Erro ao tentar buscar o status do caixa: ${error}`);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
