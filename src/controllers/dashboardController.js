const { validationResult, Result } = require('express-validator');
const dashboardService = require('../services/dashboardService');
const { generateReceiptPDF } = require("../utils/invoicGrenerator")
const { generateVehicleReceiptPDF } = require("../utils/vehicleReceiptPDF")
const { DateTime } = require("luxon");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.historic = async (req, res) => {
  try {
    const { filter } = req.query;
    const allowedFilters = ["day", "week", "month"];
    const selectedFilter = allowedFilters.includes(filter) ? filter : "day";

    const list = await dashboardService.historicService(selectedFilter);

    return res.status(200).json({
      success: true,
      message: "Histórico carregado com sucesso.",
      data: list,
    });
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);

    return res.status(500).json({
      success: false,
      message: "Erro ao buscar histórico.",
      error: error.message || error,
    });
  }
};

exports.historicCash = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log("❌ Erros de validação:", errors.array());
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { id } = req.params;

  try {
    const result = await dashboardService.historicCashService(id);

    return res.status(200).json({
      success: true,
      message: "Histórico recuperado com sucesso.",
      data: result
    });
  } catch (error) {
    console.error("[historicCashController] Erro:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao buscar histórico de transações."
    });
  }
};

exports.secondCopy = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log("❌ Erros de validação:", errors.array());
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  try {
    const { id } = req.params;
    const { type } = req.query;

    let data, receipt;

    if (type === "product") {
      const transactionProduct = await dashboardService.secondCopyProduct(id);

      // Formatar os itens
      const saleItems = transactionProduct.sale_items.map((item) => ({
        productName: item.product_name,
        soldQuantity: item.sold_quantity,
        unitPrice: Number(item.unit_price)
      }));

      receipt = await generateReceiptPDF(
        transactionProduct.operator,
        transactionProduct.method,
        saleItems,
        Number(transactionProduct.original_amount),
        Number(transactionProduct.discount_amount),
        Number(transactionProduct.final_amount),
        Number(transactionProduct.amount_received),
        Number(transactionProduct.change_given),
      );
    } else if (type === "vehicle") {
      const transactionVehicle = await dashboardService.secondCopyVehicle(id);

      const plate = transactionVehicle.vehicle_entries.plate

      data = {
        operator: transactionVehicle.operator,
        paymentMethod: transactionVehicle.method,
        plate,
        amountReceived: Number(transactionVehicle.amount_received).toFixed(2),
        discountValue: Number(transactionVehicle.discount_amount).toFixed(2),
        changeGiven: Number(transactionVehicle.change_given).toFixed(2),
        finalPrice: Number(transactionVehicle.final_amount).toFixed(2),
        originalAmount: Number(transactionVehicle.original_amount).toFixed(2)
      }

      receipt = await generateVehicleReceiptPDF(
        data.operator,
        data.paymentMethod,
        plate,
        data.amountReceived,
        data.discountValue,
        data.changeGiven,
        data.finalPrice,
        data.originalAmount
      );
    } else {
      return res.status(400).json({
        success: false,
        message: "Tipo inválido. Use 'product' ou 'vehicle'."
      });
    }

    return res.status(201).json({
      success: true,
      receipt,
      message: "Pagamento registrado com sucesso.",
    });

  } catch (error) {
    console.error("[secondCopyController] Erro:", error);
    return res.status(500).json({
      success: false,
      message: `Erro interno do servidor`
    });
  }
};

exports.photoProof = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("❌ Erros de validação:", errors.array());
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  try {
    const { id } = req.params;
    const { type } = req.query;

    if (!['product', 'vehicle'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Tipo inválido.' });
    }

    const data = await getTransactionPhoto(id, type);

    if (!data?.photo || !data?.photo_type) {
      return res.status(404).json({
        success: false,
        message: 'Foto não encontrada para esta transação.',
      });
    }

    res.status(200).json({
      success: true,
      photo: data.photo.toString('base64'),
      photoType: data.photo_type,
    });

  } catch (error) {
    console.error('[photoProofController] Erro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao buscar a foto da transação.',
    });
  }
};

