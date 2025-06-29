const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createHash, verifyPassword } = require('../utils/authUtils');
const jwt = require('jsonwebtoken');

async function registerUser(username, password) {
  // Cria hash da senha
  const { salt, hash } = await createHash(password);
  console.log('[authService] Hash de senha criado com sucesso');

  try {
    // Corrigido: usando Account (modelo) que mapeia para "accounts" (tabela)
    const user = await prisma.account.create({
      data: {
        username,
      },
    });

    // Corrigido: usando Authentication (modelo) que mapeia para "authentications" (tabela)
    await prisma.authentication.create({
      data: {
        accountId: user.id, // Campo mapeado para "account_id"
        passwordHash: hash, // Campo mapeado para "password_hash"
        salt: salt,
      }
    });

    console.log(`[authService] Usuário criado com sucesso: ID ${user.id}`);
    return user;
  } catch (err) {
    console.error('[authService] Erro ao criar usuário:', err);
    throw new Error('Erro interno ao criar usuário');
  } finally {
    await prisma.$disconnect();
  }
}

async function loginUser(username, password) {
  try {
    // Corrigido: usando account (modelo) com include
    const account = await prisma.account.findUnique({
      where: { username },
      include: { authentication: true },
    });

    if (!account || !account.authentication) {
      throw new Error('Credenciais inválidas');
    }

    const isPasswordValid = await verifyPassword(
      password,
      account.authentication.salt,
      account.authentication.passwordHash // Campo correto
    );

    if (!isPasswordValid) {
      throw new Error('Credenciais inválidas');
    }

    // Geração de token JWT
    const token = jwt.sign(
      { id: account.id, role: account.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return token;
  } catch (err) {
    console.error('[authService] Erro no login:', err);
    throw new Error(err.message || 'Erro no processo de login');
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = {
  registerUser,
  loginUser,
};