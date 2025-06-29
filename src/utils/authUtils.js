const crypto = require('crypto');
const { promisify } = require('util');

// Transforma a função pbkdf2 do crypto em uma versão que retorna Promise
const pbkdf2 = promisify(crypto.pbkdf2);

// Configurações globais para o hashing
const ITERATIONS = 100000; // Número de iterações para o PBKDF2 (quanto maior, mais seguro e mais lento)
const KEYLEN = 64;         // Tamanho do hash em bytes
const DIGEST = 'sha256';   // Algoritmo de hash usado

/**
 * Gera um salt e o hash da senha informada usando PBKDF2.
 * @param {string} password - Senha em texto puro
 * @returns {Promise<{salt: string, hash: string}>} - Retorna o salt e o hash em formato hexadecimal
 */
async function createHash(password) {
  // Gera um salt aleatório de 16 bytes, convertido para hexadecimal
  const salt = crypto.randomBytes(16).toString('hex');

  // Aplica PBKDF2 para gerar o hash da senha com o salt, aguarda a Promise resolver
  const derivedKey = await pbkdf2(password, salt, ITERATIONS, KEYLEN, DIGEST);

  // Converte o resultado (Buffer) em string hexadecimal
  const hash = derivedKey.toString('hex');

  // Retorna o salt e o hash para armazenar no banco
  return { salt, hash };
}

/**
 * Verifica se a senha informada corresponde ao hash armazenado.
 * @param {string} password - Senha em texto puro a ser verificada
 * @param {string} salt - Salt armazenado (hexadecimal)
 * @param {string} hash - Hash armazenado (hexadecimal)
 * @returns {Promise<boolean>} - Retorna true se a senha estiver correta, false caso contrário
 */
async function verifyPassword(password, salt, hash) {
  // Gera o hash da senha informada usando o salt armazenado
  const derivedKey = await pbkdf2(password, salt, ITERATIONS, KEYLEN, DIGEST);

  // Converte o resultado para hexadecimal para comparação
  const hashToCompare = derivedKey.toString('hex');

  // Compara o hash gerado com o hash armazenado e retorna o resultado
  return hashToCompare === hash;
}

module.exports = { createHash, verifyPassword };
