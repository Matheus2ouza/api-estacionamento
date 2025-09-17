const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { DateTime } = require("luxon");

// Estrutura para mensagens
const createMessage = (userMessage, logMessage) => ({
  userMessage,
  logMessage
});

async function registerOutgoingService({ description, amount, method, cashId, transactionDate, user }) {
  const verifyCash = await prisma.cashRegister.findUnique({
    where: { id: cashId },
  });

  if (!verifyCash) {
    const message = createMessage(
      "Nenhum caixa encontrado",
      `[expenseService] Tentativa de registrar despesa em caixa não encontrado: ${cashId}`
    )
    throw new Error(message);
  }

  try {
    const outgoing = await prisma.$transaction(async (tx) => {
      const outgoing = await tx.outgoingExpense.create({
        data: {
          description: description,
          amount: Number(amount),
          transactionDate: transactionDate,
          method: method,
          cashRegisterId: cashId,
          operator: user.username
        }
      });

      await tx.cashRegister.update({
        where: { id: cashId },
        data: {
          outgoingExpenseTotal: {
            increment: Number(amount)
          },
          finalValue: {
            decrement: Number(amount)
          }
        }
      });

      return outgoing.id;
    });

    return outgoing;
  } catch (error) {
    console.error(`[expenseService] Erro ao registrar despesa: ${error.message}`);
    throw error;
  }
}

async function listOutgoingExpenseService(cashId) {
  try {
    const outgoing = await prisma.outgoingExpense.findMany({
      where: { cashRegisterId: cashId },
      select: {
        id: true,
        description: true,
        amount: true,
        transactionDate: true,
        operator: true,
        method: true,
      },
      orderBy: {
        transactionDate: 'desc'
      }
    });

    return outgoing;
  } catch (error) {
    console.error(`[expenseService] Erro ao buscar despesas: ${error.message}`);
    throw error;
  }
}

async function deleteOutgoingExpenseService(cashId, expenseId) {
  console.log(`[expenseService] Iniciando exclusão de despesa - CashId: ${cashId}, ExpenseId: ${expenseId}`);

  // 1. Validar se o caixa existe
  console.log(`[expenseService] Verificando se caixa existe: ${cashId}`);
  const verifyCash = await prisma.cashRegister.findUnique({
    where: { id: cashId },
  });

  if (!verifyCash) {
    const message = createMessage(
      "Nenhum caixa encontrado",
      `[expenseService] Tentativa de deletar despesa em caixa não encontrado: ${cashId}`
    )
    console.warn(message.logMessage);
    throw new Error(message.userMessage);
  }
  console.log(`[expenseService] Caixa encontrado: ${verifyCash.id}`);

  // 2. Validar se a despesa existe
  console.log(`[expenseService] Verificando se despesa existe: ${expenseId}`);
  const verifyOutgoing = await prisma.outgoingExpense.findUnique({
    where: { id: expenseId }
  })

  if (!verifyOutgoing) {
    const message = createMessage(
      "Despesa não encontrada",
      `[expenseService] Tentativa de deletar despesa não encontrada: ${expenseId}`
    )
    console.warn(message.logMessage);
    throw new Error(message.userMessage);
  }
  console.log(`[expenseService] Despesa encontrada: ${verifyOutgoing.description} - Valor: R$ ${verifyOutgoing.amount}`);

  // 3. Validar se a despesa pertence ao caixa especificado
  if (verifyOutgoing.cashRegisterId !== cashId) {
    const message = createMessage(
      "Despesa não pertence ao caixa especificado",
      `[expenseService] Tentativa de deletar despesa ${expenseId} que pertence ao caixa ${verifyOutgoing.cashRegisterId} usando cashId ${cashId}`
    )
    console.warn(message.logMessage);
    throw new Error(message.userMessage);
  }
  console.log(`[expenseService] Validação de pertencimento ao caixa: OK`);

  try {
    console.log(`[expenseService] Iniciando transação para exclusão da despesa`);
    // 4. Executar transação: atualizar caixa e deletar despesa
    const result = await prisma.$transaction(async (tx) => {
      console.log(`[expenseService] Atualizando caixa - removendo R$ ${verifyOutgoing.amount} dos totais`);
      // Atualizar o caixa (remover a despesa dos totais)
      const cashUpdated = await tx.cashRegister.update({
        where: { id: verifyCash.id },
        data: {
          outgoingExpenseTotal: {
            decrement: Number(verifyOutgoing.amount)
          },
          finalValue: {
            increment: Number(verifyOutgoing.amount)
          }
        }
      });

      console.log(`[expenseService] Deletando despesa: ${expenseId}`);
      // Deletar a despesa
      const deletedExpense = await tx.outgoingExpense.delete({
        where: { id: expenseId }
      });

      console.log(`[expenseService] Despesa deletada com sucesso`);
      return {
        deletedExpense,
        cashUpdated
      };
    });

    console.log(`[expenseService] Transação concluída com sucesso`);
    return result;
  } catch (error) {
    console.error(`[expenseService] Erro ao deletar despesa: ${error.message}`);
    throw error;
  }
}

async function updateOutgoingExpenseService(cashId, expenseId, { description, amount, method }) {
  // 1. Validar se o caixa existe
  const verifyCash = await prisma.cashRegister.findUnique({
    where: { id: cashId },
  });

  if (!verifyCash) {
    const message = createMessage(
      "Nenhum caixa encontrado",
      `[expenseService] Tentativa de atualizar despesa em caixa não encontrado: ${cashId}`
    )
    throw new Error(message.userMessage);
  }

  // 2. Validar se a despesa existe
  const verifyOutgoing = await prisma.outgoingExpense.findUnique({
    where: { id: expenseId }
  });

  if (!verifyOutgoing) {
    const message = createMessage(
      "Despesa não encontrada",
      `[expenseService] Tentativa de atualizar despesa não encontrada: ${expenseId}`
    )
    throw new Error(message.userMessage);
  }

  // 3. Validar se a despesa pertence ao caixa especificado
  if (verifyOutgoing.cashRegisterId !== cashId) {
    const message = createMessage(
      "Despesa não pertence ao caixa especificado",
      `[expenseService] Tentativa de atualizar despesa ${expenseId} que pertence ao caixa ${verifyOutgoing.cashRegisterId} usando cashId ${cashId}`
    )
    throw new Error(message.userMessage);
  }

  // 4. Calcular a diferença de valores
  const oldAmount = Number(verifyOutgoing.amount);
  const newAmount = Number(amount);
  const amountDifference = newAmount - oldAmount;

  try {
    // 5. Executar transação: atualizar despesa e ajustar caixa
    const result = await prisma.$transaction(async (tx) => {
      // Atualizar a despesa
      const outgoingUpdated = await tx.outgoingExpense.update({
        where: { id: expenseId },
        data: {
          description: description,
          amount: newAmount,
          method: method
        }
      });

      // Ajustar o caixa baseado na diferença de valores
      if (amountDifference !== 0) {
        await tx.cashRegister.update({
          where: { id: cashId },
          data: {
            outgoingExpenseTotal: {
              increment: amountDifference
            },
            finalValue: {
              decrement: amountDifference
            }
          }
        });
      }

      return {
        updatedExpense: outgoingUpdated,
        amountDifference: amountDifference,
        oldAmount: oldAmount,
        newAmount: newAmount
      };
    });

    return result;
  } catch (error) {
    console.error(`[expenseService] Erro ao atualizar despesa: ${error.message}`);
    throw error;
  }
}


module.exports = {
  registerOutgoingService,
  listOutgoingExpenseService,
  deleteOutgoingExpenseService,
  updateOutgoingExpenseService
}
