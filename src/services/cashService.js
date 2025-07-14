const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { DateTime } = require("luxon");

async function statusCashService(date) {
  try {
    // Converte a data para DateTime com fuso de Belém
    const localDateTime = DateTime.fromJSDate(date).setZone("America/Belem");

    // Define o início e o fim do "dia local" (ex: segunda-feira das 00:00 às 23:59 de Belém)
    const startOfDay = localDateTime.startOf("day").toJSDate();
    const endOfDay = localDateTime.endOf("day").toJSDate();

    // Busca caixa aberto com data dentro do intervalo local
    const result = await prisma.cashRegister.findFirst({
      where: {
        openingDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: "OPEN",
      },
    });

    // Retorna true se encontrou um caixa aberto nesse dia
    return !!result;
  } catch (error) {
    console.error(`[CashService] Erro ao verificar caixa aberto: ${error}`);
    throw error;
  }
}


async function opencashService(user, initialValue, date) {
  console.log("[opencashService] Iniciando abertura de caixa...");
  console.log("[opencashService] Data original recebida:", date);

  // Força a zona para America/Belem ao calcular o intervalo
  const localDateTime = DateTime.fromJSDate(date).setZone('America/Belem');
  console.log("[opencashService] Data convertida para America/Belem:", localDateTime.toISO());

  const startOfDay = localDateTime.startOf('day').toJSDate();
  const endOfDay = localDateTime.endOf('day').toJSDate();

  console.log("[opencashService] Intervalo startOfDay:", startOfDay);
  console.log("[opencashService] Intervalo endOfDay:", endOfDay);

  const existingCash = await prisma.cashRegister.findFirst({
    where: {
      openingDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: 'OPEN',
    },
  });

  if (existingCash) {
    console.log("[opencashService] Já existe um caixa aberto:", existingCash);
    return false;
  }

  console.log("[opencashService] Nenhum caixa aberto encontrado, criando um novo...");

  const newCash = await prisma.cashRegister.create({
    data: {
      openingDate: date,
      operator: user.username,
      initialValue,
      finalValue: initialValue,
      status: 'OPEN',
      closingDate: null,
    },
  });

  console.log("[opencashService] Caixa criado com sucesso:", newCash);

  return !!newCash;
}

async function geralCashDataService(id) {
  const verifyCash = await prisma.cashRegister.findUnique({
    where: {id: id}
  })

  if(!verifyCash) {
    return false
  }

  try{
    const result =  await prisma.cashRegister.findFirst({
      where: {id: id},
      select: {
        vehicleEntryTotal: true,
        generalSaleTotal: true
      }
    })
    
    return result
  } catch (error) {
    throw error
  }
}

module.exports = {
  statusCashService,
  opencashService,
  geralCashDataService
}