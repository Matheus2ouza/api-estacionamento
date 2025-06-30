const { validationResult } = require('express-validator');
const authService = require('../services/authService');

exports.register = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.warn('[authController] Dados inválidos na requisição:', errors.array());
    return res.status(400).json({
      error: 'Erro de validação',
      details: errors.array(),
    });
  }

  const { username, password, role } = req.body;

  try {
    const user = await authService.registerUser(username, password, role);
    return res.status(201).json({
      message: 'Usuário criado com sucesso',
      userId: user.id,
    });
  } catch (error) {
    console.error('[authController] Erro ao registrar usuário:', error.message);
    return res.status(400).json({
      error: 'Erro ao registrar usuário',
      message: error.message,
    });
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.warn('[authController] Dados inválidos na requisição:', errors.array());
    return res.status(400).json({
      error: 'Erro de validação',
      details: errors.array(),
    });
  }

  const { username, password } = req.body;

  try {
    const token = await authService.loginUser(username.trim(), password.trim());
    console.log(`[authController] Login bem-sucedido para usuário: ${username}`);
    return res.status(200).json({
      message: 'Login bem-sucedido',
      token,
    });
  } catch (error) {
    console.error('[authController] Erro ao autenticar usuário:', error.message);
    return res.status(401).json({
      error: 'Falha na autenticação',
      message: error.message,
    });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const list = await authService.listUsers();
    console.log(`[AuthController] Busca de usuarios feita com sucesso`);
    return res.status(201).json({
      list
    })
  } catch (error) {
    return res.status(401).json({
      error: 'falha na busca de usuarios',
      message: error.message
    })
  }
}