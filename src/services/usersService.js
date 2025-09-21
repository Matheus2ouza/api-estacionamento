const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createHash, verifyPassword } = require('../utils/authUtils');
const jwt = require('jsonwebtoken');

// Estrutura para mensagens
const createMessage = (userMessage, logMessage) => ({
  userMessage,
  logMessage
});

/**
 * Função para registrar novo usuario
 * @param {string} username - Nome do usuario
 * @param {string} password - Senha do usuario
 * @param {string} role - Role do usuario (ADMIN, MANAGER, NORMAL)
 * @param {object} user - Usuario que esta criando o novo usuario
 * @param {string} passwordAdmin - Senha de administrador
 * @returns {object} - Usuario criado
 */
async function registerUserService(username, password, role, user, passwordAdmin) {
  try {
    //Verifica se o usuário já existe
    const verifyUser = await prisma.accounts.findUnique({
      where: { username },
    })

    if (verifyUser) {
      const message = createMessage(
        'Usuário já existente',
        `[UsersService] Tentativa de cadastrar usuário já cadastrado: ${username}`
      );
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    //Verifica se o usuário que vai ser criado vai ser um ADMIN
    if (role === 'ADMIN') {

      //Se for então valida os dados da pessoa que esta criando o novo usuario
      if (!passwordAdmin) {
        const message = createMessage(
          'Senha de administrador é obrigatória para criar usuário com permissão de administrador',
          `[UsersService] Tentativa de criar usuário ADMIN sem senha de administrador por: ${user.username}`
        );
        console.warn(message.logMessage);
        throw new Error(message.userMessage);
      }

      //Valida primeiro o username do admin que esta criando o novo usuario
      const userAdmin = await prisma.accounts.findUnique({
        where: { id: user.id },
        include: { authentications: true }
      })


      if (!userAdmin) {
        const message = createMessage(
          'Usuário administrador não encontrado',
          `[UsersService] Tentativa de criar usuário ADMIN por usuário inexistente: ${user.username}`
        );
        console.warn(message.logMessage);
        throw new Error(message.userMessage);
      }
      //Valida a senha do admin que esta criando o novo usuario
      const isPasswordValid = await verifyPassword(
        passwordAdmin,
        userAdmin.authentications.salt,
        userAdmin.authentications.passwordHash
      );

      if (!isPasswordValid) {
        const message = createMessage(
          'Senha de administrador incorreta',
          `[UsersService] Tentativa de criar usuário ADMIN com senha incorreta por: ${user.username}`
        );
        console.warn(message.logMessage);
        throw new Error(message.userMessage);
      }
    }

    //Valida a senha do novo usuario, se está dentro dos requisitos
    if (!password || password.trim().length < 6) {
      const message = createMessage(
        'Senha inválida, mínimo de 6 caracteres',
        `[UsersService] Tentativa de criar usuário com senha inválida por: ${user.username}`
      );
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    //Cria o hash da senha do novo usuario
    const { salt, hash } = await createHash(password);

    //Cria o novo usuario, registrando tanto os dados do usuario quanto os dados da autenticação
    const newUser = await prisma.accounts.create({
      data: { username, role, createdBy: user.id, createdAt: new Date(), authentications: { create: { passwordHash: hash, salt: salt } } }
    })

    console.log(`[UsersService] Usuário criado com sucesso: ${newUser.username} (ID: ${newUser.id}) com role: ${newUser.role} por ${user.username}`);
    return newUser

  } catch (error) {
    const message = createMessage(
      'Erro ao criar usuário',
      `[UsersService] Erro ao criar usuário com username: ${username}: ${error.message}`
    );
    console.error(message.logMessage);
    throw new Error(message.userMessage);
  }
}

/**
 * Função para fazer login de um usuario
 * @param {string} username - Nome do usuario
 * @param {string} password - Senha do usuario
 * @param {string} expoPushToken - Token do expo
 * @returns {object} - Token de autenticação
 */
async function loginUserService(username, password, expoPushToken = null) {
  try {
    const account = await prisma.accounts.findUnique({
      where: { username },
      include: { authentications: true },
    });

    if (!account || !account.authentications) {
      const message = createMessage(
        'Usuário inválido ou não cadastrado',
        `[UsersService] Tentativa de login com usuário inexistente: ${username}`
      );
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    const isPasswordValid = await verifyPassword(
      password,
      account.authentications.salt,
      account.authentications.passwordHash
    );

    if (!isPasswordValid) {
      const message = createMessage(
        'Senha inválida',
        `[UsersService] Tentativa de login com senha incorreta para usuário: ${username}`
      );
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    // Registrar push token se fornecido
    if (expoPushToken) {
      await registerPushTokenService(account.id, expoPushToken);
    }

    const token = jwt.sign(
      { id: account.id, role: account.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    console.log(`[UsersService] Login realizado com sucesso para usuário: ${username} (ID: ${account.id})`);
    return token;
  } catch (err) {
    const message = createMessage(
      'Erro ao fazer login',
      `[UsersService] Erro no processo de login para usuário ${username}: ${err.message}`
    );
    console.error(message.logMessage);
    throw err;
  }
}

/**
 * Função para registrar push token de um usuario
 * @param {string} accountId - ID do usuario
 * @param {string} expoPushToken - Token do expo
 * @returns {object} - Token registrado
 */
async function registerPushTokenService(accountId, expoPushToken) {
  console.log(`[UsersService] Registrando push token para usuário: ${accountId}`);

  try {
    // Verificar se o token já existe para outro usuário
    const existingTokenForOtherUser = await prisma.accountPushToken.findFirst({
      where: {
        token: expoPushToken,
        accountId: { not: accountId }
      }
    });

    // Se o token existe para outro usuário, atualizar para o novo usuário
    if (existingTokenForOtherUser) {
      console.log(`[UsersService] Token já existe para outro usuário, transferindo para usuário: ${accountId}`);

      // Contar tokens ativos do novo usuário
      const activeTokensCount = await prisma.accountPushToken.count({
        where: { accountId: accountId }
      });

      // Se já tem 5 tokens, remover o mais antigo
      if (activeTokensCount >= 5) {
        const oldestToken = await prisma.accountPushToken.findFirst({
          where: { accountId: accountId },
          orderBy: { createdAt: 'asc' }
        });

        if (oldestToken) {
          console.log(`[UsersService] Removendo token mais antigo: ${oldestToken.id}`);
          await prisma.accountPushToken.delete({
            where: { id: oldestToken.id }
          });
        }
      }

      // Atualizar o token existente para o novo usuário
      const updatedToken = await prisma.accountPushToken.update({
        where: { id: existingTokenForOtherUser.id },
        data: {
          accountId: accountId,
          createdAt: new Date() // Atualizar timestamp para ser o mais recente
        }
      });

      console.log(`[UsersService] Push token transferido com sucesso: ${updatedToken.id} para usuário: ${accountId}`);
      return updatedToken;
    }

    // Verificar se o token já existe para o mesmo usuário
    const existingTokenForSameUser = await prisma.accountPushToken.findFirst({
      where: {
        accountId: accountId,
        token: expoPushToken
      }
    });

    if (existingTokenForSameUser) {
      console.log(`[UsersService] Push token já existe para usuário: ${accountId}`);
      return existingTokenForSameUser;
    }

    // Contar tokens ativos do usuário
    const activeTokensCount = await prisma.accountPushToken.count({
      where: { accountId: accountId }
    });

    // Se já tem 5 tokens, remover o mais antigo
    if (activeTokensCount >= 5) {
      const oldestToken = await prisma.accountPushToken.findFirst({
        where: { accountId: accountId },
        orderBy: { createdAt: 'asc' }
      });

      if (oldestToken) {
        console.log(`[UsersService] Removendo token mais antigo: ${oldestToken.id}`);
        await prisma.accountPushToken.delete({
          where: { id: oldestToken.id }
        });
      }
    }

    // Registrar novo token
    const newToken = await prisma.accountPushToken.create({
      data: {
        token: expoPushToken,
        accountId: accountId
      }
    });

    console.log(`[UsersService] Push token registrado com sucesso: ${newToken.id} para usuário: ${accountId}`);
    return newToken;

  } catch (error) {
    const message = createMessage(
      'Erro ao registrar push token',
      `[UsersService] Erro ao registrar push token para usuário ${accountId}`
    );
    console.error(message.logMessage);
    throw err;
  }
}

/**
 *
 * @param {string} role
 * @returns
 */
async function findPushTokenForRole(role) {
  console.info("Buscando os tokens dos usuarios com role", role)


  try {
    const tokens = await prisma.accountPushToken.findMany({
      where: {
        account: {
          role: "ADMIN"
        }
      },
      select: {
        token: true
      }
    })

    if (!tokens) {
      console.warn(`Tentativa de buscar os tokens dos usuarios com role = ${role}, mas não foi encontrado ninguém`)
    }

    return tokens
  } catch (error) {
    console.warn(error.message)
    return null
  }
}

/**
 * Função para atualizar um usuario
 * @param {string} id - ID do usuario
 * @param {string} username - Nome do usuario
 * @param {string} password - Senha do usuario
 * @param {string} role - Role do usuario
 * @param {object} user - Usuario que esta atualizando o usuario
 * @param {string} passwordAdmin - Senha de administrador
 * @returns {object} - Usuario atualizado
 */
async function updateUserService(id, username, password, role, user, passwordAdmin) {
  try {
    //Verifica se o usuário existe
    const verifyUser = await prisma.accounts.findUnique({
      where: { id },
      include: { authentications: true }
    })

    if (!verifyUser) {
      const message = createMessage(
        'Usuário não encontrado',
        `[UsersService] Tentativa de atualizar usuário inexistente com ID: ${id}`
      );
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    //Verifica se o update vai fazer o usuario virar um ADMIN
    if (verifyUser.role !== 'ADMIN' && role === 'ADMIN') {
      if (!passwordAdmin) {
        const message = createMessage(
          'Senha de administrador é obrigatória para atualizar contas com permissão de administrador',
          `[UsersService] Tentativa de atualizar usuário ADMIN sem senha de administrador por: ${user.username}`
        );
        console.warn(message.logMessage);
        throw new Error(message.userMessage);
      }

      //Se for então valida os dados do de quem esta fazendo a operação
      const userAdmin = await prisma.accounts.findUnique({
        where: { id: user.id },
        include: { authentications: true }
      })

      if (!userAdmin) {
        const message = createMessage(
          'Usuário administrador não encontrado',
          `[UsersService] Tentativa de atualizar usuário ADMIN por usuário inexistente: ${user.username}`
        );
        console.warn(message.logMessage);
        throw new Error(message.userMessage);
      }

      //Verifica se a senha do admin que esta fazendo a operação é valida
      const isPasswordValid = await verifyPassword(
        passwordAdmin,
        userAdmin.authentications.salt,
        userAdmin.authentications.passwordHash
      );

      if (!isPasswordValid) {
        const message = createMessage(
          'Senha de administrador incorreta',
          `[UsersService] Tentativa de atualizar usuário ADMIN com senha incorreta por: ${user.username}`
        );
        console.warn(message.logMessage);
        throw new Error(message.userMessage);
      }
    }

    //Atualiza os dados do usuario
    const updatedUser = await prisma.accounts.update({
      where: { id: verifyUser.id },
      data: { username, role, updatedAt: new Date() }
    })

    //Se a senha foi passada, então cria o hash da senha e atualiza a senha do usuario
    if (password) {
      const { salt, hash } = await createHash(password);

      //Atualiza a senha do usuario
      await prisma.authentications.update({
        where: { account_id: updatedUser.id },
        data: { passwordHash: hash, salt: salt, updatedAt: new Date() }
      })
    } else {
      console.log(`[UsersService] Senha do usuário ${updatedUser.username} (ID: ${updatedUser.id}) não foi atualizada por ${user.username}`);
    }

    console.log(`[UsersService] Usuário atualizado com sucesso: ${updatedUser.username} (ID: ${updatedUser.id}) com role: ${updatedUser.role} por ${user.username}`);
    return updatedUser

  } catch (error) {
    const message = createMessage(
      'Erro ao atualizar usuário',
      `[UsersService] Erro ao atualizar usuário com ID ${id}: ${error.message}`
    );
    console.error(message.logMessage);
    throw err;
  }
}

/**
 * Função para deletar um usuario
 * @param {string} id - ID do usuario
 * @param {string} password - Senha do usuario
 * @param {object} user - Usuario que esta deletando o usuario
 * @returns {object} - Usuario deletado
 */
async function deleteUserService(id, password, user) {
  try {
    //Verifica se o usuário existe
    const verifyUser = await prisma.accounts.findUnique({
      where: {
        id,
      }
    })

    if (!verifyUser) {
      const message = createMessage(
        'Usuário não encontrado',
        `[UsersService] Tentativa de excluir usuário inexistente com ID: ${id}`
      );
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    //Verifica se o usuario que esta fazendo a operação existe
    const userDoingOperation = await prisma.accounts.findUnique({
      where: { id: user.id },
      include: { authentications: true }
    });

    //Verifica se a senha do usuario que esta fazendo a operação é valida
    const isPasswordValid = await verifyPassword(
      password,
      userDoingOperation.authentications.salt,
      userDoingOperation.authentications.passwordHash
    );

    if (!isPasswordValid) {
      const message = createMessage(
        'Senha incorreta',
        `[UsersService] Tentativa de excluir usuário com senha incorreta por: ${user.username}`
      );
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    //Deleta o usuario
    const deletedUser = await prisma.accounts.delete({
      where: { id: verifyUser.id }
    })

    console.log(`[UsersService] Usuário excluído com sucesso: ${deletedUser.username} (ID: ${id}) por ${user.username}`);
    return deletedUser
  } catch (err) {
    const message = createMessage(
      'Erro ao excluir usuário',
      `[UsersService] Erro ao tentar excluir usuário com ID ${id}: ${err.message}`
    );
    console.error(message.logMessage);
    throw err;
  }
}

/**
 * Função para listar todos os usuarios
 * @returns {object} - Lista de usuarios
 */
async function listUsersService() {
  try {
    const list = await prisma.accounts.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!list || list.length === 0) {
      const message = createMessage(
        'Nenhum usuário encontrado',
        '[UsersService] Lista de usuários retornou vazia'
      );
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    console.log(`[UsersService] Lista de usuários recuperada com sucesso. Total: ${list.length} usuários`);
    return list
  } catch (err) {
    const message = createMessage(
      'Erro ao buscar a lista de usuários',
      `[UsersService] Erro ao buscar a lista de usuários: ${err.message}`
    );
    console.error(message.logMessage);
    throw err;
  }
}

module.exports = {
  registerUserService,
  loginUserService,
  registerPushTokenService,
  findPushTokenForRole,
  updateUserService,
  deleteUserService,
  listUsersService,
};
