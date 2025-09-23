import { Expo } from "expo-server-sdk";

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: true
});

/**
 * Envia uma notificação push
 * @param {object} messageConfig - Objeto com os dados da mensagem
 * @param {Array<{token: string}>} tokens - Array de objetos com a propriedade token
 */
export async function sendNotification(messageConfig, tokens) {
  const messages = [];

  for (let tokenObj of tokens) {
    const token = tokenObj.token; // pega a string real do token
    console.log("dentro do sendNotification");
    console.log(token);

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