exports.getGoalConfig = async (req, res) => {
  try {
    const config = await dashboardService.getGoalConfigService();
    res.status(200).json({
      success: true,
      config
    });
  } catch (error) {
    console.error("Erro ao buscar configuração de metas:", error);
    res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

exports.saveGoalConfig = async (req, res) => {
  try {
    const data = req.body;

    console.log("📦 DADOS RECEBIDOS:", data);

    const requiredFields = [
      "daily_goal_value",
      "vehicle_goal_quantity",
      "product_goal_quantity",
      "goal_period",
      "notifications_enabled",
      "category_goals_active"
    ];

    const missingFields = requiredFields.filter(field => data[field] === undefined || data[field] === null);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Campos obrigatórios ausentes.",
        missingFields,
      });
    }

    const updated = await dashboardService.saveGoalConfigService(data);

    return res.status(201).json({
      success: true,
      message: "Metas atualizadas",
      updated
    });

  } catch (error) {
    console.error("❌ Erro ao salvar configuração de metas:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno ao salvar configuração."
    });
  }
};

exports.generalDetails = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log("❌ Erros de validação:", errors.array());
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'ID do caixa não fornecido.'
    });
  }
  
  try {
    // Retorna os dados do caixa
    const detailsCash = await dashboardService.detailsCash(id);
    
    if (!detailsCash) {
      return res.status(404).json({
        success: false,
        message: 'Caixa não encontrado.'
      });
    }

    // Dados básicos do caixa
    const totalCash = detailsCash.final_value || '0';
    const statusCash = detailsCash.status || 'UNKNOWN';
    const openingTimeCash = detailsCash.opening_date || null;
    const closingTimeCash = detailsCash.closing_date || null;
    const operatorCash = detailsCash.operator || 'Operador não identificado';
    const transactionsCash = (detailsCash._count?.product_transaction || 0) + 
                           (detailsCash._count?.vehicle_transaction || 0);

    const basicDataCash = {
      totalCash,
      statusCash,
      openingTimeCash,
      closingTimeCash,
      operatorCash,
      transactionsCash
    };

    // Inicializa contadores de métodos de pagamento
    const paymentMethodCounts = {
      PIX: 0,
      DINHEIRO: 0,
      DEBITO: 0,
      CREDITO: 0
    };

    // Conta os métodos em transações de produto
    for (const pt of detailsCash.product_transaction || []) {
      if (pt.method && pt.method in paymentMethodCounts) {
        paymentMethodCounts[pt.method]++;
      }
    }

    // Conta os métodos em transações de veículo
    for (const vt of detailsCash.vehicle_transaction || []) {
      if (vt.method && vt.method in paymentMethodCounts) {
        paymentMethodCounts[vt.method]++;
      }
    }

    // Contadores de venda por categoria (quantidade e valor)
    const categorySales = {
      CARRO: { quantidade: 0, valor: 0 },
      MOTO: { quantidade: 0, valor: 0 },
      PRODUTOS: { quantidade: 0, valor: 0 }
    };

    // Processa transações de veículos
    for (const vt of detailsCash.vehicle_transaction || []) {
      const vehicleCategory = vt.vehicle_entries?.category?.toLowerCase();
      const amount = parseFloat(vt.final_amount) || 0;

      if (vehicleCategory === 'carro') {
        categorySales.CARRO.quantidade++;
        categorySales.CARRO.valor += amount;
      } else if (vehicleCategory === 'moto') {
        categorySales.MOTO.quantidade++;
        categorySales.MOTO.valor += amount;
      }
    }

    // Processa transações de produtos
    for (const pt of detailsCash.product_transaction || []) {
      for (const item of pt.sale_items || []) {
        const quantidade = item.sold_quantity || 0;
        const valorUnitario = parseFloat(item.unit_price) || 0;
        categorySales.PRODUTOS.quantidade += quantidade;
        categorySales.PRODUTOS.valor += quantidade * valorUnitario;
      }
    }

    // Busca configurações de meta
    const goalConfigs = await prisma.goal_configs.findUnique({
      where: { id: "singleton" },
    });

    if (!goalConfigs) {
      return res.status(200).json({
        success: true,
        message: "Dados do caixa retornados (sem configurações de meta)).",
        data: {
          basicDataCash,
          paymentMethodCounts,
          categorySales,
          graficoSemanal: []
        }
      });
    }

    const { goal_period, daily_goal_value, week_start_day, week_end_day } = goalConfigs;

    // Função utilitária para calcular dias de funcionamento
    function getDiasFuncionamentoSemana(startDay, endDay) {
      return startDay <= endDay 
        ? endDay - startDay + 1 
        : 7 - startDay + endDay + 1;
    }

    const diasFuncionamentoSemana = getDiasFuncionamentoSemana(week_start_day, week_end_day);
    const dailyGoalValue = parseFloat(daily_goal_value) || 0;

    // Calcula meta do período
    let metaPeriodo = dailyGoalValue;
    if (goal_period === 'SEMANAL') {
      metaPeriodo = dailyGoalValue * diasFuncionamentoSemana;
    } else if (goal_period === 'MENSAL') {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      let diasFuncionamentoNoMes = 0;

      for (let dia = 1; dia <= daysInMonth; dia++) {
        const data = new Date(year, month, dia);
        const diaSemana = data.getDay();
        const dentroIntervalo =
          (week_start_day <= week_end_day && diaSemana >= week_start_day && diaSemana <= week_end_day) ||
          (week_start_day > week_end_day && (diaSemana >= week_start_day || diaSemana <= week_end_day));

        if (dentroIntervalo) diasFuncionamentoNoMes++;
      }

      metaPeriodo = dailyGoalValue * diasFuncionamentoNoMes;
    }

    // Calcula progresso da meta
    const totalCashValue = parseFloat(totalCash) || 0;
    const progressoMetaPercentual = metaPeriodo > 0 
      ? (totalCashValue / metaPeriodo) * 100 
      : 0;

    const goalProgress = {
      periodo: goal_period,
      meta: metaPeriodo,
      realizado: totalCashValue,
      progresso: parseFloat(progressoMetaPercentual.toFixed(2)),
    };

    // Processamento do gráfico semanal
    const openingDate = new Date(detailsCash.opening_date);
    const startOfWeek = new Date(openingDate);
    startOfWeek.setDate(openingDate.getDate() - (openingDate.getDay() - week_start_day + 7) % 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + diasFuncionamentoSemana - 1);
    endOfWeek.setHours(23, 59, 59, 999);

    const weekCashRegisters = await prisma.cash_register.findMany({
      where: {
        opening_date: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
      orderBy: {
        opening_date: 'asc',
      },
      select: {
        opening_date: true,
        final_value: true,
      },
    });

    const vendasPorDiaSemana = {};
    for (let i = 0; i < 7; i++) {
      const dia = (week_start_day + i) % 7;
      const isDentroIntervalo =
        (week_start_day <= week_end_day && dia >= week_start_day && dia <= week_end_day) ||
        (week_start_day > week_end_day && (dia >= week_start_day || dia <= week_end_day));

      if (isDentroIntervalo) vendasPorDiaSemana[dia] = 0;
    }

    for (const cash of weekCashRegisters) {
      const diaSemana = new Date(cash.opening_date).getDay();
      if (diaSemana in vendasPorDiaSemana) {
        vendasPorDiaSemana[diaSemana] += parseFloat(cash.final_value) || 0;
      }
    }

    const graficoSemanal = Object.entries(vendasPorDiaSemana)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([dia, valor]) => ({
        diaSemana: Number(dia),
        valor: parseFloat(valor.toFixed(2)),
      }));

    return res.status(200).json({
      success: true,
      message: "Dados do caixa retornados com sucesso.",
      data: {
        basicDataCash,
        paymentMethodCounts,
        categorySales,
        goalProgress,
        graficoSemanal
      },
      goalConfigs
    });

  } catch (error) {
    console.error("Erro ao buscar detalhes do caixa:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao buscar detalhes do caixa. Tente novamente mais tarde.",
      error: error.message
    });
  }
};