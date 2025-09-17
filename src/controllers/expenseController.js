const { validationResult, Result } = require('express-validator');
const expenseService = require('../services/expenseService');
const { DateTime } = require("luxon");
const { getCurrentBelemTime } = require('../utils/timeConverter');

exports.registerOutgoing = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { description, amount, method } = req.body;
  const { cashId } = req.params;

  // Gerar a hora de entrada em formato ISO
  const transactionDate = getCurrentBelemTime();

  //Dados recebidos pelo middleware
  const user = req.user;

  try {
    const result = await expenseService.registerOutgoingService({
      description: description,
      amount: amount,
      method: method,
      cashId: cashId,
      transactionDate: transactionDate,
      user: user
    });

    return res.status(201).json({
      success: true,
      message: 'Despesa registrada com sucesso.',
      data: result
    });
  } catch (error) {
    console.error("Erro ao registrar despesa:", error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao registrar despesa.',
      error: error.message
    });
  }
}

exports.listOutgoingExpense = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { cashId } = req.params;

  try {
    const result = await expenseService.listOutgoingExpenseService(cashId);

    return res.status(200).json({
      success: true,
      message: 'Despesa encontrada com sucesso.',
      data: result
    });
  } catch (error) {
    console.error("Erro ao buscar despesa:", error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar despesa.',
      error: error.message
    });
  }
}

exports.deleteOutgoingExpense = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { cashId, expenseId } = req.params;

  try {
    const result = await expenseService.deleteOutgoingExpenseService(cashId, expenseId);

    return res.status(200).json({
      success: true,
      message: 'Despesa deletada com sucesso.',
      data: result
    });
  } catch (error) {
    console.error("Erro ao deletar despesa:", error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao deletar despesa.',
      error: error.message
    });
  }
}

exports.updateOutgoingExpense = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { cashId, expenseId } = req.params;
  const { description, amount, method } = req.body;

  try {
    await expenseService.updateOutgoingExpenseService(cashId, expenseId, {
      description,
      amount,
      method
    });

    console.log('Despesa atualizada com sucesso.');

    return res.status(200).json({
      success: true,
      message: 'Despesa atualizada com sucesso.'
    });
  } catch (error) {
    console.error("Erro ao atualizar despesa:", error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao atualizar despesa.'
    });
  }
}
