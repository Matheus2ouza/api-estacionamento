const { pendingGoals, updateGoals } = require("../../services/dashboardService");
const { sendNotification, sendNotificationToOne } = require("../../notifications/sendNotification");
const { findPushTokenForRole } = require("../../services/usersService");
const { cashProfit } = require("../../services/cashService");

/**
 * Valida metas e envia notificações de acordo com o lucro
 * @param {string} cashId - Caixa a ser validado
 * @param {string} role - Nível de usuário que vai receber a notificação
 */
exports.vehicleGoalNotifications = async (cashId) => {
  console.log("Verificando se bateu a meta...");

  // 1. Busca as metas
  const goals = await pendingGoals();
  if (goals.length === 0) {
    console.log("Nenhuma meta cadastrada");
    return;
  }

  // 2. Calcula o lucro do caixa
  const profit = await cashProfit(cashId);
  if (profit === null) return;

  // 3. Percorre metas
  for (let goal of goals) {
    if (goal.isActive && profit >= parseFloat(goal.goalValue)) {
      console.log(`[NotificationService] O caixa atingiu a meta ${goal.goalPeriod}: ${goal.goalValue} (lucro atual: ${profit})`);

      const tokens = await findPushTokenForRole("ADMIN");
      console.log("Tokens encontrados:", tokens);

      const messageConfig = {
        title: "🥳 Meta atingida!",
        body: `Parabéns! A meta ${goal.goalPeriod} foi atingida`,
        priority: "high",
      };

      //Envia a notificação para todos os usuarios que são admin
      await sendNotification(messageConfig, tokens);

      // Atualiza a meta para registrar que já foi notificada
      await updateGoals(goal.id);
    }
  }
};
