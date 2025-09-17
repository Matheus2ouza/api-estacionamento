const { validationResult, Result } = require('express-validator');
const cashService = require('../services/cashService');
const expenseService = require('../services/expenseService');
const { DateTime } = require("luxon");
const { validateAndConvertBillingTime, validateTolerance } = require('../utils/billingMethodUtils');
const { getCurrentBelemTime, convertToBelemJSDate } = require('../utils/timeConverter');

exports.statusCash = async (req, res) => {
  try {

    // Usa a data atual com fuso de Belém
    const date = convertToBelemJSDate(getCurrentBelemTime());

    const data = await cashService.statusCashService(date);

    // Retorna sempre sucesso, pois agora temos os três cenários cobertos
    const response = {
      success: true,
      cashStatus: data.cashStatus,
      cash: data.cash
    };
    return res.status(200).json(response);
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
  const date = getCurrentBelemTime()

  try {
    const isOpen = await cashService.openCashService(user, initialValue, date);

    if (!isOpen) {
      return res.status(409).json({
        success: false,
        message: "Já existe um caixa aberto para hoje.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Caixa aberto com sucesso.",
      cash: isOpen
    });
  } catch (error) {
    console.log(`[CashController] Erro ao abrir caixa: ${error}`);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao tentar abrir o caixa.",
    });
  }
};

