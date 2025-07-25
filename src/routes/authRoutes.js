const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post(
  '/register',
  [ 
    body('username').isLength({ min: 2, max: 50 }).withMessage('O nome deve ter entre 2 e 50 caracteres'),
    body('password').isLength({ min: 6 }).withMessage('Senha deve ter ao menos 6 caracteres'),
    body('role').isIn(['ADMIN', 'NORMAL']).withMessage('Valor inesperado no role')
  ],
  authController.register
);

router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('Username é obrigatório'),
    body('password').notEmpty().withMessage('Senha é obrigatória'),
  ],
  authController.login
);

router.post(
  '/edit', 
  [
    body('id').notEmpty().withMessage('id é obrigatório'),
    body('username').notEmpty().withMessage('nome de usuario obrigatório'),
    body('role').notEmpty().withMessage('Role é obrigatório'),
  ],
  authMiddleware('ADMIN'),
  authController.editUsers
);

router.post(
  '/deleteUser',
  [
    body('id').notEmpty().withMessage('id é obrigatório')
  ],
  authMiddleware('ADMIN'),
  authController.deleteUser
)

router.get('/listUsers', authMiddleware('ADMIN'), authController.listUsers);

module.exports = router;
