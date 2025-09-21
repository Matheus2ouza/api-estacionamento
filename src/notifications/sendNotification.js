import { Expo } from "expo-server-sdk";

const expo = new Expo();

/**
 * Envia uma notificação push
 * @param {object} messageConfig - Objeto com os dados da mensagem
 * @param {string[]} tokens - Tokens dos usuários que vão receber
 */
export async function sendNotification(messageConfig, tokens) {
  const messages = [];

  for (let token of tokens) {
    if (!Expo.isExpoPushToken(token)) {
      console.warn(`[Notification] Token inválido: ${token}`);
      continue;
    }

    messages.push({
      to: token,
      sound: "default",
      ...messageConfig,
    });
  }

  // Envia em lotes
  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (let chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("[Notification] Erro ao enviar push:", error);
    }
  }

  return tickets;
}
