const { convertTimeToMinutes } = require('./timeConverter');

/**
 * Valida e converte o tempo baseado na categoria do método de cobrança
 * @param {string} category - Categoria do método (POR_HORA, POR_MINUTO, VALOR_FIXO)
 * @param {string} time - Tempo no formato hh:mm:ss
 * @param {number} carroValue - Valor para carro
 * @param {number} motoValue - Valor para moto
 * @returns {object} Objeto com time_minutes e description
 */
function validateAndConvertBillingTime(category, time, carroValue, motoValue) {
  let timeMinutes;
  let description;

  if (category === 'POR_HORA') {
    const totalMinutes = convertTimeToMinutes(time);
    if (totalMinutes < 1 || totalMinutes > 1440) { // 24 horas = 1440 minutos
      const error = {
        userMessage: 'O tempo estabelecido não corresponde a uma hora válida',
        logMessage: `Tempo inválido para categoria POR_HORA: ${time} (${totalMinutes} minutos). Deve estar entre 1 e 1440 minutos.`
      };
      throw error;
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const timeDisplay = minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    const carroValueFormatted = parseFloat(carroValue).toFixed(2).replace('.', ',');
    const motoValueFormatted = parseFloat(motoValue).toFixed(2).replace('.', ',');
    description = `A valor a ser cobrado sera calculado de acordo com o tempo de ${timeDisplay} pelo valor de R$ ${carroValueFormatted} para carro e R$ ${motoValueFormatted} para moto.`;
    timeMinutes = totalMinutes;
  } else if (category === 'POR_MINUTO') {
    const totalMinutes = convertTimeToMinutes(time);
    if (totalMinutes < 1 || totalMinutes > 59) {
      const error = {
        userMessage: 'O tempo estabelecido não corresponde a um minuto válido',
        logMessage: `Tempo inválido para categoria POR_MINUTO: ${time} (${totalMinutes} minutos). Deve estar entre 1 e 59 minutos.`
      };
      throw error;
    }
    const carroValueFormatted = parseFloat(carroValue).toFixed(2).replace('.', ',');
    const motoValueFormatted = parseFloat(motoValue).toFixed(2).replace('.', ',');
    description = `A valor a ser cobrado sera calculado de acordo com o tempo de ${totalMinutes} minutos pelo valor de R$ ${carroValueFormatted} para carro e R$ ${motoValueFormatted} para moto.`;
    timeMinutes = totalMinutes;
  } else if (category === 'VALOR_FIXO') {
    // Para VALOR_FIXO, se veio tempo, converte para zero, se não veio, mantém zero
    if (time && time !== "00:00:00") {
      const error = {
        userMessage: 'A categoria VALOR_FIXO não deve ter tempo definido',
        logMessage: `Categoria VALOR_FIXO recebeu tempo inválido: ${time}. Deve ser "00:00:00" ou undefined.`
      };
      throw error;
    }
    const carroValueFormatted = parseFloat(carroValue).toFixed(2).replace('.', ',');
    const motoValueFormatted = parseFloat(motoValue).toFixed(2).replace('.', ',');
    description = `A valor a ser cobrado sera calculado de acordo com o valor de R$ ${carroValueFormatted} para carro e R$ ${motoValueFormatted} para moto independente do tempo.`;
    timeMinutes = 0; // Valor padrão para VALOR_FIXO
  } else {
    // Categoria não reconhecida
    const error = {
      userMessage: 'Categoria de método de cobrança inválida',
      logMessage: `Categoria não reconhecida: ${category}. Categorias válidas: POR_HORA, POR_MINUTO, VALOR_FIXO.`
    };
    throw error;
  }

  return { timeMinutes, description };
}

/**
 * Valida se a tolerância está dentro dos limites aceitáveis
 * @param {number} tolerance - Valor da tolerância em minutos
 * @returns {object} Objeto com isValid e mensagens de erro
 */
function validateTolerance(tolerance) {
  if (tolerance < 0 || tolerance > 59) {
    return {
      isValid: false,
      userMessage: 'A tolerância deve estar entre 0 e 59 minutos',
      logMessage: `Tolerância inválida: ${tolerance} minutos. Deve estar entre 0 e 59 minutos.`
    };
  }

  return {
    isValid: true,
    userMessage: null,
    logMessage: null
  };
}

/**
 * Calcula o valor a ser cobrado baseado no tempo de permanência e método de cobrança
 * @param {Date} entryTime - Data/hora de entrada do veículo
 * @param {string} category - Categoria do veículo (carro ou moto)
 * @param {object} billingMethod - Método de cobrança com tolerance, timeMinutes, carroValue, motoValue
 * @returns {object} Objeto com valor calculado e informações adicionais
 */
function calculateOutstandingAmount(entryTime, category, billingMethod) {
  const { DateTime } = require("luxon");

  // Tempo atual no fuso de Belém
  const now = DateTime.now().setZone("America/Belem");
  const entry = DateTime.fromJSDate(entryTime).setZone("America/Belem");

  // Calcula tempo de permanência em minutos
  const stayTimeMinutes = Math.floor(now.diff(entry, 'minutes').minutes);

  // Validação: tempo muito baixo para calcular
  if (stayTimeMinutes < 0) {
    return {
      amount: 0,
      error: {
        success: false,
        message: 'Tempo de permanência inválido. Verifique a data de entrada.'
      }
    };
  }

  // Validação: tempo menor que a tolerância (apenas para métodos baseados em tempo)
  if (billingMethod.timeMinutes > 0) {
    const tolerance = billingMethod.tolerance || 0;
    if (stayTimeMinutes <= tolerance) {
      return {
        amount: 0,
        error: {
          success: false,
          message: `Tempo de permanência insuficiente para cobrança.`
        }
      };
    }
  }

  // Valor base por categoria
  const baseValue = category === 'carro' ?
    parseFloat(billingMethod.carroValue) :
    parseFloat(billingMethod.motoValue);

  // Calcula valor final baseado no método de cobrança
  let finalAmount = 0;
  let calculationDetails = {};

  if (billingMethod.timeMinutes === 0) {
    // VALOR_FIXO - cobra valor fixo independente do tempo
    finalAmount = baseValue;
    calculationDetails = {
      method: 'VALOR_FIXO',
      baseValue: baseValue,
      stayTimeMinutes: stayTimeMinutes,
      finalAmount: finalAmount
    };
  } else {
    // POR_HORA ou POR_MINUTO - calcula baseado no tempo com tolerância por bloco
    const timeUnit = billingMethod.timeMinutes;
    const tolerance = billingMethod.tolerance || 0;

    // Calcula quantos blocos completos foram utilizados
    // Cada bloco tem tolerância, então só conta o próximo bloco se passar da tolerância
    let timeUnitsUsed = 0;
    let remainingTime = stayTimeMinutes;

    while (remainingTime > 0) {
      timeUnitsUsed++;
      // Remove o tempo do bloco atual + tolerância
      remainingTime = Math.max(0, remainingTime - timeUnit - tolerance);
    }

    finalAmount = timeUnitsUsed * baseValue;

    calculationDetails = {
      method: billingMethod.timeMinutes >= 60 ? 'POR_HORA' : 'POR_MINUTO',
      baseValue: baseValue,
      timeUnitMinutes: timeUnit,
      toleranceMinutes: tolerance,
      stayTimeMinutes: stayTimeMinutes,
      timeUnitsUsed: timeUnitsUsed,
      finalAmount: finalAmount
    };
  }

  return {
    amount: parseFloat(finalAmount.toFixed(2)),
    calculationDetails: calculationDetails
  };
}

module.exports = {
  validateAndConvertBillingTime,
  validateTolerance,
  calculateOutstandingAmount
};
