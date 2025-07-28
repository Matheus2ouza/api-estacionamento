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

    // inicializa os totais por método
    const payments = { DINHEIRO: 0, CREDITO: 0, DEBITO: 0, PIX: 0 };

    // soma das transações de produtos
    cash.productTransactions.forEach(tx => {
      if (payments[tx.paymentMethod] !== undefined) {
        payments[tx.paymentMethod] += parseFloat(tx.final_amount);
      }
    });

    // soma das transações de veículos
    cash.vehicleTransactions.forEach(tx => {
      if (payments[tx.paymentMethod] !== undefined) {
        payments[tx.paymentMethod] += parseFloat(tx.final_amount);
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        initialValue: parseFloat(cash.initialValue),
        totalCash: payments.DINHEIRO,
        totalCredit: payments.CREDITO,
        totalDebit: payments.DEBITO,
        totalPix: payments.PIX,
        outgoingExpenseTotal: parseFloat(cash.outgoingExpenseTotal),
        finalValue: parseFloat(cash.finalValue),
      }
    });
  } catch (error) {
    console.error('Erro ao buscar dados do caixa:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao buscar dados do caixa.'
    });
  }
}
