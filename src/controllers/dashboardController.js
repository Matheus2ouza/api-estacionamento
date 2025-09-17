const { validationResult } = require('express-validator');
const dashboardService = require('../services/dashboardService');
const { generateDashboardReportPDF } = require('../utils/dashboardReportPDF');

exports.dashboard = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { cashId } = req.params;
  try {
    const data = await dashboardService.dashboardService(cashId);

    return res.status(200).json({
      success: true,
      message: 'Dados do dashboard',
      data: {
        cash: data.cash,
        data: data.transactions
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar dados do dashboard',
      error: error.message
    });
  }
}

exports.reports = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { type, startDate, endDate, details, charts, pdf } = req.query;

  try {
    let reportData;

    // Determina a data de início (se não fornecida, usa a data atual)
    const startDateToUse = startDate || new Date().toISOString().split('T')[0];

    // Processa os tipos de gráficos solicitados
    const requestedCharts = charts ? charts.split(',').map(chart => chart.trim()) : [];

    // Chama o service único com o tipo, datas, detalhes e gráficos
    const includeDetails = details === 'true';
    const generatePDF = pdf === 'true';
    reportData = await dashboardService.getReportService(type, startDateToUse, endDate, includeDetails, requestedCharts);

    // Adiciona o flag includeDetails aos dados do relatório
    reportData.includeDetails = includeDetails;

    // Gera PDF do relatório apenas se solicitado
    if (generatePDF) {
      try {
        const pdfBuffer = await generateDashboardReportPDF(reportData);
        const pdfBase64 = pdfBuffer.toString('base64');

        console.log('PDF gerado com sucesso:', reportData);

        return res.status(200).json({
          success: true,
          message: `Relatório gerado com sucesso.`,
          data: {
            report: reportData,
            pdf: pdfBase64
          }
        });

      } catch (pdfError) {
        console.error('Erro ao gerar PDF:', pdfError.message);

        // Se o PDF falhar, retorna apenas os dados JSON
        return res.status(200).json({
          success: true,
          message: `Relatório gerado com sucesso mas o PDF não foi gerado.`,
          data: {
            report: reportData,
            pdf: null
          }
        });
      }
    } else {
      // Retorna apenas os dados JSON sem PDF
      return res.status(200).json({
        success: true,
        message: `Relatório gerado com sucesso.`,
        data: {
          report: reportData,
          pdf: null
        }
      });
    }

  } catch (error) {
    console.error(`[DashboardController] Erro ao gerar relatório:`, error.message);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao gerar relatório.',
    });
  }
}

exports.goals = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { goalPeriod, goalValue, isActive } = req.query;

  // Converter isActive de string para boolean
  const isActiveBoolean = isActive === 'true' || isActive === true;

  try {
    const data = await dashboardService.goalsService(goalPeriod, goalValue, isActiveBoolean);

    console.log("Metas configuradas com sucesso:", data);

    return res.status(200).json({
      success: true,
      message: 'Metas configuradas com sucesso.',
      data: data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao configurar metas.',
    });
  }
}

exports.listGoals = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  try {
    const data = await dashboardService.listGoalsService();

    console.log("Metas encontradas com sucesso:", data);

    return res.status(200).json({
      success: true,
      message: 'Metas encontradas com sucesso.',
      data: data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao buscar metas.',
    });
  }
}

exports.desactivateGoal = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { goalPeriod } = req.query;

  try {
    const data = await dashboardService.desactivateGoalService(goalPeriod);

    return res.status(200).json({
      success: true,
      message: 'Meta desativada com sucesso.',
      data: data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao desativar meta.',
    });
  }
}

exports.charts = async (req, res) => {
  // Log da URL completa e método HTTP
  try {
    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    console.log(`[charts] ${req.method} ${fullUrl}`);
  } catch (e) {
    console.warn('[charts] Falha ao montar URL completa para log:', e?.message || e);
  }
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { goalPeriod, charts } = req.query;

  // Validar se goalPeriod foi fornecido
  if (!goalPeriod) {
    return res.status(400).json({
      success: false,
      message: 'goalPeriod é obrigatório.',
    });
  }

  // Validar se charts foi fornecido
  if (!charts) {
    return res.status(400).json({
      success: false,
      message: 'charts é obrigatório.',
    });
  }

  try {
    // Buscar a meta configurada para o período
    const goalConfig = await dashboardService.getGoalConfigService(goalPeriod);

    if (!goalConfig) {
      return res.status(404).json({
        success: false,
        message: 'Meta não encontrada para o período especificado.',
      });
    }

    // Separar os gráficos solicitados
    const requestedCharts = charts.split(',').map(chart => chart.trim());
    const chartData = {};
    const processedCharts = [];
    const ignoredCharts = [];

    // Regras de permissão por período (níveis)
    const allowedChartsByPeriod = {
      DIARIA: new Set(['goalProgress', 'dailyTotals']),
      SEMANAL: new Set(['goalProgress', 'weeklyProfit', 'totalsBarGroup', 'dailyTotals']),
      MENSAL: new Set(['goalProgress', 'weeklyProfit', 'totalsBarGroup', 'dailyTotals'])
    };

    const allowedForPeriod = allowedChartsByPeriod[goalPeriod] || new Set();

    // Processar cada gráfico solicitado respeitando o nível do período
    for (const chartType of requestedCharts) {
      if (!allowedForPeriod.has(chartType)) {
        console.warn(`[charts] Gráfico "${chartType}" não permitido para goalPeriod=${goalPeriod}. Será ignorado.`);
        ignoredCharts.push(chartType);
        continue;
      }

      switch (chartType) {
        case 'goalProgress':
          chartData.goalProgress = await dashboardService.getGoalProgressDataService(goalPeriod, goalConfig);
          processedCharts.push('goalProgress');
          break;
        case 'weeklyProfit':
          chartData.weeklyProfit = await dashboardService.getWeeklyProfitDataService(goalPeriod, goalConfig);
          processedCharts.push('weeklyProfit');
          break;
        case 'totalsBarGroup':
          chartData.totalsBarGroup = await dashboardService.getTotalsBarGroupDataService(goalPeriod);
          processedCharts.push('totalsBarGroup');
          break;
        case 'dailyTotals':
          chartData.dailyTotals = await dashboardService.getDailyTotalsDataService(goalPeriod);
          processedCharts.push('dailyTotals');
          break;
        // Adicionar outros tipos de gráfico aqui conforme necessário
        default:
          console.warn(`Tipo de gráfico não reconhecido: ${chartType}`);
          ignoredCharts.push(chartType);
      }
    }

    console.log('Gráficos processados:', processedCharts);
    console.log('Gráficos ignorados:', ignoredCharts);

    return res.status(200).json({
      success: true,
      message: 'Dados dos gráficos obtidos com sucesso.',
      data: chartData,
      meta: {
        requestedCharts,
        processedCharts,
        ignoredCharts
      }
    });

  } catch (error) {
    console.error('Erro ao obter dados dos gráficos:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao obter dados dos gráficos.',
    });
  }
}
