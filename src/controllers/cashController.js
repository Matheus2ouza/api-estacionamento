const { validationResult, Result } = require('express-validator');
const cashService = require('../services/cashService');
const { DateTime } = require("luxon");

exports.statusCash = async (req, res) => {
  try {
    // Usa a data atual com fuso de Belém
    const date = DateTime.now().setZone("America/Belem").toJSDate();

    const isOpen = await cashService.statusCashService(date);

    return res.status(200).json({
      success: true,
      isOpen,
    });
  } catch (error) {
    console.error(`[CashController] Erro ao buscar status do caixa: ${error}`);
    res.status(500).json({
      success: false,
      message: "Erro interno ao verificar o status do caixa.",
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

  const { initialValue } = req.body;
  const user = req.user;
  const date = DateTime.now().setZone("America/Belem").toJSDate();

  try {
    const isOpen = await cashService.opencashService(user, initialValue, date);

    if (!isOpen) {
      return res.status(409).json({
        success: false,
        message: "Já existe um caixa aberto para hoje.",
      });
    }

    return res.status(201).json({
      success: true,
      isOpen: true,
    });
  } catch (error) {
    console.log(`[CashController] Erro ao abrir caixa: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao tentar abrir o caixa.",
    });
  }
};
