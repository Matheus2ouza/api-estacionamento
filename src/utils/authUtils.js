const crypto = require('crypto');
const { promisify } = require('util');

// Transforma a função pbkdf2 do Node.js para retornar uma Promise
const pbkdf2 = promisify(crypto.pbkdf2);

// Parâmetros para o algoritmo de hash
const ITERATIONS = 100_000; // Quanto mais alto, mais seguro (e mais lento)
const KEYLEN = 64;          // Tamanho do hash gerado (em bytes)
const DIGEST = 'sha256';    // Algoritmo de digestão utilizado

/**
 * Gera um salt e um hash a partir de uma senha em texto puro.
 * 
 * @param {string} password - A senha fornecida pelo usuário.
 * @returns {Promise<{salt: string, hash: string}>} - Um objeto contendo o salt e o hash em hexadecimal.
 */
async function createHash(password) {
  // Gera um salt aleatório de 16 bytes
  const salt = crypto.randomBytes(16).toString('hex');

  // Gera o hash da senha usando o salt e PBKDF2
  const derivedKey = await pbkdf2(password, salt, ITERATIONS, KEYLEN, DIGEST);
  const hash = derivedKey.toString('hex');

  return { salt, hash };
}

/**
 * Compara uma senha fornecida com um hash armazenado.
 * 
 * @param {string} password - Senha em texto puro informada pelo usuário.
 * @param {string} salt - Salt que foi usado para gerar o hash original.
 * @param {string} hash - Hash previamente armazenado para comparar.
 * @returns {Promise<boolean>} - Retorna true se a senha for válida, false caso contrário.
 */
async function verifyPassword(password, salt, hash) {
  // Recalcula o hash com o salt original
  const derivedKey = await pbkdf2(password, salt, ITERATIONS, KEYLEN, DIGEST);
  const hashToCompare = derivedKey.toString('hex');

  // Compara o novo hash com o armazenado
  return hashToCompare === hash;
}

module.exports = { createHash, verifyPassword };
