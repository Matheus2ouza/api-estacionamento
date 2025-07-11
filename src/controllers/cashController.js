const { validationResult } = require('express-validator');
const cashService = require('../services/cashService');
const { DateTime } = require("luxon");


exports.statusCash = async (req, res) => {
  try{
    const date = DateTime.now().setZone("America/Belem").toJSDate();
    const date2 = DateTime.now().setZone("America/Belem").toJSDate();
    const date3 = new Date();

    console.log(`Data com toJSDate: ${date}`);
    console.log(`Data sem toJSDate: ${date2}`);
    console.log(`Data com o new date: ${date3}`);
  
    return res.status(201).json({
      success: true
    })

  } catch (error) {
    console.log(`[CashController] Erro ao tentar buscar o status do caixa: ${error}`);
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}