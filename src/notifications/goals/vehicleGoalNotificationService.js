const { listGoalsService } = require("../../services/dashboardService");
const { sendNotification } = require("../../notifications/sendNotification");
const { getAllPushTokensForUsers } = require("../../services/pushTokenService");

// essa função deve buscar os tokens de quem vai receber a notificação
/**
 * @param {number} values - Valor da transação
 * @param {string} role - nivel de usuario para qual vão ser enviadas as mensagens
 */
exports.vehicleGoalNotifications = async (transactionValue, role) => {
  const goals = await listGoalsService();

  for (let i = 0; i < goals.length; i++) {
    const goal = goals[i];

    // Só metas ativas
    if (goal.isActive && transactionValue >= parseFloat(goal.goalValue)) {
      console.log(`[NotificationService] Meta atingida: ${goal.goalValue} (valor: ${transactionValue})`);

      // Pega os tokens dos usuários (ex: admins)
      const tokens = await findPushTokenForRole(role);

      // Monta a mensagem
      const messageConfig = {
        title: "🥳 Meta atingida!",
        body: `Parabens você acabou de alcançar a meta ${goals.goalPeriod}`,
        priority: "high",
      };

      // Envia notificação
      await sendNotification(messageConfig, tokens);
    }
  }
};
