const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { DateTime } = require("luxon");

import { DateTime } from 'luxon';

async function statusCashService(date) {
  try {
    // Converte a data para o fuso de Belém (UTC-3)
    const localDateTime = DateTime.fromJSDate(date).setZone('America/Belem');

    const startOfDay = localDateTime.startOf('day').toJSDate();
    const endOfDay = localDateTime.endOf('day').toJSDate();

    const result = await prisma.cashRegister.findFirst({
      where: {
        openingDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: 'OPEN',
      },
    });

    return !!result; // retorna true se encontrou, false se não
  } catch (err) {
    throw err;
  }
}

async function opencashService(user, initialValue, date) {
  // Força a zona para America/Belem ao calcular o intervalo
  const localDateTime = DateTime.fromJSDate(date).setZone('America/Belem');

  const startOfDay = localDateTime.startOf('day').toJSDate();
  const endOfDay = localDateTime.endOf('day').toJSDate();

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
      openingDate: date, // esse `date` já veio com fuso local ao ser criado
      operator: user.username,
      initialValue,
      finalValue: initialValue,
      status: 'OPEN',
      closingDate: null,
    },
  });

  return !!newCash;
}


module.exports = {
  statusCashService,
  opencashService
}