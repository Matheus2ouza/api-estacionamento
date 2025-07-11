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
    return false;
  }

  const newCash = await prisma.cashRegister.create({
    data: {
      openingDate: date,
      operator: user.username,
      initialValue,
      finalValue: initialValue,
      status: "OPEN",
      closingDate: null,
    },
  });

  return !!newCash; // true se criou com sucesso
}

module.exports = {
  statusCashService,
  opencashService
}