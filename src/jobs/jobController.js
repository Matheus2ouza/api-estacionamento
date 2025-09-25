const { NotifyCloseCashRegister } = require("../notifications/cash/NotifyCloseCashRegister");
const jobService = require("./jobService");

exports.closeCashRegister = async (req, res) => {
  try {
    console.log("[CashJobController] Tentativa de fechar o caixa automaticamente");

    // Chama o service responsável por fechar o caixa
    const result = await jobService.closeCashRegister();

    if (!result) {
      console.log("[CashJobController] Nenhum caixa encontrado para fechar");
      return res.status(200).json({
        success: true,
        message: "Nenhum caixa aberto encontrado para fechar hoje",
      });
    }

    // Só envia notificação se o caixa foi fechado com sucesso
    await NotifyCloseCashRegister();

    console.log(`[CashJobController] Caixa ID ${result.id} fechado com sucesso`);

    return res.status(200).json({
      success: true,
      message: "Caixa fechado automaticamente!",
    });
  } catch (error) {
    console.error("[CashJobController] Erro ao fechar caixa:", error);

    return res.status(500).json({
      success: false,
      message: "Erro ao fechar caixa automaticamente",
      error: error.message
    });
  }
};
