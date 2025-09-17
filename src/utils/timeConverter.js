const { DateTime } = require("luxon");

/**
 * Converte tempo no formato hh:mm:ss para minutos totais
 * @param {string} timeString - Tempo no formato "hh:mm:ss"
 * @returns {number} - Total de minutos
 */
function convertTimeToMinutes(timeString) {
  if (!timeString) return 0;

  const parts = timeString.split(':');
  const hours = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;
  const seconds = parseInt(parts[2]) || 0;

  return (hours * 60) + minutes + Math.round(seconds / 60);
}

/**
 * Converte uma data para o fuso horário de Belém
 * @param {Date|string} date - Data a ser convertida (pode ser Date ou string ISO)
 * @returns {DateTime} - DateTime no fuso horário de Belém
 */
function convertToBelemTime(date) {
  if (!date) {
    return DateTime.now().setZone("America/Belem");
  }

  // Se for uma string, converte para DateTime primeiro
  if (typeof date === 'string') {
    return DateTime.fromISO(date).setZone("America/Belem");
  }

  // Se for um objeto Date, converte para DateTime
  if (date instanceof Date) {
    return DateTime.fromJSDate(date).setZone("America/Belem");
  }

  // Se já for DateTime, apenas ajusta o fuso
  if (date instanceof DateTime) {
    return date.setZone("America/Belem");
  }

  // Fallback para data atual
  return DateTime.now().setZone("America/Belem");
}

/**
 * Obtém a data/hora atual no fuso horário de Belém
 * @returns {DateTime} - DateTime atual no fuso horário de Belém
 */
function getCurrentBelemTime() {
  return DateTime.now().setZone("America/Belem");
}

/**
 * Converte uma data para o fuso horário de Belém e retorna formatada
 * @param {Date|string} date - Data a ser convertida
 * @param {string} format - Formato desejado (padrão: "dd/MM/yyyy HH:mm:ss")
 * @returns {string} - Data formatada no fuso de Belém
 */
function formatBelemTime(date, format = "dd/MM/yyyy HH:mm:ss") {
  const belemTime = convertToBelemTime(date);
  return belemTime.toFormat(format);
}

/**
 * Converte uma data para o fuso horário de Belém e retorna como JSDate
 * @param {Date|string} date - Data a ser convertida
 * @returns {Date} - Date no fuso horário de Belém
 */
function convertToBelemJSDate(date) {
  const belemTime = convertToBelemTime(date);
  return belemTime.toJSDate();
}

/**
 * Valida e converte data de validade no formato MM/AAAA para Date
 * @param {string} expirationDate - Data no formato MM/AAAA
 * @returns {Object} - { isValid: boolean, date: Date|null, error: string|null }
 */
function validateAndConvertExpirationDate(expirationDate) {
  // Se não foi fornecida data, retorna válido com null
  if (!expirationDate) {
    return {
      isValid: true,
      date: null,
      error: null
    };
  }

  // Verificar formato MM/AAAA
  if (!/^\d{2}\/\d{4}$/.test(expirationDate)) {
    return {
      isValid: false,
      date: null,
      error: 'Formato de validade inválido. Use MM/AAAA.'
    };
  }

  const [monthStr, yearStr] = expirationDate.split('/');
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);

  // Validar mês (1-12)
  if (month < 1 || month > 12) {
    return {
      isValid: false,
      date: null,
      error: 'Mês inválido na validade. Deve ser entre 01 e 12.'
    };
  }

  // Validar se a data não está no passado
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // Janeiro = 1
  const currentYear = now.getFullYear();

  // Verificar se a data é anterior ao mês/ano atual
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return {
      isValid: false,
      date: null,
      error: 'A validade não pode ser anterior ao mês/ano atual.'
    };
  }

  // Converter para objeto Date (primeiro dia do mês)
  const date = new Date(year, month - 1, 1);

  return {
    isValid: true,
    date: date,
    error: null
  };
}

module.exports = {
  convertTimeToMinutes,
  convertToBelemTime,
  getCurrentBelemTime,
  formatBelemTime,
  convertToBelemJSDate,
  validateAndConvertExpirationDate
};
