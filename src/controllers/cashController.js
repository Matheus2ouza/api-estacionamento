const { validationResult, Result } = require('express-validator');
const cashService = require('../services/cashService');
const { DateTime } = require("luxon");

exports.statusCash = async (req, res) => {
  try {
    // Usa a data atual com fuso de Belém
    const date = DateTime.now().setZone("America/Belem").toJSDate();
    console.log(date)
    const data = await cashService.statusCashService(date);
    console.log(data)

    if(!data) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum caixa encontrado',
      })
    }

    return res.status(200).json({
      success: true,
      cash: data
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
  const date = DateTime.now().setZone("America/Belem")

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

  const { id } = req.params
  const { finalValue } = req.body
  const date = DateTime.now().setZone("America/Belem")
  try{
    const cash = await cashService.closeCashService(id, finalValue, date);

    if(!cash) {
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
    console.log(`[CashController] Erro ao tentar fechar o caixa: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    })
  }
}

exports.geralCashData = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { id } = req.params;
  
  try{
    const data = await cashService.geralCashDataService(id);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Caixa não encontrado'
      })
    }

    const totalValue = Number(data.initialValue) + Number(data.generalSaleTotal) + Number(data.vehicleEntryTotal)
    data.totalValue = totalValue

    return res.status(200).json({
      success: true,
      data: data
    })
  } catch (error) {
    console.log(`[CashController] Erro ao tentar buscar os dados gerais do caixa: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Erro ao tentar buscar os dados gerais do caixa',
      error: error.message
    })
  }
}

exports.BillingMethod = async (req, res) => {
  try {
    const methods = await cashService.BillingMethodService();

    if(!methods) {
      return res.status(404).json({
        success: false,
        message: 'Nenhuma regra encontrada'
      })
    }

    return res.status(200).json({
      success: true,
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

exports.cashData = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { id } = req.params;

  try {
    const cash = await cashService.cashDataService(id);

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

exports.OutgoingExpense = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
      errors: errors.array()
    });
  }

  const { id } = req.params;

  try {
    const response = await cashService.OutgoingExpenseService(id);

    // Caixa não encontrado
    if (response === null) {
      return res.status(404).json({
        success: false,
        message: 'Caixa não encontrado.'
      });
    }

    // Caixa existe mas não há despesas
    if (response.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhuma despesa registrada para este caixa.',
        data: []
      });
    }

    // Retorno com sucesso e dados
    return res.status(200).json({
      success: true,
      message: 'Despesas encontradas com sucesso.',
      data: response
    });

  } catch (error) {
    console.error("Erro ao buscar despesas:", error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao buscar despesas.',
      error: error.message
    });
  }
};

exports.registerOutgoing = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
      errors: errors.array()
    });
  }

  const belemDate = DateTime.now().setZone("America/Belem").toJSDate();
  const { description, amount, method, openCashId } = req.body;
  const user = req.user;

  try {
    const result = await cashService.registerOutgoingService(
      description,
      amount,
      method.toUpperCase(),
      openCashId,
      belemDate,
      user
    );

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
};