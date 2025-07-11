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

module.exports = {
  statusCashService,
}