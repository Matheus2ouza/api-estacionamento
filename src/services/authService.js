const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createHash, verifyPassword } = require('../utils/authUtils');
const jwt = require('jsonwebtoken');

async function registerUser(username, password, role) {
  const { salt, hash } = await createHash(password);
  console.log('[authService] Hash de senha criado com sucesso');

  const verifyUsername = await prisma.account.findUnique({
    where: {
      username
    }
  })

  if(verifyUsername) {
    console.error(`[authService] Erro ao criar usuario porque o usuario já existia: ${username}` )
    throw new Error(`O Nome ${username} já foi usado`)
  }

  try {
    const user = await prisma.account.create({
      data: {
        username,
        role,
      },
    });

    await prisma.authentication.create({
      data: {
        accountId: user.id,
        passwordHash: hash,
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
    const account = await prisma.account.findUnique({
      where: { username },
      include: { authentication: true },
    });

    if (!account || !account.authentication) {
      throw new Error('Usuario Invalido ou não cadastrado');
    }

    const isPasswordValid = await verifyPassword(
      password,
      account.authentication.salt,
      account.authentication.passwordHash
    );

    if (!isPasswordValid) {
      throw new Error('Senha inválida')}

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

async function editUser(id, username, password, role) {
  try {
    const user = await prisma.account.findUnique({
      where: { id },
      select: {
        username: true,
        role: true,
        authentication: {
          select: {
            passwordHash: true,
            salt: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const updateData = {};
    const authUpdateData = {};

    // Atualiza username se fornecido e diferente
    if (username && username !== user.username) {
      updateData.username = username;
    }

    // Atualiza role se fornecido e diferente
    if (role && role !== user.role) {
      updateData.role = role;
    }

    // Atualiza senha se fornecido e diferente
    if (password && password.trim() !== "") {
      const { hash, salt } = await createHash(password);
      authUpdateData.passwordHash = hash;
      authUpdateData.salt = salt;
    }

    // Atualiza dados da tabela Account
    if (Object.keys(updateData).length > 0) {
      await prisma.account.update({
        where: { id },
        data: updateData,
      });
    }

    // Atualiza dados da tabela Authentication
    if (Object.keys(authUpdateData).length > 0) {
      await prisma.authentication.update({
        where: { accountId: id },
        data: authUpdateData,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Erro ao editar usuário:", error);
    throw error;
  } finally {
    prisma.$disconnect
  }
}

async function deleteUser(id) {
  try {
    const verifyUser = await prisma.account.findUnique({
      where: {
        id
      },
    })

    if(!verifyUser) {
      throw new Error('Usuário não encontrado')
    }

    const user = await prisma.account.delete({
      where: { id }
    })

    return user
  } catch (err) {
    console.log(`[authService] Erro ao tentar excluir o usuario ${id}:`, err)
    throw err
  } finally {
    prisma.$disconnect
  }
}

async function listUsers() {
  try{
    const list = await prisma.account.findMany({
      select: {
        id: true,
        username: true,
        role: true
      }
    });

    return list
  } catch (err) {
    console.warn(`[AuthSErvice] Erro buscar a lista de usuarios: ${err}`)
    throw new Error("Erro ao buscar a lista de usuarios")
  } finally {
    prisma.$disconnect();
  }

}

module.exports = {
  registerUser,
  loginUser,
  editUser,
  deleteUser,
  listUsers,
};