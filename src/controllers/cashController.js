const { validationResult, Result } = require('express-validator');
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

exports.openCash = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { initialValue } = req.body
  const user = req.user
  const date = DateTime.now().setZone("America/Belem").toJSDate();

  try {
    const cash = await cashService.opencashService(user, initialValue, date);

    return res.status(201).json({
      success: true,
      cash
    })
  } catch  (error) {
    console.log(`[CashController] Já existe um caixa aberto nessa data`);
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}