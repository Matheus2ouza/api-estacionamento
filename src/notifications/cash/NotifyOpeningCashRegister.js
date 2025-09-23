const { findPushTokenForRole } = require("../../services/usersService");
const { sendNotification } = require("../sendNotification");

exports.notifyOpeningCashRegister = async (user) => {
  try {
    console.log("[NotificationService] Enviando a notificação de caixa aberto para o operador");

    // Determina o público e mensagem com base no role de quem abriu
    const openedBy = user?.role || 'NORMAL';
    const isPrivileged = openedBy === 'ADMIN' || openedBy === 'MANAGER';
    const targetRoles = isPrivileged ? ['NORMAL'] : ['ADMIN', 'MANAGER'];

    // Mensagens distintas
    const messageConfig = isPrivileged
      ? {
        title: "🎉 Caixa aberto!",
        body: "A administração abriu o caixa. Tenha um excelente turno! 😊",
        priority: "high"
      }
      : {
        title: "✅ Caixa aberto pelo operador",
        body: `O operador ${user?.username || ''} abriu o caixa. Tudo pronto para começar. Acompanhe pelo painel quando quiser.`,
        priority: "high"
      };

    // Busca tokens dos públicos alvo (ADMIN e/ou MANAGER, ou NORMAL) com deduplicação
    const tokensArrays = await Promise.all(targetRoles.map(role => findPushTokenForRole(role)));
    const merged = tokensArrays.flat().filter(Boolean);
    const unique = [];
    const seen = new Set();
    for (const t of merged) {
      const key = t.token;
      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(t);
      }
    }
    const tokens = unique;
    console.log("[NotificationService] Tokens encontrados:", tokens);

    if (!tokens || tokens.length === 0) {
      console.log("[NotificationService] Nenhum token encontrado para enviar a notificação");
      return;
    }

    // Envia a notificação para os públicos alvo
    await sendNotification(messageConfig, tokens);

    console.log("[NotificationService] Notificação de abertura de caixa enviada com sucesso");
  } catch (error) {
    console.error("[NotificationService] Erro ao enviar notificação de abertura de caixa:", error);
  }
}
