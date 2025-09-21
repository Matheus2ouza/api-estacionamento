const { validationResult } = require('express-validator');
const usersService = require('../services/usersService');

exports.register = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.warn('[UsersController] Dados inválidos na requisição:', errors.array());
    return res.status(400).json({
      success: false,
      error: 'Erro de validação do usuario',
    });
  }

  const { username, password, role, passwordAdmin } = req.body;
  const user = req.user;

  try {
    const newUser = await usersService.registerUserService(username.toLowerCase().trim(), password, role, user, passwordAdmin);

    console.log('[UsersController] Usuário registrado com sucesso:', newUser.id);

    return res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      details: newUser.id,
    });
  } catch (error) {
    console.error('[UsersController] Erro ao registrar usuário:', {
      error: error.message,
      stack: error.stack,
      inputData: { username, role, hasPassword: !!password }
    });
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.warn('[UsersController] Dados inválidos na requisição de login:', errors.array());
    return res.status(400).json({
      success: false,
      error: 'Erro de validação do login',
    });
  }

  const { username, password, expoPushToken } = req.body;

  console.log(`[UsersController] Tentativa de login para usuário: ${username ? '***' : 'não informado'}`);

  try {
    const token = await usersService.loginUserService(
      username.trim().toLowerCase(),
      password.trim(),
      expoPushToken ? expoPushToken.trim() : null
    );

    console.log('[UsersController] Login bem-sucedido para usuário autenticado');

    return res.status(200).json({
      success: true,
      message: 'Login bem-sucedido',
      token,
    });
  } catch (error) {
    console.error('[UsersController] Erro ao autenticar usuário:', {
      error: error.message,
      stack: error.stack,
      username,
      hasPassword: !!password,
      hasExpoPushToken: !!expoPushToken
    });
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateUsers = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.warn('[UsersController] Dados inválidos na requisição de atualização:', errors.array());
    return res.status(400).json({
      success: false,
      error: 'Erro de validação do usuario',
    });
  }

  const { id, username, password, role } = req.body;
  const user = req.user;

  console.log('[UsersController] Dados processados para atualização:', id);

  try {
    await usersService.updateUserService(
      id,
      username.toLowerCase().trim(),
      password,
      role,
      user,
    );

    console.log('[UsersController] Usuário atualizado com sucesso:', id);

    return res.status(200).json({
      success: true,
      message: "Usuário atualizado com sucesso.",
    });
  } catch (error) {
    console.error("[UsersController] Erro ao editar usuário:", {
      error: error.message,
      stack: error.stack,
      inputData: { id, username, role, hasPassword: !!password },
      requestingUser: user ? { id: user.id, username: user.username } : null
    });
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteUser = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.warn('[UsersController] Dados inválidos na requisição de exclusão:', errors.array());
    return res.status(400).json({
      success: false,
      error: 'Erro de validação do usuario',
    });
  }

  const { id } = req.params
  const { password } = req.body
  const user = req.user

  console.log('[UsersController] Dados processados para exclusão:', id);

  try {
    await usersService.deleteUserService(id, password, user);

    console.log('[UsersController] Usuário excluído com sucesso:', id);

    return res.status(200).json({
      success: true,
      message: "Usuário excluído com sucesso.",
    });

  } catch (error) {
    console.error('[UsersController] Erro ao excluir usuário:', {
      error: error.message,
      stack: error.stack,
      inputData: { id, hasPassword: !!password },
      requestingUser: user ? { id: user.id, username: user.username } : null
    });
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

exports.listUsers = async (req, res) => {
  try {
    const list = await usersService.listUsersService();

    console.log('[UsersController] Lista de usuários obtida com sucesso:', list.length);

    return res.status(201).json({
      success: true,
      message: 'Usuarios encontrados com sucesso',
      list
    })
  } catch (error) {
    console.error('[UsersController] Erro ao buscar usuarios:', {
      error: error.message,
      stack: error.stack,
      requestingUser: req.user ? { id: req.user.id, username: req.user.username } : null
    });
    return res.status(401).json({
      success: false,
      message: error.message,
    })
  }
}
