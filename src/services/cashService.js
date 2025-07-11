const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { DateTime } = require("luxon");

async function statusCashService(date) {
  try {
    const startOfDay = DateTime.fromJSDate(date).startOf('day').toJSDate();
    const endOfDay = DateTime.fromJSDate(date).endOf('day').toJSDate();

    const result = await prisma.cashRegister.findFirst({
      where: {
        openingDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: 'OPEN',
      },
    });

    return !!result; // retorna true ou false
  } catch (err) {
    throw err;
  }
}

async function opencashService(user, initialValue, date) {
  const startOfDay = DateTime.fromJSDate(date).startOf('day').toJSDate();
  const endOfDay = DateTime.fromJSDate(date).endOf('day').toJSDate();

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

    throw new Error("Já existe um caixa aberto para hoje.");
  }

  try{
    const newCash = await prisma.cashRegister.create({
      data: {
        openingDate: date,
        operator: user.username,
        initialValue: initialValue,
        status: "OPEN",
      },
    });
  
    return newCash;
  } catch (err) {
    throw err
  }
}

module.exports = {
  statusCashService,
  opencashService
}