exports.closeCash = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { cashId } = req.params
  const date = getCurrentBelemTime()
  try {
    const cash = await cashService.closeCashService(cashId, date);

    if (!cash) {
      return res.status(404).json({
        success: false,
        message: 'Caixa não encontrado',
      })
    }

    return res.status(200).json({
      success: true,
      data: cash,
      message: 'Caixa Fechado com sucesso'
    })
  } catch (error) {
    console.log(`[CashController] Erro ao tentar fechar o caixa: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    })
  }
}

exports.reopenCash = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.warn("❌ Erros de validação ao tentar reabrir caixa:", errors.array());
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { cashId } = req.params;
  console.log("Requisição para reabrir caixa:", cashId);

  try {
    const result = await cashService.reopenCashService(cashId);

    console.log("✅ Caixa reaberto com sucesso:", result.id);
    return res.status(200).json({
      success: true,
      message: "Caixa reaberto com sucesso.",
      cash: result
    });
  } catch (error) {
    console.error("❌ Erro ao reabrir caixa:", error.message);
    return res.status(400).json({
      success: false,
      message: "Erro ao tentar reabrir o caixa."
    });
  }
};

exports.updateCash = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { cashId } = req.params;
  const { initialValue } = req.body;

  try {
    const cash = await cashService.updateCashService(cashId, initialValue);

    return res.status(200).json({
      success: true,
      data: cash,
      message: 'Valor inicial do caixa atualizado com sucesso.',
    });
  } catch (error) {
    console.error('Erro ao atualizar valor inicial do caixa:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao atualizar valor inicial do caixa.',
    });
  }
}

exports.cashData = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { cashId } = req.params;

  try {
    const cash = await cashService.cashDataService(cashId);

    if (!cash) {
      return res.status(404).json({
        success: false,
        message: 'Caixa não encontrado ou não está aberto.',
      });
    }

    console.log(cash)
    return res.status(200).json({
      success: true,
      data: cash
    });
  } catch (error) {
    console.error('Erro ao buscar dados do caixa:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao buscar dados do caixa.'
    });
  }
}

exports.generalCashData = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { cashId } = req.params;

  try {
    const cash = await cashService.generalCashDataService(cashId);

    return res.status(200).json({
      success: true,
      data: cash
    });
  } catch (error) {
    console.error('Erro ao buscar dados gerais do caixa:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao buscar dados gerais do caixa.',
      error: error.message
    });
  }
}

exports.deleteTransaction = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.warn('[cashController] Dados inválidos na exclusão de transação:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { cashId, transactionId } = req.params;
  const { type, permanent } = req.query;

  console.log(`[cashController] Iniciando exclusão de transação - Tipo: ${type}, CashId: ${cashId}, TransactionId: ${transactionId}, Permanent: ${permanent}`);

  try {
    let result;

    switch (type) {
      case 'expense':
        console.log('[cashController] Chamando service para exclusão de despesa');
        result = await expenseService.deleteOutgoingExpenseService(cashId, transactionId);
        break;

      case 'product':
        console.log('[cashController] Chamando service para exclusão de transação de produto');
        result = await cashService.deleteProductTransactionService(cashId, transactionId);
        break;

      case 'vehicle':
        console.log(`[cashController] Chamando service para exclusão de transação de veículo - Permanent: ${permanent === 'true'}`);
        result = await cashService.deleteVehicleTransactionService(cashId, transactionId, permanent === 'true');
        break;

      default:
        console.warn(`[cashController] Tipo de transação inválido: ${type}`);
        return res.status(400).json({
          success: false,
          message: 'Tipo de transação inválido. Use: expense, product ou vehicle.'
        });
    }

    console.log(`[cashController] Transação ${type} excluída com sucesso - Result:`, result);
    return res.status(200).json({
      success: true,
      message: 'Transação excluída com sucesso.'
    });

  } catch (error) {
    console.error(`[cashController] Erro ao excluir transação ${type}:`, error.message);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao excluir transação.',
      error: error.message
    });
  }
}

exports.cashHistory = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { cashId } = req.params;

  try {
    const cash = await cashService.cashHistoryService(cashId);

    return res.status(200).json({
      success: true,
      data: cash
    });
  } catch (error) {
    console.error('Erro ao buscar histórico do caixa:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao buscar histórico do caixa.'
    });
  }
}

exports.generalCashHistory = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.warn('[cashController] Dados inválidos no histórico geral:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const user = req.user;
  const { cursor, limit } = req.query;

  console.log(`[cashController] Buscando histórico geral - User: ${user.username}, Role: ${user.role}, Cursor: ${cursor}, Limit: ${limit}`);

  try {
    const parsedLimit = limit ? parseInt(limit) : 10;

    // Validar limite
    if (parsedLimit < 1 || parsedLimit > 50) {
      console.warn(`[cashController] Limite inválido: ${parsedLimit}`);
      return res.status(400).json({
        success: false,
        message: 'Limite deve estar entre 1 e 50.'
      });
    }

    const result = await cashService.generalCashHistoryService(user, cursor, parsedLimit);

    console.log(`[cashController] Histórico geral retornado com sucesso - ${result.cashRegisters.length} caixas`);
    return res.status(200).json({
      success: true,
      message: 'Histórico geral carregado com sucesso.',
      data: result
    });

  } catch (error) {
    console.error(`[cashController] Erro ao buscar histórico geral:`, error.message);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao buscar histórico geral.',
      error: error.message
    });
  }
}

exports.transactionPhoto = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.warn('[cashController] Dados inválidos na busca de foto de transação:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { transactionId } = req.params;
  const { type } = req.query;

  console.log(`[cashController] Buscando foto de transação - TransactionId: ${transactionId}, Type: ${type}`);

  try {
    const photoData = await cashService.transactionPhotoService(transactionId, type);



    // Converter de binário para base64
    const base64Photo = photoData.photo.toString('base64');

    console.log(`[cashController] Foto convertida para base64 - Type: ${type}, Size: ${base64Photo.length} chars`);

    // Retornar a foto em base64
    return res.status(200).json({
      success: true,
      data: {
        photo: base64Photo,
      }
    });

  } catch (error) {
    console.error(`[cashController] Erro ao buscar foto de transação:`, error.message);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao buscar foto de transação.',
      error: error.message
    });
  }
}

exports.billingMethodSave = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors)
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { title, category, tolerance, time, carroValue, motoValue } = req.body;

  // Validação da tolerância
  const toleranceValidation = validateTolerance(tolerance);
  if (!toleranceValidation.isValid) {
    console.warn(`Tentativa de salvar um novo metodo de cobrança: ${toleranceValidation.logMessage}`)
    return res.status(400).json({
      success: false,
      message: toleranceValidation.userMessage
    })
  }

  // Validação e conversão de tempo baseada na categoria
  let timeMinutes;
  let description;

  try {
    const result = validateAndConvertBillingTime(category, time, carroValue, motoValue);
    timeMinutes = result.timeMinutes;
    description = result.description;
  } catch (error) {
    console.warn(`Tentativa de salvar um novo metodo de cobrança: ${error.logMessage}`)
    return res.status(400).json({
      success: false,
      message: error.userMessage
    })
  }

  try {
    const result = await cashService.saveBillingMethodService({
      title: title,
      description: description,
      category: category,
      tolerance: tolerance,
      timeMinutes: timeMinutes,
      carroValue: carroValue,
      motoValue: motoValue
    });

    return res.status(200).json({
      success: true,
      message: 'Método de cobrança salvo com sucesso',
      data: result
    });

  } catch (error) {
    console.error('Erro ao salvar método de cobrança:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

exports.billingMethodList = async (req, res) => {
  try {
    const methods = await cashService.listBillingMethodService();

    if (!methods) {
      return res.status(404).json({
        success: false,
        message: 'Nenhuma regra encontrada'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Métodos de cobrança encontrados com sucesso',
      methods: methods
    });
  } catch (error) {
    console.error("Erro na rota de métodos de cobrança:", error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar métodos de cobrança'
    });
  }
};

exports.billingMethodDelete = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { id } = req.params;
  const user = req.user;

  try {
    await cashService.deleteBillingMethodService(id, user);

    return res.status(200).json({
      success: true,
      message: 'Método de cobrança desativado com sucesso.',
    });

  } catch (error) {
    console.error('Erro ao deletar método de cobrança:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao deletar método de cobrança.',
      error: error.message
    });
  }
}

exports.billingMethodUpdate = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { id } = req.params;
  const user = req.user;

  try {
    const result = await cashService.updateBillingMethodService(id, user);

    return res.status(200).json({
      success: true,
      message: 'Método de cobrança atualizado com sucesso.',
      data: result
    });
  } catch (error) {
    console.error('Erro ao atualizar método de cobrança:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao atualizar método de cobrança.',
      error: error.message
    });
  }
}

exports.billingMethodPut = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors)
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { id } = req.params;
  const { title, category, tolerance, time, carroValue, motoValue } = req.body;
  const user = req.user;

  // Validação da tolerância
  const toleranceValidation = validateTolerance(tolerance);
  if (!toleranceValidation.isValid) {
    console.warn(`Tentativa de atualizar metodo de cobrança: ${toleranceValidation.logMessage}`)
    return res.status(400).json({
      success: false,
      message: toleranceValidation.userMessage
    })
  }

  // Validação e conversão de tempo baseada na categoria
  let timeMinutes;
  let description;

  try {
    const result = validateAndConvertBillingTime(category, time, carroValue, motoValue);
    timeMinutes = result.timeMinutes;
    description = result.description;
  } catch (error) {
    console.warn(`Tentativa de atualizar metodo de cobrança: ${error.logMessage}`)
    return res.status(400).json({
      success: false,
      message: error.userMessage
    })
  }

  try {
    const result = await cashService.updateBillingMethodPutService(id, user, {
      title,
      description,
      category,
      tolerance,
      timeMinutes,
      carroValue,
      motoValue
    });

    return res.status(200).json({
      success: true,
      message: 'Método de cobrança atualizado com sucesso.',
      data: result
    });
  } catch (error) {
    console.error('Erro ao atualizar método de cobrança:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao atualizar método de cobrança.',
      error: error.message
    });
  }
}

exports.generalCashData = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { cashId } = req.params;

  try {
    const { generalDetails, vehicleDetails, productDetails, outgoingExpenseDetails } = await cashService.generalCashDataService(cashId);

    return res.status(200).json({
      success: true,
      message: 'Dados gerais do caixa encontrados com sucesso.',
      data: {
        generalDetails,
        vehicleDetails,
        productDetails,
        outgoingExpenseDetails
      }
    });
  } catch (error) {
    console.error("Erro ao buscar dados gerais do caixa:", error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao buscar dados gerais do caixa.',
      error: error.message
    });
  }
}
