const { PrismaClient } = require('@prisma/client');
const { DateTime } = require("luxon");
const prisma = new PrismaClient();

// Estrutura para mensagens
const createMessage = (userMessage, logMessage) => ({
  userMessage,
  logMessage
});

async function closeCashRegister() {
  try {
    // Data atual no fuso "America/Belem"
    const date = new Date();
    const local = DateTime.fromJSDate(date, { zone: "America/Belem" });

    const startOfDay = local.startOf("day").toUTC().toJSDate();
    const endOfDay = local.endOf("day").toUTC().toJSDate();

    // Busca o caixa aberto do dia (ainda sem closingDate e status OPEN)
    const cashRegister = await prisma.cashRegister.findFirst({
      where: {
        openingDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        closingDate: null,
        status: 'OPEN'
      }
    });

    if (!cashRegister) {
      console.log("[CloseCashJobService] Nenhum caixa encontrado para fechar");
      return null;
    }

    // Fecha o caixa
    const closedCash = await prisma.cashRegister.update({
      where: { id: cashRegister.id },
      data: {
        closingDate: new Date(), // hora de fechamento atual
        status: 'CLOSED'
      }
    });

    console.log(`[CloseCashJobService] Caixa ID ${cashRegister.id} fechado com sucesso`);
    return closedCash;
  } catch (error) {
    console.error("[CloseCashJobService] Erro ao processar fechamento de caixa:", error);
    throw error; // Re-lança o erro para ser capturado pelo controller
  }
}

module.exports = { closeCashRegister };
