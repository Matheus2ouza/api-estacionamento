const { findPushTokenForRole } = require("../../services/usersService");
const { sendNotification } = require("../../notifications/sendNotification");

exports.NotifyCloseCashRegister = async () => {
  try {
    console.log("[NotificationService] Enviando a notificação de caixa fechado pelo sistema");

    // Busca tokens de todos os administradores
    const tokens = await findPushTokenForRole("ADMIN");
    console.log("[NotificationService] Tokens encontrados:", tokens);

    if (!tokens || tokens.length === 0) {
      console.log("[NotificationService] Nenhum token encontrado para enviar a notificação");
      return;
    }

    // Configura a mensagem da notificação
    const messageConfig = {
      title: "💰 Caixa fechado!",
      body: "Ops, parece que você esqueceu de fechar o caixa, mas não se preocupe o sistema fechou para você.",
      priority: "high"
    };

    // Envia a notificação para todos os administradores
    await sendNotification(messageConfig, tokens);

    console.log("[NotificationService] Notificação de fechamento de caixa enviada com sucesso");
  } catch (error) {
    console.error("[NotificationService] Erro ao enviar notificação de fechamento de caixa:", error);
  }
};
