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
    return res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      details: newUser.id,
    });
  } catch (error) {
    console.error('[UsersController] Erro ao registrar usuário:', error.message);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.warn('[UsersController] Dados inválidos na requisição:', errors.array());
    return res.status(400).json({
      success: false,
      error: 'Erro de validação do login',
    });
  }

  const { username, password } = req.body;

  try {
    const token = await usersService.loginUserService(username.trim().toLowerCase(), password.trim());
    console.log(`[UsersController] Login bem-sucedido para usuário: ${username}`);
    return res.status(200).json({
      success: true,
      message: 'Login bem-sucedido',
      token,
    });
  } catch (error) {
    console.error('[UsersController] Erro ao autenticar usuário:', error.message);
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateUsers = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.warn('[UsersController] Dados inválidos na requisição:', errors.array());
    return res.status(400).json({
      success: false,
      error: 'Erro de validação do usuario',
    });
  }

  const { id, username, password, role } = req.body;
  const user = req.user;

  try {
    await usersService.updateUserService(
      id,
      username.toLowerCase().trim(),
      password,
      role,
      user,
    );

    return res.status(200).json({
      success: true,
      message: "Usuário atualizado com sucesso.",
    });
  } catch (error) {
    console.error("[UsersController] Erro ao editar usuário:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteUser = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.warn('[UsersController] Dados inválidos na requisição:', errors.array());
    return res.status(400).json({
      success: false,
      error: 'Erro de validação do usuario',
    });
  }

  const { id } = req.params
  const { password } = req.body
  const user = req.user

  try {

    await usersService.deleteUserService(id, password, user);

    return res.status(200).json({
      success: true,
      message: "Usuário excluído com sucesso.",
    });

  } catch (error) {
    console.error('[UsersController] Erro ao excluir usuário:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

exports.listUsers = async (req, res) => {
  try {
    const list = await usersService.listUsersService();
    console.log('[UsersController] Busca de usuarios feita com sucesso:', list);
    return res.status(201).json({
      success: true,
      message: 'Usuarios encontrados com sucesso',
      list
    })
  } catch (error) {
    console.error('[UsersController] Erro ao buscar usuarios:', error.message);
    return res.status(401).json({
      success: false,
      message: error.message,
    })
  }
}
