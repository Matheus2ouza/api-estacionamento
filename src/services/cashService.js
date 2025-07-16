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
    return result;
  } catch (error) {
    console.error(`[CashService] Erro ao verificar caixa aberto: ${error}`);
    throw error;
  }
}

async function openCashService(user, initialValue, localDateTime) {
  console.log("[opencashService] Data recebida como DateTime:", localDateTime.toISO());

  const startOfDay = localDateTime.startOf('day').toJSDate(); // convertido em UTC
  const endOfDay = localDateTime.endOf('day').toJSDate();

  console.log("[opencashService] Intervalo UTC - startOfDay:", startOfDay);
  console.log("[opencashService] Intervalo UTC - endOfDay:", endOfDay);

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

  const newCash = await prisma.cashRegister.create({
    data: {
      openingDate: localDateTime.toJSDate(), // armazena em UTC
      operator: user.username,
      initialValue,
      finalValue: initialValue,
      status: 'OPEN',
      closingDate: null,
    },
  });

  console.log("[opencashService] Caixa criado com sucesso:", newCash);
  return newCash;
}

async function closeCashService(id, date, finalValue) {
  const verifyCash = await prisma.cashRegister.findUnique({
    where: { id: id }
  })

  if (!verifyCash) {
    return false
  }

  try{
    const closeCash = await prisma.cashRegister.update({
      where: {id: id},
      data: {
        closingDate: date,
        status: 'CLOSED',
        finalValue: finalValue
      },
      select: {
        id: true,
        status: true
      }
    })

    return closeCash
  } catch (error) {
    throw error
  }
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
      where: {id: id}
    })
    
    return result
  } catch (error) {
    throw error
  }
}

module.exports = {
  statusCashService,
  openCashService,
  closeCashService,
  geralCashDataService
}